import { useToastAutoDismiss } from "../hooks/useToastAutoDismiss";
import "./CvScannerToast.css";

interface CvScannerToastProps {
  fileName: string;
  onRate: () => void;
  onDismiss: () => void;
  onDontAskAgain: () => void;
}

export function CvScannerToast({ fileName, onRate, onDismiss, onDontAskAgain }: CvScannerToastProps) {
  useToastAutoDismiss(onDismiss, true, "action");
  return (
    <div className="cv-scanner-toast" role="status">
      <div>
        <strong>Rate this CV with Job Hunter scanner?</strong>
        <p>{fileName}</p>
      </div>
      <div className="cv-scanner-toast-actions">
        <button type="button" className="cv-scanner-btn primary" onClick={onRate}>
          Rate
        </button>
        <button type="button" className="cv-scanner-btn" onClick={onDismiss}>
          Not now
        </button>
        <button type="button" className="cv-scanner-btn subtle" onClick={onDontAskAgain}>
          Don&apos;t ask again
        </button>
      </div>
    </div>
  );
}
