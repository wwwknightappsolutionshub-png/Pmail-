import type { MailFolder } from "../types/mail";
import { folderDisplayLabel, resolveFolderKind } from "./FolderNav";
import "./MailToolbar.css";

interface MailBulkActionsProps {
  selectedCount: number;
  folders: MailFolder[];
  currentFolder: string;
  onMarkRead: () => void;
  onReportSpam: () => void;
  onDelete: () => void;
  onMove: (targetFolder: string) => void;
  onClearSelection: () => void;
}

export function MailBulkActions({
  selectedCount,
  folders,
  currentFolder,
  onMarkRead,
  onReportSpam,
  onDelete,
  onMove,
  onClearSelection,
}: MailBulkActionsProps) {
  if (selectedCount === 0) return null;

  const moveTargets = folders.filter((f) => f.path !== currentFolder);

  return (
    <div className="mail-bulk-actions">
      <span className="mail-bulk-count">{selectedCount} selected</span>
      <button type="button" className="mail-toolbar-btn" onClick={onMarkRead}>
        Mark read
      </button>
      <button type="button" className="mail-toolbar-btn" onClick={onReportSpam}>
        Report spam
      </button>
      <button type="button" className="mail-toolbar-btn mail-toolbar-btn--danger" onClick={onDelete}>
        Delete
      </button>
      <label className="mail-bulk-move">
        <span className="sr-only">Move to folder</span>
        <select
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) {
              onMove(e.target.value);
              e.target.value = "";
            }
          }}
        >
          <option value="" disabled>
            Move to…
          </option>
          {moveTargets.map((folder) => (
            <option key={folder.path} value={folder.path}>
              {folderDisplayLabel(folder)} ({resolveFolderKind(folder)})
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="mail-toolbar-btn mail-toolbar-btn--ghost" onClick={onClearSelection}>
        Clear
      </button>
    </div>
  );
}
