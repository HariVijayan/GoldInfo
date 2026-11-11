import { useContext } from "react";
import { RetailPricingContext } from "../context/retailPricingContext";

export function useRetailPricing() {
  const retailPricing = useContext(RetailPricingContext);
  if (retailPricing === null) {
    throw new Error("useRetailPricing must be used inside RetailPricingProvider.");
  }
  return retailPricing;
}
