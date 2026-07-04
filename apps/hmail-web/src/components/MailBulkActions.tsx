import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CircleX, FolderInput, MailOpen, ShieldAlert, Trash2 } from "lucide-react";
import type { MailFolder } from "../types/mail";
import { folderDisplayLabel, resolveFolderKind } from "./FolderNav";
import { ReadActionButton } from "./ReadActionButton";
import "./MailToolbar.css";

const BULK_TOOLTIP_Z = 10040;

interface MailBulkActionsProps {
  selectedCount: number;
  folders: MailFolder[];
  currentFolder: string;
  onMarkRead: () => void;
  onReportSpam: () => void;
  onDelete: () => void;
  deleteLabel?: string;
  onMove: (targetFolder: string) => void;
  onClearSelection: () => void;
  showMarkRead?: boolean;
  showReportSpam?: boolean;
}

interface BulkMoveSelectProps {
  folders: MailFolder[];
  currentFolder: string;
  onMove: (targetFolder: string) => void;
}

function BulkMoveSelect({ folders, currentFolder, onMove }: BulkMoveSelectProps) {
  const labelRef = useRef<HTMLLabelElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [showHoverTooltip, setShowHoverTooltip] = useState(false);
  const moveLabel = "Move to…";
  const moveTargets = folders.filter((folder) => folder.path !== currentFolder);

  useEffect(() => {
    setShowHoverTooltip(window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  }, []);

  const updateTooltip = useCallback(() => {
    if (!showHoverTooltip) return;
    const node = labelRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    setTooltipPos({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
  }, [showHoverTooltip]);

  const hideTooltip = useCallback(() => {
    setTooltipPos(null);
  }, []);

  if (moveTargets.length === 0) return null;

  return (
    <>
      <label
        ref={labelRef}
        className="mail-bulk-move mail-bulk-move--icon"
        onMouseEnter={showHoverTooltip ? updateTooltip : undefined}
        onMouseLeave={showHoverTooltip ? hideTooltip : undefined}
        onFocus={showHoverTooltip ? updateTooltip : undefined}
        onBlur={showHoverTooltip ? hideTooltip : undefined}
      >
        <FolderInput className="mail-bulk-move-icon" strokeWidth={1.75} aria-hidden />
        <span className="sr-only">{moveLabel}</span>
        <select
          aria-label={moveLabel}
          defaultValue=""
          onChange={(event) => {
            if (event.target.value) {
              onMove(event.target.value);
              event.target.value = "";
            }
          }}
        >
          <option value="" disabled>
            {moveLabel}
          </option>
          {moveTargets.map((folder) => (
            <option key={folder.path} value={folder.path}>
              {folderDisplayLabel(folder)} ({resolveFolderKind(folder)})
            </option>
          ))}
        </select>
      </label>
      {tooltipPos
        ? createPortal(
            <span
              className="read-action-tooltip-portal"
              role="tooltip"
              style={{
                left: `${tooltipPos.x}px`,
                top: `${tooltipPos.y}px`,
                zIndex: BULK_TOOLTIP_Z,
              }}
            >
              {moveLabel}
            </span>,
            document.body,
          )
        : null}
    </>
  );
}

export function MailBulkActions({
  selectedCount,
  folders,
  currentFolder,
  onMarkRead,
  onReportSpam,
  onDelete,
  deleteLabel = "Delete",
  onMove,
  onClearSelection,
  showMarkRead = true,
  showReportSpam = true,
}: MailBulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="mail-bulk-actions">
      <span className="mail-bulk-count">{selectedCount} selected</span>
      <div className="mail-bulk-actions__toolbar">
        {showMarkRead ? <ReadActionButton label="Mark read" icon={MailOpen} onClick={onMarkRead} /> : null}
        {showReportSpam ? <ReadActionButton label="Report spam" icon={ShieldAlert} onClick={onReportSpam} /> : null}
        <ReadActionButton label={deleteLabel} icon={Trash2} variant="danger" onClick={onDelete} />
        <BulkMoveSelect folders={folders} currentFolder={currentFolder} onMove={onMove} />
        <ReadActionButton label="Clear" icon={CircleX} onClick={onClearSelection} />
      </div>
    </div>
  );
}
