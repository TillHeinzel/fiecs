import { Archetype } from "./Archetype";
import { Id } from "./EntityData";
import { LinkType } from "./Hooks";

export class Links {
  archetype: Archetype;

  constructor(archetype: Archetype) {
    this.archetype = archetype;
  }

  private forAdd = new Map<Id, NewLink>();
  private forRemove = new Map<Id, NewLink>();

  private targetingThis = new Set<NewLink>();

  count() {
    return this.forAdd.size + this.forRemove.size;
  }

  get(type: LinkType, id: Id): Archetype | undefined {
    if (type === LinkType.Add) {
      return this.forAdd.get(id)?.target;
    }
    if (type === LinkType.Remove) {
      return this.forRemove.get(id)?.target;
    }
    return undefined;
  }

  add(type: LinkType, id: Id, target: Archetype) {
    const link = {
      component: id,
      type,
      target: target,
      source: this.archetype,
    };

    target.links.targetingThis.add(link);

    if (type === LinkType.Add) {
      this.forAdd.set(id, link);
    }
    if (type === LinkType.Remove) {
      this.forRemove.set(id, link);
    }
  }

  remove(type: LinkType, id: Id) {
    if (type === LinkType.Add) {
      this.forAdd.delete(id);
    }
    if (type === LinkType.Remove) {
      this.forRemove.delete(id);
    }
  }

  detachLinks() {
    for (const link of this.targetingThis) {
      link.source.links.remove(link.type, link.component);
    }
    this.targetingThis.clear();
  }
}

export function reverseLinkType(linkType: LinkType): LinkType {
  switch (linkType) {
    case LinkType.Add:
      return LinkType.Remove;
    case LinkType.Remove:
      return LinkType.Add;
  }
}
type NewLink = {
  component: Id;
  type: LinkType;
  target: Archetype;
  source: Archetype;
};
