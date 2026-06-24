import { Peekable } from "#/Utility/Peekable";

import { Backend } from "../Backend";
import {
  Archetype,
  Entity,
  IndexedTerm,
  isEntity,
  isStringlookup,
  isVariable,
  isWildcard,
  Variable,
  VariableImplicitPairTermInput,
  Wildcard,
} from "../BasicTypes";
import {
  MissingVariableMessage,
  NeedVariableAsEntityMessage,
  QueryVariables,
  Term,
} from "./BaseQuery";
import {
  handleFieldResults,
  handleFilterResults,
  noGetMatch,
} from "./handleBasicResults";
import { Source } from "./Source";
import { lookupEntityVariable, LookupResult } from "./variableTerm";

export function variablePairQueryTerm(
  t: VariableImplicitPairTermInput,
  returnsMatch: boolean,
  source: Source,
  backend: Backend,
): Term {
  const handleResults = returnsMatch ? handleFieldResults : handleFilterResults;

  return {
    cacheAble: false,
    lookupStrings() {
      source.lookupStrings();

      const variablePair = doVariablePairStringLookup(t, backend);

      return (vs) => {
        const variableLookupOutcome = lookupVariablePair(
          variablePair,
          vs,
          backend,
        );

        switch (variableLookupOutcome.result) {
          case "missingVariable": {
            const peekable = new Peekable(
              variableLookupOutcome.candidates as IteratorObject<Archetype>,
            );
            if (peekable.peek.done) {
              return noGetMatch(source.getSourceFromVariables(vs));
            }

            return { ...variableLookupOutcome, candidates: peekable };
          }
          case "needVariableAsEntity":
            return variableLookupOutcome;
          case "success":
            return handleResults(
              variableLookupOutcome.val,
              source.getSourceFromVariables(vs),
            );
          case "failedPairLookup":
            return noGetMatch(source.getSourceFromVariables(vs));
        }
      };
    },
  };
}

function doVariablePairStringLookup(
  t: VariableImplicitPairTermInput,
  backend: Backend,
) {
  const frst = isStringlookup(t[0]) ? t[0].doLookup() : t[0];
  const scnd = isStringlookup(t[1]) ? t[1].doLookup() : t[1];

  return getVariablePairObject([frst, scnd] as VariablePairType, backend);
}

function lookupVariablePair(
  variablePairObject: EVPair | VEPair | VWPair | VVPair | WVPair,
  v: QueryVariables,
  backend: Backend,
): VariableLookupOutcome {
  const relationshipLookupOutcome = variablePairObject.lookupRelationship(v);

  if (relationshipLookupOutcome.result !== "success")
    return relationshipLookupOutcome;

  const targetLookupOutcome = variablePairObject.lookupTarget(v);
  if (targetLookupOutcome.result !== "success") return targetLookupOutcome;

  const val = backend.lookupPairIndex(
    relationshipLookupOutcome.val,
    targetLookupOutcome.val,
  );

  return { result: "success", val } as const;
}

export function getVariablePairObject(
  tt:
    | [Entity, Variable]
    | [Variable, Entity]
    | [Wildcard, Variable]
    | [Variable, Wildcard]
    | [Variable, Variable],
  backend: Backend,
) {
  if (isEntity(tt[0])) {
    if (isVariable(tt[1])) {
      return new EVPair(tt[0], tt[1], backend);
    }
  }
  if (isVariable(tt[0])) {
    if (isEntity(tt[1])) {
      return new VEPair(tt[0], tt[1], backend);
    }
    if (isWildcard(tt[1])) {
      return new VWPair(tt[0], tt[1], backend);
    }
    if (isVariable(tt[1])) {
      return new VVPair(tt[0], tt[1], backend);
    }
  }
  if (isWildcard(tt[0])) {
    if (isVariable(tt[1])) {
      return new WVPair(tt[0], tt[1], backend);
    }
  }

  throw new Error("internal: someting weird is happenen");
}
class EVPair {
  _EVPairBrand7097: undefined = undefined;

  relationship: Entity;
  target: Variable;
  backend: Backend;

  constructor(relationship: Entity, target: Variable, backend: Backend) {
    this.relationship = relationship;
    this.target = target;
    this.backend = backend;
  }

  lookupRelationship(): LookupResult {
    return { result: "success", val: this.relationship };
  }

  lookupTarget(v: QueryVariables): LookupResult {
    return lookupEntityVariable(
      this.target,
      v,
      this.backend.pairsManager
        .getAllTargetsForRelationship(this.relationship)
        .map(([relation]) => relation),
    );
  }
}
class VEPair {
  _EVPairBrand7097: undefined = undefined;

  relationship: Variable;
  target: Entity;
  backend: Backend;

  constructor(relationship: Variable, target: Entity, backend: Backend) {
    this.relationship = relationship;
    this.target = target;
    this.backend = backend;
  }

  lookupRelationship(v: QueryVariables): LookupResult {
    return lookupEntityVariable(
      this.relationship,
      v,
      this.backend.pairsManager
        .getAllRelationshipsForTarget(this.target)
        .map(([relation]) => relation),
    );
  }

  lookupTarget(): LookupResult {
    return { result: "success", val: this.target };
  }
}
class WVPair {
  relationship: Wildcard;
  target: Variable;
  backend: Backend;

  constructor(relationship: Wildcard, target: Variable, backend: Backend) {
    this.relationship = relationship;
    this.target = target;
    this.backend = backend;
  }

  lookupRelationship(): LookupResult {
    return { result: "success", val: this.relationship };
  }

  lookupTarget(v: QueryVariables): LookupResult {
    return lookupEntityVariable(
      this.target,
      v,
      this.backend.doubleWildcard.getAllActiveTargets(),
    );
  }
}
class VWPair {
  relationship: Variable;
  target: Wildcard;
  backend: Backend;

  constructor(relationship: Variable, target: Wildcard, backend: Backend) {
    this.relationship = relationship;
    this.target = target;
    this.backend = backend;
  }

  lookupRelationship(v: QueryVariables): LookupResult {
    return lookupEntityVariable(
      this.relationship,
      v,
      this.backend.doubleWildcard.getAllActiveRelationships(),
    );
  }
  lookupTarget(): LookupResult {
    return { result: "success", val: this.target };
  }
}

class VVPair {
  relationship: Variable;
  target: Variable;
  backend: Backend;

  constructor(relationship: Variable, target: Variable, backend: Backend) {
    this.relationship = relationship;
    this.target = target;
    this.backend = backend;
  }

  lookupRelationship(v: QueryVariables): LookupResult {
    return lookupEntityVariable(
      this.relationship,
      v,
      this.backend.doubleWildcard.getAllActiveRelationships(),
    );
  }
  lookupTarget(v: QueryVariables): LookupResult {
    return lookupEntityVariable(
      this.target,
      v,
      this.backend.doubleWildcard.getAllActiveTargets(),
    );
  }
}
export type VariablePairType =
  | [Entity, Variable]
  | [Variable, Entity]
  | [Wildcard, Variable]
  | [Variable, Wildcard]
  | [Variable, Variable];
export type VariableLookupOutcome =
  | { result: "success"; val: IndexedTerm }
  | MissingVariableMessage
  | NeedVariableAsEntityMessage
  | { result: "failedPairLookup" };
