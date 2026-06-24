import { Backend } from "../Backend";

export class StringLookup {
  _StringLookupBrand: undefined = undefined;

  name: string;
  backend: Backend;

  constructor(name: string, backend: Backend) {
    this.name = name;
    this.backend = backend;
  }

  doLookup() {
    const x = this.backend.lookupEntity(this.name);
    if (x === undefined)
      throw new Error(`entity named "${this.name}" does not exist`);

    return x;
  }
}
export function isStringlookup(x: unknown): x is StringLookup {
  return x instanceof StringLookup;
}
