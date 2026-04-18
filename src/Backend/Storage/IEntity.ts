import { MergeCtor, MixinBase } from "#/Utility/mixins";

import { IStorageArchetype } from "./IArchetype";
import { IStoragePair } from "./IPair";
import { RelationshipWildcard, WildcardTarget } from "./Wildcard";

export interface IStorageEntity<
  Archetype extends IStorageArchetype<Archetype, Entity, Pair>,
  Entity extends IStorageEntity<Archetype, Entity, Pair>,
  Pair extends IStoragePair<Archetype, Entity, Pair>,
> {
  readonly archetype?: Archetype;

  moveToArchetype(
    newArchetype: Archetype,
    removedComponents: ReadonlySet<Entity | Pair>,
  ): void;

  destruct(): void;

  get(id: Entity | Pair): unknown;
  set(id: Entity | Pair, value: unknown): void;

  removeBacklink(archetype: Archetype): void;
  addBacklink(archetype: Archetype): void;

  matches(archetype: Archetype): boolean;

  match(archetype: Archetype): IteratorObject<Entity>;
  matchingArchetypes(): IteratorObject<[Archetype, Set<Entity>]>;

  getRelationshipWildcard(): RelationshipWildcard<Archetype, Entity, Pair>;
  getWildcardTarget(): WildcardTarget<Archetype, Entity, Pair>;

  isPair(): this is Pair;

  isEntity(): this is Entity;

  isAlive(): this is Entity & {
    archetype: Archetype;
  };

  lookupPairWith(target: Entity): Pair | undefined;
  isInUseAsComponent(): boolean;
}

export const StorageEntityMixin =
  <
    Archetype extends IStorageArchetype<Archetype, Entity, Pair>,
    Entity extends IStorageEntity<Archetype, Entity, Pair>,
    Pair extends IStoragePair<Archetype, Entity, Pair>,
  >() =>
  <TBase extends MixinBase>(Base: TBase) => {
    const Derived = class StorageEntity
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      extends (Base as any)
      implements IStorageEntity<Archetype, Entity, Pair>
    {
      archetype?: Archetype;
      componentData: Map<Entity | Pair, unknown> = new Map();

      backLinksComponent?: Set<Archetype> | undefined;

      relationshipWildcard?: RelationshipWildcard<Archetype, Entity, Pair>;
      wildcardTarget?: WildcardTarget<Archetype, Entity, Pair>;

      constructor(props: object) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        super(props);
      }

      moveToArchetype(
        newArchetype: Archetype,
        removedComponents: ReadonlySet<Entity | Pair> = new Set(),
      ) {
        this.archetype?.entities.delete(this as unknown as Entity);
        newArchetype.entities.add(this as unknown as Entity);
        this.archetype = newArchetype;
        removedComponents.forEach((component) =>
          this.componentData.delete(component),
        );
      }

      destruct(): void {
        this.archetype?.entities.delete(this as unknown as Entity);
        this.archetype = undefined;
        this.componentData.clear();
      }

      get(id: Entity | Pair): unknown {
        return this.componentData.get(id);
      }
      set(id: Entity | Pair, value: unknown): void {
        this.componentData.set(id, value);
      }

      isPair(): this is Pair {
        return false;
      }
      isEntity(): this is Entity {
        return true;
      }

      isAlive(): this is Entity & {
        archetype: Archetype;
      } {
        return this.archetype !== undefined;
      }

      matches(archetype: Archetype): boolean {
        return this.backLinksComponent?.has(archetype) ?? false;
      }

      match(archetype: Archetype): IteratorObject<Entity> {
        return archetype.components
          .keys()
          .filter((component) => component.isEntity())
          .filter((component) => component === (this as unknown as Entity));
      }

      matchingArchetypes(): IteratorObject<[Archetype, Set<Entity>]> {
        if (!this.backLinksComponent) return [][Symbol.iterator]();
        return this.backLinksComponent
          .keys()
          .map((archetype) => [
            archetype,
            new Set<Entity>([this as unknown as Entity]),
          ]);
      }

      removeBacklink(archetype: Archetype): void {
        this.backLinksComponent?.delete(archetype);
      }
      addBacklink(archetype: Archetype): void {
        if (!this.backLinksComponent) {
          this.backLinksComponent = new Set();
        }
        this.backLinksComponent.add(archetype);
      }

      getRelationshipWildcard(): RelationshipWildcard<Archetype, Entity, Pair> {
        if (!this.relationshipWildcard) {
          this.relationshipWildcard = new RelationshipWildcard(
            this as unknown as Entity,
          );
        }
        return this.relationshipWildcard;
      }
      getWildcardTarget(): WildcardTarget<Archetype, Entity, Pair> {
        if (!this.wildcardTarget) {
          this.wildcardTarget = new WildcardTarget(this as unknown as Entity);
        }
        return this.wildcardTarget;
      }

      lookupPairWith(target: Entity): Pair | undefined {
        return this.relationshipWildcard?.lookupTarget(target);
      }

      isInUseAsComponent(): boolean {
        return (
          (this.backLinksComponent !== undefined &&
            this.backLinksComponent.size > 0) ||
          (this.relationshipWildcard !== undefined &&
            this.relationshipWildcard.hasPairs())
        );
      }
    };

    return Derived as MergeCtor<typeof Derived, TBase>;
  };
