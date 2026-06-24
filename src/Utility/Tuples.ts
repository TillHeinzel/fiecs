import { Push } from "./TypeLevelArithmetic";
import { Equal, Expect } from "./TypeTestUtils";

export type ExcludeFromTuple<T extends readonly unknown[], E> = T extends [
  infer F,
  ...infer R,
]
  ? [F] extends [E]
    ? ExcludeFromTuple<R, E>
    : [F, ...ExcludeFromTuple<R, E>]
  : [];

export type CartesianProductOfTypes<
  Ts1 extends readonly unknown[],
  Ts2 extends readonly unknown[],
> = AllCombos<Ts1, Ts2>[number];

export type AllCombos<
  Ts1 extends readonly unknown[],
  Ts2 extends readonly unknown[],
> = Flatten<AllCombosDeep<Ts1, Ts2>>;

type AllCombosDeep<
  Ts1 extends readonly unknown[],
  Ts2 extends readonly unknown[],
> = { [Index in keyof Ts1]: SplitFirst<Ts1[Index], Ts2> };
type SplitFirst<T, Ts extends readonly unknown[]> = {
  [Index in keyof Ts]: [T, Ts[Index]];
};

{
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type cases = [
    Expect<Equal<AllCombos<[], []>, []>>,
    Expect<Equal<AllCombos<[], [number]>, []>>,
    Expect<Equal<AllCombos<[number], []>, []>>,
    Expect<Equal<AllCombos<[number], [number]>, [[number, number]]>>,
    Expect<
      Equal<
        AllCombos<[number, string], [number]>,
        [[number, number], [string, number]]
      >
    >,
    Expect<
      Equal<
        AllCombos<[number, string], [number, string]>,
        [[number, number], [number, string], [string, number], [string, string]]
      >
    >,
    Expect<
      Equal<
        AllCombos<[number, string, object], [number, string]>,
        [
          [number, number],
          [number, string],
          [string, number],
          [string, string],
          [object, number],
          [object, string],
        ]
      >
    >,
  ];
}

type Flatten<Arr, Depth = 1, Helper extends unknown[] = []> = Arr extends []
  ? []
  : Helper["length"] extends Depth
    ? Arr
    : Arr extends [[...infer Ts], ...infer Tail]
      ? [...Flatten<Ts, Depth, Push<Helper>>, ...Flatten<Tail, Depth, Helper>]
      : Arr extends [infer Head, ...infer Tail]
        ? [Head, ...Flatten<Tail, Depth, Helper>]
        : Arr;

{
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type cases = [
    Expect<Equal<Flatten<[]>, []>>,
    Expect<Equal<Flatten<[1, 2, 3, 4]>, [1, 2, 3, 4]>>,
    Expect<Equal<Flatten<[1, [2]]>, [1, 2]>>,
    Expect<Equal<Flatten<[1, 2, [3, 4], [[5]]]>, [1, 2, 3, 4, [5]]>>,
    Expect<
      Equal<
        Flatten<[{ foo: "bar"; 2: 10 }, "foobar"]>,
        [{ foo: "bar"; 2: 10 }, "foobar"]
      >
    >,
  ];
}

{
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type cases = [
    Expect<Equal<Flatten<[], 2>, []>>,
    Expect<Equal<Flatten<[1, 2, 3, 4], 2>, [1, 2, 3, 4]>>,
    Expect<Equal<Flatten<[1, [2]], 2>, [1, 2]>>,
    Expect<Equal<Flatten<[1, 2, [3, 4], [[5]]], 2>, [1, 2, 3, 4, 5]>>,
    Expect<Equal<Flatten<[1, 2, [3, 4], [[[5]]]], 2>, [1, 2, 3, 4, [5]]>>,
    Expect<
      Equal<
        Flatten<[{ foo: "bar"; 2: 10 }, "foobar"]>,
        [{ foo: "bar"; 2: 10 }, "foobar"]
      >
    >,
  ];
}
