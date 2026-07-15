import { Trash2 } from "lucide-react";

type Props = {
  label: string;
  disabled?: boolean;
  onClick: () => void;
};

export function MessageRowDeleteButton({ label, disabled = false, onClick }: Props) {
  return (
    <button
      type="button"
      className="message-row-delete-btn"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <Trash2 className="message-row-delete-btn-icon" strokeWidth={2} aria-hidden="true" />
    </button>
  );
}
