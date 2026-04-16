import { MergeCtor, MixinBase } from "#/mixins/mixins";

import { IStorageArchetype } from "./IArchetype";
import { IStoragePair } from "./IPair";
import { RelationshipWildcard, WildcardTarget } from "./Wildcard";

export interface IStorageEntity<
  Archetype extends IStorageArchetype<Archetype, Entity, Pair>,
  Entity extends IStorageEntity<Archetype, Entity, Pair>,
  Pair extends IStoragePair<Archetype, Entity, Pair>,
> {
  archetype?: Archetype;
  componentData: Map<Entity | Pair, unknown>;

  // [this, *]
  relationshipWildcard?: RelationshipWildcard<Archetype, Entity, Pair>;
  // [*, this]
  wildcardTarget?: WildcardTarget<Archetype, Entity, Pair>;

  removeBacklink(archetype: Archetype): void;
  getBacklinks(): IteratorObject<Archetype>;
  addBacklink(archetype: Archetype): void;

  matches(archetype: Archetype): boolean;

  match(archetype: Archetype): IteratorObject<Entity>;
  matchingArchetypes(): IteratorObject<[Archetype, Set<Entity>]>;

  getRelationshipWildcard(): RelationshipWildcard<Archetype, Entity, Pair>;
  getWildcardTarget(): WildcardTarget<Archetype, Entity, Pair>;
  lookupPairWith(target: Entity): Pair | undefined;

  isPair(): this is Pair;

  isEntity(): this is Entity;

  isAlive(): this is IStorageEntity<Archetype, Entity, Pair> & {
    archetype: Archetype;
  };

  getARelationshipPair(relationship: Entity): Pair | undefined;
  getRelationshipPairs(relationship: Entity): Set<Pair>;
  hasAnyRelationship(relationship: Entity): boolean;

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

      isPair(): this is Pair {
        return false;
      }
      isEntity(): this is Entity {
        return true;
      }

      isAlive(): this is IStorageEntity<Archetype, Entity, Pair> & {
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
      getBacklinks(): IteratorObject<Archetype> {
        return this.backLinksComponent?.values() ?? [][Symbol.iterator]();
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

      getARelationshipPair(relationship: Entity): Pair | undefined {
        if (!this.isAlive()) return undefined;
        return this.archetype.components
          .keys()
          .filter((component) => component.isPair())
          .find((pair) => pair.relationship === relationship);
      }
      getRelationshipPairs(relationship: Entity): Set<Pair> {
        if (!this.isAlive()) return new Set();
        return new Set(
          this.archetype.components
            .keys()
            .filter((component) => component.isPair())
            .filter((pair) => pair.relationship === relationship),
        );
      }
      hasAnyRelationship(relationship: Entity): boolean {
        if (!this.isAlive()) return false;
        return this.archetype.components
          .keys()
          .filter((component) => component.isPair())
          .some((pair) => pair.relationship === relationship);
      }

      isInUseAsComponent(): boolean {
        return (
          (this.backLinksComponent !== undefined &&
            this.backLinksComponent.size > 0) ||
          (this.relationshipWildcard !== undefined &&
            this.relationshipWildcard.hasBacklinks())
        );
      }
    };

    return Derived as MergeCtor<typeof Derived, TBase>;
  };
