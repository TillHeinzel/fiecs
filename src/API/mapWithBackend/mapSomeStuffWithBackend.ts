import * as Backend from "#/Backend";

import {
  AnyId,
  AnyIdObject,
  AnyIdObjectWithData,
  AnyIndex,
  AnyPairIdObject,
  AnyPairIdObjectWithData,
  AnySingleIndex,
  Component,
  Entity,
  isAnySingleId,
  isImplicitPair,
  isPairObject,
  isString,
  isWildcard,
  Pair,
  PairBackendObject,
  Wildcard,
} from "../BasicTypes";

export function mapRecordFromBackend<Keys extends string | number | symbol>(
  record: Record<Keys, Backend.Entity>,
  backend: Backend.Backend,
): Record<Keys, Entity> {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key,
      new Entity(value as Backend.Entity, backend),
    ]),
  ) as {
    [Property in Keys]: Entity;
  };
}

export function mapEntityFromBackend(
  entity: Backend.Entity | undefined,
  backend: Backend.Backend,
): Entity | undefined {
  if (entity === undefined) {
    return undefined;
  } else {
    return new Entity(entity, backend);
  }
}

export function mapWildcardFromBackend(
  w: Backend.Wildcard,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  backend: Backend.Backend,
) {
  return new Wildcard(w);
}

function mapSingleFromBackend(
  component: Backend.Entity,
  backend: Backend.Backend,
) {
  if (component.hasData()) {
    return new Component(component, backend);
  }
  return new Entity(component as unknown as Backend.Entity, backend);
}

export function mapIdFromBackend(
  component: Backend.Entity | Backend.Pair,
  backend: Backend.Backend,
): AnyIdObject {
  if (component instanceof Backend.Entity) {
    return mapSingleFromBackend(component, backend);
  } else if (component instanceof Backend.Pair) {
    return new Pair(
      mapSingleFromBackend(component.relationship, backend),
      mapSingleFromBackend(component.target, backend),
      component as unknown as Backend.Pair,
      backend,
    ) as AnyPairIdObject;
  }
  throw new Error("Invalid component from backend");
}

export function mapIdWithDataFromBackend<T>(
  component: Backend.Entity | Backend.Pair,
  backend: Backend.Backend,
): AnyIdObjectWithData<T> {
  if (!component.hasData()) throw new Error("component has no data");

  if (component instanceof Backend.Entity) {
    return new Component<T>(component, backend);
  } else if (component instanceof Backend.Pair) {
    return new Pair(
      mapSingleFromBackend(component.relationship, backend),
      mapSingleFromBackend(component.target, backend),
      component as unknown as Backend.Pair,
      backend,
    ) as AnyPairIdObjectWithData<T>;
  }
  throw new Error("Invalid component from backend");
}

export function mapImplicitPairIndexToBackend<
  First extends AnySingleIndex,
  Second extends AnySingleIndex,
>(
  first: First,
  second: Second,
  backend: Backend.Backend,
): PairBackendObject<First, Second> {
  if (isPairObject(first)) {
    throw new Error("Cannot create a pair with a pair as the relationship");
  }

  if (isAnySingleId(first) && isAnySingleId(second)) {
    return backend.pair(first.data, second.data) as PairBackendObject<
      First,
      Second
    >;
  } else if (isAnySingleId(first) && isWildcard(second)) {
    return backend.relationshipWildcard(first.data) as PairBackendObject<
      First,
      Second
    >;
  }
  if (isWildcard(first) && isAnySingleId(second)) {
    return backend.wildcardTarget(second.data) as PairBackendObject<
      First,
      Second
    >;
  }
  if (isWildcard(first) && isWildcard(second)) {
    return backend.doubleWildcard as PairBackendObject<First, Second>;
  }

  throw new Error(`Invalid arguments for mapToBackend`);
}

export function mapIdToBackendWithString(
  id: AnyId | string,
  backend: Backend.Backend,
) {
  if (isString(id)) {
    return backend.lookupEntity(id);
  }

  return mapIdTobackend(id, backend);
}

export function mapIdTobackend(id: AnyId, backend: Backend.Backend) {
  if (isImplicitPair(id)) {
    if (isPairObject(id[0])) {
      throw new Error(
        "Cannot create a pair with an existing pair as relationship",
      );
    }
    return backend.pair(id[0].data, id[1].data);
  }
  return id.data;
}

export function mapIndexToBackendWithString(
  index: AnyIndex | string,
  backend: Backend.Backend,
) {
  if (typeof index === "string") {
    return backend.lookupEntity(index);
  }

  return mapIndexToBackend(index, backend);
}

export function mapSingleIndexToBackend(t: AnySingleIndex) {
  return t.data;
}

export function mapIndexToBackend(
  term: AnyIndex,
  backend: Backend.Backend,
): Backend.IndexedTerm {
  if (isImplicitPair(term)) {
    return mapImplicitPairIndexToBackend(term[0], term[1], backend);
  }
  return term.data;
}
