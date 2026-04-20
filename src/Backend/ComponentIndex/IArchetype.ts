import { IEntity } from "./IEntity";
import { IPair } from "./IPair";

export interface IArchetype<
  Archetype extends IArchetype<Archetype, Entity, Pair>,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair extends IPair<Archetype, Entity, Pair>,
> {
  readonly components: ReadonlySet<Entity | Pair>;
}
