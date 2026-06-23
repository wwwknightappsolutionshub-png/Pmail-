import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { MailFolder } from "../types/mail";
import { folderDisplayLabel, resolveFolderKind, sortFolders } from "./FolderNav";

function useFolders() {
  const [folders, setFolders] = useState<MailFolder[]>([]);  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void api
      .folders()
      .then((result) => {
        if (!cancelled) setFolders(sortFolders(result.folders));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load folders");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { folders, loading, error };
}

type PlatformFolderSelectProps = {  value: string;
  onChange: (path: string) => void;
  id?: string;
  label?: string;
  disabled?: boolean;
};

export function PlatformFolderSelect({
  value,
  onChange,
  id,
  label = "Mailbox folder",
  disabled = false,
}: PlatformFolderSelectProps) {
  const { folders, loading, error } = useFolders();

  const inboxPath = useMemo(
    () => folders.find((folder) => resolveFolderKind(folder) === "inbox")?.path ?? folders[0]?.path ?? "INBOX",
    [folders],
  );

  useEffect(() => {
    if (!value && inboxPath) onChange(inboxPath);
  }, [value, inboxPath, onChange]);

  const selectValue = value || inboxPath;

  return (
    <label className="platform-tools-field" htmlFor={id}>
      <span className="platform-tools-field__label">{label}</span>
      <div className="platform-tools-select-wrap">
        <select
          id={id}
          className="platform-tools-select"
          value={selectValue}
          disabled={disabled || loading || folders.length === 0}
          onChange={(e) => onChange(e.target.value)}
        >
          {loading ? <option value="">Loading folders…</option> : null}
          {!loading && folders.length === 0 ? <option value="INBOX">Inbox</option> : null}
          {folders.map((folder) => (
            <option key={folder.path} value={folder.path}>
              {folderDisplayLabel(folder)}
            </option>
          ))}
        </select>
      </div>
      {error ? <span className="platform-tools-field__hint platform-tools-field__hint--error">{error}</span> : null}
    </label>
  );
}
