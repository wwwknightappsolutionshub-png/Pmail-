import { useEffect, useState } from "react";
import { api } from "../api/client";
import "./UndoSendToast.css";

export type PendingUndoSend = {
  pendingId: string;
  undoUntil: string;
  undoSeconds: number;
  subject: string;
  to: string;
};

interface UndoSendToastProps {
  pending: PendingUndoSend;
  onUndone: () => void;
  onSent: (sentFolder?: string) => void;
}

export function UndoSendToast({ pending, onUndone, onSent }: UndoSendToastProps) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.ceil((new Date(pending.undoUntil).getTime() - Date.now()) / 1000)),
  );
  const [undoing, setUndoing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, Math.ceil((new Date(pending.undoUntil).getTime() - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) {
        onSent(undefined);
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [pending.undoUntil, onSent]);

  const handleUndo = async () => {
    setUndoing(true);
    setError("");
    try {
      await api.undoPendingSend(pending.pendingId);
      onUndone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Undo failed");
    } finally {
      setUndoing(false);
    }
  };

  return (
    <div className="undo-send-toast" role="status">
      <div>
        <strong>Sending in {secondsLeft}s</strong>
        <p>
          “{pending.subject}” to {pending.to}
        </p>
        {error ? <p className="undo-send-error">{error}</p> : null}
      </div>
      <button type="button" className="undo-send-btn" disabled={undoing || secondsLeft <= 0} onClick={() => void handleUndo()}>
        {undoing ? "Undoing…" : "Undo"}
      </button>
    </div>
  );
}
