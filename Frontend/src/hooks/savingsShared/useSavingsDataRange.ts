import { useCallback, useEffect, useState } from "react";
import { describeError } from "../../api/apiErrors";
import { fetchSavingsDataRange } from "../../api/savingsShared/savingsDataRangeApi";
import type { SavingsDataRange } from "../../types/savingsShared/savingsSharedTypes";

/** The first and last date a savings comparison can use. */
export function useSavingsDataRange() {
  const [dataRange, setDataRange] = useState<SavingsDataRange | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    const requestController = new AbortController();

    fetchSavingsDataRange(requestController.signal)
      .then((loadedRange) => {
        setDataRange(loadedRange);
        setErrorMessage("");
      })
      .catch((caughtError: unknown) => {
        if (requestController.signal.aborted) return;
        setErrorMessage(describeError(caughtError));
      });

    return () => requestController.abort();
  }, [reloadCount]);

  const retry = useCallback(() => {
    setErrorMessage("");
    setReloadCount((currentCount) => currentCount + 1);
  }, []);

  return { dataRange, errorMessage, retry };
}
