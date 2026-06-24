import { Archetype, Entity, isArchetype, isEntity } from "../BasicTypes";
import { isStringlookup, StringLookup } from "../BasicTypes/StringLookup";
import { isVariable, Variable } from "../BasicTypes/Variable";
import { QueryVariables } from "./BaseQuery";

export type Source = {
  lookupStrings(): void;
  getSourceFromVariables(vs: QueryVariables): SourceLookupOutcome;

  isThis(): boolean;
};

export type SourceLookupOutcome =
  | { result: "success"; archetype: Archetype; source: string | Entity }
  | { result: "missingSourceVariable"; varName: string };

export type SourceType = Entity | StringLookup | Variable;

export function getSource(s: SourceType): Source {
  if (isVariable(s)) return new VariableSource(s);
  if (isEntity(s)) return new EntitySource(s);
  if (isStringlookup(s)) return new StringLookupSource(s);

  throw new Error("internal: should not happen");
}

class EntitySource implements Source {
  _source: Entity;

  constructor(source: Entity) {
    this._source = source;
  }

  lookupStrings() {}

  getSourceFromVariables(): SourceLookupOutcome {
    return {
      result: "success",
      archetype: this._source.archetype!,
      source: this._source,
    };
  }

  isThis() {
    return false;
  }
}

class VariableSource implements Source {
  _source: Variable;

  constructor(source: Variable) {
    this._source = source;
  }

  lookupStrings() {}

  getSourceFromVariables(vars: QueryVariables): SourceLookupOutcome {
    const lookedUp = vars.get(this._source.name);

    if (lookedUp === undefined)
      return { result: "missingSourceVariable", varName: this._source.name };

    if (isArchetype(lookedUp))
      return {
        result: "success",
        archetype: lookedUp,
        source: this._source.name,
      };

    if (isEntity(lookedUp))
      return {
        result: "success",
        archetype: lookedUp.archetype!,
        source: lookedUp,
      };

    throw new Error("should not be possible");
  }

  isThis() {
    return this._source.name === "this";
  }
}

class StringLookupSource implements Source {
  _source: StringLookup;

  concreteSource: Entity | undefined;

  constructor(source: StringLookup) {
    this._source = source;
  }

  lookupStrings() {
    this.concreteSource = this._source.doLookup();
  }

  getSourceFromVariables(): SourceLookupOutcome {
    return {
      result: "success",
      archetype: this.concreteSource!.archetype!,
      source: this.concreteSource!,
    };
  }
  isThis() {
    return false;
  }
}
