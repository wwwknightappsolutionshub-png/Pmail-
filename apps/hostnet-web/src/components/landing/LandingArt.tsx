export function HeroMeshArt() {
  return (
    <svg className="landing-art landing-art--hero" viewBox="0 0 640 520" aria-hidden="true">
      <defs>
        <linearGradient id="hero-grad-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#0d9488" stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id="hero-grad-b" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.05" />
        </linearGradient>
        <filter id="hero-glow">
          <feGaussianBlur stdDeviation="18" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width="640" height="520" fill="#0a1424" rx="28" />
      <path d="M0 120 Q200 40 400 100 T640 80 V0 H0 Z" fill="url(#hero-grad-b)" />
      <circle cx="480" cy="140" r="90" fill="url(#hero-grad-a)" filter="url(#hero-glow)" />
      <circle cx="160" cy="360" r="120" fill="url(#hero-grad-a)" opacity="0.6" />
      <g stroke="rgba(45,212,191,0.25)" strokeWidth="1">
        <line x1="80" y1="80" x2="560" y2="440" />
        <line x1="560" y1="80" x2="80" y2="440" />
        <line x1="320" y1="40" x2="320" y2="480" />
        <line x1="40" y1="260" x2="600" y2="260" />
      </g>
      <rect x="92" y="118" width="180" height="110" rx="14" fill="rgba(16,28,48,0.9)" stroke="rgba(45,212,191,0.35)" />
      <rect x="108" y="138" width="90" height="10" rx="5" fill="rgba(45,212,191,0.5)" />
      <rect x="108" y="158" width="140" height="8" rx="4" fill="rgba(139,163,199,0.25)" />
      <rect x="108" y="176" width="120" height="8" rx="4" fill="rgba(139,163,199,0.18)" />
      <rect x="108" y="194" width="100" height="8" rx="4" fill="rgba(139,163,199,0.12)" />
      <rect x="348" y="168" width="200" height="148" rx="16" fill="rgba(10,20,36,0.95)" stroke="rgba(45,212,191,0.4)" />
      <rect x="368" y="192" width="160" height="12" rx="6" fill="rgba(45,212,191,0.45)" />
      <rect x="368" y="216" width="120" height="8" rx="4" fill="rgba(139,163,199,0.22)" />
      <rect x="368" y="236" width="140" height="8" rx="4" fill="rgba(139,163,199,0.16)" />
      <rect x="368" y="268" width="72" height="28" rx="8" fill="rgba(20,184,166,0.25)" stroke="rgba(45,212,191,0.35)" />
      <rect x="196" y="292" width="220" height="132" rx="18" fill="rgba(15,41,38,0.85)" stroke="rgba(45,212,191,0.3)" />
      <text x="216" y="332" fill="#8ba3c7" fontSize="13" fontFamily="system-ui,sans-serif">
        Operations layer
      </text>
      <rect x="216" y="346" width="180" height="10" rx="5" fill="rgba(45,212,191,0.35)" />
      <rect x="216" y="366" width="150" height="10" rx="5" fill="rgba(45,212,191,0.22)" />
      <rect x="216" y="386" width="120" height="10" rx="5" fill="rgba(45,212,191,0.15)" />
      <circle cx="520" cy="400" r="36" fill="rgba(20,184,166,0.2)" stroke="#2dd4bf" strokeWidth="2" />
      <path d="M508 400h24M520 388v24" stroke="#2dd4bf" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function PlatformOrbitArt() {
  return (
    <svg className="landing-art landing-art--orbit" viewBox="0 0 480 480" aria-hidden="true">
      <defs>
        <linearGradient id="orbit-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2dd4bf" />
          <stop offset="100%" stopColor="#0d9488" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <circle cx="240" cy="240" r="200" fill="none" stroke="url(#orbit-ring)" strokeWidth="1.5" strokeDasharray="8 10" />
      <circle cx="240" cy="240" r="140" fill="none" stroke="rgba(45,212,191,0.2)" strokeWidth="1" />
      <circle cx="240" cy="240" r="72" fill="rgba(20,184,166,0.12)" stroke="rgba(45,212,191,0.45)" strokeWidth="2" />
      <circle cx="240" cy="68" r="28" fill="#101c30" stroke="#2dd4bf" strokeWidth="2" />
      <circle cx="412" cy="240" r="28" fill="#101c30" stroke="#2dd4bf" strokeWidth="2" />
      <circle cx="240" cy="412" r="28" fill="#101c30" stroke="#2dd4bf" strokeWidth="2" />
      <text x="240" y="246" textAnchor="middle" fill="#edf4ff" fontSize="14" fontWeight="600" fontFamily="system-ui,sans-serif">
        Core
      </text>
      <text x="240" y="74" textAnchor="middle" fill="#8ba3c7" fontSize="11" fontFamily="system-ui,sans-serif">
        Panel
      </text>
      <text x="412" y="244" textAnchor="middle" fill="#8ba3c7" fontSize="11" fontFamily="system-ui,sans-serif">
        PMail+
      </text>
      <text x="240" y="418" textAnchor="middle" fill="#8ba3c7" fontSize="11" fontFamily="system-ui,sans-serif">
        VPS
      </text>
    </svg>
  );
}

export function SolutionsFabricArt() {
  return (
    <svg className="landing-art landing-art--fabric" viewBox="0 0 420 520" aria-hidden="true">
      <rect width="420" height="520" fill="#0d1628" rx="24" />
      <path d="M0 0h420v180L280 320 0 520V0z" fill="rgba(20,184,166,0.08)" />
      <rect x="36" y="48" width="150" height="100" rx="12" fill="rgba(16,28,48,0.95)" stroke="rgba(45,212,191,0.3)" />
      <rect x="210" y="88" width="170" height="120" rx="14" fill="rgba(15,41,38,0.9)" stroke="rgba(45,212,191,0.35)" />
      <rect x="56" y="220" width="190" height="130" rx="16" fill="rgba(10,20,36,0.95)" stroke="rgba(45,212,191,0.25)" />
      <rect x="250" y="280" width="130" height="90" rx="12" fill="rgba(20,184,166,0.12)" stroke="rgba(45,212,191,0.4)" />
      <rect x="72" y="390" width="280" height="88" rx="14" fill="rgba(16,28,48,0.9)" stroke="rgba(45,212,191,0.2)" />
      <line x1="36" y1="48" x2="380" y2="478" stroke="rgba(45,212,191,0.15)" strokeWidth="1" />
      <line x1="380" y1="48" x2="36" y2="478" stroke="rgba(45,212,191,0.1)" strokeWidth="1" />
    </svg>
  );
}

export function SecurityShieldArt() {
  return (
    <svg className="landing-art landing-art--shield" viewBox="0 0 360 400" aria-hidden="true">
      <path
        d="M180 24 L320 88 V200 C320 290 260 350 180 376 C100 350 40 290 40 200 V88 Z"
        fill="rgba(16,28,48,0.95)"
        stroke="rgba(45,212,191,0.45)"
        strokeWidth="2"
      />
      <path
        d="M180 72 L276 116 V212 C276 276 236 320 180 340 C124 320 84 276 84 212 V116 Z"
        fill="rgba(20,184,166,0.1)"
      />
      <path
        d="M148 198 L172 228 L220 168"
        fill="none"
        stroke="#2dd4bf"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CapabilitiesArt() {
  return (
    <svg className="landing-art landing-art--capabilities" viewBox="0 0 440 400" aria-hidden="true">
      <rect width="440" height="400" fill="#0d1628" rx="22" />
      <rect x="40" y="48" width="360" height="48" rx="10" fill="rgba(16,28,48,0.95)" stroke="rgba(45,212,191,0.3)" />
      <rect x="56" y="64" width="120" height="16" rx="6" fill="rgba(45,212,191,0.45)" />
      <rect x="56" y="112" width="160" height="72" rx="12" fill="rgba(15,41,38,0.9)" stroke="rgba(45,212,191,0.25)" />
      <rect x="232" y="112" width="168" height="72" rx="12" fill="rgba(16,28,48,0.9)" stroke="rgba(45,212,191,0.2)" />
      <rect x="56" y="200" width="344" height="56" rx="12" fill="rgba(10,20,36,0.95)" stroke="rgba(45,212,191,0.22)" />
      <rect x="72" y="216" width="200" height="10" rx="5" fill="rgba(45,212,191,0.35)" />
      <rect x="72" y="234" width="160" height="8" rx="4" fill="rgba(139,163,199,0.2)" />
      <rect x="56" y="272" width="100" height="80" rx="10" fill="rgba(20,184,166,0.12)" stroke="rgba(45,212,191,0.35)" />
      <rect x="170" y="272" width="100" height="80" rx="10" fill="rgba(16,28,48,0.9)" stroke="rgba(45,212,191,0.2)" />
      <rect x="284" y="272" width="116" height="80" rx="10" fill="rgba(16,28,48,0.9)" stroke="rgba(45,212,191,0.28)" />
      <circle className="landing-art-pulse-dot" cx="106" cy="312" r="8" fill="#2dd4bf" opacity="0.8" />
      <circle className="landing-art-pulse-dot landing-art-pulse-dot--delay" cx="220" cy="312" r="8" fill="#2dd4bf" opacity="0.55" />
      <circle className="landing-art-pulse-dot landing-art-pulse-dot--delay2" cx="342" cy="312" r="8" fill="#2dd4bf" opacity="0.7" />
    </svg>
  );
}

export function PmailTeaserArt() {
  return (
    <svg className="landing-art landing-art--pmail" viewBox="0 0 520 280" aria-hidden="true">
      <rect width="520" height="280" rx="20" fill="#0f2926" stroke="rgba(45,212,191,0.3)" />
      <rect x="32" y="40" width="200" height="200" rx="16" fill="rgba(10,20,36,0.9)" stroke="rgba(45,212,191,0.25)" />
      <path d="M72 100 L132 140 L192 100 V180 H72 Z" fill="none" stroke="#2dd4bf" strokeWidth="3" strokeLinejoin="round" />
      <rect x="260" y="56" width="220" height="16" rx="8" fill="rgba(45,212,191,0.4)" />
      <rect x="260" y="88" width="180" height="10" rx="5" fill="rgba(139,163,199,0.2)" />
      <rect x="260" y="110" width="200" height="10" rx="5" fill="rgba(139,163,199,0.15)" />
      <rect x="260" y="150" width="140" height="36" rx="10" fill="rgba(20,184,166,0.18)" stroke="rgba(45,212,191,0.35)" />
      <text x="290" y="174" fill="#2dd4bf" fontSize="13" fontWeight="600" fontFamily="system-ui,sans-serif">
        Bespoke Mail
      </text>
    </svg>
  );
}
