import * as Backend from "#/Backend";
import * as Tup from "#/Utility/Tuples";

import {
  AccessType,
  NoAccess,
  ReadOnly,
  ReadWrite,
  WriteOnly,
} from "./MatchAccessors";
import { Query, QueryWithEntityAccess } from "./QueryClass";

export function makeQuery<Ts extends AnyTerm[]>(
  backend: Backend.Backend,
  cacheStrategy: Backend.CacheStrategy,
  ts: Ts,
): QueryAccessType<Ts, FieldAccessors<Ts>> {
  checkForPotentiallyUnsetVariablesUsedAfterwards(ts);
  const QueryConstructor = ts.some((t) => t._getSourceType() === "this")
    ? QueryWithEntityAccess
    : Query;

  return new QueryConstructor(ts, cacheStrategy, backend) as QueryAccessType<
    Ts,
    FieldAccessors<Ts>
  >;
}

type QueryAccessType<Ts extends AnyTerm[], params extends unknown[]> =
  IsAnySourceThis<Ts> extends true
    ? QueryWithEntityAccess<params>
    : Query<params>;

type IsAnySourceThis<Ts extends AnyTerm[]> = Ts extends [
  infer Head extends AnyTerm,
  ...infer Tail extends AnyTerm[],
]
  ? GetSourceType<Head> extends "this"
    ? "this" extends GetSourceType<Head>
      ? true
      : IsAnySourceThis<Tail>
    : IsAnySourceThis<Tail>
  : false;

type GetSourceType<T extends AnyTerm> =
  T extends Term<unknown, AccessType, "other">
    ? "other"
    : T extends Term<unknown, AccessType, "this">
      ? "this"
      : T extends Term<unknown, AccessType, "mixed">
        ? "mixed"
        : never;

// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-object-type
export type DatatypePlaceholder<T> = {};

export type SourceType = "this" | "other" | "mixed";

export type VariableWriteStyle =
  | "DefinitelyWrites"
  | "MaybeWrites"
  | "NoWrite_IgnoresUnset";

export type Term<T, A extends AccessType, S extends SourceType> = {
  datatypePlaceholder: DatatypePlaceholder<T>;
  _getAccessorType: () => A;
  _getSourceType: () => S;
  _getBackendTerm(backend: Backend.Backend): Backend.Term | Backend.OneOf;
  _getVariableWriteStrategy(): VariableWriteStyle;

  _usesVariables(): Set<string>;
};

export type Filter<S extends SourceType> = {
  _getSourceType: () => S;
  _getBackendTerm(backend: Backend.Backend): Backend.Term | Backend.OneOf;
  _getVariableWriteStrategy(): VariableWriteStyle;

  _usesVariables(): Set<string>;
};

export type AnyTerm = Term<unknown, AccessType, SourceType>;

type FieldAccessors<Ts extends readonly AnyTerm[]> = Tup.ExcludeFromTuple<
  TermAccessors<Ts>,
  undefined
>;

type TermAccessors<Ts extends readonly AnyTerm[]> = {
  [Index in keyof Ts]: TermAccessor<Ts[Index]>;
};

export type TermAccessor<T extends AnyTerm> =
  T extends Term<unknown, "FilterOnly", SourceType>
    ? undefined
    : T extends Term<infer Type, "ReadWrite", SourceType>
      ? ReadWrite<Type>
      : T extends Term<infer Type, "ReadOnly", SourceType>
        ? ReadOnly<Type>
        : T extends Term<infer Type, "WriteOnly", SourceType>
          ? WriteOnly<Type>
          : T extends Term<infer Type, "NoAccess", SourceType>
            ? NoAccess<Type>
            : never;

function checkForPotentiallyUnsetVariablesUsedAfterwards<Ts extends AnyTerm[]>(
  ts: Ts,
) {
  ts.reduce(
    ([potentiallyUnsetVariables, definitelySetVariables], t) => {
      const variableWriteStrategy = t._getVariableWriteStrategy();
      const usedVariables = t._usesVariables();

      switch (variableWriteStrategy) {
        case "MaybeWrites":
          checkNoPotentiallyUnsetVariablesUsed(
            potentiallyUnsetVariables.intersection(usedVariables),
          );
          return [
            potentiallyUnsetVariables.union(
              usedVariables.difference(definitelySetVariables),
            ),
            definitelySetVariables,
          ];

        case "DefinitelyWrites":
          checkNoPotentiallyUnsetVariablesUsed(
            potentiallyUnsetVariables.intersection(usedVariables),
          );
          return [
            potentiallyUnsetVariables,
            definitelySetVariables.union(usedVariables),
          ];
        case "NoWrite_IgnoresUnset":
          checkNoVariablesSet(
            usedVariables,
            potentiallyUnsetVariables.union(definitelySetVariables),
          );

          return [potentiallyUnsetVariables, definitelySetVariables];
      }
    },
    [new Set<string>(), new Set<string>()],
  );
}

function checkNoPotentiallyUnsetVariablesUsed(
  usedPotentiallyUnsetVariables: Set<string>,
) {
  if (usedPotentiallyUnsetVariables.size !== 0) {
    throw new Error(
      `Terms using variables that may be left unset (due to being set by an optional or oneOf) must be marked dependent. Variables: ${Array.from(usedPotentiallyUnsetVariables.keys()).join(", ")}`,
    );
  }
}

function checkNoVariablesSet(
  usedVariables: Set<string>,
  potentiallySetVariables: Set<string>,
) {
  const setVariables = usedVariables.difference(potentiallySetVariables);

  if (setVariables.size !== 0) {
    throw new Error(
      `A dependent term cannot set variables. Variables set: ${Array.from(setVariables).join(", ")}`,
    );
  }
}
