import {
  DataInitializeEntityMixin,
  DataInitializePairMixin,
  IDataInitializeEntity,
  IDataInitializePair,
} from "./DataInitializer";
import {
  HookArchetypeMixin,
  HookEntityMixin,
  HookPairMixin,
  IHookArchetype,
  IHookEntity,
  IHookPair,
} from "./Hooks";
import {
  IStorageArchetype,
  IStorageEntity,
  IStoragePair,
  StorageArchetypeMixin,
  StorageEntityMixin,
  StoragePairMixin,
} from "./Storage";

const EntityBase: new (
  o: object,
) => IStorageEntity<Archetype, Entity, Pair> &
  IHookEntity<Archetype, Entity, Pair> &
  IDataInitializeEntity<Archetype, Entity, Pair> = //
  DataInitializeEntityMixin<Archetype, Entity, Pair>()(
    HookEntityMixin<Archetype, Entity, Pair>()(
      StorageEntityMixin<Archetype, Entity, Pair>()(class {}),
    ),
  );

const ArchetypeBase: new (o: {
  components: ReadonlySet<Entity | Pair>;
}) => IStorageArchetype<Archetype, Entity, Pair> &
  IHookArchetype<Archetype, Entity, Pair> = //
  HookArchetypeMixin<Archetype, Entity, Pair>()(
    StorageArchetypeMixin<Archetype, Entity, Pair>()(class {}),
  );

const PairBase: new (o: {
  relationship: Entity;
  target: Entity;
}) => IHookPair<Archetype, Entity, Pair> &
  IStoragePair<Archetype, Entity, Pair> &
  IDataInitializePair<Archetype, Entity, Pair> = //
  DataInitializePairMixin<Archetype, Entity, Pair>()(
    HookPairMixin<Archetype, Entity, Pair>()(
      StoragePairMixin<Archetype, Entity, Pair>()(class {}),
    ),
  );

export class Archetype extends ArchetypeBase {}
export class Entity extends EntityBase {
  name?: string;
}
export class Pair extends PairBase {}
export type Id = Entity | Pair;
