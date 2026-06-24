import { Backend } from "../Backend";
import { Term } from "./BaseQuery";

export function optionalTerm(t: Term, backend: Backend): Term {
  return {
    cacheAble: t.cacheAble,
    lookupStrings: () => {
      const tryGetMatch = t.lookupStrings();

      return (v) => {
        const matchOutcome = tryGetMatch(v);

        switch (matchOutcome.result) {
          case "successfulField":
            return matchOutcome;

          case "failedField":
            return {
              result: "successfulField",
              source: matchOutcome.source,
              matches: [undefined].values(),
            };

          case "successfulFilter":
            throw new Error("internal: cannot have filters inside optional");

          case "failedFilter":
            throw new Error("internal: cannot have filters inside optional");

          case "missingSourceVariable":
            return {
              result: "missingSourceVariable",
              varName: matchOutcome.varName,
              candidates: backend.getAllArchetypes(),
            };

          case "missingVariable":
            return matchOutcome;

          case "needVariableAsEntity":
            return matchOutcome;
        }
      };
    },
  };
}
