import { ErrorPanel } from "../../components/common/ErrorPanel";
import { LoadingPanel } from "../../components/common/LoadingPanel";
import { MetadataPanel } from "../../components/common/MetadataPanel";
import { ForecastControls } from "../../components/forecast/ForecastControls";
import { ForecastDashboard } from "../../components/forecast/ForecastDashboard";
import { ErrorBoundary } from "../../components/layout/ErrorBoundary";
import { ProcedurePanel } from "../../components/layout/ProcedurePanel";
import { useForecastRun } from "../../hooks/forecast/useForecastRun";
import { useCollapseWhenResultArrives } from "../../hooks/shared/useCollapseWhenResultArrives";
import { buildForecastRunDetails } from "../../utils/forecast/forecastRunDetails";

/** The Forecast tab: procedure, inputs, then the result. */
function ForecastView() {
  const forecast = useForecastRun();
  const { run, displayedResult } = forecast;
  const procedure = useCollapseWhenResultArrives(run.status === "success");

  return (
    <ErrorBoundary sectionName="Forecast">
      <ProcedurePanel featureId="forecast" isExpanded={procedure.isExpanded} onToggle={procedure.toggle} />

      <ForecastControls
        horizonWeeks={forecast.horizonWeeks}
        onSelectHorizon={forecast.setHorizonWeeks}
        frequency={forecast.frequency}
        onSelectFrequency={forecast.setFrequency}
        isRunning={run.isRunning}
        onGenerate={forecast.runForecast}
      />

      {run.isRunning && (
        <LoadingPanel
          title="Building the forecast"
          message="Training the models on the full price history. This usually takes a few seconds."
        />
      )}

      {run.status === "error" && (
        <ErrorPanel title="Forecast failed" message={run.errorMessage} onRetry={forecast.runForecast} />
      )}

      {run.status === "success" && displayedResult && (
        <ForecastDashboard
          forecastResult={displayedResult}
          selectedSeriesKey={forecast.selectedSeriesKey}
          onSelectSeries={forecast.setSelectedSeriesKey}
          historyWeeksShown={forecast.historyWeeksShown}
          onSelectHistoryWeeks={forecast.setHistoryWeeksShown}
        />
      )}

      {run.artifactFiles.length > 0 && (
        <MetadataPanel
          panelId="forecast-metadata"
          artifactFiles={run.artifactFiles}
          runDetails={run.result ? buildForecastRunDetails(run.result) : null}
          isRunning={run.isRunning}
        />
      )}
    </ErrorBoundary>
  );
}

export default ForecastView;
