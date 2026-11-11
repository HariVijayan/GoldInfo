import { useEffect, useRef } from "react";

/**
 * Runs `rerun` when the committed retail charge changes, but only if the tab
 * has a result or a run in progress. A tab nobody has used yet is left alone.
 * The first render never triggers a run.
 */
export function useRerunOnRetailChargeChange(
  retailChargePct: number,
  hasResultOrRun: boolean,
  rerun: () => void
): void {
  const latestArguments = useRef({ hasResultOrRun, rerun });
  const previousRetailChargePct = useRef(retailChargePct);

  useEffect(() => {
    latestArguments.current = { hasResultOrRun, rerun };
  });

  useEffect(() => {
    if (previousRetailChargePct.current === retailChargePct) return;
    previousRetailChargePct.current = retailChargePct;

    if (latestArguments.current.hasResultOrRun) {
      latestArguments.current.rerun();
    }
  }, [retailChargePct]);
}
