import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function AdminPageHeader({ title, description, actions }: Props) {
  return (
    <header className="admin-page-header">
      <div className="admin-page-header-text">
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="admin-page-header-actions">{actions}</div> : null}
    </header>
  );
}
