import { Equal, Expect } from "./TypeTestUtils";

export type Increment<I extends number> = Add<I, 1>;

{
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type cases = [Expect<Equal<Increment<1>, 2>>, Expect<Equal<Increment<2>, 3>>];
}

export type Decrement<I extends number> = ArrayLength<
  Pop1<CreateArrayOfLength<I>>
>;

{
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type cases = [
    Expect<Equal<Decrement<0>, 0>>,
    Expect<Equal<Decrement<1>, 0>>,
    Expect<Equal<Decrement<2>, 1>>,
    Expect<Equal<Decrement<3>, 2>>,
  ];
}

export type Add<N extends number, M extends number> = ArrayLength<
  Concat<CreateArrayOfLength<N>, CreateArrayOfLength<M>>
>;

{
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type cases = [
    Expect<Equal<Add<0, 0>, 0>>,
    Expect<Equal<Add<1, 0>, 1>>,
    Expect<Equal<Add<1, 1>, 2>>,
    Expect<Equal<Add<3, 5>, 8>>,
  ];
}

export type Subtract<N extends number, M extends number> = ArrayLength<
  Pop<CreateArrayOfLength<N>, M>
>;

{
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type cases = [
    Expect<Equal<Subtract<0, 0>, 0>>,
    Expect<Equal<Subtract<1, 0>, 1>>,
    Expect<Equal<Subtract<1, 1>, 0>>,
    Expect<Equal<Subtract<3, 5>, 0>>,
    Expect<Equal<Subtract<11, 2>, 9>>,
  ];
}

type CreateArrayOfLength<
  Length extends number,
  Arr extends unknown[] = [],
> = Arr["length"] extends Length
  ? Arr
  : CreateArrayOfLength<Length, [...Arr, unknown]>;

{
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type cases = [
    Expect<Equal<CreateArrayOfLength<0>, []>>,
    Expect<Equal<CreateArrayOfLength<1>, [unknown]>>,
    Expect<Equal<CreateArrayOfLength<2>, [unknown, unknown]>>,
    Expect<Equal<CreateArrayOfLength<3>, [unknown, unknown, unknown]>>,
  ];
}

type Concat<A1 extends unknown[], A2 extends unknown[]> = [...A1, ...A2];

{
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type cases = [
    Expect<Equal<Concat<[], []>, []>>,
    Expect<Equal<Concat<[unknown], []>, [unknown]>>,
    Expect<Equal<Concat<[unknown], [number]>, [unknown, number]>>,
    Expect<
      Equal<Concat<[unknown, string], [number]>, [unknown, string, number]>
    >,
  ];
}

export type ArrayLength<A extends unknown[]> = A["length"];

{
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type cases = [
    Expect<Equal<ArrayLength<[]>, 0>>,
    Expect<Equal<ArrayLength<[number]>, 1>>,
    Expect<Equal<ArrayLength<[number, string]>, 2>>,
    Expect<Equal<ArrayLength<[undefined, number, string, unknown]>, 4>>,
  ];
}

export type Push<A extends unknown[], T = unknown> = [...A, T];

{
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type cases = [
    Expect<Equal<Push<[], unknown>, [unknown]>>,
    Expect<Equal<Push<[string], unknown>, [string, unknown]>>,
    Expect<Equal<Push<[string, unknown], unknown>, [string, unknown, unknown]>>,
    Expect<Equal<Push<[string, unknown]>, [string, unknown, unknown]>>,
  ];
}

type Pop1<A extends unknown[]> = A extends [...infer Head, unknown] ? Head : [];

{
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type cases = [
    Expect<Equal<Pop1<[]>, []>>,
    Expect<Equal<Pop1<[unknown]>, []>>,
    Expect<Equal<Pop1<[unknown, unknown]>, [unknown]>>,
  ];
}

type Pop<
  A extends unknown[],
  N extends number = 1,
  Helper extends unknown[] = [],
> = ArrayLength<Helper> extends N ? A : Pop<Pop1<A>, N, Push<Helper>>;

{
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type cases = [
    Expect<Equal<Pop<[], 0>, []>>,
    Expect<Equal<Pop<[]>, []>>,
    Expect<Equal<Pop<[unknown]>, []>>,
    Expect<Equal<Pop<[unknown, unknown]>, [unknown]>>,
    Expect<Equal<Pop<[], 1>, []>>,
    Expect<Equal<Pop<[], 5>, []>>,
    Expect<Equal<Pop<[unknown], 1>, []>>,
    Expect<Equal<Pop<[unknown, unknown], 2>, []>>,
    Expect<Equal<Pop<[unknown, unknown], 1>, [unknown]>>,
    Expect<Equal<Pop<[unknown, unknown], 0>, [unknown, unknown]>>,
  ];
}
