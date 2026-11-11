import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  DEFAULT_PRICE_VIEW,
  DEFAULT_RETAIL_CHARGE_PCT,
  PRICE_VIEW_STORAGE_KEY,
  RETAIL_CHARGE_STORAGE_KEY,
} from "../config/retailPricingConfig";
import type { PriceView } from "../types/retailPricingTypes";
import { isValidRetailChargePct } from "../utils/retailChargeInput";
import { RetailPricingContext } from "./retailPricingContext";

/** Storage can be blocked or full. A failure only costs persistence. */
function readStoredValue(storageKey: string): string | null {
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function writeStoredValue(storageKey: string, storedValue: string): void {
  try {
    window.localStorage.setItem(storageKey, storedValue);
  } catch {
    // Nothing to do: the setting still works for this session.
  }
}

function loadInitialRetailChargePct(): number {
  const storedText = readStoredValue(RETAIL_CHARGE_STORAGE_KEY);
  if (storedText === null || storedText.trim() === "") return DEFAULT_RETAIL_CHARGE_PCT;
  const storedNumber = Number(storedText);
  return isValidRetailChargePct(storedNumber) ? storedNumber : DEFAULT_RETAIL_CHARGE_PCT;
}

function loadInitialPriceView(): PriceView {
  const storedText = readStoredValue(PRICE_VIEW_STORAGE_KEY);
  return storedText === "original" || storedText === "retail" ? storedText : DEFAULT_PRICE_VIEW;
}

export function RetailPricingProvider({ children }: { children: ReactNode }) {
  const [retailChargePct, setRetailChargePct] = useState(loadInitialRetailChargePct);
  const [priceView, setPriceViewState] = useState(loadInitialPriceView);

  const commitRetailChargePct = useCallback((nextRetailChargePct: number) => {
    if (!isValidRetailChargePct(nextRetailChargePct)) return;
    setRetailChargePct(nextRetailChargePct);
    writeStoredValue(RETAIL_CHARGE_STORAGE_KEY, String(nextRetailChargePct));
  }, []);

  const setPriceView = useCallback((nextPriceView: PriceView) => {
    setPriceViewState(nextPriceView);
    writeStoredValue(PRICE_VIEW_STORAGE_KEY, nextPriceView);
  }, []);

  const contextValue = useMemo(
    () => ({ retailChargePct, priceView, commitRetailChargePct, setPriceView }),
    [retailChargePct, priceView, commitRetailChargePct, setPriceView]
  );

  return (
    <RetailPricingContext.Provider value={contextValue}>{children}</RetailPricingContext.Provider>
  );
}
