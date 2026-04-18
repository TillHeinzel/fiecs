import { IStorageArchetype } from "./IArchetype";
import { IStorageEntity } from "./IEntity";
import { IStoragePair } from "./IPair";

export interface IQueryAble<
  Archetype extends IStorageArchetype<Archetype, Entity, Pair>,
  Entity extends IStorageEntity<Archetype, Entity, Pair>,
  Pair extends IStoragePair<Archetype, Entity, Pair>,
  T,
> {
  matches(archetype: Archetype): boolean;
  match(archetype: Archetype): IteratorObject<T>;
  matchingArchetypes(): IteratorObject<[Archetype, Set<T>]>;
}
