import { MergeCtor, MixinBase } from "#/mixins/mixins";

import { Initializer } from "./Initializer";

export interface IDataInitializeEntity<
  Archetype,
  Entity extends IDataInitializeEntity<Archetype, Entity, Pair>,
  Pair extends IDataInitializePair<Archetype, Entity, Pair>,
> {
  _relationshipHasNoData?: boolean;
  _initializer?: Initializer;

  addDataInitializer(parse: (val: unknown) => unknown): void;

  tryInitialize(init: { data: unknown } | undefined): unknown;

  canDefaultInitialize(): boolean;

  hasData(): boolean;

  setRelationshipHasNoData(): void;
}

export const DataInitializeEntityMixin =
  <
    Archetype,
    Entity extends IDataInitializeEntity<Archetype, Entity, Pair>,
    Pair extends IDataInitializePair<Archetype, Entity, Pair>,
  >() =>
  <TBase extends MixinBase>(Base: TBase) => {
    const Derived = class
      extends // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Base as any)
      implements IDataInitializeEntity<Archetype, Entity, Pair>
    {
      _initializer?: Initializer | undefined;

      addDataInitializer(parse: (val: unknown) => unknown) {
        this._initializer = (() => {
          if (parse === undefined) return undefined;

          const canDefaultInitialize = (() => {
            try {
              parse(undefined);
            } catch {
              return false;
            }
            return true;
          })();

          const tryInitialize = (val?: { data: unknown }) => {
            if (val === undefined) {
              if (!canDefaultInitialize) {
                throw new Error(
                  `Component "${this.name}" cannot be default initialized`,
                );
              }
              return parse(undefined);
            }
            try {
              return parse(val.data);
            } catch {
              throw new Error("Invalid component data");
            }
          };

          return { canDefaultInitialize, tryInitialize };
        })();
      }

      setRelationshipHasNoData() {
        this._relationshipHasNoData = true;
      }

      tryInitialize(init: { data: unknown } | undefined): unknown {
        return this._initializer?.tryInitialize(init);
      }

      canDefaultInitialize(): boolean {
        return this._initializer?.canDefaultInitialize ?? true;
      }

      hasData() {
        return this._initializer !== undefined;
      }
    };

    return Derived as unknown as MergeCtor<typeof Derived, TBase>;
  };

export interface IDataInitializePair<
  Archetype,
  Entity extends IDataInitializeEntity<Archetype, Entity, Pair>,
  Pair extends IDataInitializePair<Archetype, Entity, Pair>,
> {
  tryInitialize(init: { data: unknown } | undefined): unknown;

  canDefaultInitialize(): boolean;

  hasData(): boolean;
}

export const DataInitializePairMixin =
  <
    Archetype,
    Entity extends IDataInitializeEntity<Archetype, Entity, Pair>,
    Pair extends IDataInitializePair<Archetype, Entity, Pair>,
  >() =>
  <TBase extends MixinBase<{ relationship: Entity; target: Entity }>>(
    Base: TBase,
  ) => {
    const Derived = class
      extends Base
      implements IDataInitializePair<Archetype, Entity, Pair>
    {
      _initializer?: Initializer;

      tryInitialize(init: { data: unknown } | undefined): unknown {
        return this._initializer?.tryInitialize(init);
      }

      canDefaultInitialize(): boolean {
        return this._initializer?.canDefaultInitialize ?? true;
      }

      hasData() {
        return this._initializer !== undefined;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      constructor(...props: any[]) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        super(...props);
        this._initializer = (() => {
          if (
            this.relationship._initializer !== undefined &&
            this.target._initializer === undefined
          ) {
            return this.relationship._initializer;
          }
          if (
            this.relationship._initializer === undefined &&
            this.target._initializer !== undefined &&
            !this.relationship._relationshipHasNoData
          ) {
            return this.target._initializer;
          }
          if (
            this.relationship._initializer !== undefined &&
            this.target._initializer !== undefined &&
            !this.relationship._relationshipHasNoData
          ) {
            return this.relationship._initializer;
          }
          // type.initializer === undefined && target.initializer === undefined
          return undefined;
        })();
      }
    };

    return Derived as unknown as MergeCtor<typeof Derived, TBase>;
  };
