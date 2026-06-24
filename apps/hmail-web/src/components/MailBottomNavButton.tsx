import type { LucideIcon } from "lucide-react";
import "./MailBottomNavButton.css";

type MailBottomNavButtonProps = {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  onClick: () => void;
};

export function MailBottomNavButton({ label, icon: Icon, active = false, onClick }: MailBottomNavButtonProps) {
  return (
    <button
      type="button"
      className={`mail-bottom-nav-btn${active ? " is-active" : ""}`}
      onClick={onClick}
      aria-label={label}
      title={label}
      data-tooltip={label}
    >
      <Icon className="mail-bottom-nav-icon" strokeWidth={2} aria-hidden />
    </button>
  );
}
