export class Variable {
  _VariableBrand: undefined = undefined;
  name: string;

  constructor(name: string) {
    this.name = name;
  }
}
export function isVariable(x: unknown): x is Variable {
  return x instanceof Variable;
}
