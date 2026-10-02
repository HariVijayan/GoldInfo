# GoldInfo — Local Gold Price Analysis Agent

## 1. Project Overview

**GoldInfo** is a small, locally run AI-agent application that retrieves historical international gold futures prices, calculates useful statistics, and generates a concise analysis using a locally hosted language model.

The project is intended as a learning prototype and showcase. Its focus is to demonstrate how a custom tool-calling agent can be integrated with a Python backend and a minimal React frontend.

### Goals

- Retrieve approximately one year of daily gold futures price data.
- Calculate historical price statistics using Python.
- Use a local LLM to interpret the calculated results.
- Implement a custom agent loop with tool calling, without an agent framework.
- Expose the workflow through a FastAPI backend.
- Display execution progress and the final report in a single-page React UI.
- Keep the project small enough to build and understand in one evening.

### Out of Scope

The initial version will not include:

- A scheduler or automatic daily execution.
- Automated trading or investment recommendations.
- Model training or fine-tuning.
- Multiple agents.
- Persistent memory or a database.
- Authentication or user accounts.
- A complex frontend, charting system, or design framework.
- A formal unit-testing suite.

## 2. User Experience

The user opens the React page and clicks **Analyze Gold Prices**.

The application then:

1. Retrieves the latest available gold futures data and approximately one year of historical observations.
2. Validates and processes the data.
3. Calculates historical statistics.
4. Runs the custom agent loop, allowing the model to request registered tools.
5. Generates a concise analysis based on the retrieved data.
6. Displays execution progress, metrics, the analysis, the data source, and the latest observation date.

The application runs on demand. There is no scheduler.

## 3. Proposed Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React + Vite | Single-page user interface |
| Frontend language | JavaScript | Keep the initial implementation simple |
| Styling | Plain CSS | Minimal, readable dashboard |
| Backend | Python + FastAPI | API and orchestration |
| Local model runtime | Ollama | Run an LLM locally |
| Initial model | `qwen2.5:1.5b` | Lightweight starting point for limited hardware |
| Market data | `yfinance` | Retrieve historical gold futures data |
| Data processing | pandas | Process observations and calculate statistics |
| Agent runtime | Custom Python tool-calling loop | Learn the core agent mechanism directly |
| Progress updates | Server-Sent Events (SSE) | Stream real execution progress to the frontend |
| Persistence | None | Keep the initial version stateless |

The initial development machine runs Windows with 8 GB RAM, an Intel Core i7-10510U CPU, and integrated Intel UHD graphics. The model choice is a starting point and may need adjustment based on actual inference speed and tool-calling reliability.

## 4. Data Source and Scope

The prototype will use Yahoo Finance data through `yfinance`, starting with the `GC=F` ticker for COMEX gold futures.

- **Instrument:** Gold futures (`GC=F`)
- **Requested historical period:** Approximately one year
- **Interval:** Daily
- **Reference price:** Daily closing-price series, not a guaranteed real-time spot quote
- **Currency/unit:** USD per troy ounce

The application must distinguish the latest available observation from today's calendar date. On weekends, holidays, or before a new market observation is available, the latest record may be older than the current date.

`yfinance` is an unofficial interface to Yahoo Finance data, not a guaranteed production-grade market-data service. Retrieval may fail or change if the upstream service changes. The UI and report should show the source and observation date.

## 5. Planned Analysis

Python, rather than the LLM, will calculate numerical statistics. The LLM will interpret the resulting structured data.

Planned metrics:

- Latest available closing price and observation date.
- Previous available closing price.
- One-session percentage change.
- Approximately 7-calendar-day percentage change.
- Approximately 30-calendar-day percentage change.
- Historical high and low for the retrieved period.
- Position of the latest price within the historical range.
- Percentage distance below the historical high.

The report should describe historical observations without presenting them as predictions. A price near a historical high does not, by itself, establish that gold is overvalued or likely to fall.

Missing or stale data must be identified rather than invented or silently replaced with plausible values.

## 6. Agent Design

The backend will implement its own small tool-calling loop using the Ollama Python client. No agent framework is required for the initial version.

### Planned tools

1. **`get_gold_history`**
   - Retrieves and validates historical gold futures observations.
   - Returns the data and relevant metadata.

2. **`analyze_gold_history`**
   - Calculates the planned historical statistics.
   - Returns a structured summary for the model to interpret.

The agent receives a goal, sees the available tool definitions, requests tool calls when needed, receives their results, and continues until it returns a final response or reaches an execution limit.

Only registered tools may execute. Tool arguments must be validated, unknown tools rejected, and the number of iterations bounded. The model must not execute arbitrary code.

If the selected small model struggles to use two tools reliably, the fallback is to expose a single analysis tool that retrieves the data and calculates the metrics. The custom tool-calling loop remains part of the project.

## 7. Backend and Frontend Architecture

```text
React Frontend
  - Analyze button
  - Live execution progress
  - Historical statistics
  - Final AI analysis
          |
          | HTTP POST + streamed events
          v
FastAPI Backend
  - POST /api/analyze
  - Progress/event streaming
  - Agent orchestration
          |
          v
Custom Agent Runtime
  - Ollama model client
  - Tool registry and execution loop
  - Execution limits and error handling
       |                 |
       v                 v
Market-data tool    Analysis tool
       |                 |
       v                 v
Yahoo Finance       pandas/Python
          |
          v
     Local Ollama model
```

### API approach

The initial backend will expose one main endpoint:

- `POST /api/analyze`

The endpoint will stream progress events and the final result. Since the browser's native `EventSource` API is primarily designed for GET-based event streams, the React frontend will use `fetch()` and read the streamed response.

Progress must reflect actual backend execution rather than a timer or simulated sequence.

The backend must avoid blocking FastAPI's event loop during slow inference or data retrieval. A small background worker and thread-safe event queue are acceptable for this prototype; a distributed task queue is unnecessary.

The frontend and backend will run locally as separate development processes. CORS will be configured for the local Vite origin.

## 8. Proposed Repository Structure

```text
GoldInfo/
├── backend/
│   ├── main.py
│   ├── agent.py
│   ├── market_data.py
│   ├── analysis.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   ├── package.json
│   └── index.html
├── .gitignore
└── README.md
```

This is an intentionally minimal structure. The implementation can be reorganized later if it grows.

## 9. TODO Checklist

The checklist below is for the initial implementation. Once a step is completed, mark it as done. After the prototype is complete, replace this checklist with the actual implementation details and decisions.

### Phase 1 — Prepare the Windows Environment

- [ ] Verify Python, Node.js/npm, and Git availability.
- [ ] Choose the project directory.
- [ ] Install Ollama for Windows.
- [ ] Verify that the Ollama service and local API are available.
- [ ] Download `qwen2.5:1.5b`.
- [ ] Run a simple prompt to confirm local inference works.

### Phase 2 — Create the Project Skeleton

- [ ] Create the `GoldInfo` project directory and proposed folder structure.
- [ ] Create a Python virtual environment in `backend`.
- [ ] Install FastAPI, Uvicorn, Ollama, yfinance, and pandas.
- [ ] Initialize the React frontend using Vite.
- [ ] Confirm that the frontend and backend can start independently.
- [ ] Add a `.gitignore` for virtual environments, dependencies, local configuration, and generated files.

### Phase 3 — Implement Market-Data Retrieval

- [ ] Create `backend/market_data.py`.
- [ ] Retrieve approximately one year of daily data for `GC=F`.
- [ ] Inspect the returned data and expected price column.
- [ ] Validate that the result is not empty and contains usable observations.
- [ ] Handle missing values and ensure observations are ordered by date.
- [ ] Preserve the latest observation date and data-source metadata.
- [ ] Handle network errors and provider failures.
- [ ] Run the retrieval function independently and inspect its output.

### Phase 4 — Implement Historical Analysis

- [ ] Create `backend/analysis.py`.
- [ ] Calculate the latest and previous available closing prices.
- [ ] Calculate one-session, approximately 7-day, and approximately 30-day percentage changes.
- [ ] Calculate the historical high and low for the retrieved period.
- [ ] Calculate the latest price's position within the historical range.
- [ ] Calculate percentage distance below the historical high.
- [ ] Handle missing observations and zero denominators safely.
- [ ] Return the metrics as structured data.
- [ ] Run the analysis independently of the LLM and inspect the results.

### Phase 5 — Build the Custom Agent Runtime

- [ ] Create `backend/agent.py`.
- [ ] Integrate the Ollama Python client.
- [ ] Define the `get_gold_history` tool.
- [ ] Define the `analyze_gold_history` tool.
- [ ] Register tools with the model using the supported tool-calling interface.
- [ ] Implement the loop that processes model responses and tool calls.
- [ ] Validate tool arguments and reject unknown tool names.
- [ ] Return tool results to the model.
- [ ] Add a maximum iteration limit and basic error handling.
- [ ] Add instructions requiring the model to ground its report in retrieved data.
- [ ] Run the agent in the terminal and inspect tool-call logs.
- [ ] If the model struggles with two tools, fall back to one combined analysis tool.

### Phase 6 — Implement FastAPI and Progress Streaming

- [ ] Create `backend/main.py`.
- [ ] Implement `POST /api/analyze`.
- [ ] Define a consistent event format for progress, errors, and the final result.
- [ ] Connect the endpoint to the agent runtime.
- [ ] Stream real progress events as execution proceeds.
- [ ] Ensure blocking data retrieval and model inference do not freeze the event loop.
- [ ] Configure CORS for the local Vite development origin.
- [ ] Verify the endpoint and stream using FastAPI's interactive documentation or an HTTP client.

### Phase 7 — Build the React Frontend

- [ ] Create a single-page GoldInfo dashboard.
- [ ] Add an **Analyze Gold Prices** button.
- [ ] Add an execution-progress section.
- [ ] Add sections for historical statistics and the AI-generated analysis.
- [ ] Show the data source and latest observation date.
- [ ] Connect the page to `POST /api/analyze`.
- [ ] Read the streamed response using `fetch()` and a response reader.
- [ ] Update the interface from actual progress events.
- [ ] Disable repeated submissions while an analysis is running.
- [ ] Display useful error messages.
- [ ] Add minimal responsive CSS styling.

### Phase 8 — End-to-End Verification and Documentation

- [ ] Start Ollama, FastAPI, and the Vite development server.
- [ ] Run an analysis from the React UI.
- [ ] Confirm that market data is retrieved and the calculated statistics are plausible.
- [ ] Confirm that the model requests and receives tool results.
- [ ] Confirm that the final report reflects the actual retrieved data.
- [ ] Verify behavior when the data provider is unavailable.
- [ ] Verify behavior when Ollama is unavailable or inference fails.
- [ ] Verify that frontend errors are displayed clearly.
- [ ] Add setup and run instructions to `README.md`.
- [ ] Document the architecture, data source, and known limitations.
- [ ] Capture a successful end-to-end demonstration.

## 10. Time Budget

The target is a working first version in approximately **6–8 hours**, assuming dependencies install successfully and the local model performs adequately.

| Phase | Estimated time |
|---|---:|
| 1. Environment and Ollama | 30–60 minutes |
| 2. Project skeleton | 15–25 minutes |
| 3. Market-data retrieval | 30–45 minutes |
| 4. Historical analysis | 20–30 minutes |
| 5. Agent runtime | 60–90 minutes |
| 6. FastAPI and streaming | 45–60 minutes |
| 7. React frontend | 45–60 minutes |
| 8. Verification and README | 30–45 minutes |
| **Estimated total** | **4 hours 45 minutes–6 hours 55 minutes** |

These are estimates, not guarantees. Model downloads, local inference performance, and integration debugging may add time.

If time becomes tight, prioritize correct data retrieval, deterministic calculations, a working tool-calling loop, and a functional backend. Simplify frontend styling or temporarily replace streaming with a normal request if necessary; do not fake progress.

## 11. Definition of Done

The initial prototype is complete when:

- [ ] Running the application from the UI starts an analysis without further manual intervention.
- [ ] The backend retrieves approximately one year of daily gold futures data or clearly reports the actual available range.
- [ ] Python calculates the historical metrics.
- [ ] The local LLM participates in a custom tool-calling loop.
- [ ] The frontend shows actual execution progress and the final report.
- [ ] The report identifies the data source and observation date.
- [ ] Missing data and execution failures are surfaced rather than hidden.
- [ ] The README explains how to set up and run the project.

## 12. Known Limitations

- The local model may be slow or unreliable at tool calling on an 8 GB RAM machine.
- `yfinance` relies on an unofficial Yahoo Finance interface and is not a guaranteed production data feed.
- `GC=F` represents gold futures, not a guaranteed real-time spot price.
- The latest available daily observation may not be from the current calendar day.
- Historical price position is descriptive and does not predict future movements.
- The application runs only when manually started; there is no scheduler.
- There is no persistent history, authentication, or production deployment configuration.
- The prototype will receive basic manual verification, not a formal unit-testing suite.

---

**Current status:** Planning complete; implementation not started.
