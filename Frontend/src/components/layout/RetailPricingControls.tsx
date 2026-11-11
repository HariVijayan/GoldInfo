import { useState, type KeyboardEvent } from "react";
import { PRICE_VIEW_OPTIONS } from "../../config/retailPricingConfig";
import { useRetailPricing } from "../../hooks/useRetailPricing";
import { checkRetailChargeText } from "../../utils/retailChargeInput";

/**
 * The retail charge field and the Original / Retail switch, shown beside the
 * page title. The charge is committed (and the data refetched) only when the
 * user finishes: on Enter or when the field loses focus. The switch changes
 * the display at once, because every response carries both views.
 */
export function RetailPricingControls() {
  const { retailChargePct, priceView, commitRetailChargePct, setPriceView } = useRetailPricing();
  const [typedText, setTypedText] = useState(String(retailChargePct));
  const [errorMessage, setErrorMessage] = useState("");

  const finishEditing = () => {
    const check = checkRetailChargeText(typedText);

    if (!check.isValid) {
      setErrorMessage(check.errorMessage);
      return;
    }

    setErrorMessage("");
    setTypedText(String(check.retailChargePct));
    if (check.retailChargePct !== retailChargePct) {
      commitRetailChargePct(check.retailChargePct);
    }
  };

  const handleKeyDown = (keyEvent: KeyboardEvent<HTMLInputElement>) => {
    if (keyEvent.key === "Enter") {
      keyEvent.preventDefault();
      finishEditing();
    }
  };

  return (
    <div className="retail-controls" aria-label="Retail pricing">
      <div className="field retail-charge-field">
        <label className="field-label" htmlFor="retail-charge-input">
          Retail charge (%)
        </label>
        <input
          id="retail-charge-input"
          className="field-input"
          type="number"
          inputMode="decimal"
          min={0}
          max={100}
          step="any"
          value={typedText}
          aria-invalid={errorMessage ? true : undefined}
          aria-describedby="retail-charge-hint"
          onChange={(changeEvent) => setTypedText(changeEvent.target.value)}
          onBlur={finishEditing}
          onKeyDown={handleKeyDown}
        />
        <small
          id="retail-charge-hint"
          className={errorMessage ? "field-hint field-hint-error" : "field-hint"}
          role={errorMessage ? "alert" : undefined}
        >
          {errorMessage || "Added to INR gold prices for the Retail view."}
        </small>
      </div>

      <div className="field">
        <span className="field-label" id="price-view-label">
          Prices shown
        </span>
        <div role="radiogroup" aria-labelledby="price-view-label" className="period-picker">
          {PRICE_VIEW_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={priceView === option.value}
              className="period-option"
              onClick={() => setPriceView(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
