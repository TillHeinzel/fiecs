import * as Backend from "./Backend";
import {
  AnyComponent,
  AnySingle,
  Component,
  ComponentDataSchema,
  Entity,
  PairComponent,
  PairTag,
  Tag,
} from "./Ids";
import { Wildcard } from "./Wildcard";

export function mapIdFromBackend(
  component: Backend.Entity | Backend.Pair,
  backend: Backend.Backend,
):
  | Tag
  | PairTag
  | Component<ComponentDataSchema>
  | PairComponent<ComponentDataSchema> {
  if (component instanceof Backend.Entity) {
    if (component.hasData()) {
      return new Component(component, backend);
    }
    return new Entity(component as unknown as Backend.Entity, backend);
  } else if (component instanceof Backend.Pair) {
    if (component.hasData()) {
      return new PairComponent(component, backend);
    }
    return new PairTag(component as unknown as Backend.Pair, backend);
  }
  throw new Error("Invalid component from backend");
}

export function mapToBackend(
  [first, second]: [AnySingle, AnyPairPart | undefined],
  backend: Backend.Backend,
):
  | Backend.Entity
  | Backend.Pair
  | Backend.Wildcard
  | Backend.DoubleWildcard
  | Backend.RelationshipWildcard
  | Backend.WildcardTarget {
  if (first === undefined) {
    throw new Error(
      ` cannot map to backend with undefined first argument. Received: ${JSON.stringify([first, second])}`,
    );
  }
  if (second === undefined) {
    return first.data;
  }
  if (isPair(first)) {
    throw new Error("Cannot create a pair with a pair as the relationship");
  }
  if (isComponent(first) && isComponent(second)) {
    return backend.pair(first.data, second.data);
  }
  if (isComponent(first) && isWildcard(second)) {
    return backend.relationshipWildcard(first.data);
  }
  if (isWildcard(first) && isComponent(second)) {
    return backend.wildcardTarget(second.data);
  }
  if (isWildcard(first) && isWildcard(second)) {
    return backend.doubleWildcard;
  }

  throw new Error(
    `Invalid arguments for mapToBackend: ${JSON.stringify([first, second])}`,
  );
}
function isWildcard(value: { data: unknown }): value is Wildcard {
  return Backend.isWildcard(value.data);
}
export function isComponent(value: { data: unknown }): value is AnyComponent {
  return value.data instanceof Backend.Entity;
}

function isPair(value: { data: unknown }): value is AnyPair {
  return value.data instanceof Backend.Pair;
}
type AnyPairPart = AnyComponent | Wildcard;
export type AnyPair = PairTag | PairComponent<ComponentDataSchema>;
