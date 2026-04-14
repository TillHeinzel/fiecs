import { MergeCtor, MixinBase } from "#/mixins/mixins";

import { HookCallback, Hooks, Operation, Phase } from "./Hooks";

export interface IHookEntity<
  Archetype extends IHookArchetype<Archetype, Entity, Pair>,
  Entity extends IHookEntity<Archetype, Entity, Pair>,
  Pair extends IHookPair<Archetype, Entity, Pair>,
> {
  archetype?: Archetype;
  _hooks: Hooks<Entity, Pair>;
  runHooksFor(phase: Phase): { on: (entity: Entity) => void };
  addHook(
    phase: Phase,
    operation: Operation,
    callback: HookCallback<Entity, Pair>,
  ): void;
}

export const HookEntityMixin =
  <
    Archetype extends IHookArchetype<Archetype, Entity, Pair>,
    Entity extends IHookEntity<Archetype, Entity, Pair>,
    Pair extends IHookPair<Archetype, Entity, Pair>,
  >() =>
  <TBase extends MixinBase>(Base: TBase) => {
    const Derived = class
      extends // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Base as any)
      implements IHookEntity<Archetype, Entity, Pair>
    {
      archetype?: Archetype;
      _hooks = new Hooks<Entity, Pair>();

      runHooksFor(phase: Phase): { on: (entity: Entity) => void } {
        return {
          on: (entity: Entity) => {
            this._hooks.run(
              phase,
              Operation.asComponent,
              this as unknown as Entity,
              entity,
            );
            this.archetype?._hooks.run(
              phase,
              Operation.asComponent,
              this as unknown as Entity,
              entity,
            );
          },
        };
      }

      addHook(
        phase: Phase,
        operation: Operation,
        callback: HookCallback<Entity, Pair>,
      ): void {
        this._hooks.add(phase, operation, callback);
      }
    };

    return Derived as unknown as MergeCtor<typeof Derived, TBase>;
  };

export interface IHookArchetype<
  Archetype extends IHookArchetype<Archetype, Entity, Pair>,
  Entity extends IHookEntity<Archetype, Entity, Pair>,
  Pair extends IHookPair<Archetype, Entity, Pair>,
> {
  _hooks: Hooks<Entity, Pair>;
  addHook(
    phase: Phase,
    operation: Operation,
    callback: HookCallback<Entity, Pair>,
  ): void;
}

export const HookArchetypeMixin =
  <
    Archetype extends IHookArchetype<Archetype, Entity, Pair>,
    Entity extends IHookEntity<Archetype, Entity, Pair>,
    Pair extends IHookPair<Archetype, Entity, Pair>,
  >() =>
  <TBase extends MixinBase>(Base: TBase) => {
    const Derived = class
      extends // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Base as any)
      implements IHookArchetype<Archetype, Entity, Pair>
    {
      _hooks = new Hooks<Entity, Pair>();

      addHook(
        phase: Phase,
        operation: Operation,
        callback: HookCallback<Entity, Pair>,
      ): void {
        this._hooks.add(phase, operation, callback);
      }
    };

    return Derived as unknown as MergeCtor<typeof Derived, TBase>;
  };

export interface IHookPair<
  Archetype extends IHookArchetype<Archetype, Entity, Pair>,
  Entity extends IHookEntity<Archetype, Entity, Pair>,
  Pair extends IHookPair<Archetype, Entity, Pair>,
> {
  runHooksFor(phase: Phase): { on: (entity: Entity) => void };
}

export const HookPairMixin =
  <
    Archetype extends IHookArchetype<Archetype, Entity, Pair>,
    Entity extends IHookEntity<Archetype, Entity, Pair>,
    Pair extends IHookPair<Archetype, Entity, Pair>,
  >() =>
  <TBase extends MixinBase<{ relationship: Entity; target: Entity }>>(
    Base: TBase,
  ) => {
    const Derived = class
      extends Base
      implements IHookPair<Archetype, Entity, Pair>
    {
      runHooksFor(phase: Phase) {
        return {
          on: (entity: Entity) => {
            this.relationship.archetype?._hooks.run(
              phase,
              Operation.asRelationship,
              this as unknown as Pair,
              entity,
            );
            this.relationship._hooks.run(
              phase,
              Operation.asRelationship,
              this as unknown as Pair,
              entity,
            );

            this.target.archetype?._hooks.run(
              phase,
              Operation.asTarget,
              this as unknown as Pair,
              entity,
            );
            this.target._hooks.run(
              phase,
              Operation.asTarget,
              this as unknown as Pair,
              entity,
            );
          },
        };
      }
    };

    return Derived as unknown as MergeCtor<typeof Derived, TBase>;
  };
