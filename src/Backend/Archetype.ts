import { Entity, Id, Pair } from "./EntityData";
import { Hooks } from "./Hooks";
import { IArchetype } from "./Storage/IArchetype";
import { Links } from "./Storage/Links";

export class Archetype implements IArchetype<Archetype, Entity, Pair> {
  readonly components: ReadonlySet<Id>;
  entities = new Set<Entity>();

  readonly links: Links<Archetype, Id> = new Links<Archetype, Id>(this);

  constructor(components: ReadonlySet<Id>) {
    this.components = components;
  }

  detachConnections() {
    for (const component of this.components) {
      component.backLinksComponent?.delete(this);
    }

    this.links.detachLinks();
  }

  readonly hooks = new Hooks();
}
