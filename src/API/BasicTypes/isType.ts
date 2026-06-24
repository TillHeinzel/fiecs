import {
  AnyId,
  AnyIdObject,
  AnyIdObjectWithData,
  AnyIdWithData,
  AnyImplicitPairId,
  AnyImplicitPairIndex,
  AnyIndex,
  AnyPairId,
  AnyPairIdObject,
  AnyPairIdObjectWithData,
  AnyPairIdObjectWithoutData,
  AnyPairIndex,
  AnyPairIndexObject,
  AnySingleId,
  AnySingleIndex,
} from "./";
import { isComponent, isEntity } from "./Entity";
import { isPairObject } from "./Pair";
import { isWildcard } from "./Wildcard";

export function isString(x: unknown): x is string {
  return typeof x === "string";
}

export function isImplicitPair(x: unknown): x is readonly [unknown, unknown] {
  return Array.isArray(x) && x.length === 2;
}

export function isAnySingleId(x: unknown): x is AnySingleId {
  return isComponent(x) || isEntity(x);
}

export function isAnyPairIdObjectWithoutData(
  x: unknown,
): x is AnyPairIdObjectWithoutData {
  return (
    isPairObject(x) &&
    isAnySingleId(x.first()) &&
    isAnySingleId(x.second()) &&
    !x.hasData()
  );
}

export function isAnyPairIdObjectWithData(
  x: unknown,
): x is AnyPairIdObjectWithData<unknown> {
  return (
    isPairObject(x) &&
    isAnySingleId(x.first()) &&
    isAnySingleId(x.second()) &&
    x.hasData()
  );
}

export function isAnyPairIdObject(x: unknown): x is AnyPairIdObject {
  return (
    isPairObject(x) && isAnySingleId(x.first()) && isAnySingleId(x.second())
  );
}

export function isAnyImplicitPairId(x: unknown): x is AnyImplicitPairId {
  return isImplicitPair(x) && isAnySingleId(x[0]) && isAnySingleId(x[1]);
}

export function isAnyPairId(x: unknown): x is AnyPairId {
  return isAnyPairIdObject(x) || isAnyImplicitPairId(x);
}

export function isAnyIdObject(x: unknown): x is AnyIdObject {
  return isEntity(x) || isComponent(x) || isAnyPairIdObject(x);
}

export function isAnyIdObjectWithData(
  x: unknown,
): x is AnyIdObjectWithData<unknown> {
  return isAnyIdObject(x) && x.hasData();
}

export function isAnyId(x: unknown): x is AnyId {
  return isAnySingleId(x) || isAnyPairId(x);
}

export function isAnyIdWithData(x: unknown): x is AnyIdWithData<unknown> {
  return (
    isAnyIdObjectWithData(x) ||
    (isImplicitPair(x) && (isComponent(x[0]) || isComponent(x[1])))
  );
}

export function isAnySingleIndex(x: unknown): x is AnySingleIndex {
  return isAnySingleId(x) || isWildcard(x);
}

export function isAnyPairIndexObject(x: unknown): x is AnyPairIndexObject {
  return (
    isPairObject(x) &&
    isAnySingleIndex(x.first()) &&
    isAnySingleIndex(x.second())
  );
}

export function isAnyImplicitPairIndex(x: unknown): x is AnyImplicitPairIndex {
  return isImplicitPair(x) && isAnySingleIndex(x[0]) && isAnySingleIndex(x[1]);
}

export function isAnyPairIndex(x: unknown): x is AnyPairIndex {
  return isAnyPairIndexObject(x) || isAnyImplicitPairIndex(x);
}

export function isAnyIndex(x: unknown): x is AnyIndex {
  return isAnySingleIndex(x) || isAnyPairIndex(x);
}
