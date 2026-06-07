import * as Backend from "./Backend";
import {
  AnyComponent,
  AnySingle,
  Component,
  ComponentDataSchema,
  Entity,
  InferType,
  PairComponent,
  PairTag,
} from "./Ids";
import { Logger } from "./Logger";
import { isComponent, mapIdFromBackend, mapToBackend } from "./mapWithBackend";
import { Query, QueryT } from "./Query";
import {
  DoubleWildcard,
  RelationshipWildcard,
  RelationshipWildcardComponent,
  Wildcard,
  WildcardTarget,
} from "./Wildcard";

export class World {
  private backend = new Backend.Backend();

  builtin = (() => {
    const traits = this.backend.builtin;

    return Object.fromEntries(
      Object.entries(traits).map(([key, value]) => [
        key,
        new Entity(value, this.backend),
      ]),
    ) as {
      [Property in keyof typeof traits]: Entity;
    };
  })();

  wildcard: Wildcard = { data: this.backend.wildcard };

  private logger?: Logger;

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

  entity(name?: string) {
    return new Entity(this.backend.entity(name), this.backend);
  }

  tag(name?: string) {
    return new Entity(this.backend.tag(name), this.backend);
  }

  component<T extends ComponentDataSchema>(schema: T) {
    return new Component<T>(this.backend.component(schema), this.backend);
  }

  pair(relationship: Wildcard, target: Wildcard): DoubleWildcard;
  pair(relationship: Entity, target: Wildcard): RelationshipWildcard;
  pair<T extends ComponentDataSchema>(
    relationship: Component<T>,
    target: Wildcard,
  ): RelationshipWildcardComponent<T>;
  pair(relationship: Wildcard, target: Entity): WildcardTarget;
  pair<T1 extends ComponentDataSchema, T2 extends ComponentDataSchema>(
    relationship: Component<T1>,
    target: Component<T2>,
  ): PairComponent<T1>;
  pair<T extends ComponentDataSchema>(
    relationship: Entity,
    target: Component<T>,
  ): PairComponent<T>;
  pair<T extends ComponentDataSchema>(
    relationship: Component<T>,
    target: Entity,
  ): PairComponent<T>;
  pair(relationship: Entity, target: Entity): PairTag;
  pair(first: AnyComponent | Wildcard, second: AnyComponent | Wildcard) {
    if (isComponent(first)) {
      this.backend.checkValid(first.data);
    }

    const backendObject = mapToBackend([first, second], this.backend);

    if (backendObject instanceof Backend.Pair) {
      return mapIdFromBackend(backendObject, this.backend);
    } else if (Backend.isDoubleWildcard(backendObject)) {
      return { data: backendObject } as DoubleWildcard;
    } else if (Backend.isRelationshipWildcard(backendObject)) {
      if (backendObject.relationship.hasData()) {
        return new RelationshipWildcardComponent(backendObject, this.backend);
      }
      return new RelationshipWildcard(backendObject, this.backend);
    } else if (Backend.isWildcardTarget(backendObject)) {
      return new WildcardTarget(backendObject, this.backend);
    }

    throw new Error("Invalid arguments for pair");
  }

  lookupEntity(name: string) {
    const entityData = this.backend.lookupEntity(name);
    return entityData ? new Entity(entityData, this.backend) : undefined;
  }

  removeFromAll(component: AnySingle): void;
  removeFromAll(
    component: AnyComponent | Wildcard,
    target: AnyComponent | Wildcard,
  ): void;
  removeFromAll(first: AnySingle, second?: AnyComponent | Wildcard) {
    this.backend.removeFromAll(mapToBackend([first, second], this.backend));
  }

  destructAllWith(component: AnySingle): void;
  destructAllWith(
    component: AnyComponent | Wildcard,
    target: AnyComponent | Wildcard,
  ): void;
  destructAllWith(first: AnySingle, second?: AnyComponent | Wildcard) {
    this.backend.destructAllWith(mapToBackend([first, second], this.backend));
  }

  set<T extends ComponentDataSchema>(
    component: Component<T>,
    newVal: InferType<T>,
  ): void {
    this.backend.add(component.data, this.builtin.Singleton.data);
    this.backend.set(component.data, component.data, newVal);
  }

  query<T extends QueryT>(queryO: T) {
    return new Query<T>(this.backend.makeQuery(queryO.data), this.backend);
  }

  _debugBackendOperationIsDirty() {
    // @ts-expect-error // exposing for testing purposes, not part of public API
    return this.backend.operation.isDirty();
  }
}
