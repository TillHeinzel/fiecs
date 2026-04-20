export interface ILogger {
  addArchetype(archetype: object): void;
  deleteArchetype(archetype: object): void;
  addLink(link: object): void;
  deleteLink(link: object): void;
  doExpensiveLookup(): void;
}
