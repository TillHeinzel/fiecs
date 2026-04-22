import { IArchetype } from "./IArchetype";
import { IEntity } from "./IEntity";
import { IPair } from "./IPair";
import { DoubleWildcard, Wildcard } from "./Wildcard";

export class ComponentIndex<
  Archetype extends IArchetype<Archetype, Entity, Pair>,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair extends IPair<Archetype, Entity, Pair>,
> {
  wildcard = new Wildcard<Archetype, Entity, Pair>();
  doubleWildcard = new DoubleWildcard<Archetype, Entity, Pair>();

  pairsManager: {
    lookupPair: (relationship: Entity, target: Entity) => Pair | undefined;
  };

  constructor(pairsManager: {
    lookupPair: (relationship: Entity, target: Entity) => Pair | undefined;
  }) {
    this.pairsManager = pairsManager;
  }

  addArchetype(archetype: Archetype): void {
    const components = archetype.components;
    this.wildcard.addBacklinkIfMatches(archetype);
    this.doubleWildcard.addBacklinkIfMatches(archetype);
    for (const id of components) {
      id.addBacklink(archetype);
    }
  }

  removeArchetype(archetype: Archetype): void {
    this.wildcard.removeBacklink(archetype);
    this.doubleWildcard.removeBacklink(archetype);
    for (const id of archetype.components) {
      id.removeBacklink(archetype);
    }
  }
}

export interface ArchetypeMatcher<
  Archetype extends IArchetype<Archetype, Entity, Pair>,
  Entity extends IEntity<Archetype, Entity, Pair>,
  Pair extends IPair<Archetype, Entity, Pair>,
  T extends Entity | Pair,
> {
  matches(archetype: Archetype): boolean;
  match(archetype: Archetype): IteratorObject<T>;
  matchingArchetypes(): IteratorObject<Archetype>;
}
