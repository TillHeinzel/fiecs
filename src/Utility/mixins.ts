/* eslint-disable @typescript-eslint/no-explicit-any */

export type MixinBase<T = any> = new (...args: any[]) => T;

type GetProps<TBase> = TBase extends new (props: infer P) => any ? P : never;
type GetInstance<TBase> = TBase extends new (...args: any[]) => infer I
  ? I
  : never;
export type MergeCtor<A, B> = new (
  props: GetProps<A> & GetProps<B>,
) => GetInstance<A> & GetInstance<B>;
