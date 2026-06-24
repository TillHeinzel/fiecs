import {
  Component,
  Entity,
  isString,
  isVariableString,
  StringLookup,
  Variable,
} from "./";

export type TermSourceIn = TermSource | string;

export type TermSource = Entity | Component<unknown> | Variable | StringLookup;

export function mapSourceStringInput(i: TermSourceIn): TermSource {
  if (isVariableString(i)) return new Variable(i.slice(1));
  else if (isString(i)) return new StringLookup(i);
  else return i;
}
