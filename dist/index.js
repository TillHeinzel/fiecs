class Links {
    archetype;
    constructor(archetype) {
        this.archetype = archetype;
    }
    forAdd = new Map();
    forRemove = new Map();
    targetingThis = new Set();
    count() {
        return this.forAdd.size + this.forRemove.size;
    }
    get(type, id) {
        if (type === LinkType.Add) {
            return this.forAdd.get(id)?.target;
        }
        if (type === LinkType.Remove) {
            return this.forRemove.get(id)?.target;
        }
        return undefined;
    }
    add(type, id, target) {
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
    remove(type, id) {
        if (type === LinkType.Add) {
            this.forAdd.delete(id);
        }
        if (type === LinkType.Remove) {
            this.forRemove.delete(id);
        }
    }
    detachLinks(logger) {
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
        this.archetype = null;
    }
}
function reverseLinkType(linkType) {
    switch (linkType) {
        case LinkType.Add:
            return LinkType.Remove;
        case LinkType.Remove:
            return LinkType.Add;
    }
}
var LinkType;
(function (LinkType) {
    LinkType[LinkType["Add"] = 0] = "Add";
    LinkType[LinkType["Remove"] = 1] = "Remove";
})(LinkType || (LinkType = {}));

class ArchetypeGraph {
    constructor(makeArchetype, makeEntity, query, logger = new NullLogger()) {
        this.makeArchetype = makeArchetype;
        this.makeEntity = makeEntity;
        this.emptyArchetype = this.newArchetype(new Set());
        this.query = query;
        this.logger = logger;
        logger.addArchetype(this.emptyArchetype);
    }
    makeArchetype;
    makeEntity;
    query;
    newArchetype(components) {
        return new this.makeArchetype({ components });
    }
    newEntity() {
        const newEntity = new this.makeEntity({});
        newEntity.moveToArchetype(this.emptyArchetype, new Set());
        return newEntity;
    }
    emptyArchetype;
    addNewArchetypeCallbacks = new Set();
    deleteArchetypeCallbacks = new Set();
    getArchetype(components) {
        return (this.#lookupArchetype(components) ?? this.#addNewArchetype(components));
    }
    createEntity() {
        const entity = this.newEntity();
        this.emptyArchetype.entities.add(entity);
        return entity;
    }
    #lookupArchetype(components) {
        this.logger.doExpensiveLookup();
        if (components.size === 0) {
            return this.emptyArchetype;
        }
        const setOfArchetypes = this.query(components);
        if (setOfArchetypes === undefined) {
            return undefined;
        }
        for (const archetype of setOfArchetypes) {
            if (isSameSet(archetype.components, components)) {
                return archetype;
            }
        }
        return undefined;
    }
    #addNewArchetype(components) {
        const newArchetype = this.newArchetype(components);
        this.logger.addArchetype(newArchetype);
        this.addNewArchetypeCallbacks.forEach((callback) => callback(newArchetype));
        return newArchetype;
    }
    clear(entity) {
        if (!entity.isAlive())
            return;
        entity.moveToArchetype(this.emptyArchetype, entity.archetype.components);
    }
    moveToArchetype(entity, link, toAdd, toRemove) {
        if (!entity.isAlive())
            return;
        if (toAdd.size === 0 && toRemove.size === 0)
            return;
        entity.moveToArchetype(this.ensureArchetypeWithLink(entity.archetype, link, toAdd, toRemove), toRemove);
    }
    ensureArchetypeWithLink(archetype, link, toAdd, toRemove) {
        const lookupCheapLink = () => {
            return archetype.links.get(link.type, link.id);
        };
        const establishNewLink = () => {
            const newArchetype = this.getArchetype(addAll(removeAll(archetype.components, toRemove), toAdd));
            const newLink = archetype.links.add(link.type, link.id, newArchetype);
            this.logger.addLink(newLink);
            if (toAdd.size + toRemove.size === 1) {
                const reverseLink = newArchetype.links.add(reverseLinkType(link.type), link.id, archetype);
                this.logger.addLink(reverseLink);
            }
            return newArchetype;
        };
        return lookupCheapLink() ?? establishNewLink();
    }
    cleanup(archetype) {
        if (archetype.entities.size === 0 && archetype !== this.emptyArchetype) {
            this.deleteArchetype(archetype);
        }
    }
    moveAllEntities(archetype, componentsToRemove) {
        if (componentsToRemove.size === 0)
            throw new Error("Internal: Can't remove 0 components from archetype");
        const archetypeToMoveEntitiesTo = this.getArchetypeWithoutComponents(archetype, componentsToRemove);
        for (const entity of archetype.entities) {
            entity.moveToArchetype(archetypeToMoveEntitiesTo, componentsToRemove);
        }
    }
    getArchetypeWithoutComponents(archetype, componentsToRemove) {
        if (componentsToRemove.size === 1) {
            const component = componentsToRemove.values().next().value;
            const preppedLink = archetype.links.get(LinkType.Remove, component);
            if (preppedLink)
                return preppedLink;
        }
        return this.getArchetype(removeAll(archetype.components, componentsToRemove));
    }
    deleteArchetype(archetype) {
        if (archetype.entities.size > 0) {
            throw new Error("Internal: Cannot detach connections of an archetype that still has entities");
        }
        archetype.links.detachLinks(this.logger);
        this.deleteArchetypeCallbacks.forEach((callback) => callback(archetype));
        this.logger.deleteArchetype(archetype);
    }
    logger = new NullLogger();
    startStatistics(logger) {
        this.logger = logger;
    }
    stopStatistics() {
        this.logger = new NullLogger();
    }
}
function addAll(archetype, ids) {
    return archetype.union(ids);
}
function removeAll(archetype, ids) {
    return archetype.difference(ids);
}
function isSameSet(a, b) {
    return a.isSubsetOf(b) && b.isSubsetOf(a);
}
class NullLogger {
    addArchetype() { }
    deleteArchetype() { }
    addLink() { }
    deleteLink() { }
    doExpensiveLookup() { }
}

const ArchetypeMixin$1 = () => (Base) => {
    const Derived = class extends Base {
        entities = new Set();
        links = new Links(this);
    };
    return Derived;
};
const EntityMixin$4 = () => (Base) => {
    const Derived = class extends Base {
        archetype;
        componentData = new Map();
        moveToArchetype(newArchetype, removedComponents = new Set()) {
            this.archetype?.entities.delete(this);
            newArchetype.entities.add(this);
            this.archetype = newArchetype;
            removedComponents.forEach((component) => this.componentData.delete(component));
        }
        destruct() {
            this.archetype?.entities.delete(this);
            this.archetype = undefined;
            this.componentData.clear();
        }
        get(id) {
            return this.componentData.get(id);
        }
        set(id, value) {
            this.componentData.set(id, value);
        }
        isAlive() {
            return this.archetype !== undefined;
        }
    };
    return Derived;
};

class AtomicOperationManager {
    storage;
    #opens = 0;
    #dirty = false;
    #targets = new Map();
    constructor(storage) {
        this.storage = storage;
    }
    isDirty() {
        return this.#opens > 0 || this.#dirty;
    }
    open(entity, link, callback) {
        this.#opens++;
        const target = (() => {
            const existingTarget = this.#targets.get(entity);
            if (existingTarget !== undefined)
                return existingTarget;
            return new OperationPayload(entity, link);
        })();
        this.#targets.set(entity, target);
        try {
            callback(target);
        }
        catch (e) {
            this.#dirty = true;
            throw e;
        }
        finally {
            this.#opens--;
            if (this.#opens === 0) {
                if (!this.#dirty) {
                    this.#targets.forEach((payload) => payload.close(this.storage));
                }
                this.#targets.clear();
                this.#dirty = false;
            }
        }
    }
}
class OperationPayload {
    entity;
    link;
    dataToSet = [];
    dataToRemove = new Set();
    idsToAdd = new Set();
    idsToRemove = new Set();
    constructor(entity, link) {
        this.entity = entity;
        this.link = link;
    }
    add(id) {
        this.idsToAdd.add(id);
    }
    remove(id) {
        this.idsToRemove.add(id);
    }
    set(id, val) {
        this.dataToSet.push([id, val]);
    }
    delete(id) {
        this.dataToRemove.add(id);
    }
    isAdding(id) {
        return this.idsToAdd.has(id);
    }
    isRemoving(id) {
        return this.idsToRemove.has(id);
    }
    close(storage) {
        storage.moveToArchetype(this.entity, this.link, this.idsToAdd, this.idsToRemove);
        this.dataToSet.forEach(([id, val]) => {
            this.entity.set(id, val);
        });
    }
}

class BacklinkQueryable {
    backlinks = new Map();
    addBacklinkIfMatches(archetype) {
        const match = new Set(this.checkMatch(archetype));
        if (match.size > 0) {
            this.backlinks.set(archetype, match);
        }
    }
    removeBacklink(archetype) {
        this.backlinks.delete(archetype);
    }
    matchingArchetypes() {
        return this.backlinks.keys();
    }
    matches(archetype) {
        return this.backlinks.has(archetype);
    }
    match(archetype) {
        return this.backlinks.get(archetype)?.values() ?? [][Symbol.iterator]();
    }
}
// *
class Wildcard extends BacklinkQueryable {
    _wildcardBrand = undefined;
    checkMatch(archetype) {
        return archetype.components
            .keys()
            .filter((component) => component.isEntity());
    }
}
function isWildcard$2(value) {
    return value instanceof Wildcard;
}
// [*,*]
class DoubleWildcard extends BacklinkQueryable {
    _doubleWildcardBrand = undefined;
    checkMatch(archetype) {
        return archetype.components
            .keys()
            .filter((component) => component.isPair());
    }
}
function isDoubleWildcard$1(value) {
    return value instanceof DoubleWildcard;
}
// [relationship, *]
let RelationshipWildcard$1 = class RelationshipWildcard extends BacklinkQueryable {
    _relationshipWildcardBrand = undefined;
    relationship;
    constructor(relationship) {
        super();
        this.relationship = relationship;
    }
    checkMatch(archetype) {
        return archetype.components
            .keys()
            .filter((component) => component.isPair())
            .filter((pair) => pair.relationship === this.relationship);
    }
};
function isRelationshipWildcard$1(value) {
    return value instanceof RelationshipWildcard$1;
}
// [*, target]
let WildcardTarget$1 = class WildcardTarget extends BacklinkQueryable {
    _wildcardTargetBrand = undefined;
    target;
    constructor(target) {
        super();
        this.target = target;
    }
    // private backlinks: Map<Archetype, Set<Pair>> = new Map();
    checkMatch(archetype) {
        return archetype.components
            .keys()
            .filter((component) => component.isPair())
            .filter((pair) => pair.target === this.target);
    }
};
function isWildcardTarget$1(value) {
    return value instanceof WildcardTarget$1;
}

const EntityMixin$3 = () => (Base) => {
    const Derived = class StorageEntity extends Base {
        backLinksComponent;
        relationshipWildcard;
        wildcardTarget;
        matches(archetype) {
            return this.backLinksComponent?.has(archetype) ?? false;
        }
        match(archetype) {
            return archetype.components
                .keys()
                .filter((component) => component.isEntity())
                .filter((component) => component === this);
        }
        matchingArchetypes() {
            if (!this.backLinksComponent)
                return [][Symbol.iterator]();
            return this.backLinksComponent.keys();
        }
        removeBacklink(archetype) {
            this.backLinksComponent?.delete(archetype);
        }
        addBacklink(archetype) {
            if (!this.backLinksComponent) {
                this.backLinksComponent = new Set();
            }
            this.backLinksComponent.add(archetype);
        }
        getRelationshipWildcard() {
            if (!this.relationshipWildcard) {
                this.relationshipWildcard = new RelationshipWildcard$1(this);
            }
            return this.relationshipWildcard;
        }
        getWildcardTarget() {
            if (!this.wildcardTarget) {
                this.wildcardTarget = new WildcardTarget$1(this);
            }
            return this.wildcardTarget;
        }
    };
    return Derived;
};

const PairMixin$2 = () => (Base) => {
    const Derived = class StoragePair extends Base {
        backLinksComponent;
        matches(archetype) {
            return this.backLinksComponent?.has(archetype) ?? false;
        }
        match(archetype) {
            return archetype.components
                .keys()
                .filter((component) => component.isPair())
                .filter((component) => component === this);
        }
        matchingArchetypes() {
            if (!this.backLinksComponent)
                return [][Symbol.iterator]();
            return this.backLinksComponent.keys();
        }
        removeBacklink(archetype) {
            this.backLinksComponent?.delete(archetype);
            this.relationship.getRelationshipWildcard().removeBacklink(archetype);
            this.target.getWildcardTarget().removeBacklink(archetype);
        }
        addBacklink(archetype) {
            if (!this.backLinksComponent) {
                this.backLinksComponent = new Set();
            }
            this.backLinksComponent.add(archetype);
            this.relationship
                .getRelationshipWildcard()
                .addBacklinkIfMatches(archetype);
            this.target.getWildcardTarget().addBacklinkIfMatches(archetype);
        }
        isPair() {
            return true;
        }
        isEntity() {
            return false;
        }
    };
    return Derived;
};

class ComponentIndex {
    wildcard = new Wildcard();
    doubleWildcard = new DoubleWildcard();
    pairsManager;
    constructor(pairsManager) {
        this.pairsManager = pairsManager;
    }
    addArchetype(archetype) {
        const components = archetype.components;
        this.wildcard.addBacklinkIfMatches(archetype);
        this.doubleWildcard.addBacklinkIfMatches(archetype);
        for (const id of components) {
            id.addBacklink(archetype);
        }
    }
    removeArchetype(archetype) {
        this.wildcard.removeBacklink(archetype);
        this.doubleWildcard.removeBacklink(archetype);
        for (const id of archetype.components) {
            id.removeBacklink(archetype);
        }
    }
}

const EntityMixin$2 = () => (Base) => {
    const Derived = class extends Base {
        _initializer;
        addDataInitializer(parser) {
            this._initializer = (() => {
                if (parser === undefined)
                    return undefined;
                const canDefaultInitialize = (() => {
                    try {
                        parser.parse(undefined);
                    }
                    catch {
                        return false;
                    }
                    return true;
                })();
                const tryInitialize = (val) => {
                    if (val === undefined) {
                        if (!canDefaultInitialize) {
                            throw new Error(`Component "${this.name}" cannot be default initialized`);
                        }
                        return parser.parse(undefined);
                    }
                    try {
                        return parser.parse(val.data);
                    }
                    catch {
                        throw new Error("Invalid component data");
                    }
                };
                return { canDefaultInitialize, tryInitialize };
            })();
        }
        setRelationshipHasNoData() {
            this._relationshipHasNoData = true;
        }
        tryInitialize(init) {
            return this._initializer?.tryInitialize(init);
        }
        canDefaultInitialize() {
            return this._initializer?.canDefaultInitialize ?? true;
        }
        hasData() {
            return this._initializer !== undefined;
        }
    };
    return Derived;
};
const PairMixin$1 = () => (Base) => {
    const Derived = class extends Base {
        _initializer = (() => {
            if (this.relationship._initializer !== undefined &&
                this.target._initializer === undefined) {
                return this.relationship._initializer;
            }
            if (this.relationship._initializer === undefined &&
                this.target._initializer !== undefined &&
                !this.relationship._relationshipHasNoData) {
                return this.target._initializer;
            }
            if (this.relationship._initializer !== undefined &&
                this.target._initializer !== undefined &&
                !this.relationship._relationshipHasNoData) {
                return this.relationship._initializer;
            }
            // type.initializer === undefined && target.initializer === undefined
            return undefined;
        })();
        tryInitialize(init) {
            return this._initializer?.tryInitialize(init);
        }
        canDefaultInitialize() {
            return this._initializer?.canDefaultInitialize ?? true;
        }
        hasData() {
            return this._initializer !== undefined;
        }
    };
    return Derived;
};

class Hooks {
    phases = new Map();
    add(phase, operation, hook) {
        const phaseContainer = (() => {
            const existing = this.phases.get(phase);
            if (existing) {
                return existing;
            }
            const newContainer = new PhaseContainer();
            this.phases.set(phase, newContainer);
            return newContainer;
        })();
        if (operation === Operation.asComponent) {
            phaseContainer.asComponent.add(hook);
        }
        if (operation === Operation.asRelationship) {
            phaseContainer.asRelationship.add(hook);
        }
        if (operation === Operation.asTarget) {
            phaseContainer.asTarget.add(hook);
        }
    }
    run(phase, operation, id, entity) {
        const phaseContainer = this.phases.get(phase);
        if (phaseContainer === undefined)
            return new Set();
        if (operation === Operation.asComponent) {
            phaseContainer.asComponent.forEach((hook) => hook(id, entity));
            return;
        }
        if (operation === Operation.asRelationship) {
            phaseContainer.asRelationship.forEach((hook) => hook(id, entity));
            return;
        }
        if (operation === Operation.asTarget) {
            phaseContainer.asTarget.forEach((hook) => hook(id, entity));
            return;
        }
        throw new Error("Unsupported phase or operation");
    }
}
class PhaseContainer {
    asComponent = new Set();
    asRelationship = new Set();
    asTarget = new Set();
}
var Phase;
(function (Phase) {
    Phase[Phase["preAdd"] = 0] = "preAdd";
    Phase[Phase["postAdd"] = 1] = "postAdd";
    Phase[Phase["postRemove"] = 2] = "postRemove";
})(Phase || (Phase = {}));
var Operation;
(function (Operation) {
    Operation[Operation["asComponent"] = 0] = "asComponent";
    Operation[Operation["asRelationship"] = 1] = "asRelationship";
    Operation[Operation["asTarget"] = 2] = "asTarget";
})(Operation || (Operation = {}));

const EntityMixin$1 = () => (Base) => {
    const Derived = class extends Base {
        archetype;
        _hooks = new Hooks();
        runHooksFor(phase) {
            return {
                on: (entity) => {
                    this._hooks.run(phase, Operation.asComponent, this, entity);
                    this.archetype?._hooks.run(phase, Operation.asComponent, this, entity);
                },
            };
        }
        addHook(phase, operation, callback) {
            this._hooks.add(phase, operation, callback);
        }
    };
    return Derived;
};
const ArchetypeMixin = () => (Base) => {
    const Derived = class extends Base {
        _hooks = new Hooks();
        addHook(phase, operation, callback) {
            this._hooks.add(phase, operation, callback);
        }
    };
    return Derived;
};
const PairMixin = () => (Base) => {
    const Derived = class extends Base {
        runHooksFor(phase) {
            return {
                on: (entity) => {
                    this.relationship.archetype?._hooks.run(phase, Operation.asRelationship, this, entity);
                    this.relationship._hooks.run(phase, Operation.asRelationship, this, entity);
                    this.target.archetype?._hooks.run(phase, Operation.asTarget, this, entity);
                    this.target._hooks.run(phase, Operation.asTarget, this, entity);
                },
            };
        }
    };
    return Derived;
};

const EntityMixin = () => (Base) => {
    const Derived = class extends Base {
        pairsWhereThisIsRelationship;
        _addPairBacklink(pair) {
            if (!this.pairsWhereThisIsRelationship) {
                this.pairsWhereThisIsRelationship = new Map();
            }
            this.pairsWhereThisIsRelationship.set(pair.target, pair);
        }
        _lookupPairWith(target) {
            return this.pairsWhereThisIsRelationship?.get(target);
        }
    };
    return Derived;
};

class PairsManager {
    constructor(Pair) {
        this.Pair = Pair;
    }
    Pair;
    lookupPair(relationship, target) {
        return relationship._lookupPairWith(target);
    }
    ensurePair(relationship, target) {
        const existingPair = this.lookupPair(relationship, target);
        if (existingPair) {
            return existingPair;
        }
        const newPair = new this.Pair({ relationship, target });
        relationship._addPairBacklink(newPair);
        return newPair;
    }
}

const EntitySuper = //
 EntityMixin$2()(EntityMixin$1()(EntityMixin$3()(EntityMixin$4()(EntityMixin()(
//
class {
    isPair() {
        return false;
    }
    isEntity() {
        return true;
    }
})))));
const ArchetypeSuper = //
 ArchetypeMixin()(ArchetypeMixin$1()(
//
class {
    components;
    constructor(props) {
        this.components = props.components;
    }
}));
const PairSuper = //
 PairMixin$1()(PairMixin()(PairMixin$2()(
//
class {
    relationship;
    target;
    constructor(props) {
        this.relationship = props.relationship;
        this.target = props.target;
    }
    isPair() {
        return true;
    }
    isEntity() {
        return false;
    }
})));
class Archetype extends ArchetypeSuper {
}
let Entity$1 = class Entity extends EntitySuper {
    name;
};
class Pair extends PairSuper {
}

class NameMap {
    #nameMap = new Map();
    hasLookupName(name) {
        return this.#nameMap.has(name);
    }
    setLookupName(entityData, name) {
        if (entityData.name) {
            this.#nameMap.delete(entityData.name);
        }
        this.#nameMap.set(name, entityData);
    }
    deleteName(name) {
        this.#nameMap.delete(name);
    }
    lookup(name) {
        if (name === undefined)
            return undefined;
        return this.#nameMap.get(name);
    }
}

const isWildcard$1 = (isWildcard$2);
const isDoubleWildcard = (isDoubleWildcard$1);
const isRelationshipWildcard = (isRelationshipWildcard$1);
const isWildcardTarget = (isWildcardTarget$1);
class QueryBuilder {
    componentIndex;
    constructor(componentIndex) {
        this.componentIndex = componentIndex;
    }
    build(arg) {
        return new QueryImpl(this.buildBit(arg));
    }
    buildBit(arg) {
        if (isAnd(arg)) {
            return new AndQuery(arg.ands.map((term) => this.buildBit(term)));
        }
        if (isOr(arg)) {
            return new OrQuery(arg.ors.map((term) => this.buildBit(term)));
        }
        return new SingleQueryTerm(arg);
    }
}
let And$1 = class And {
    _andBrand = undefined;
    ands;
    constructor(ands) {
        this.ands = ands;
    }
};
function isAnd(value) {
    return value instanceof And$1;
}
function and$1(...ands) {
    return new And$1(ands);
}
let Or$1 = class Or {
    _orBrand = undefined;
    ors;
    constructor(ors) {
        this.ors = ors;
    }
};
function isOr(value) {
    return value instanceof Or$1;
}
function or$1(...ors) {
    return new Or$1(ors);
}
class QueryImpl {
    queryBit;
    constructor(queryBit) {
        this.queryBit = queryBit;
    }
    matchingArchetypes() {
        return this.queryBit.matchingArchetypes();
    }
    matches(archetype) {
        return this.queryBit.matches(archetype);
    }
    match(archetype) {
        return this.queryBit.match(archetype);
    }
    archetypesWithMatches() {
        return this.queryBit
            .matchingArchetypes()
            .map((archetype) => [archetype, this.queryBit.match(archetype)]);
    }
    archetypeWithMatches() {
        return this.queryBit.archetypesWithMatch();
    }
}
class OrQuery {
    subqueries;
    constructor(subqueries) {
        this.subqueries = subqueries;
    }
    matchingArchetypes() {
        return this.subqueries
            .reduce((set, query) => set.union(new Set(query.matchingArchetypes())), new Set())
            .values();
    }
    matches(archetype) {
        throw new Error("OrQuery is not fully implemented yet");
    }
    match(archetype) {
        return this.subqueries.reduce((set, query) => set.union(query.match(archetype)), new Set());
    }
    archetypesWithMatch() {
        const retval = new Map();
        for (const query of this.subqueries) {
            for (const [archetype, matches] of query.archetypesWithMatch()) {
                const existing = retval.get(archetype) ?? [];
                existing.push(...matches);
                retval.set(archetype, existing);
            }
        }
        return retval;
    }
}
class AndQuery {
    subqueries;
    constructor(subqueries) {
        this.subqueries = subqueries;
    }
    matchingArchetypes() {
        const elements = [...this.subqueries];
        const first = elements.shift();
        return elements
            .reduce((set, query) => set.intersection(new Set(query.matchingArchetypes())), new Set(first.matchingArchetypes()))
            .values();
    }
    matches(archetype) {
        throw new Error("AndQuery is not fully implemented yet");
    }
    match(archetype) {
        const elements = [...this.subqueries];
        const first = elements.shift();
        return elements.reduce((set, query) => set.intersection(query.match(archetype)), first.match(archetype));
    }
    archetypesWithMatch() {
        const matchingArchetypes = this.matchingArchetypes();
        const retval = new Map();
        const subArchetypesWithMatches = this.subqueries.map((query) => query.archetypesWithMatch());
        for (const archetype of matchingArchetypes) {
            const matches = subArchetypesWithMatches.map((query) => query.get(archetype) ?? []);
            const combinations = cartesian(...matches.map((match) => Array.from(match))).map((combination) => combination.flat());
            retval.set(archetype, combinations);
        }
        return retval;
    }
}
class SingleQueryTerm {
    term;
    constructor(id) {
        this.term = id;
    }
    matchingArchetypes() {
        return this.term.matchingArchetypes();
    }
    matches(archetype) {
        return this.term.matches(archetype);
    }
    match(archetype) {
        return new Set(this.term.match(archetype));
    }
    archetypesWithMatch() {
        return new Map(this.term
            .matchingArchetypes()
            .map((archetype) => [
            archetype,
            Array.from(this.term.match(archetype).map((match) => [match])),
        ]));
    }
}
function cartesian(...arrays) {
    return arrays.reduce((acc, curr) => acc
        .map((x) => curr.map((y) => x.concat([y])))
        .reduce((a, b) => a.concat(b), []), [[]]);
}

class Backend {
    nameMap = new NameMap();
    entities = new Set();
    components = new Map();
    pairsManager = new PairsManager(Pair);
    componentIndex = new ComponentIndex(this.pairsManager);
    queryBuilder = new QueryBuilder(this.componentIndex);
    archetypeGraph = new ArchetypeGraph(Archetype, Entity$1, (components) => this.queryBuilder.build(and$1(...components)).matchingArchetypes());
    operation = new AtomicOperationManager(this.archetypeGraph);
    wildcard = this.componentIndex.wildcard;
    doubleWildcard = this.componentIndex.doubleWildcard;
    makeQuery = this.queryBuilder.build.bind(this.queryBuilder);
    constructor() {
        this.archetypeGraph.addNewArchetypeCallbacks.add((newArchetype) => {
            this.componentIndex.addArchetype(newArchetype);
        });
        this.archetypeGraph.deleteArchetypeCallbacks.add((archetype) => {
            this.componentIndex.removeArchetype(archetype);
        });
    }
    createEntity() {
        const newEntity = this.archetypeGraph.createEntity();
        this.entities.add(newEntity);
        return newEntity;
    }
    startStatistics(logger) {
        this.archetypeGraph.startStatistics(logger);
    }
    stopStatistics() {
        this.archetypeGraph.stopStatistics();
    }
    entity(name) {
        const createEntity = () => {
            const newEntity = this.createEntity();
            if (name !== undefined)
                this.setName(newEntity, name);
            return newEntity;
        };
        return this.nameMap.lookup(name) ?? createEntity();
    }
    tag(name) {
        return this.entity(name);
    }
    component(parse) {
        const createComponent = () => {
            const newComponent = this.createEntity();
            newComponent.addDataInitializer(parse);
            this.components.set(parse, newComponent);
            return newComponent;
        };
        return this.components.get(parse) ?? createComponent();
    }
    pair(relationship, target) {
        return this.pairsManager.ensurePair(relationship, target);
    }
    relationshipWildcard(relationship) {
        return relationship.getRelationshipWildcard();
    }
    wildcardTarget(target) {
        return target.getWildcardTarget();
    }
    initializer(component) {
        return this.components
            .entries()
            .find(([, comp]) => comp === component)?.[0];
    }
    getName(entity) {
        return entity.name;
    }
    setName(entity, name) {
        if (this.nameMap.hasLookupName(name)) {
            throw new Error(`Entity with name ${name} already exists`);
        }
        this.nameMap.setLookupName(entity, name);
        entity.name = name;
    }
    getDisplayName(id) {
        if (id.isPair()) {
            return `(${this.getDisplayName(id.relationship)}, ${this.getDisplayName(id.target)})`;
        }
        else {
            return id.name ?? "-unnamed-";
        }
    }
    lookupEntity(name) {
        return this.nameMap.lookup(name);
    }
    isAlive(entity) {
        return entity.isAlive();
    }
    destruct(entity) {
        if (entity.hasData()) {
            throw new Error("Components cannot be destructed (by default)");
        }
        if (entity.name) {
            this.nameMap.deleteName(entity.name);
        }
        entity.name = undefined;
        this.entities.delete(entity);
        this.queryBuilder
            .build(or$1(entity, this.relationshipWildcard(entity), this.wildcardTarget(entity)))
            .archetypesWithMatches()
            .forEach(([archetype, components]) => {
            this.archetypeGraph.moveAllEntities(archetype, components);
            this.archetypeGraph.cleanup(archetype);
        });
        entity.destruct();
    }
    removeFromAll(term) {
        const query = this.queryBuilder.build(term);
        query.matchingArchetypes().forEach((archetype) => {
            this.archetypeGraph.moveAllEntities(archetype, query.match(archetype));
            this.archetypeGraph.cleanup(archetype);
        });
    }
    destructAllWith(x) {
        const query = this.queryBuilder.build(x);
        const toBeDestructed = new Set();
        const toBeCleanedUp = new Set();
        query.matchingArchetypes().forEach((archetype) => {
            archetype.entities.forEach((entity) => toBeDestructed.add(entity));
            toBeCleanedUp.add(archetype);
        });
        for (const entity of toBeDestructed) {
            this.destruct(entity);
        }
        for (const archetype of toBeCleanedUp) {
            this.archetypeGraph.cleanup(archetype);
        }
    }
    clear(entity) {
        this.archetypeGraph.clear(entity);
    }
    has(entity, term) {
        if (!entity.isAlive())
            return false;
        return this.queryBuilder.build(term).matches(entity.archetype);
    }
    remove(entity, removeTerm) {
        if (!entity.isAlive())
            return;
        this.queryBuilder
            .build(removeTerm)
            .match(entity.archetype)
            .forEach((id) => {
            if (!this.has(entity, id))
                return;
            this.operation.open(entity, { type: LinkType.Remove, id }, (operation) => {
                if (operation.isRemoving(id))
                    return;
                operation.remove(id);
                operation.delete(id);
                id.runHooksFor(Phase.postRemove).on(entity);
            });
        });
    }
    getComponents(entity, term) {
        if (term === undefined) {
            return entity.archetype?.components.keys() ?? [][Symbol.iterator]();
        }
        return this.queryBuilder.build(term).match(entity.archetype).keys();
    }
    findComponent(entity, term) {
        if (term === undefined) {
            return entity.archetype?.components.keys().next().value;
        }
        return this.queryBuilder.build(term).match(entity.archetype).keys().next()
            .value;
    }
    add(entity, id, initialData = undefined) {
        if (this.has(entity, id))
            return;
        this.checkValid(id);
        this.operation.open(entity, {
            type: LinkType.Add,
            id,
        }, (operation) => {
            if (operation.isAdding(id))
                return;
            // pre hooks
            id.runHooksFor(Phase.preAdd).on(entity);
            // add this
            operation.add(id);
            if (id.hasData()) {
                operation.set(id, id.tryInitialize(initialData));
            }
            // post hooks
            id.runHooksFor(Phase.postAdd).on(entity);
        });
    }
    set(entity, id, newVal) {
        if (!id.hasData()) {
            throw new Error(`"${this.getDisplayName(id)}" has no data to be set`);
        }
        if (!this.has(entity, id)) {
            this.add(entity, id, { data: newVal });
        }
        else {
            entity.set(id, id.tryInitialize({ data: newVal }));
        }
    }
    get(entity, id) {
        return entity.get(id);
    }
    checkValid(id) {
        if (id.isPair()) {
            if (!this.entities.has(id.relationship)) {
                throw new Error("Component does not exist in ECS");
            }
            if (!this.entities.has(id.target)) {
                throw new Error("Component does not exist in ECS");
            }
        }
        else {
            if (!this.entities.has(id)) {
                throw new Error("Component does not exist in ECS");
            }
        }
    }
    canDefaultInitialize(id) {
        return !id.hasData() || id.canDefaultInitialize();
    }
    addHook(phase, operation, query, callback) {
        query.matchingArchetypes().forEach((archetype) => {
            archetype.addHook(phase, operation, callback);
        });
        this.archetypeGraph.addNewArchetypeCallbacks.add((archetype) => {
            if (query.matches(archetype)) {
                archetype.addHook(phase, operation, callback);
            }
        });
    }
    addHookToEntity(phase, operation, entity, callback) {
        entity.addHook(phase, operation, callback);
    }
}

function addHook(backend, phase, operation, query, callback) {
    backend.addHook(phase, operation, query, callback);
}
function addHookToEntity(backend, phase, operation, entity, callback) {
    backend.addHookToEntity(phase, operation, entity, callback);
}
function builtinTraits(backend) {
    const Trait = backend.tag("Trait");
    backend.add(Trait, Trait);
    const traitCheckCallback = (pair, entity) => {
        const isInUseAsComponent = (() => {
            return (backend
                .makeQuery(entity)
                .matchingArchetypes()
                .some(() => true) ||
                backend
                    .makeQuery(backend.relationshipWildcard(entity))
                    .matchingArchetypes()
                    .some(() => true));
        })();
        if (isInUseAsComponent) {
            throw new Error(`Component "${backend.getDisplayName(pair)}" is a Trait and cannot be added to a component that is already in use!`);
        }
    };
    addHook(backend, Phase.preAdd, Operation.asComponent, backend.makeQuery(Trait), traitCheckCallback);
    addHook(backend, Phase.preAdd, Operation.asRelationship, backend.makeQuery(Trait), traitCheckCallback);
    addHook(backend, Phase.preAdd, Operation.asTarget, backend.makeQuery(Trait), traitCheckCallback);
    const Relationship = backend.tag("Relationship");
    backend.add(Relationship, Trait);
    addHook(backend, Phase.preAdd, Operation.asComponent, backend.makeQuery(Relationship), (component) => {
        throw new Error(`Component "${backend.getDisplayName(component)}" is purely a relationship and cannot be used as a component`);
    });
    addHook(backend, Phase.preAdd, Operation.asTarget, backend.makeQuery(Relationship), (pair) => {
        if (!backend.has(pair.relationship, Trait)) {
            throw new Error(`Component "${backend.getDisplayName(pair.target)}" is purely a relationship and cannot be used as a target of a relationship`);
        }
    });
    const Acyclic = backend.tag("Acyclic");
    backend.add(Acyclic, Trait);
    addHook(backend, Phase.preAdd, Operation.asRelationship, backend.makeQuery(Acyclic), (pair, entity) => {
        const relationship = pair.relationship;
        const target = pair.target;
        if (!backend.has(relationship, Acyclic))
            return;
        if (target === entity) {
            throw new Error(`Relationship "${backend.getDisplayName(relationship)}" is acyclic and cannot target the entity it is added to`);
        }
        const callback = (currentTarget) => {
            if (currentTarget === entity) {
                throw new Error(`Relationship "${backend.getDisplayName(relationship)}" is acyclic and cannot be added to an entity that would create a cycle`);
            }
        };
        const getChildren = (currentTarget) => backend
            .getComponents(currentTarget, backend.relationshipWildcard(relationship))
            .filter((component) => isPair$1(component))
            .map((pair) => pair.target);
        recurse(getChildren(target));
        function recurse(targets) {
            targets.forEach((target) => {
                callback(target);
                recurse(getChildren(target));
            });
        }
    });
    const RelationshipHasNoData = backend.tag("RelationshipHasNoData");
    const RelationshipHasNoDataSpecialTag = backend.tag("RelationshipHasNoDataSpecialTag");
    backend.add(RelationshipHasNoData, Trait);
    backend.add(RelationshipHasNoData, RelationshipHasNoDataSpecialTag);
    addHook(backend, Phase.preAdd, Operation.asComponent, backend.makeQuery(RelationshipHasNoDataSpecialTag), (component, entity) => {
        if (component !== RelationshipHasNoData)
            return;
        entity._relationshipHasNoData = true;
    });
    const TargetMustBeDefaultInitializable = backend.tag("TargetMustBeDefaultInitializable");
    backend.add(TargetMustBeDefaultInitializable, Trait);
    addHook(backend, Phase.preAdd, Operation.asRelationship, backend.makeQuery(TargetMustBeDefaultInitializable), (pair) => {
        const relationship = pair.relationship;
        const target = pair.target;
        if (!backend.canDefaultInitialize(target)) {
            throw new Error(`Relationship "${backend.getDisplayName(relationship)}" is marked as TargetMustBeDefaultInitializable while target "${backend.getDisplayName(target)}" has data and is not default initializable`);
        }
    });
    const With = backend.tag("With");
    backend.add(With, Trait);
    backend.add(With, Relationship);
    backend.add(With, RelationshipHasNoData);
    backend.add(With, Acyclic);
    backend.add(With, TargetMustBeDefaultInitializable);
    addHook(backend, Phase.postAdd, Operation.asRelationship, backend.makeQuery(backend.relationshipWildcard(With)), (pair, entity) => {
        backend
            .getComponents(pair.relationship, backend.relationshipWildcard(With))
            .filter((withComp) => withComp.isPair())
            .forEach((withComp) => backend.add(entity, backend.pair(withComp.target, pair.target)));
    });
    const WithSpecialTag = backend.tag("WithSpecialTag");
    backend.add(WithSpecialTag, Trait);
    backend.add(With, WithSpecialTag);
    addHook(backend, Phase.postAdd, Operation.asRelationship, backend.makeQuery(WithSpecialTag), (pair) => {
        if (pair.relationship !== With)
            return;
        addHookToEntity(backend, Phase.postRemove, Operation.asComponent, pair.target, (component, entity) => {
            backend
                .makeQuery(backend.pair(With, component))
                .matchingArchetypes()
                .flatMap((archetype) => archetype.entities)
                .forEach((withedComponent) => {
                backend.remove(entity, withedComponent);
            });
        });
        addHookToEntity(backend, Phase.postRemove, Operation.asRelationship, pair.target, (pair, entity) => {
            backend
                .makeQuery(backend.pair(With, pair.relationship))
                .matchingArchetypes()
                .flatMap((archetype) => archetype.entities)
                .forEach((withedComponent) => {
                backend.remove(entity, backend.pair(withedComponent, pair.target));
            });
        });
    });
    addHook(backend, Phase.postAdd, Operation.asComponent, backend.makeQuery(backend.relationshipWildcard(With)), (component, entity) => {
        backend
            .getComponents(component, backend.relationshipWildcard(With))
            .forEach((withId) => backend.add(entity, withId.target));
    });
    const Singleton = backend.tag("Singleton");
    backend.add(Singleton, Trait);
    addHook(backend, Phase.preAdd, Operation.asComponent, backend.makeQuery(Singleton), (component, entity) => {
        if (entity !== component) {
            throw new Error(`Component "${backend.getDisplayName(component)}" is a singleton and cannot be added to entities other than itself`);
        }
    });
    const Symmetric = backend.tag("Symmetric");
    backend.add(Symmetric, Trait);
    addHook(backend, Phase.postAdd, Operation.asRelationship, backend.makeQuery(Symmetric), (pair, entity) => {
        backend.add(pair.target, backend.pair(pair.relationship, entity));
    });
    addHook(backend, Phase.postRemove, Operation.asRelationship, backend.makeQuery(Symmetric), (pair, entity) => {
        backend.remove(pair.target, backend.pair(pair.relationship, entity));
    });
    const Target = backend.tag("Target");
    backend.add(Target, Trait);
    addHook(backend, Phase.preAdd, Operation.asComponent, backend.makeQuery(Target), (component) => {
        throw new Error(`Entity "${backend.getDisplayName(component)}" is marked as a Target and cannot be used as a component`);
    });
    addHook(backend, Phase.preAdd, Operation.asRelationship, backend.makeQuery(Target), (pair) => {
        throw new Error(`Entity "${backend.getDisplayName(pair.relationship)}" is marked as a Target and cannot be used as a relationship`);
    });
    const Exclusive = backend.tag("Exclusive");
    backend.add(Exclusive, Trait);
    addHook(backend, Phase.preAdd, Operation.asRelationship, backend.makeQuery(Exclusive), (pair, entity) => {
        const currentPair = backend.findComponent(entity, backend.relationshipWildcard(pair.relationship));
        if (currentPair !== undefined) {
            backend.remove(entity, currentPair);
            backend
                .getComponents(pair.relationship, backend.relationshipWildcard(With))
                .forEach((withComp) => backend.remove(entity, backend.pair(withComp.target, currentPair.target)));
        }
    });
    return {
        Trait,
        Relationship,
        Acyclic,
        RelationshipHasNoData,
        With,
        Singleton,
        Symmetric,
        Target,
        TargetMustBeDefaultInitializable,
        Exclusive,
    };
}
function isPair$1(component) {
    return component.isPair();
}

class ObjectGCTracker {
    objects = new Map();
    registry = new FinalizationRegistry((key) => {
        this.objects.delete(key);
    });
    key = 0;
    add(obj) {
        const key = this.key++;
        this.objects.set(key, new WeakRef(obj));
        this.registry.register(obj, key);
        obj = null;
    }
    count() {
        return this.objects.size;
    }
    clearDead() {
        this.objects.entries().forEach(([key, ref]) => {
            if (ref.deref() === undefined) {
                this.objects.delete(key);
            }
        });
    }
}

class BackendHandleBase {
    backend;
    constructor(backend) {
        this.backend = backend;
    }
    // protected mapFromBackend(
    //   component: AnySingle,
    // ):
    //   | Wildcard
    //   | Tag
    //   | PairTag
    //   | Component<ComponentDataSchema>
    //   | PairComponent<ComponentDataSchema>
    //   | RelationshipWildcard
    //   | RelationshipWildcardComponent<ComponentDataSchema>
    //   | WildcardTarget
    //   | DoubleWildcard;
    mapIdFromBackend(component) {
        // | Wildcard
        // | RelationshipWildcard
        // | RelationshipWildcardComponent<ComponentDataSchema>
        // | WildcardTarget
        // | DoubleWildcard
        if (component instanceof Entity$1) {
            if (component.hasData()) {
                return new Component(component, this.backend);
            }
            return new Entity(component, this.backend);
        }
        else if (component instanceof Pair) {
            if (component.hasData()) {
                return new PairComponent(component, this.backend);
            }
            return new PairTag(component, this.backend);
        }
        throw new Error("Invalid component from backend");
    }
    mapToBackend([first, second]) {
        if (first === undefined) {
            throw new Error(` cannot map to backend with undefined first argument. Received: ${JSON.stringify([first, second])}`);
        }
        if (second === undefined) {
            return first.data;
        }
        if (isPair(first)) {
            throw new Error("Cannot create a pair with a pair as the relationship");
        }
        if (isComponent(first) && isComponent(second)) {
            return this.backend.pair(first.data, second.data);
        }
        if (isComponent(first) && isWildcard(second)) {
            return this.backend.relationshipWildcard(first.data);
        }
        if (isWildcard(first) && isComponent(second)) {
            return this.backend.wildcardTarget(second.data);
        }
        if (isWildcard(first) && isWildcard(second)) {
            return this.backend.doubleWildcard;
        }
        throw new Error(`Invalid arguments for mapToBackend: ${JSON.stringify([first, second])}`);
    }
}
class World extends BackendHandleBase {
    constructor() {
        super(new Backend());
    }
    builtin = (() => {
        const traits = builtinTraits(this.backend);
        return {
            Trait: new Entity(traits.Trait, this.backend),
            Relationship: new Entity(traits.Relationship, this.backend),
            RelationshipHasNoData: new Entity(traits.RelationshipHasNoData, this.backend),
            With: new Entity(traits.With, this.backend),
            Acyclic: new Entity(traits.Acyclic, this.backend),
            Singleton: new Entity(traits.Singleton, this.backend),
            Symmetric: new Entity(traits.Symmetric, this.backend),
            Target: new Entity(traits.Target, this.backend),
            TargetMustBeDefaultInitializable: new Entity(traits.TargetMustBeDefaultInitializable, this.backend),
            Exclusive: new Entity(traits.Exclusive, this.backend),
        };
    })();
    wildcard = { data: this.backend.wildcard };
    logger;
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
    entity(name) {
        return new Entity(this.backend.entity(name), this.backend);
    }
    tag(name) {
        return new Entity(this.backend.tag(name), this.backend);
    }
    component(schema) {
        return new Component(this.backend.component(schema), this.backend);
    }
    pair(first, second) {
        if (isComponent(first)) {
            this.backend.checkValid(first.data);
        }
        const backendObject = this.mapToBackend([first, second]);
        if (backendObject instanceof Pair) {
            return this.mapIdFromBackend(backendObject);
        }
        else if (isDoubleWildcard(backendObject)) {
            return { data: backendObject };
        }
        else if (isRelationshipWildcard(backendObject)) {
            if (backendObject.relationship.hasData()) {
                return new RelationshipWildcardComponent(backendObject, this.backend);
            }
            return new RelationshipWildcard(backendObject, this.backend);
        }
        else if (isWildcardTarget(backendObject)) {
            return new WildcardTarget(backendObject, this.backend);
        }
        throw new Error("Invalid arguments for pair");
    }
    lookupEntity(name) {
        const entityData = this.backend.lookupEntity(name);
        return entityData ? new Entity(entityData, this.backend) : undefined;
    }
    removeFromAll(first, second) {
        this.backend.removeFromAll(this.mapToBackend([first, second]));
    }
    destructAllWith(first, second) {
        this.backend.destructAllWith(this.mapToBackend([first, second]));
    }
    set(component, newVal) {
        this.backend.add(component.data, this.builtin.Singleton.data);
        this.backend.set(component.data, component.data, newVal);
    }
    query(queryO) {
        const query = this.backend.makeQuery(queryO.data);
        return {
            matches: () => query
                .archetypeWithMatches()
                .entries()
                .flatMap(([archetype, matches]) => matches.map((match) => [archetype, match]))
                .flatMap(([archetype, match]) => archetype.entities.keys().map((entity) => ({
                entity: new Entity(entity, this.backend),
                match: match.map((m) => this.mapIdFromBackend(m)),
            }))),
        };
    }
    _debugBackendOperationIsDirty() {
        // @ts-expect-error // exposing for testing purposes, not part of public API
        return this.backend.operation.isDirty();
    }
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class And {
    _andBrand = undefined;
    data;
    constructor(data) {
        this.data = data;
    }
}
function and(...subs) {
    return new And(and$1(...subs.map((c) => c.data)));
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class Or {
    _orBrand = undefined;
    data;
    constructor(data) {
        this.data = data;
    }
}
function or(...subs) {
    return new Or(or$1(...subs.map((c) => c.data)));
}
class EntityHandleBase extends BackendHandleBase {
    data;
    constructor(data, backend) {
        super(backend);
        this.data = data;
    }
    getName() {
        return this.backend.getName(this.data);
    }
    setName(name) {
        this.backend.setName(this.data, name);
        return this;
    }
    isSameAs(other) {
        return this.data === other.data;
    }
    isAlive() {
        return this.backend.isAlive(this.data);
    }
    destruct() {
        this.backend.destruct(this.data);
    }
    clear() {
        this.backend.clear(this.data);
        return this;
    }
    type() {
        const archetype = this.data.archetype;
        if (archetype === undefined)
            return [];
        return [...archetype.components].map(this.mapIdFromBackend.bind(this));
    }
    has(first, second) {
        return this.backend.has(this.data, this.mapToBackend([first, second]));
    }
    remove(first, second) {
        this.backend.remove(this.data, this.mapToBackend([first, second]));
        return this;
    }
    add(first, second) {
        if (second === undefined) {
            this.backend.add(this.data, first.data);
            return this;
        }
        if (first.data instanceof Entity$1) {
            this.backend.add(this.data, this.backend.pair(first.data, second.data));
            return this;
        }
        throw new Error("Bad arguments for add");
    }
    set(first, second, third) {
        if (third === undefined) {
            this.backend.set(this.data, first.data, second);
            return this;
        }
        if (first.data instanceof Entity$1 &&
            second.data instanceof Entity$1) {
            this.backend.set(this.data, this.backend.pair(first.data, second.data), third);
            return this;
        }
        throw new Error("Invalid arguments for setData");
    }
    get(first, second) {
        if (second === undefined) {
            return this.backend.get(this.data, first.data);
        }
        if (first.data instanceof Entity$1 &&
            second.data instanceof Entity$1) {
            return this.backend.get(this.data, this.backend.pair(first.data, second.data));
        }
        throw new Error("Invalid arguments for getData");
    }
    components(first, second) {
        if (first === undefined) {
            return this.backend
                .getComponents(this.data)
                .map(this.mapIdFromBackend.bind(this));
        }
        return this.backend
            .getComponents(this.data, this.mapToBackend([first, second]))
            .map(this.mapIdFromBackend.bind(this));
    }
    findComponent(first, second) {
        const fromBackend = (() => {
            if (first === undefined)
                return this.backend.findComponent(this.data);
            return this.backend.findComponent(this.data, this.mapToBackend([first, second]));
        })();
        if (fromBackend === undefined) {
            return undefined;
        }
        return this.mapIdFromBackend(fromBackend);
    }
}
class Entity extends EntityHandleBase {
}
class Component extends EntityHandleBase {
    getInitializer() {
        return this.backend.initializer(this.data);
    }
}
class PairHandleBase extends BackendHandleBase {
    data;
    constructor(_data, backend) {
        super(backend);
        this.data = _data;
    }
    relationship() {
        return new Entity(this.data.relationship, this.backend);
    }
    target() {
        return new Entity(this.data.target, this.backend);
    }
    isSameAs(other) {
        return this.data === other.data;
    }
}
class PairTag extends PairHandleBase {
    _tagPairBrand = undefined;
}
class PairComponent extends PairHandleBase {
    _componentPairBrand = undefined;
}
class RelationshipWildcard extends BackendHandleBase {
    _relationshipWildcardBrand = undefined;
    data;
    constructor(data, backend) {
        super(backend);
        this.data = data;
    }
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class RelationshipWildcardComponent extends BackendHandleBase {
    _relationshipWildcardComponentBrand = undefined;
    data;
    constructor(data, backend) {
        super(backend);
        this.data = data;
    }
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class WildcardTarget extends BackendHandleBase {
    _wildcardTargetBrand = undefined;
    data;
    constructor(data, backend) {
        super(backend);
        this.data = data;
    }
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function isWildcard(value) {
    return isWildcard$1(value.data);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function isComponent(value) {
    return value.data instanceof Entity$1;
}
function isPair(value) {
    return value.data instanceof Pair;
}
class Logger {
    archetypeGCTracker = new ObjectGCTracker();
    archetypesAdded = 0;
    archetypesDeleted = 0;
    liveArchetypes() {
        this.archetypeGCTracker.clearDead();
        return this.archetypeGCTracker.count();
    }
    addArchetype(archetype) {
        this.archetypeGCTracker.add(archetype);
        this.archetypesAdded++;
        archetype = null; // allow GC to collect the archetype if nothing else is referencing it
    }
    deleteArchetype() {
        this.archetypesDeleted++;
    }
    liveLinks() {
        this.linkGCTracker.clearDead();
        return this.linkGCTracker.count();
    }
    linkGCTracker = new ObjectGCTracker();
    linksAdded = 0;
    linksDeleted = 0;
    addLink(link) {
        this.linkGCTracker.add(link);
        this.linksAdded++;
        link = null; // allow GC to collect the link if nothing else is referencing it
    }
    deleteLink() {
        this.linksDeleted++;
    }
    expensiveLookups = 0;
    doExpensiveLookup() {
        this.expensiveLookups++;
    }
}

export { Component, Entity, PairComponent, PairTag, World, and, or };
