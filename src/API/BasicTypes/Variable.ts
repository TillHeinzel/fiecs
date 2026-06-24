export class Variable {
  _queryVariableBrand: undefined = undefined;

  varName: string;

  constructor(varName: string) {
    this.varName = varName;
  }
}

export type VariableString<T extends string> = `$${T}`;

export function isVariable(t: unknown): t is Variable {
  return t instanceof Variable;
}

export function isVariableString(t: unknown): t is VariableString<string> {
  return typeof t === "string" && t[0] === "$";
}

export class StringLookup {
  _frontendStringLookupBrand678: undefined = undefined;

  s: string;

  constructor(s: string) {
    this.s = s;
  }
}

export function isStringlookup(x: unknown): x is StringLookup {
  return x instanceof StringLookup;
}

export function identifyString<S extends string>(
  s: VariableString<S>,
): Variable;
export function identifyString(s: string): StringLookup;
export function identifyString(s: string) {
  if (s[0] === "$") return new Variable(s.slice(1));
  return new StringLookup(s);
}
