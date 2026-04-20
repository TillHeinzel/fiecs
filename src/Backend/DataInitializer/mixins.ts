import { MixinBase } from "#/Utility/mixins";

import { Initializer } from "./Initializer";

export interface IEntity<
  Archetype,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair extends IPair<Archetype, Entity, Pair>,
> {
  _relationshipHasNoData?: boolean;
  _initializer?: Initializer;

  addDataInitializer(parser: { parse: (val: unknown) => unknown }): void;

  tryInitialize(init: { data: unknown } | undefined): unknown;

  canDefaultInitialize(): boolean;

  hasData(): boolean;

  setRelationshipHasNoData(): void;
}

export const EntityMixin =
  <
    Archetype,
    Entity extends IEntity<Archetype, Entity, Pair>,
    Pair extends IPair<Archetype, Entity, Pair>,
  >() =>
  <TBase extends MixinBase>(Base: TBase) => {
    const Derived = class
      extends Base
      implements IEntity<Archetype, Entity, Pair>
    {
      _initializer?: Initializer | undefined;

      addDataInitializer(parser: { parse: (val: unknown) => unknown }): void {
        this._initializer = (() => {
          if (parser === undefined) return undefined;

          const canDefaultInitialize = (() => {
            try {
              parser.parse(undefined);
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
              return parser.parse(undefined);
            }
            try {
              return parser.parse(val.data);
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

    return Derived;
  };

export interface IPair<
  Archetype,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair extends IPair<Archetype, Entity, Pair>,
> {
  tryInitialize(init: { data: unknown } | undefined): unknown;

  canDefaultInitialize(): boolean;

  hasData(): boolean;
}

export const PairMixin =
  <
    Archetype,
    Entity extends IEntity<Archetype, Entity, Pair>,
    Pair extends IPair<Archetype, Entity, Pair>,
  >() =>
  <TBase extends MixinBase<{ relationship: Entity; target: Entity }>>(
    Base: TBase,
  ) => {
    const Derived = class
      extends Base
      implements IPair<Archetype, Entity, Pair>
    {
      _initializer?: Initializer = (() => {
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

    return Derived;
  };
