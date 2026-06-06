interface ILogger {
    addArchetype(archetype: object): void;
    deleteArchetype(archetype: object): void;
    addLink(link: object): void;
    deleteLink(link: object): void;
    doExpensiveLookup(): void;
}

interface IArchetype$3<Archetype extends IArchetype$3<Archetype, Id>, Id> {
    links: Links<Archetype, Id>;
}
declare class Links<Archetype extends IArchetype$3<Archetype, Id>, Id> {
    archetype: Archetype;
    constructor(archetype: Archetype);
    private forAdd;
    private forRemove;
    private targetingThis;
    count(): number;
    get(type: LinkType, id: Id): Archetype | undefined;
    add(type: LinkType, id: Id, target: Archetype): {
        component: Id;
        type: LinkType;
        target: Archetype;
        source: Archetype;
    };
    private remove;
    detachLinks(logger: ILogger): void;
}
declare enum LinkType {
    Add = 0,
    Remove = 1
}

interface IArchetypeIn<Archetype extends IArchetype$2<Archetype, Entity, Pair>, Entity extends IEntity$4<Archetype, Entity, Pair>, Pair> {
    readonly components: ReadonlySet<Entity | Pair>;
}
interface IArchetype$2<Archetype extends IArchetype$2<Archetype, Entity, Pair>, Entity extends IEntity$4<Archetype, Entity, Pair>, Pair> extends IArchetypeIn<Archetype, Entity, Pair> {
    entities: Set<Entity>;
    readonly links: Links<Archetype, Entity | Pair>;
}
interface IEntity$4<Archetype extends IArchetype$2<Archetype, Entity, Pair>, Entity extends IEntity$4<Archetype, Entity, Pair>, Pair> {
    readonly archetype?: Archetype;
    destruct(): void;
    get(id: Entity | Pair): unknown;
    set(id: Entity | Pair, value: unknown): void;
    moveToArchetype(newArchetype: Archetype, removedComponents: ReadonlySet<Entity | Pair>): void;
    isAlive(): this is Entity & {
        archetype: Archetype;
    };
}

interface IPairIn<Archetype extends IArchetype$1<Archetype, Entity, Pair>, Entity extends IEntity$3<Archetype, Entity, Pair>, Pair extends IPair$3<Archetype, Entity, Pair>> {
    relationship: Entity;
    target: Entity;
    isPair(): this is Pair;
    isEntity(): this is Entity;
}
interface IPair$3<Archetype extends IArchetype$1<Archetype, Entity, Pair>, Entity extends IEntity$3<Archetype, Entity, Pair>, Pair extends IPair$3<Archetype, Entity, Pair>> extends IPairIn<Archetype, Entity, Pair>, ArchetypeMatcher<Archetype, Entity, Pair, Pair> {
    removeBacklink(archetype: Archetype): void;
    addBacklink(archetype: Archetype): void;
}

interface IArchetype$1<Archetype extends IArchetype$1<Archetype, Entity, Pair>, Entity extends IEntity$3<Archetype, Entity, Pair>, Pair extends IPair$3<Archetype, Entity, Pair>> {
    readonly components: ReadonlySet<Entity | Pair>;
}

declare abstract class BacklinkQueryable<Archetype extends IArchetype$1<Archetype, Entity, Pair>, Entity extends IEntity$3<Archetype, Entity, Pair>, Pair extends IPair$3<Archetype, Entity, Pair>, T extends Entity | Pair> implements ArchetypeMatcher<Archetype, Entity, Pair, T> {
    protected backlinks: Map<Archetype, Set<T>>;
    protected abstract checkMatch(archetype: Archetype): IteratorObject<T>;
    addBacklinkIfMatches(archetype: Archetype): void;
    removeBacklink(archetype: Archetype): void;
    matchingArchetypes(): IteratorObject<Archetype>;
    matches(archetype: Archetype): boolean;
    match(archetype: Archetype): IteratorObject<T>;
}
declare class Wildcard$2<Archetype extends IArchetype$1<Archetype, Entity, Pair>, Entity extends IEntity$3<Archetype, Entity, Pair>, Pair extends IPair$3<Archetype, Entity, Pair>> extends BacklinkQueryable<Archetype, Entity, Pair, Entity> {
    _wildcardBrand: undefined;
    protected checkMatch(archetype: Archetype): IteratorObject<Entity, unknown, unknown>;
}
declare class DoubleWildcard$2<Archetype extends IArchetype$1<Archetype, Entity, Pair>, Entity extends IEntity$3<Archetype, Entity, Pair>, Pair extends IPair$3<Archetype, Entity, Pair>> extends BacklinkQueryable<Archetype, Entity, Pair, Pair> {
    _doubleWildcardBrand: undefined;
    protected checkMatch(archetype: Archetype): IteratorObject<Pair, unknown, unknown>;
}
declare class RelationshipWildcard$2<Archetype extends IArchetype$1<Archetype, Entity, Pair>, Entity extends IEntity$3<Archetype, Entity, Pair>, Pair extends IPair$3<Archetype, Entity, Pair>> extends BacklinkQueryable<Archetype, Entity, Pair, Pair> {
    _relationshipWildcardBrand: undefined;
    readonly relationship: Entity;
    constructor(relationship: Entity);
    protected checkMatch(archetype: Archetype): IteratorObject<Pair>;
}
declare class WildcardTarget$2<Archetype extends IArchetype$1<Archetype, Entity, Pair>, Entity extends IEntity$3<Archetype, Entity, Pair>, Pair extends IPair$3<Archetype, Entity, Pair>> extends BacklinkQueryable<Archetype, Entity, Pair, Pair> {
    _wildcardTargetBrand: undefined;
    target: Entity;
    constructor(target: Entity);
    protected checkMatch(archetype: Archetype): IteratorObject<Pair, unknown, unknown>;
}

declare class ComponentIndex<Archetype extends IArchetype$1<Archetype, Entity, Pair>, Entity extends IEntity$3<Archetype, Entity, Pair>, Pair extends IPair$3<Archetype, Entity, Pair>> {
    wildcard: Wildcard$2<Archetype, Entity, Pair>;
    doubleWildcard: DoubleWildcard$2<Archetype, Entity, Pair>;
    pairsManager: {
        lookupPair: (relationship: Entity, target: Entity) => Pair | undefined;
    };
    constructor(pairsManager: {
        lookupPair: (relationship: Entity, target: Entity) => Pair | undefined;
    });
    addArchetype(archetype: Archetype): void;
    removeArchetype(archetype: Archetype): void;
}
interface ArchetypeMatcher<Archetype extends IArchetype$1<Archetype, Entity, Pair>, Entity extends IEntity$3<Archetype, Entity, Pair>, Pair extends IPair$3<Archetype, Entity, Pair>, T extends Entity | Pair> {
    matches(archetype: Archetype): boolean;
    match(archetype: Archetype): IteratorObject<T>;
    matchingArchetypes(): IteratorObject<Archetype>;
}

interface IEntityIn<Archetype extends IArchetype$1<Archetype, Entity, Pair>, Entity extends IEntity$3<Archetype, Entity, Pair>, Pair extends IPair$3<Archetype, Entity, Pair>> {
    isPair(): this is Pair;
    isEntity(): this is Entity;
}
interface IEntity$3<Archetype extends IArchetype$1<Archetype, Entity, Pair>, Entity extends IEntity$3<Archetype, Entity, Pair>, Pair extends IPair$3<Archetype, Entity, Pair>> extends IEntityIn<Archetype, Entity, Pair>, ArchetypeMatcher<Archetype, Entity, Pair, Entity> {
    removeBacklink(archetype: Archetype): void;
    addBacklink(archetype: Archetype): void;
    getRelationshipWildcard(): RelationshipWildcard$2<Archetype, Entity, Pair>;
    getWildcardTarget(): WildcardTarget$2<Archetype, Entity, Pair>;
}

type Initializer = {
    canDefaultInitialize: boolean;
    tryInitialize: (val?: {
        data: unknown;
    }) => unknown;
};

interface IEntity$2<Archetype, Entity extends IEntity$2<Archetype, Entity, Pair>, Pair extends IPair$2<Archetype, Entity, Pair>> {
    _relationshipHasNoData?: boolean;
    _initializer?: Initializer;
    addDataInitializer(parser: {
        parse: (val: unknown) => unknown;
    }): void;
    tryInitialize(init: {
        data: unknown;
    } | undefined): unknown;
    canDefaultInitialize(): boolean;
    hasData(): boolean;
    setRelationshipHasNoData(): void;
}
interface IPair$2<Archetype, Entity extends IEntity$2<Archetype, Entity, Pair>, Pair extends IPair$2<Archetype, Entity, Pair>> {
    tryInitialize(init: {
        data: unknown;
    } | undefined): unknown;
    canDefaultInitialize(): boolean;
    hasData(): boolean;
}

declare class Hooks<Entity, Pair> {
    private phases;
    add(phase: Phase, operation: Operation, hook: HookCallback$1<Entity, Pair>): void;
    run(phase: Phase, operation: Operation, id: Entity | Pair, entity: Entity): Set<unknown> | undefined;
}
type HookCallback$1<Entity, Pair> = (id: Entity | Pair, entity: Entity) => void;
declare enum Phase {
    preAdd = 0,
    postAdd = 1,
    postRemove = 2
}
declare enum Operation {
    asComponent = 0,
    asRelationship = 1,
    asTarget = 2
}

interface IEntity$1<Archetype extends IArchetype<Archetype, Entity, Pair>, Entity extends IEntity$1<Archetype, Entity, Pair>, Pair extends IPair$1<Archetype, Entity, Pair>> {
    archetype?: Archetype;
    _hooks: Hooks<Entity, Pair>;
    runHooksFor(phase: Phase): {
        on: (entity: Entity) => void;
    };
    addHook(phase: Phase, operation: Operation, callback: HookCallback$1<Entity, Pair>): void;
}
interface IArchetype<Archetype extends IArchetype<Archetype, Entity, Pair>, Entity extends IEntity$1<Archetype, Entity, Pair>, Pair extends IPair$1<Archetype, Entity, Pair>> {
    readonly _hooks: Hooks<Entity, Pair>;
    addHook(phase: Phase, operation: Operation, callback: HookCallback$1<Entity, Pair>): void;
}
interface IPair$1<Archetype extends IArchetype<Archetype, Entity, Pair>, Entity extends IEntity$1<Archetype, Entity, Pair>, Pair extends IPair$1<Archetype, Entity, Pair>> {
    runHooksFor(phase: Phase): {
        on: (entity: Entity) => void;
    };
}

interface IEntity<Archetype, Entity extends IEntity<Archetype, Entity, Pair>, Pair extends IPair<Archetype, Entity, Pair>> {
    _addPairBacklink(pair: Pair): void;
    _lookupPairWith(target: Entity): Pair | undefined;
}
interface IPair<Archetype, Entity extends IEntity<Archetype, Entity, Pair>, Pair extends IPair<Archetype, Entity, Pair>> {
    relationship: Entity;
    target: Entity;
}

declare const EntitySuper: new (o: object) => IEntity<Archetype$1, Entity$2, Pair$1> & IEntity$3<Archetype$1, Entity$2, Pair$1> & IEntity$1<Archetype$1, Entity$2, Pair$1> & IEntity$2<Archetype$1, Entity$2, Pair$1> & IEntity$4<Archetype$1, Entity$2, Pair$1>;
declare const ArchetypeSuper: new (o: {
    components: ReadonlySet<Entity$2 | Pair$1>;
}) => IArchetype<Archetype$1, Entity$2, Pair$1> & IArchetype$2<Archetype$1, Entity$2, Pair$1>;
declare const PairSuper: new (o: {
    relationship: Entity$2;
    target: Entity$2;
}) => IPair<Archetype$1, Entity$2, Pair$1> & IPair$1<Archetype$1, Entity$2, Pair$1> & IPair$3<Archetype$1, Entity$2, Pair$1> & IPair$2<Archetype$1, Entity$2, Pair$1>;
declare class Archetype$1 extends ArchetypeSuper {
}
declare class Entity$2 extends EntitySuper {
    name?: string;
}
declare class Pair$1 extends PairSuper {
}

type Wildcard$1 = Wildcard$2<Archetype$1, Entity$2, Pair$1>;
type DoubleWildcard$1 = DoubleWildcard$2<Archetype$1, Entity$2, Pair$1>;
type RelationshipWildcard$1 = RelationshipWildcard$2<Archetype$1, Entity$2, Pair$1>;
type WildcardTarget$1 = WildcardTarget$2<Archetype$1, Entity$2, Pair$1>;
type Query = {
    matches(archetype: Archetype$1): boolean;
    match(archetype: Archetype$1): Set<Entity$2 | Pair$1>;
    matchingArchetypes(): IteratorObject<Archetype$1>;
    archetypesWithMatches(): IteratorObject<[Archetype$1, Set<Entity$2 | Pair$1>]>;
    archetypeWithMatches(): Map<Archetype$1, Array<Array<Entity$2 | Pair$1>>>;
};
declare class QueryBuilder {
    componentIndex: ComponentIndex<Archetype$1, Entity$2, Pair$1>;
    constructor(componentIndex: ComponentIndex<Archetype$1, Entity$2, Pair$1>);
    build(arg: QueryT$1): Query;
    private buildBit;
}
type QueryT$1 = SingleTerm | And$1 | Or$1;
declare class And$1 {
    _andBrand: undefined;
    ands: QueryT$1[];
    constructor(ands: QueryT$1[]);
}
declare class Or$1 {
    _orBrand: undefined;
    ors: QueryT$1[];
    constructor(ors: QueryT$1[]);
}
type SingleTerm = Wildcard$1 | Entity$2 | Pair$1 | DoubleWildcard$1 | RelationshipWildcard$1 | WildcardTarget$1;

declare class Backend {
    private nameMap;
    private entities;
    private components;
    private pairsManager;
    private componentIndex;
    queryBuilder: QueryBuilder;
    private archetypeGraph;
    private operation;
    wildcard: Wildcard$2<Archetype$1, Entity$2, Pair$1>;
    doubleWildcard: DoubleWildcard$2<Archetype$1, Entity$2, Pair$1>;
    makeQuery: (arg: QueryT$1) => Query;
    constructor();
    private createEntity;
    startStatistics(logger: ILogger): void;
    stopStatistics(): void;
    entity(name?: string): Entity$2;
    tag(name?: string): Entity$2;
    component(parse: {
        parse: (val: unknown) => unknown;
    }): Entity$2;
    pair(relationship: Entity$2, target: Entity$2): Pair$1;
    relationshipWildcard(relationship: Entity$2): RelationshipWildcard$2<Archetype$1, Entity$2, Pair$1>;
    wildcardTarget(target: Entity$2): WildcardTarget$2<Archetype$1, Entity$2, Pair$1>;
    initializer(component: Entity$2): unknown;
    getName(entity: Entity$2): string | undefined;
    setName(entity: Entity$2, name: string): void;
    getDisplayName(id: Entity$2 | Pair$1): string;
    lookupEntity(name: string): Entity$2 | undefined;
    isAlive(entity: Entity$2): entity is Entity$2 & {
        archetype: Archetype$1;
    };
    destruct(entity: Entity$2): void;
    removeFromAll(term: SingleTerm): void;
    destructAllWith(x: SingleTerm): void;
    clear(entity: Entity$2): void;
    has(entity: Entity$2, term: SingleTerm): boolean;
    remove(entity: Entity$2, removeTerm: SingleTerm): void;
    getComponents(entity: Entity$2, term?: SingleTerm): IteratorObject<Entity$2> | IteratorObject<Pair$1> | IteratorObject<Entity$2 | Pair$1>;
    findComponent(entity: Entity$2, term?: SingleTerm): Entity$2 | Pair$1 | undefined;
    add(entity: Entity$2, id: Entity$2 | Pair$1, initialData?: {
        data: unknown;
    } | undefined): void;
    set(entity: Entity$2, id: Entity$2 | Pair$1, newVal: unknown): void;
    get(entity: Entity$2, id: Entity$2 | Pair$1): unknown;
    checkValid(id: Entity$2 | Pair$1): void;
    canDefaultInitialize(id: Entity$2 | Pair$1): boolean;
    addHook(phase: Phase, operation: Operation, query: Query, callback: HookCallback): void;
    addHookToEntity(phase: Phase, operation: Operation, entity: Entity$2, callback: HookCallback): void;
}
type HookCallback = HookCallback$1<Entity$2, Pair$1>;

declare class BackendHandleBase {
    protected backend: Backend;
    constructor(backend: Backend);
    protected mapIdFromBackend(component: Entity$2 | Pair$1): Tag | PairTag | Component<ComponentDataSchema> | PairComponent<ComponentDataSchema>;
    protected mapToBackend([first, second]: [
        AnySingle,
        AnyPairPart | undefined
    ]): Entity$2 | Pair$1 | Wildcard$1 | DoubleWildcard$1 | RelationshipWildcard$1 | WildcardTarget$1;
}
declare class World extends BackendHandleBase {
    constructor();
    builtin: {
        Trait: Entity$1;
        Relationship: Entity$1;
        RelationshipHasNoData: Entity$1;
        With: Entity$1;
        Acyclic: Entity$1;
        Singleton: Entity$1;
        Symmetric: Entity$1;
        Target: Entity$1;
        TargetMustBeDefaultInitializable: Entity$1;
        Exclusive: Entity$1;
    };
    wildcard: Wildcard;
    private logger?;
    startStatistics(): void;
    stopStatistics(): void;
    getStatistics(): {
        expensiveLookups: number;
        archetypesAdded: number;
        archetypesDeleted: number;
        linksAdded: number;
        linksDeleted: number;
        liveArchetypes: number;
        liveLinks: number;
    };
    entity(name?: string): Entity$1;
    tag(name?: string): Entity$1;
    component<T extends ComponentDataSchema>(schema: T): Component<T>;
    pair(relationship: Wildcard, target: Wildcard): DoubleWildcard;
    pair(relationship: Entity$1, target: Wildcard): RelationshipWildcard;
    pair<T extends ComponentDataSchema>(relationship: Component<T>, target: Wildcard): RelationshipWildcardComponent<T>;
    pair(relationship: Wildcard, target: Entity$1): WildcardTarget;
    pair<T1 extends ComponentDataSchema, T2 extends ComponentDataSchema>(relationship: Component<T1>, target: Component<T2>): PairComponent<T1>;
    pair<T extends ComponentDataSchema>(relationship: Entity$1, target: Component<T>): PairComponent<T>;
    pair<T extends ComponentDataSchema>(relationship: Component<T>, target: Entity$1): PairComponent<T>;
    pair(relationship: Entity$1, target: Entity$1): PairTag;
    lookupEntity(name: string): Entity$1 | undefined;
    removeFromAll(component: AnySingle): void;
    removeFromAll(component: AnyComponent | Wildcard, target: AnyComponent | Wildcard): void;
    destructAllWith(component: AnySingle): void;
    destructAllWith(component: AnyComponent | Wildcard, target: AnyComponent | Wildcard): void;
    set<T extends ComponentDataSchema>(component: Component<T>, newVal: InferType<T>): void;
    query<T extends QueryT>(queryO: T): {
        matches: () => IteratorObject<{
            entity: Entity$1;
            match: MatchType<T>;
        }, undefined, unknown>;
    };
    _debugBackendOperationIsDirty(): boolean;
}
type QueryT = Tag | Component<ComponentDataSchema> | PairTag | PairComponent<ComponentDataSchema> | And<unknown[]> | Or<unknown[]> | Wildcard;
type MatchType<T> = T extends Tag ? Boxed<T> : T extends Component<ComponentDataSchema> ? Boxed<T> : T extends PairTag ? Boxed<T> : T extends PairComponent<ComponentDataSchema> ? Boxed<T> : T extends And<infer Ts> ? Flatten<{
    [K in keyof Ts]: MatchType<Ts[K]>;
}> : T extends Or<infer Ts> ? Boxed<{
    [K in keyof Ts]: MatchType<Ts[K]>;
}[number]> : T extends Wildcard ? [unknown] : never;
type Boxed<T> = T extends unknown[] ? T : [T];
type Flatten<T> = T extends [] ? [] : T extends [infer T0] ? [...Flatten<T0>] : T extends [infer T0, ...infer Ts] ? [...Flatten<T0>, ...Flatten<Ts>] : [T];
declare class And<Ts extends unknown[]> {
    _andBrand: undefined;
    data: And$1;
    constructor(data: And$1);
}
declare function and<Ts extends QueryT[]>(...subs: Ts): And<Ts>;
declare class Or<Ts extends unknown[]> {
    _orBrand: undefined;
    data: Or$1;
    constructor(data: Or$1);
}
declare function or<Ts extends QueryT[]>(...subs: Ts): Or<Ts>;
declare class EntityHandleBase extends BackendHandleBase {
    data: Entity$2;
    constructor(data: Entity$2, backend: Backend);
    getName(): string | undefined;
    setName(name: string): this;
    isSameAs(other: AnyId): boolean;
    isAlive(): boolean;
    destruct(): void;
    clear(): this;
    type(): AnyId[];
    has(component: AnySingle): boolean;
    has(relationship: AnyComponent | Wildcard, target: AnyComponent | Wildcard): boolean;
    remove(id: AnySingle): this;
    remove(relationship: AnyComponent | Wildcard, target: AnyComponent | Wildcard): this;
    add(component: AnyId): this;
    add(relationship: AnyComponent, target: AnyComponent): this;
    set<T extends ComponentDataSchema>(component: Component<T>, newVal: InferType<T>): this;
    set<T extends ComponentDataSchema>(explicitRelationship: PairComponent<T>, newVal: InferType<T>): this;
    set<T1 extends ComponentDataSchema, T2 extends ComponentDataSchema>(component: Component<T1>, target: Component<T2>, newVal: InferType<T1>): this;
    set<T extends ComponentDataSchema>(component: Component<T>, target: Entity$1, newVal: InferType<T>): this;
    set<T extends ComponentDataSchema>(component: Entity$1, target: Component<T>, newVal: InferType<T>): this;
    get<T extends AnyWithData>(component: T): InferComponentType<T> | undefined;
    get<T extends Component<ComponentDataSchema>>(component: T, target: Entity$1): InferComponentType<T> | undefined;
    get<T extends Component<ComponentDataSchema>>(component: Entity$1, target: T): InferComponentType<T> | undefined;
    get<T1 extends Component<ComponentDataSchema>, T2 extends Component<ComponentDataSchema>>(component: T1, target: T2): InferComponentType<T1> | undefined;
    components(): IteratorObject<Tag | PairTag>;
    components(first: AnySingle): IteratorObject<Tag>;
    components(first: AnyComponent | Wildcard, second: Wildcard | AnyComponent): IteratorObject<PairTag>;
    findComponent(first?: AnySingle, second?: AnyComponent | Wildcard): Tag | PairTag | Component<ComponentDataSchema> | PairComponent<ComponentDataSchema> | undefined;
}
declare class Entity$1 extends EntityHandleBase {
}
type Tag = Entity$1;
declare class Component<T extends ComponentDataSchema> extends EntityHandleBase {
    getInitializer(): T;
}
declare class PairHandleBase extends BackendHandleBase {
    data: Pair$1;
    constructor(_data: Pair$1, backend: Backend);
    relationship(): Entity$1;
    target(): Entity$1;
    isSameAs(other: AnyId): boolean;
}
declare class PairTag extends PairHandleBase {
    _tagPairBrand: undefined;
}
declare class PairComponent<T extends ComponentDataSchema> extends PairHandleBase {
    _componentPairBrand: undefined;
}
type Wildcard = {
    data: Wildcard$1;
};
type DoubleWildcard = {
    data: DoubleWildcard$1;
};
declare class RelationshipWildcard extends BackendHandleBase {
    _relationshipWildcardBrand: undefined;
    data: RelationshipWildcard$1;
    constructor(data: RelationshipWildcard$1, backend: Backend);
}
declare class RelationshipWildcardComponent<T extends ComponentDataSchema> extends BackendHandleBase {
    _relationshipWildcardComponentBrand: undefined;
    data: RelationshipWildcard$1;
    constructor(data: RelationshipWildcard$1, backend: Backend);
}
declare class WildcardTarget extends BackendHandleBase {
    _wildcardTargetBrand: undefined;
    data: WildcardTarget$1;
    constructor(data: WildcardTarget$1, backend: Backend);
}
type AnyComponent = Tag | Component<ComponentDataSchema>;
type AnyPair = PairTag | PairComponent<ComponentDataSchema>;
type AnyWithData = Component<ComponentDataSchema> | PairComponent<ComponentDataSchema>;
type AnyId = AnyComponent | AnyPair;
type ComponentDataSchema = {
    parse(val: unknown): unknown;
};
type InferType<T extends ComponentDataSchema> = ReturnType<T["parse"]>;
type InferComponentType<T> = T extends Component<infer U> ? InferType<U> : T extends PairComponent<infer U> ? InferType<U> : never;
type AnySingle = AnyId | Wildcard | RelationshipWildcard | WildcardTarget | DoubleWildcard;
type AnyPairPart = AnyComponent | Wildcard;

export { Component, Entity$1 as Entity, PairComponent, PairTag, World, and, or };
export type { Tag };
