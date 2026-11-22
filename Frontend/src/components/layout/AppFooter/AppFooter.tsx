import { DISCLAIMER_BODY, DISCLAIMER_HEADLINE } from "../../../config/shared/disclaimerText";

/** The one place the app says its values are indicative only. */
export function AppFooter() {
  return (
    <footer className="app-footer">
      <div className="container">
        <p>
          <strong>{DISCLAIMER_HEADLINE}</strong> {DISCLAIMER_BODY}
        </p>
      </div>
    </footer>
  );
}
