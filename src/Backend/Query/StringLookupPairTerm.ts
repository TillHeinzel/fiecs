import { Backend } from "../Backend";
import { isStringlookup } from "../BasicTypes";
import { StringImplicitPairTermInput } from "../BasicTypes/StringImplicitPairTermInput";
import { Term } from "./BaseQuery";
import { handleFieldResults, handleFilterResults } from "./handleBasicResults";
import { Source } from "./Source";

export function stringLookupPairQueryTerm(
  t: StringImplicitPairTermInput,
  returnsMatch: boolean,
  source: Source,
  backend: Backend,
): Term {
  const handleResults = returnsMatch ? handleFieldResults : handleFilterResults;

  return {
    cacheAble: false,
    lookupStrings: () => {
      source.lookupStrings();

      const x = doStringPairLookup(t, backend);

      return (vs) => handleResults(x, source.getSourceFromVariables(vs));
    },
  };
}

function doStringPairLookup(t: StringImplicitPairTermInput, backend: Backend) {
  const frst = isStringlookup(t[0]) ? t[0].doLookup() : t[0];
  const scnd = isStringlookup(t[1]) ? t[1].doLookup() : t[1];

  return backend.lookupPairIndex(frst, scnd);
}
