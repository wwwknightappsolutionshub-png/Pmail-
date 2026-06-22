import "./ProhostLogo.css";

type Props = {
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function ProhostLogo({ showWordmark = true, size = "md", className = "" }: Props) {
  const uid = "prohost-logo";
  const gradId = `${uid}-grad`;
  const glowId = `${uid}-glow`;

  return (
    <div className={`prohost-logo prohost-logo--${size} ${className}`.trim()}>
      <svg className="prohost-logo-mark" viewBox="0 0 48 48" aria-hidden="true">
        <defs>
          <linearGradient id={gradId} x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2dd4bf" />
            <stop offset="55%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>
          <radialGradient id={glowId} cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#5eead4" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="2" y="2" width="44" height="44" rx="13" fill="#0a1628" stroke="rgba(45, 212, 191, 0.35)" strokeWidth="1.5" />
        <circle cx="24" cy="18" r="14" fill={`url(#${glowId})`} />
        <path
          d="M15 33V15h9.2c4.6 0 7.4 2.4 7.4 6.1 0 2.5-1.2 4.5-3.3 5.5L33 33h-4.8l-4.2-5.6H19.2V33H15zm4.2-9.4h4.5c2 0 3.1-0.9 3.1-2.5S25.7 18.7 23.7 18.7h-4.5v5z"
          fill={`url(#${gradId})`}
        />
        <path
          d="M30 11c6 2 10 7.5 10 13.5"
          fill="none"
          stroke="#2dd4bf"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.85"
        />
      </svg>
      {showWordmark ? (
        <div className="prohost-logo-wordmark">
          <strong>Prohost</strong>
          <span>Cloud</span>
        </div>
      ) : null}
    </div>
  );
}
