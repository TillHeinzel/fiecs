import { AnyAccessor } from "#/API/Query/MatchAccessors";
import * as Fiecs from "#/index";

export function matchesStringArray(it: MatchIterator) {
  return Array.from(it).map(({ entity, match }) =>
    matchesString([entity, match]),
  );
}

export function matchesString([entity, match]: [Fiecs.Entity, AnyAccessor[]]) {
  return [
    entity.getName(),
    match.map((a) => {
      const comp = a.getComponent();

      return `${a.type()}("${comp ? comp.getName() : "undefined"}" from "${a.getSource().getName()}")`;
    }),
  ];
}

export function matchStringArray(it: MatchIterator) {
  return Array.from(it).map(({ entity, match }) =>
    matchString([entity, match]),
  );
}

export function matchString([entity, match]: [Fiecs.Entity, AnyAccessor[]]) {
  return `${entity.getName()}; ${match.reduce((prev, a) => {
    const comp = a.getComponent()
      ? a.getComponent()
      : a.getPair()
        ? a.getPair()
        : undefined;

    return (
      prev +
      `${a.type()}("${comp ? comp.getName() : "undefined"}" from "${a.getSource().getName()}"); `
    );
  }, "")}`;
}

type MatchIterator = IteratorObject<
  {
    match: AnyAccessor[];
    entity: Fiecs.Entity;
  },
  unknown,
  unknown
>;
