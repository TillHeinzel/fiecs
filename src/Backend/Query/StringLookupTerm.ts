import { StringLookup } from "../BasicTypes";
import { Term } from "./BaseQuery";
import { handleFieldResults, handleFilterResults } from "./handleBasicResults";
import { Source } from "./Source";

export function stringLookupQueryTerm(
  t: StringLookup,
  returnsMatch: boolean,
  source: Source,
): Term {
  const handleResults = returnsMatch ? handleFieldResults : handleFilterResults;

  return {
    lookupStrings: () => {
      source.lookupStrings();

      const x = t.doLookup();

      return (vs) => handleResults(x, source.getSourceFromVariables(vs));
    },
    cacheAble: false,
  };
}
