import * as Backend from "#/Backend";

import {
  AnyIndex,
  AnySingleIndex,
  Component,
  Entity,
  isAnySingleId,
  isString,
  Pair,
  Wildcard,
} from "./BasicTypes";
import { Logger } from "./Logger";
import {
  mapEntityFromBackend,
  mapImplicitPairIndexToBackend,
  mapIndexToBackend,
  mapRecordFromBackend,
} from "./mapWithBackend";
import { makeQuery } from "./Query";
import { mapToTerms, QueryTermAble } from "./QueryTerms";

export class World {
  private backend = new Backend.Backend();

  builtin = mapRecordFromBackend(this.backend.builtin, this.backend);

  wildcard = new Wildcard(this.backend.wildcard);

  private logger?: Logger;

  lockTables() {
    this.backend.lockTables();
  }
  unlockTables() {
    this.backend.unlockTables();
  }
  areTablesLocked() {
    return this.backend.tablesLocked;
  }

  startStatistics() {
    this.logger = new Logger();
    this.backend.startStatistics(this.logger);
  }

  stopStatistics() {
    this.backend.stopStatistics();
    this.logger = undefined;
  }

  getStatistics() {
    if (!this.logger) {
      throw new Error("Statistics not started");
    }
    return {
      expensiveLookups: this.logger.expensiveLookups,
      archetypesAdded: this.logger.archetypesAdded,
      archetypesDeleted: this.logger.archetypesDeleted,
      linksAdded: this.logger.linksAdded,
      linksDeleted: this.logger.linksDeleted,
      liveArchetypes: this.logger.liveArchetypes(),
      liveLinks: this.logger.liveLinks(),
    };
  }

  entity(name?: string): Entity {
    return new Entity(this.backend.entity(name), this.backend);
  }

  tag(name?: string): Entity {
    return new Entity(this.backend.tag(name), this.backend);
  }

  component<T extends ComponentDataSchema>(schema: T) {
    return new Component<InferType<T>>(
      this.backend.component(schema),
      this.backend,
    );
  }

  pair<First extends AnySingleIndex, Second extends AnySingleIndex>(
    first: First,
    second: Second,
  ): Pair<First, Second>;
  pair<Second extends AnySingleIndex>(
    first: string,
    second: Second,
  ): Pair<Entity, Second>;
  pair<First extends AnySingleIndex>(
    first: First,
    second: string,
  ): Pair<First, Entity>;
  pair(first: string, second: string): Pair<Entity, Entity>;
  pair<First extends AnySingleIndex, Second extends AnySingleIndex>(
    first: First | string,
    second: Second | string,
  ) {
    const mapIt = <T extends AnySingleIndex>(
      term: T | string,
    ): T | Entity | undefined => {
      if (isString(term)) {
        const lookup = this.backend.lookupEntity(term);
        return lookup ? new Entity(lookup, this.backend) : undefined;
      }

      return term;
    };

    const mappedFirst = mapIt(first);

    if (!mappedFirst) {
      throw new Error(
        `There is no entity called ${JSON.stringify(first)} to create a pair from`,
      );
    }

    const mappedSecond = mapIt(second);

    if (!mappedSecond) {
      throw new Error(
        `There is no entity called ${JSON.stringify(second)} to create a pair from`,
      );
    }

    if (isAnySingleId(mappedFirst)) {
      this.backend.checkValid(mappedFirst.data);
    }
    if (isAnySingleId(mappedSecond)) {
      this.backend.checkValid(mappedSecond.data);
    }

    return new Pair(
      mappedFirst,
      mappedSecond,
      mapImplicitPairIndexToBackend(mappedFirst, mappedSecond, this.backend),
      this.backend,
    );
  }

  lookupEntity(name: string) {
    return mapEntityFromBackend(this.backend.lookupEntity(name), this.backend);
  }

  removeFromAll(term: AnyIndex) {
    this.backend.removeFromAll(mapIndexToBackend(term, this.backend));
  }

  destructAllWith(term: AnyIndex) {
    this.backend.destructAllWith(mapIndexToBackend(term, this.backend));
  }

  set<T>(component: Component<T>, newVal: T): void {
    this.backend.add(component.data, this.builtin.Singleton.data);
    this.backend.set(component.data, component.data, newVal);
  }

  getChildren() {
    return this.backend
      .getRootObjects()
      .map((entity) => new Entity(entity, this.backend));
  }

  query<T extends QueryTermAble, Ts extends QueryTermAble[]>(
    first: T,
    ...terms: Ts
  ) {
    return makeQuery(
      this.backend,
      "noCache",
      mapToTerms([first, ...terms] as const),
    );
  }

  cachedQuery<T extends QueryTermAble, Ts extends QueryTermAble[]>(
    first: T,
    ...terms: Ts
  ) {
    return makeQuery(
      this.backend,
      "cacheAsMuchAsPossible",
      mapToTerms([first, ...terms] as const),
    );
  }

  forceCachedQuery<T extends QueryTermAble, Ts extends QueryTermAble[]>(
    first: T,
    ...terms: Ts
  ) {
    return makeQuery(
      this.backend,
      "requireCaching",
      mapToTerms([first, ...terms] as const),
    );
  }

  _debugBackendOperationIsDirty() {
    // @ts-expect-error // exposing for testing purposes, not part of public API
    return this.backend.operation.isDirty();
  }
}

type ComponentDataSchema = {
  parse(val: unknown): unknown;
};

type InferType<T extends ComponentDataSchema> = ReturnType<T["parse"]>;
