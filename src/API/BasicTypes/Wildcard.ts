import * as Backend from "#/Backend";

export class Wildcard {
  data: Backend.Wildcard;
  constructor(data: Backend.Wildcard) {
    this.data = data;
  }
}
export function isWildcard(x: unknown): x is Wildcard {
  return x instanceof Wildcard;
}
