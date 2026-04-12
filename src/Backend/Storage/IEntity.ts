import { IArchetype } from "./IArchetype";

export interface IEntity<
  Archetype extends IArchetype<Archetype, Entity, Pair>,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair extends IPair<Archetype, Entity, Pair>,
> {
  archetype?: Archetype;
  componentData: Map<Entity | Pair, unknown>;
  // archetypes that have this entity as a component
  backLinksComponent?: Set<Archetype>;
  // relationships where this entity is the type
  backLinksRelationship?: Map<Entity, Pair>;
  // relationships where this entity is the target
  backLinksTarget?: Map<Entity, Pair>;
  target: undefined; // to distinguish from Pair
}

export interface IPair<
  Archetype extends IArchetype<Archetype, Entity, Pair>,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair extends IPair<Archetype, Entity, Pair>,
> {
  relationship: Entity;
  target: Entity;
  backLinksComponent: Set<Archetype>;
}

export function isAlive<
  Archetype extends IArchetype<Archetype, Entity, Pair>,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair extends IPair<Archetype, Entity, Pair>,
>(
  entity: IEntity<Archetype, Entity, Pair>,
): entity is IEntity<Archetype, Entity, Pair> & { archetype: Archetype } {
  return entity.archetype !== undefined;
}

export function isPair<
  Archetype extends IArchetype<Archetype, Entity, Pair>,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair extends IPair<Archetype, Entity, Pair>,
>(
  id: IEntity<Archetype, Entity, Pair> | IPair<Archetype, Entity, Pair>,
): id is IPair<Archetype, Entity, Pair> {
  return id.target !== undefined;
}

export function getRelationshipTargets<
  Archetype extends IArchetype<Archetype, Entity, Pair>,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair extends IPair<Archetype, Entity, Pair>,
>(
  entity: IEntity<Archetype, Entity, Pair>,
  relationship: IEntity<Archetype, Entity, Pair>,
): Set<Entity> {
  if (!isAlive(entity)) return new Set();
  return new Set(
    entity.archetype.components
      .keys()
      .filter((component) => isPair(component))
      .filter((pair) => pair.relationship === relationship)
      .map((pair) => pair.target),
  );
}

export function getARelationshipPair<
  Archetype extends IArchetype<Archetype, Entity, Pair>,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair extends IPair<Archetype, Entity, Pair>,
>(entity: Entity, relationship: Entity): Pair | undefined {
  if (!isAlive(entity)) return undefined;
  return entity.archetype.components
    .keys()
    .filter((component) => isPair(component))
    .find((pair) => pair.relationship === relationship);
}

export function getARelationshipTarget<
  Archetype extends IArchetype<Archetype, Entity, Pair>,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair extends IPair<Archetype, Entity, Pair>,
>(entity: Entity, relationship: Entity): Entity | undefined {
  if (!isAlive(entity)) return undefined;
  return entity.archetype.components
    .keys()
    .filter((component) => isPair(component))
    .find((pair) => pair.relationship === relationship)?.target;
}

export function isInUseAsComponent<
  Archetype extends IArchetype<Archetype, Entity, Pair>,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair extends IPair<Archetype, Entity, Pair>,
>(entity: Entity): boolean {
  return (
    (entity.backLinksComponent !== undefined &&
      entity.backLinksComponent.size > 0) ||
    (entity.backLinksRelationship !== undefined &&
      entity.backLinksRelationship.size > 0)
  );
}

export function hasAnyRelationship<
  Archetype extends IArchetype<Archetype, Entity, Pair>,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair extends IPair<Archetype, Entity, Pair>,
>(entity: Entity, relationship: Entity): boolean {
  if (!isAlive(entity)) return false;
  return entity.archetype.components
    .keys()
    .filter((component) => isPair(component))
    .some((pair) => pair.relationship === relationship);
}
