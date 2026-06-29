import { useMemo, useState } from "react";
import {
  extractEmailFromHeader,
  gravatarUrlForEmail,
  senderAvatarColors,
  senderInitials,
  senderLabel,
} from "../utils/senderAvatar";
import "./SenderAvatar.css";

type SenderAvatarProps = {
  from: string;
  className?: string;
  size?: "sm" | "md";
};

export function SenderAvatar({ from, className = "", size = "md" }: SenderAvatarProps) {
  const email = useMemo(() => extractEmailFromHeader(from), [from]);
  const label = useMemo(() => senderLabel(from), [from]);
  const initials = useMemo(() => senderInitials(from), [from]);
  const colors = useMemo(() => senderAvatarColors(email), [email]);
  const photoUrl = useMemo(() => gravatarUrlForEmail(email, size === "sm" ? 64 : 96), [email, size]);
  const [photoFailed, setPhotoFailed] = useState(false);

  const rootClass = `sender-avatar sender-avatar--${size}${className ? ` ${className}` : ""}`;

  if (photoUrl && !photoFailed) {
    return (
      <span className={rootClass}>
        <img
          src={photoUrl}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setPhotoFailed(true)}
        />
      </span>
    );
  }

  return (
    <span
      className={rootClass}
      style={{ backgroundColor: colors.background, color: colors.color }}
      aria-hidden="true"
      title={label}
    >
      {initials}
    </span>
  );
}
