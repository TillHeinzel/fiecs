import {
  IndexedTerm,
  StringImplicitPairTermInput,
  StringLookup,
  Variable,
  VariableImplicitPairTermInput,
} from "../BasicTypes";

export type BasicTermInput =
  | IndexedTerm
  | StringLookup
  | Variable
  | StringImplicitPairTermInput
  | VariableImplicitPairTermInput;
