import { useId } from "react";
import "./HMailLogo.css";

type HMailLogoSize = "sm" | "md" | "lg" | "xl";

interface HMailLogoProps {
  size?: HMailLogoSize;
  className?: string;
  /** Show product wordmark beside the icon */
  showWordmark?: boolean;
  subtitle?: string;
  productName?: string;
}

export function HMailLogo({
  size = "md",
  className = "",
  showWordmark = false,
  subtitle,
  productName = "PMail+",
}: HMailLogoProps) {
  const uid = useId().replace(/:/g, "");
  const gradientId = `hmail-logo-gradient-${uid}`;
  const shineId = `hmail-envelope-shine-${uid}`;

  return (
    <div className={`hmail-logo hmail-logo--${size} ${className}`.trim()}>
      <svg
        className="hmail-logo-icon"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={productName}
      >
        <defs>
          <linearGradient id={gradientId} x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--brand-primary, #0d4f6c)" />
            <stop offset="1" stopColor="var(--brand-accent, #0d9488)" />
          </linearGradient>
          <linearGradient id={shineId} x1="14" y1="16" x2="34" y2="34" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0.82" />
          </linearGradient>
        </defs>

        <rect x="2" y="2" width="44" height="44" rx="11" fill={`url(#${gradientId})`} />
        <rect
          x="2"
          y="2"
          width="44"
          height="44"
          rx="11"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth="1"
        />

        {/* Envelope body */}
        <path
          d="M13 17.5C13 16.1193 14.1193 15 15.5 15H32.5C33.8807 15 35 16.1193 35 17.5V30.5C35 31.8807 33.8807 33 32.5 33H15.5C14.1193 33 13 31.8807 13 30.5V17.5Z"
          fill={`url(#${shineId})`}
        />

        {/* Envelope flap */}
        <path
          d="M13.8 17.2L24 25.1L34.2 17.2"
          stroke="var(--brand-primary, #0d4f6c)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* H monogram on envelope */}
        <path
          d="M20.2 22.2V29.2M20.2 25.7H24.1M24.1 22.2V29.2M27.8 22.2V29.2"
          stroke="var(--brand-primary, #0d4f6c)"
          strokeWidth="1.85"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Subtle send indicator */}
        <circle cx="33.5" cy="14.5" r="3.25" fill="#fff" fillOpacity="0.92" />
        <path
          d="M32.4 14.5H34.6M33.5 13.4V15.6"
          stroke="var(--brand-accent, #0d9488)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>

      {showWordmark ? (
        <div className="hmail-logo-text">
          <strong className="hmail-wordmark">{productName}</strong>
          {subtitle ? <span>{subtitle}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
