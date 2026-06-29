import { useEffect, useMemo, useState } from "react";
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
  priority?: "auto" | "high";
};

export function SenderAvatar({
  from,
  className = "",
  size = "md",
  priority = "auto",
}: SenderAvatarProps) {
  const email = useMemo(() => extractEmailFromHeader(from), [from]);
  const label = useMemo(() => senderLabel(from), [from]);
  const initials = useMemo(() => senderInitials(from), [from]);
  const colors = useMemo(() => senderAvatarColors(email), [email]);
  const photoUrl = useMemo(() => gravatarUrlForEmail(email, size === "sm" ? 64 : 96), [email, size]);
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);

  useEffect(() => {
    setPhotoLoaded(false);
    setPhotoFailed(false);
  }, [email, photoUrl]);

  const rootClass = `sender-avatar sender-avatar--${size}${className ? ` ${className}` : ""}`;
  const showPhoto = Boolean(photoUrl && !photoFailed);

  return (
    <span
      className={rootClass}
      style={{ backgroundColor: colors.background, color: colors.color }}
      title={label}
      aria-hidden="true"
    >
      <span className="sender-avatar-initials">{initials}</span>
      {showPhoto ? (
        <img
          src={photoUrl}
          alt=""
          loading={priority === "high" ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          className={photoLoaded ? "is-loaded" : "is-loading"}
          onLoad={() => setPhotoLoaded(true)}
          onError={() => setPhotoFailed(true)}
        />
      ) : null}
    </span>
  );
}
