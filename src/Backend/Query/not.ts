import { Backend } from "../Backend";
import { Term } from "./BaseQuery";

export function notTerm(t: Term, backend: Backend): Term {
  return {
    cacheAble: t.cacheAble,
    lookupStrings: () => {
      const tryGetMatch = t.lookupStrings();

      return (v) => {
        const matchOutcome = tryGetMatch(v);

        switch (matchOutcome.result) {
          case "failedField":
            return { result: "successfulFilter" };

          case "failedFilter":
            return { result: "successfulFilter" };

          case "successfulField":
            return { result: "failedFilter" };

          case "successfulFilter":
            return { result: "failedFilter" };

          case "missingSourceVariable": {
            return {
              result: "missingSourceVariable",
              varName: matchOutcome.varName,
              candidates: backend.getAllArchetypes(),
            };
          }

          case "missingVariable":
            throw new Error("internal: Error! Error! Error!");

          case "needVariableAsEntity":
            return matchOutcome;
        }
      };
    },
  };
}
