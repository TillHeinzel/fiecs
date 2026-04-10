import { Entity, Id } from "./EntityData";
import { Hooks } from "./Hooks";
import { Links } from "./Links";

export class Archetype {
  readonly components: ReadonlySet<Id>;
  entities = new Set<Entity>();

  readonly hooks = new Hooks();
  readonly links = new Links(this);

  constructor(components: ReadonlySet<Id>) {
    this.components = components;
  }

  detachConnections() {
    for (const component of this.components) {
      component.backLinksComponent?.delete(this);
    }

    this.links.detachLinks();
  }
}
