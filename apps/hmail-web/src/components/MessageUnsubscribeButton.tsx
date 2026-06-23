import { useEffect, useState } from "react";
import { api } from "../api/client";
import { ReadActionButton, UnsubscribeIcon } from "./ReadActionButton";
import "./MessageUnsubscribeButton.css";

interface MessageUnsubscribeButtonProps {
  folder: string;
  uid: number;
  enabled: boolean;
  iconOnly?: boolean;
  onUnsubscribed?: () => void;
}

export function MessageUnsubscribeButton({
  folder,
  uid,
  enabled,
  iconOnly = false,
  onUnsubscribed,
}: MessageUnsubscribeButtonProps) {
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled) {
      setAvailable(false);
      return;
    }
    let cancelled = false;
    setChecking(true);
    setError("");
    void api
      .getMessageUnsubscribeInfo(folder, uid)
      .then((result) => {
        if (!cancelled) {
          setAvailable(result.options.length > 0);
        }
      })
      .catch(() => {
        if (!cancelled) setAvailable(false);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, folder, uid]);

  if (!enabled || checking || !available) {
    return null;
  }

  const handleUnsubscribe = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.unsubscribeFromMessage({ folder, uid });
      if (result.ok) {
        onUnsubscribed?.();
      } else {
        setError("Unsubscribe request did not succeed. Check cleanup logs for details.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unsubscribe failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (iconOnly) {
    return (
      <div className="message-unsubscribe message-unsubscribe--icon">
        <ReadActionButton
          label={loading ? "Unsubscribing…" : "Unsubscribe"}
          icon={UnsubscribeIcon}
          onClick={() => void handleUnsubscribe()}
          disabled={loading}
        />
        {error ? <p className="message-unsubscribe-error">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="message-unsubscribe">
      <button type="button" onClick={() => void handleUnsubscribe()} disabled={loading}>
        {loading ? "Unsubscribing…" : "Unsubscribe"}
      </button>
      {error ? <p className="message-unsubscribe-error">{error}</p> : null}
    </div>
  );
}
