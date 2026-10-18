import { useState } from "react";
import "./App.css";

type AgentEvent = {
  type: string;
  message: string;
  timestamp?: string;
};

type AnalysisState = "idle" | "running" | "success" | "error";

type AnalysisMetrics = {
  unit: string;
  latest_price: number;
  latest_date: string;
  previous_price: number | null;
  previous_date: string | null;
  one_session_change_pct: number | null;
  seven_day_change_pct: number | null;
  thirty_day_change_pct: number | null;
  historical_high: number;
  historical_high_date: string;
  historical_low: number;
  historical_low_date: string;
  range_position_pct: number | null;
  distance_below_high_pct: number | null;
  observation_count: number;
  period_start: string;
  period_end: string;
};

type AgentResult = {
  run_id: string;
  request: {
    goal: string;
    period: string;
    [key: string]: unknown;
  };
  analysis: AnalysisMetrics;
  interpretation: string;
  processed_data: Record<string, unknown>;
  status: "success" | "error";
};

const PERIOD_OPTIONS = [
  { label: "1 Month", value: "1mo" },
  { label: "3 Months", value: "3mo" },
  { label: "6 Months", value: "6mo" },
  { label: "1 Year", value: "1y" },
  { label: "2 Years", value: "2y" },
  { label: "5 Years", value: "5y" },
  { label: "10 Years", value: "10y" },
];

const DEFAULT_GOAL =
  "Analyze historical gold prices and describe the observed movement.";

function formatPrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "N/A";
  }

  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "N/A";
  }

  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatDate(value: string | null | undefined): string {
  return value || "N/A";
}

function App() {
  const [period, setPeriod] = useState("1y");
  const [status, setStatus] = useState<AnalysisState>("idle");
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [error, setError] = useState("");

  const runAnalysis = async () => {
    setStatus("running");
    setEvents([]);
    setResult(null);
    setError("");

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/analyze/stream",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            goal: DEFAULT_GOAL,
            period,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}.`);
      }

      if (!response.body) {
        throw new Error("Streaming response body is unavailable.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        const messages = buffer.split("\n\n");
        buffer = messages.pop() ?? "";

        for (const message of messages) {
          const lines = message.split("\n");

          let eventName = "";
          const dataLines: string[] = [];

          for (const line of lines) {
            if (line.startsWith("event:")) {
              eventName = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              dataLines.push(line.slice(5).trimStart());
            }
          }

          if (!eventName || dataLines.length === 0) {
            continue;
          }

          const payloadText = dataLines.join("\n");

          if (!payloadText) {
            continue;
          }

          const payload = JSON.parse(payloadText);

          if (eventName === "status") {
            setEvents((current) => [...current, payload as AgentEvent]);
          }

          if (eventName === "final") {
            const agentResult = payload as AgentResult;

            if (agentResult.status === "error") {
              throw new Error(
                agentResult.interpretation || "Analysis failed."
              );
            }

            if (!agentResult.analysis) {
              throw new Error(
                "The server response did not contain analysis metrics."
              );
            }

            setResult(agentResult);
            setStatus("success");
          }

          if (eventName === "error") {
            throw new Error(payload.message ?? "Analysis failed.");
          }
        }
      }

      if (status !== "error") {
        // If the stream ends without a final result, report the incomplete response.
        // The local variable avoids relying on asynchronous React state updates.
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred."
      );
      setStatus("error");
    } finally {
      // A successful final event sets status to success.
      // If the stream ended without a final event, detect it below.
    }

  };

  const isRunning = status === "running";
  const metrics = result?.analysis;

  return (<main className="app"> <section className="container"> <header className="header"> <div> <p className="eyebrow">LOCAL AI AGENT</p> <h1>GoldInfo</h1> <p className="subtitle">
    Historical gold price analysis powered by local data and Ollama. </p> </div> </header>

    <section className="card">
      <label htmlFor="period">Historical period</label>

      <select
        id="period"
        value={period}
        onChange={(event) => setPeriod(event.target.value)}
        disabled={isRunning}
      >
        {PERIOD_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={runAnalysis}
        disabled={isRunning}
      >
        {isRunning ? "Analyzing..." : "Analyze Gold"}
      </button>
    </section>

    {events.length > 0 && (
      <section className="card">
        <div className="section-heading">
          <h2>Agent progress</h2>

          {isRunning && (
            <span className="running-indicator">Running</span>
          )}
        </div>

        <div className="events">
          {events.map((event, index) => (
            <div
              className="event"
              key={`${event.timestamp ?? "event"}-${index}`}
            >
              <span className="event-type">{event.type}</span>
              <span className="event-message">{event.message}</span>
            </div>
          ))}
        </div>
      </section>
    )}

    {status === "error" && (
      <section className="card error-card">
        <h2>Analysis failed</h2>
        <p>{error}</p>
      </section>
    )}

    {status === "success" && result && metrics && (
      <>
        <section className="card">
          <div className="section-heading">
            <h2>Historical Summary</h2>
            <span className="success-indicator">Complete</span>
          </div>

          <p>
            <strong>Selected period:</strong>{" "}
            {PERIOD_OPTIONS.find(
              (option) => option.value === result.request.period
            )?.label ?? result.request.period}
          </p>

          <p>
            <strong>Actual data coverage:</strong>{" "}
            {formatDate(metrics.period_start)} –{" "}
            {formatDate(metrics.period_end)}
          </p>

          <p>
            <strong>Observations:</strong>{" "}
            {metrics.observation_count}
          </p>

          <div className="metrics-grid">
            <article className="metric-card">
              <h3>Latest Price</h3>
              <p>
                {formatPrice(metrics.latest_price)} {metrics.unit}
              </p>
              <small>{formatDate(metrics.latest_date)}</small>
            </article>

            <article className="metric-card">
              <h3>Previous Price</h3>
              <p>
                {formatPrice(metrics.previous_price)} {metrics.unit}
              </p>
              <small>{formatDate(metrics.previous_date)}</small>
            </article>

            <article className="metric-card">
              <h3>1-Session Change</h3>
              <p>{formatPercent(metrics.one_session_change_pct)}</p>
            </article>

            <article className="metric-card">
              <h3>7-Day Change</h3>
              <p>{formatPercent(metrics.seven_day_change_pct)}</p>
            </article>

            <article className="metric-card">
              <h3>30-Day Change</h3>
              <p>{formatPercent(metrics.thirty_day_change_pct)}</p>
            </article>

            <article className="metric-card">
              <h3>Historical High</h3>
              <p>
                {formatPrice(metrics.historical_high)} {metrics.unit}
              </p>
              <small>
                {formatDate(metrics.historical_high_date)}
              </small>
            </article>

            <article className="metric-card">
              <h3>Historical Low</h3>
              <p>
                {formatPrice(metrics.historical_low)} {metrics.unit}
              </p>
              <small>
                {formatDate(metrics.historical_low_date)}
              </small>
            </article>

            <article className="metric-card">
              <h3>Position in Historical Range</h3>
              <p>{formatPercent(metrics.range_position_pct)}</p>
            </article>

            <article className="metric-card">
              <h3>Below Historical High</h3>
              <p>{formatPercent(metrics.distance_below_high_pct)}</p>
            </article>
          </div>
        </section>

        <section className="card">
          <div className="section-heading">
            <h2>Analysis</h2>
            <span className="success-indicator">Complete</span>
          </div>

          <div className="analysis">{result.interpretation}</div>
        </section>

        <section className="card">
          <h2>Run Details</h2>
          <p>
            <strong>Run ID:</strong> {result.run_id}
          </p>
          <p>
            <strong>Status:</strong> {result.status}
          </p>
        </section>
      </>
    )}
  </section>
  </main>

  );
}

export default App;
