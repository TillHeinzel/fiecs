import { IEntity, IPair } from "./IEntity";
import { Links } from "./Links";

export interface IArchetype<
  Archetype extends IArchetype<Archetype, Entity, Pair>,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair extends IPair<Archetype, Entity, Pair>,
> {
  readonly components: ReadonlySet<Entity | Pair>;
  entities: Set<Entity>;

  readonly links: Links<Archetype, Entity | Pair>;

  detachConnections(): void;
}
