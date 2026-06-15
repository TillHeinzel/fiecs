import * as Backend from "#/Backend";

import { ComponentDataSchema } from "./EntityAndPair";

export type Wildcard = { data: Backend.Wildcard };
export type DoubleWildcard = { data: Backend.DoubleWildcard };

export class RelationshipWildcard {
  _relationshipWildcardBrand: undefined = undefined;
  data: Backend.RelationshipWildcard;
  backend: Backend.Backend;

  constructor(data: Backend.RelationshipWildcard, backend: Backend.Backend) {
    this.backend = backend;
    this.data = data;
  }
}

export class RelationshipWildcardComponent<
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  T extends ComponentDataSchema,
> {
  _relationshipWildcardComponentBrand: undefined = undefined;
  data: Backend.RelationshipWildcard;
  backend: Backend.Backend;

  constructor(data: Backend.RelationshipWildcard, backend: Backend.Backend) {
    this.backend = backend;
    this.data = data;
  }
}

export class WildcardTarget {
  _wildcardTargetBrand: undefined = undefined;
  data: Backend.WildcardTarget;
  backend: Backend.Backend;

  constructor(data: Backend.WildcardTarget, backend: Backend.Backend) {
    this.backend = backend;
    this.data = data;
  }
}
