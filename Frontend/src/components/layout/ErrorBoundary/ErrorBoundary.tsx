import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  /** Names the part of the page that failed, for the message. */
  sectionName: string;
  children: ReactNode;
};

type ErrorBoundaryState = { hasFailed: boolean };

/**
 * Keeps one broken section from blanking the whole page. The message is
 * generic on purpose: error details are not shown on screen.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasFailed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasFailed: true };
  }

  override componentDidCatch(_caughtError: Error, _errorInfo: ErrorInfo): void {
    // Rendering errors are contained here. Nothing is logged to the console or sent anywhere.
  }

  override render() {
    if (!this.state.hasFailed) return this.props.children;

    return (
      <section className="panel error-panel" role="alert">
        <h2>Something went wrong</h2>
        <p>The {this.props.sectionName} section could not be displayed.</p>
        <button type="button" className="secondary-button" onClick={() => this.setState({ hasFailed: false })}>
          Try again
        </button>
      </section>
    );
  }
}
