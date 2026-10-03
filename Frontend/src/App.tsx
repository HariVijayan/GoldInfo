import { useState } from "react";
import "./App.css";

type AgentEvent = {
  type: string;
  message: string;
  timestamp?: string;
};

type AnalysisState = "idle" | "running" | "success" | "error";

function App() {
  const [goal, setGoal] = useState(
    "Analyze approximately one year of historical gold futures prices."
  );

  const [status, setStatus] = useState<AnalysisState>("idle");
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [analysis, setAnalysis] = useState("");
  const [error, setError] = useState("");

  const runAnalysis = async () => {
    setStatus("running");
    setEvents([]);
    setAnalysis("");
    setError("");

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/analyze/stream",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ goal }),
        }
      );

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status} `);
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
          let data = "";

          for (const line of lines) {
            if (line.startsWith("event:")) {
              eventName = line.slice(6).trim();
            }

            if (line.startsWith("data:")) {
              data += line.slice(5).trim();
            }
          }

          if (!eventName || !data) {
            continue;
          }

          const payload = JSON.parse(data);

          if (eventName === "status") {
            setEvents((current) => [...current, payload]);
          }

          if (eventName === "final") {
            setAnalysis(payload.analysis ?? "");
            setStatus("success");
          }

          if (eventName === "error") {
            setError(payload.message ?? "Analysis failed.");
            setStatus("error");
          }
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred."
      );
      setStatus("error");
    }
  };

  const isRunning = status === "running";

  return (
    <main className="app">
      <section className="container">
        <header className="header">
          <div>
            <p className="eyebrow">LOCAL AI AGENT</p>
            <h1>GoldInfo</h1>
            <p className="subtitle">
              Historical gold price analysis powered by local data and Ollama.
            </p>
          </div>
        </header>

        <section className="card">
          <label htmlFor="goal">Analysis request</label>

          <textarea
            id="goal"
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            disabled={isRunning}
            rows={4}
          />

          <button
            type="button"
            onClick={runAnalysis}
            disabled={isRunning || !goal.trim()}
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
                <div className="event" key={`${event.timestamp} -${index} `}>
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

        {status === "success" && analysis && (
          <section className="card">
            <div className="section-heading">
              <h2>Analysis</h2>
              <span className="success-indicator">Complete</span>
            </div>

            <div className="analysis">
              {analysis}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

export default App;