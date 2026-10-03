# GoldInfo v2 --- TODO

**Goal:** Extend GoldInfo from an international gold-futures analyzer
into a reproducible INR-per-gram gold benchmark analysis application,
while retaining Yahoo Finance, the existing custom agent runtime,
FastAPI, SSE, React + TypeScript, and `qwen2.5:1.5b`.

**Scope:** Data retrieval, deterministic conversions, analysis, LLM
interpretation, downloadable artifacts, and documentation. Machine
learning and price prediction are explicitly deferred to v3.

------------------------------------------------------------------------

## 1. v2 scope and decisions

-   [ ] Keep Yahoo Finance via `yfinance` as the data source.
-   [ ] Keep the current Ollama model: `qwen2.5:1.5b`.
-   [ ] Keep the existing FastAPI backend, custom agent loop, and
    React + TypeScript frontend.
-   [ ] Support the same user-selectable historical period already
    accepted by GoldInfo, including 1, 5, and 10 years where data is
    available.
-   [ ] Retrieve gold futures prices in **USD per troy ounce** and
    USD/INR exchange-rate data for the same requested period.
-   [ ] Use the daily `Close` series as the input to the initial v2
    calculation, and document this choice.
-   [ ] Convert gold prices into **INR per troy ounce**, then into **INR
    per gram**.
-   [ ] Run the existing deterministic historical analysis on **INR per
    gram only**.
-   [ ] Pass the structured analysis results to Qwen for interpretation.
-   [ ] Let the frontend download five artifacts: USD/ounce data,
    USD/INR data, INR/ounce data, INR/gram data, and the final analysis
    text.
-   [ ] Do not add scikit-learn, prediction models, model switching,
    databases, schedulers, or other unnecessary infrastructure in v2.

### Explicitly out of scope

-   Machine learning and forecasting (v3).
-   Indian city-level prices or claims that the converted benchmark
    represents Indian retail prices.
-   Trading recommendations or automated trading.
-   Persistent storage of historical runs.
-   Switching between LLMs or adding an agent framework.

------------------------------------------------------------------------

## 2. Data definitions and calculation rules

### Instruments and units

-   [ ] Gold source: Yahoo Finance symbol `GC=F`, subject to runtime
    validation.
-   [ ] FX source: validate the Yahoo Finance symbol and quote
    convention for USD/INR before relying on it (commonly `INR=X`;
    confirm that values represent INR per USD).
-   [ ] Gold input unit: USD per troy ounce.
-   [ ] FX unit: INR per USD.
-   [ ] Intermediate output unit: INR per troy ounce.
-   [ ] Final analysis unit: INR per gram.
-   [ ] Use the troy-ounce conversion constant **1 troy ounce =
    31.1034768 grams**.

### Formulas

For each aligned date:

``` text
INR per troy ounce = gold close (USD/troy ounce) × USD/INR rate (INR/USD)

INR per gram = INR per troy ounce ÷ 31.1034768
```

-   [ ] Keep full floating-point precision through calculations.
-   [ ] Round values only for presentation; do not round the stored
    source or intermediate series prematurely.
-   [ ] Include units, ticker/symbol, source, requested period, actual
    coverage dates, and retrieval timestamp in metadata.
-   [ ] Document that this is a currency-converted international futures
    benchmark, **not** an observed Indian retail gold price. It excludes
    local premiums, duties, GST, making charges, and other costs.

### Date alignment and missing data

-   [ ] Retrieve both series for the same requested historical period
    and daily interval.
-   [ ] Normalize dates and sort observations chronologically.
-   [ ] Inspect the returned data shapes and `Close` fields; handle
    yfinance's possible MultiIndex columns.
-   [ ] Remove invalid/missing source observations before calculating
    derived values.
-   [ ] Define and document a consistent date-alignment policy. Prefer
    dates where both gold and FX observations are available; do not
    silently fabricate missing values.
-   [ ] Do not blindly forward-fill exchange rates. If a different
    alignment policy is later needed, make it explicit and test it.
-   [ ] Report the actual date coverage and observation count after
    alignment.
-   [ ] Raise a clear application error if either source is empty,
    invalid, or leaves too little aligned data to analyze.
-   [ ] Ensure the four output datasets use the same aligned dates so
    the transformations can be audited row by row.

------------------------------------------------------------------------

## 3. Generalize the market-data layer

Target module: `backend/market_data.py` (or a small helper module if
necessary).

-   [ ] Preserve existing functionality where practical.
-   [ ] Implement or refactor a function to retrieve gold futures
    history for a requested period.
-   [ ] Implement or refactor a function to retrieve USD/INR history for
    the same period.
-   [ ] Normalize both outputs into predictable, typed structures.
-   [ ] Keep source retrieval separate from conversion and analysis
    logic.
-   [ ] Include source symbols, units, coverage dates, and observation
    counts in returned metadata.
-   [ ] Test both source retrieval functions independently before
    integrating them.
-   [ ] Verify 1-year behavior first, then test 5- and 10-year requests
    where Yahoo Finance returns sufficient data.
-   [ ] Handle provider errors and empty responses with useful errors
    rather than fabricated values.

**Completion criterion:** Both source series can be retrieved and
validated independently for the requested period.

------------------------------------------------------------------------

## 4. Build the four datasets

Create a clear transformation pipeline. Keep the datasets in memory for
the current run; persistent storage is not required.

### Dataset 1 --- Gold in USD per troy ounce

Suggested artifact: `gold_usd_per_ounce.csv`

-   [ ] Include date and gold close in USD per troy ounce.
-   [ ] Preserve the source observation dates and values.
-   [ ] Use explicit column names and units.
-   [ ] Include only the source series required for reproducibility,
    plus any agreed source metadata.

### Dataset 2 --- USD/INR exchange rate

Suggested artifact: `usd_inr.csv`

-   [ ] Include date and INR per USD.
-   [ ] Confirm and document the quote convention.
-   [ ] Preserve the source dates and values used in the conversion.

### Dataset 3 --- Gold in INR per troy ounce

Suggested artifact: `gold_inr_per_ounce.csv`

-   [ ] Join the two source series according to the documented
    date-alignment policy.
-   [ ] Calculate INR per troy ounce using the formula above.
-   [ ] Include the gold USD price and FX rate used for each derived
    row, or make the relationship unambiguous through consistent dates
    and documented columns.
-   [ ] Validate the result against hand-calculated sample rows.

### Dataset 4 --- Gold in INR per gram

Suggested artifact: `gold_inr_per_gram.csv`

-   [ ] Derive this dataset from Dataset 3 using the troy-ounce-to-gram
    constant.
-   [ ] Include date and INR per gram.
-   [ ] Preserve full calculation precision in the CSV.
-   [ ] Validate sample rows against manual calculations.

### Dataset invariants

-   [ ] All four artifacts represent the same analysis run.
-   [ ] Dates are sorted ascending and are not duplicated.
-   [ ] Derived rows can be traced to their source observations.
-   [ ] Dataset 3 equals Dataset 1 multiplied by Dataset 2 for each
    aligned date, within floating-point tolerance.
-   [ ] Dataset 4 equals Dataset 3 divided by `31.1034768`, within
    floating-point tolerance.
-   [ ] Never label the INR-per-gram series as an Indian retail or
    city-level price.

**Completion criterion:** All four datasets are produced, consistent,
auditable, and independently downloadable.

------------------------------------------------------------------------

## 5. Analyze INR per gram only

Target: reuse and adapt `backend/analysis.py`.

-   [ ] Pass Dataset 4 to the deterministic analysis layer.
-   [ ] Keep Python as the source of truth for all numerical metrics.
-   [ ] Preserve existing metrics where applicable:
    -   Latest price and observation date.
    -   Previous observation and date.
    -   One-session percentage change.
    -   Seven-day percentage change.
    -   Thirty-day percentage change.
    -   Historical high and its date.
    -   Historical low and its date.
    -   Position within the historical range.
    -   Distance below the historical high.
    -   Observation count and actual period coverage.
-   [ ] Ensure all reported prices and price-based metrics clearly state
    INR per gram.
-   [ ] Keep the existing calendar-day reference policy for 7-day and
    30-day changes: use the latest available observation on or before
    the target date.
-   [ ] Handle insufficient observations and zero denominators safely.
-   [ ] Review metric descriptions so that range position, distance
    below high, and reference dates are not misinterpreted.
-   [ ] Add deterministic tests with small synthetic series whose
    expected results are known.

**Completion criterion:** The analysis layer consumes only the derived
INR-per-gram series and returns validated structured metrics.

------------------------------------------------------------------------

## 6. Update the agent workflow

Target: `backend/agent.py`.

Required logical workflow:

``` text
Parse user request and historical period
                 |
                 v
Retrieve gold USD/troy-ounce series
                 |
                 v
Retrieve USD/INR series
                 |
                 v
Validate and align source observations
                 |
                 v
Build INR/troy-ounce dataset
                 |
                 v
Build INR/gram dataset
                 |
                 v
Analyze INR/gram dataset only
                 |
                 v
Ask Qwen to interpret structured metrics
                 |
                 v
Return final analysis + artifact references
```

-   [ ] Keep the existing custom tool-calling runtime and Qwen model.
-   [ ] Keep raw series and derived datasets in Python application state
    for the duration of the run.
-   [ ] Enforce required workflow stages in Python rather than trusting
    the model to execute them in order.
-   [ ] Ensure the LLM receives structured INR-per-gram analysis
    results, not thousands of raw historical rows.
-   [ ] Prompt the model to use supplied values, dates, and units
    accurately.
-   [ ] Make it clear that the series is an international gold-futures
    benchmark converted into INR per gram, not an Indian retail quote.
-   [ ] Generate `analysis.txt` from the final model summary, with
    useful metadata such as requested period, actual coverage, source
    symbols, and units.
-   [ ] Keep agent progress events decoupled from CLI logging.
-   [ ] Preserve clear failure behavior if retrieval, conversion,
    analysis, or inference fails.
-   [ ] Do not expose partially generated or mismatched artifacts as if
    the run had succeeded.

**Completion criterion:** One request produces the four consistent
datasets, deterministic analysis, final Qwen interpretation, and
downloadable artifact references.

------------------------------------------------------------------------

## 7. Add artifact downloads to the API

Required artifacts:

1.  `gold_usd_per_ounce.csv`
2.  `usd_inr.csv`
3.  `gold_inr_per_ounce.csv`
4.  `gold_inr_per_gram.csv`
5.  `analysis.txt`

-   [ ] Define stable artifact identifiers and filenames.
-   [ ] Associate artifacts with the specific completed analysis run
    that generated them.
-   [ ] Decide on a lightweight delivery mechanism compatible with the
    current local-only application.
-   [ ] Prefer a per-run artifact identifier and download endpoint, or
    an equivalent safe mechanism, rather than putting large CSV contents
    into every SSE event.
-   [ ] Return artifact metadata/references with the final SSE event.
-   [ ] Add a download endpoint that returns the correct content type
    and `Content-Disposition` filename.
-   [ ] Return a clear not-found response for an invalid or expired
    artifact reference.
-   [ ] Ensure failed runs cannot expose stale artifacts from a previous
    run.
-   [ ] Keep the existing `GET /api/health`, `POST /api/analyze`, and
    `POST /api/analyze/stream` behavior working, updating response
    schemas where needed.
-   [ ] Test each download and verify its filename, content type,
    header, and contents.

**Suggested final SSE payload shape:**

``` json
{
  "status": "success",
  "analysis": "Final Qwen interpretation...",
  "artifacts": [
    {
      "id": "gold_usd_per_ounce",
      "filename": "gold_usd_per_ounce.csv",
      "download_url": "/api/artifacts/<run-id>/gold_usd_per_ounce"
    },
    {
      "id": "usd_inr",
      "filename": "usd_inr.csv",
      "download_url": "/api/artifacts/<run-id>/usd_inr"
    },
    {
      "id": "gold_inr_per_ounce",
      "filename": "gold_inr_per_ounce.csv",
      "download_url": "/api/artifacts/<run-id>/gold_inr_per_ounce"
    },
    {
      "id": "gold_inr_per_gram",
      "filename": "gold_inr_per_gram.csv",
      "download_url": "/api/artifacts/<run-id>/gold_inr_per_gram"
    },
    {
      "id": "analysis",
      "filename": "analysis.txt",
      "download_url": "/api/artifacts/<run-id>/analysis"
    }
  ]
}
```

This is a proposed contract; finalize it when implementing the endpoint.
Since the app is local-only and no database is in scope, in-memory
per-run artifact storage is sufficient initially. Document that
artifacts are ephemeral and disappear when the backend restarts.

------------------------------------------------------------------------

## 8. Upgrade the React + TypeScript frontend

-   [ ] Keep the current request form and streaming status display.
-   [ ] Preserve the current running, success, and error states.
-   [ ] Continue displaying the final summary only when the final event
    is received.
-   [ ] Read artifact references from the final SSE payload.
-   [ ] Display exactly five download buttons after a successful run:
    1.  Download USD/ounce data
    2.  Download USD/INR data
    3.  Download INR/ounce data
    4.  Download INR/gram data
    5.  Download analysis.txt
-   [ ] Trigger downloads using the returned artifact URLs.
-   [ ] Use the backend-provided filenames.
-   [ ] Disable or hide artifact buttons while a run is incomplete.
-   [ ] Clear previous run's download links when a new run starts.
-   [ ] Display useful errors if a download fails or the artifact has
    expired.
-   [ ] Keep the UI simple; avoid adding charts or model-selection
    controls in v2 unless they become necessary.

**Completion criterion:** The frontend streams progress, displays the
final analysis, and provides five working downloads belonging to that
exact run.

------------------------------------------------------------------------

## 9. Testing and verification

### Data retrieval

-   [ ] Test gold history retrieval independently.
-   [ ] Test USD/INR retrieval independently.
-   [ ] Confirm both series cover the requested period as far as the
    source allows.
-   [ ] Confirm returned columns and quote conventions.
-   [ ] Test empty, malformed, and partially missing source data.

### Transformations

-   [ ] Verify INR/ounce with hand-calculated examples.
-   [ ] Verify INR/gram with hand-calculated examples.
-   [ ] Test date alignment and missing-date behavior.
-   [ ] Assert the dataset invariants described above.
-   [ ] Confirm CSVs contain numeric values, clear column names, and
    ascending dates.

### Analysis and inference

-   [ ] Verify metrics against synthetic data with known answers.
-   [ ] Confirm the analysis layer receives INR per gram, not USD per
    ounce or INR per ounce.
-   [ ] Confirm the LLM receives the structured metrics and correct
    unit/benchmark context.
-   [ ] Check that the final summary does not claim to predict future
    prices.
-   [ ] Verify model errors produce a clear error event.

### API and frontend

-   [ ] Verify `GET /api/health`.
-   [ ] Verify the existing JSON analysis endpoint.
-   [ ] Verify SSE events arrive incrementally.
-   [ ] Verify the final event includes analysis and all five artifact
    references.
-   [ ] Download and inspect each artifact.
-   [ ] Start a new run and confirm old artifact links are cleared from
    the UI.
-   [ ] Verify missing/expired artifacts are handled cleanly.
-   [ ] Run a 1-year analysis end to end, then verify 5- and 10-year
    requests where data is available.

------------------------------------------------------------------------

## 10. Documentation

-   [ ] Update `README.md` with the v2 architecture and workflow.
-   [ ] Document setup, dependencies, Ollama model, and run commands.
-   [ ] Document ticker symbols, source fields, units, and formulas.
-   [ ] Document the troy-ounce-to-gram conversion constant.
-   [ ] Explain the difference between an INR-converted international
    futures benchmark and Indian retail gold prices.
-   [ ] Document missing-data and date-alignment behavior.
-   [ ] Document the API endpoints, SSE event contract, and artifact
    download URLs.
-   [ ] Explain that artifacts are held in memory and are not
    persistent.
-   [ ] List known limitations of Yahoo Finance and `yfinance`.
-   [ ] Document manual verification steps and automated tests.
-   [ ] Record v3 as the planned next milestone.

------------------------------------------------------------------------

## 11. v2 completion criteria

v2 is complete when all of the following are true:

-   [ ] Gold futures and USD/INR histories are retrieved for the same
    requested period.
-   [ ] The INR-per-ounce and INR-per-gram datasets are derived
    deterministically.
-   [ ] All four CSV artifacts can be downloaded and their calculations
    verified.
-   [ ] Historical analysis uses only the INR-per-gram dataset.
-   [ ] Qwen generates the final interpretation from structured analysis
    metrics.
-   [ ] The frontend streams progress and displays the final summary.
-   [ ] The frontend exposes five working artifact-download buttons.
-   [ ] Retrieval, conversion, analysis, inference, and download
    failures are handled explicitly.
-   [ ] The README describes the architecture, formulas, limitations,
    and usage.
-   [ ] Existing GoldInfo behavior remains functional where intended.

------------------------------------------------------------------------

## 12. v3 --- deferred

Do not implement these items in v2.

-   [ ] Add scikit-learn and a defined ML experimentation workflow.
-   [ ] Establish baseline forecasting models before testing more
    complex algorithms.
-   [ ] Use chronological train/validation/test splits to avoid
    time-series leakage.
-   [ ] Compare predictions against simple baselines.
-   [ ] Report evaluation metrics and uncertainty; do not present
    forecasts as facts.
-   [ ] Keep ML predictions separate from historical descriptive
    analysis and LLM interpretation.
