import { IndexedTerm } from "../BasicTypes/BasicObjects";
import { GetMatchOutcome } from "./BaseQuery";
import { SourceLookupOutcome } from "./Source";

export function noGetMatch(
  sourceOutcome: SourceLookupOutcome,
): GetMatchOutcome {
  switch (sourceOutcome.result) {
    case "success": {
      return { result: "failedField", source: sourceOutcome.source };
    }
    case "missingSourceVariable":
      return { ...sourceOutcome, candidates: [].values() };
  }

  throw new Error("internal: Well, I guess I f'ed something up");
}

export function handleFilterResults(
  indexToMatch: IndexedTerm,
  sourceOutcome: SourceLookupOutcome,
): GetMatchOutcome {
  const candidates = indexToMatch.archetypesWithMatches();

  switch (sourceOutcome.result) {
    case "success": {
      const matches = candidates.get(sourceOutcome.archetype);

      if (matches === undefined) return { result: "failedFilter" };

      return {
        result: "successfulFilter",
      };
    }

    case "missingSourceVariable":
      return { ...sourceOutcome, candidates: candidates.keys() };
  }

  throw new Error("internal: Well, I guess I f'ed something up");
}

export function handleFieldResults(
  indexToMatch: IndexedTerm,
  sourceOutcome: SourceLookupOutcome,
): GetMatchOutcome {
  const candidates = indexToMatch.archetypesWithMatches();

  switch (sourceOutcome.result) {
    case "success": {
      const matches = candidates.get(sourceOutcome.archetype);

      if (matches === undefined)
        return { result: "failedField", source: sourceOutcome.source };

      return {
        result: "successfulField",
        source: sourceOutcome.source,
        matches: matches.keys(),
      };
    }

    case "missingSourceVariable":
      return { ...sourceOutcome, candidates: candidates.keys() };
  }

  throw new Error("internal: Well, I guess I f'ed something up");
}
