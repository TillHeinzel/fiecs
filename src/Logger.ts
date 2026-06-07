import * as Backend from "./Backend";
import { ObjectGCTracker } from "./Utility/GC.testutility";

export class Logger implements Backend.ILogger {
  private archetypeGCTracker = new ObjectGCTracker();

  archetypesAdded = 0;
  archetypesDeleted = 0;

  liveArchetypes() {
    this.archetypeGCTracker.clearDead();
    return this.archetypeGCTracker.count();
  }

  addArchetype(archetype: object): void {
    this.archetypeGCTracker.add(archetype);
    this.archetypesAdded++;

    archetype = null as unknown as object; // allow GC to collect the archetype if nothing else is referencing it
  }
  deleteArchetype(): void {
    this.archetypesDeleted++;
  }

  liveLinks() {
    this.linkGCTracker.clearDead();
    return this.linkGCTracker.count();
  }

  private linkGCTracker = new ObjectGCTracker();

  linksAdded = 0;
  linksDeleted = 0;

  addLink(link: object): void {
    this.linkGCTracker.add(link);
    this.linksAdded++;
    link = null as unknown as object; // allow GC to collect the link if nothing else is referencing it
  }
  deleteLink(): void {
    this.linksDeleted++;
  }

  expensiveLookups = 0;
  doExpensiveLookup(): void {
    this.expensiveLookups++;
  }
}
