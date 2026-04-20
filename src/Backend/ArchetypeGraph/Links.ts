import { ILogger } from "../ArchetypeGraph/ILogger";

interface IArchetype<Archetype extends IArchetype<Archetype, Id>, Id> {
  links: Links<Archetype, Id>;
}

export class Links<Archetype extends IArchetype<Archetype, Id>, Id> {
  archetype: Archetype;

  constructor(archetype: Archetype) {
    this.archetype = archetype;
  }

  private forAdd = new Map<Id, NewLink<Id, Archetype>>();
  private forRemove = new Map<Id, NewLink<Id, Archetype>>();

  private targetingThis = new Set<NewLink<Id, Archetype>>();

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
    return link;
  }

  private remove(type: LinkType, id: Id) {
    if (type === LinkType.Add) {
      this.forAdd.delete(id);
    }
    if (type === LinkType.Remove) {
      this.forRemove.delete(id);
    }
  }

  detachLinks(logger: ILogger) {
    for (const link of this.targetingThis) {
      link.source.links.remove(link.type, link.component);
      logger.deleteLink(link);
    }
    for (const link of this.forAdd.values()) {
      link.target.links.targetingThis.delete(link);
      logger.deleteLink(link);
    }
    for (const link of this.forRemove.values()) {
      link.target.links.targetingThis.delete(link);
      logger.deleteLink(link);
    }
    this.targetingThis.clear();
    this.forAdd.clear();
    this.forRemove.clear();
    this.archetype = null as unknown as Archetype;
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
export type NewLink<Id, Archetype extends IArchetype<Archetype, Id>> = {
  component: Id;
  type: LinkType;
  target: Archetype;
  source: Archetype;
};

export enum LinkType {
  Add,
  Remove,
}
