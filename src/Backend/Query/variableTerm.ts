import { Backend } from "../Backend";
import {
  Archetype,
  Entity,
  isArchetype,
  Variable,
  Wildcard,
} from "../BasicTypes";
import {
  MissingVariableMessage,
  NeedVariableAsEntityMessage,
  QueryVariables,
  Term,
} from "./BaseQuery";
import { handleFieldResults, handleFilterResults } from "./handleBasicResults";
import { Source } from "./Source";

export function variableQueryTerm(
  t: Variable,
  returnsMatch: boolean,
  source: Source,
  backend: Backend,
): Term {
  const handleResults = returnsMatch ? handleFieldResults : handleFilterResults;

  return {
    cacheAble: false,
    lookupStrings: () => {
      source.lookupStrings();

      return (v) => {
        const variableLookupOutcome = lookupVariable(t, v, backend);

        if (variableLookupOutcome.result !== "success")
          return variableLookupOutcome;

        return handleResults(
          variableLookupOutcome.val,
          source.getSourceFromVariables(v),
        );
      };
    },
  };
}

export type LookupResult =
  | {
      result: "success";
      val: Entity | Wildcard;
    }
  | MissingVariableMessage
  | NeedVariableAsEntityMessage;

export function lookupVariable(
  t: Variable,
  v: QueryVariables,
  backend: Backend,
): LookupResult {
  return lookupEntityVariable(t, v, backend.wildcard.getAllActiveComponents());
}

export function lookupEntityVariable(
  t: Variable,
  v: QueryVariables,
  candidates: IteratorObject<Archetype> | IteratorObject<Entity>,
): LookupResult {
  const lookedUp = v.get(t.name);

  if (lookedUp === undefined)
    return {
      result: "missingVariable",
      varName: t.name,
      candidates: candidates,
    };

  if (isArchetype(lookedUp))
    return { result: "needVariableAsEntity", varName: t.name };

  return { result: "success", val: lookedUp };
}
