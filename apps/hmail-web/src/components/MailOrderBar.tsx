import type { MailSortField, MailSortOrder } from "../types/mail";
import "./MailOrderBar.css";

interface MailOrderBarProps {
  sortBy: MailSortField;
  sortOrder: MailSortOrder;
  onChange: (sortBy: MailSortField, sortOrder: MailSortOrder) => void;
}

export function MailOrderBar({ sortBy, sortOrder, onChange }: MailOrderBarProps) {
  return (
    <div className="mail-order-bar">
      <label>
        Order by
        <select
          value={sortBy}
          onChange={(e) => onChange(e.target.value as MailSortField, sortOrder)}
        >
          <option value="date">Date received</option>
          <option value="subject">Subject</option>
          <option value="sender">Sender</option>
        </select>
      </label>
      <label>
        Direction
        <select
          value={sortOrder}
          onChange={(e) => onChange(sortBy, e.target.value as MailSortOrder)}
        >
          <option value="desc">Newest / Z–A first</option>
          <option value="asc">Oldest / A–Z first</option>
        </select>
      </label>
    </div>
  );
}
