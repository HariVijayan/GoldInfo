import { useState } from "react";

/**
 * The open/closed state of a panel that should fold away once a result
 * arrives (the procedure panel). It starts open, closes the moment
 * `hasResult` turns true, and the user can open or close it again. Starting
 * a new run does not reopen it.
 */
export function useCollapseWhenResultArrives(hasResult: boolean) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [hadResult, setHadResult] = useState(hasResult);

  // Adjusting state while rendering avoids a flash of the old layout.
  if (hasResult !== hadResult) {
    setHadResult(hasResult);
    if (hasResult) setIsExpanded(false);
  }

  return { isExpanded, toggle: () => setIsExpanded((wasExpanded) => !wasExpanded) };
}
