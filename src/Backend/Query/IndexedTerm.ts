import { IndexedTerm } from "../BasicTypes/BasicObjects";
import { Term } from "./BaseQuery";
import { handleFieldResults, handleFilterResults } from "./handleBasicResults";
import { Source } from "./Source";

export function indexedQueryTerm(
  t: IndexedTerm,
  returnsMatch: boolean,
  source: Source,
): Term {
  const handleResults = returnsMatch ? handleFieldResults : handleFilterResults;

  return {
    lookupStrings: () => {
      source.lookupStrings();

      return (vs) => handleResults(t, source.getSourceFromVariables(vs));
    },
    cacheAble: source.isThis(),
  };
}
