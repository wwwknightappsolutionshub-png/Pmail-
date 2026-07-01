import type { GmailConnectSlide } from "../data/gmailConnectSlides";

type ScreenProps = {
  className?: string;
};

function ScreenFrame({
  children,
  className = "",
  url = "mail.google.com",
}: {
  children: React.ReactNode;
  className?: string;
  url?: string;
}) {
  return (
    <div className={`gmail-connect-screen ${className}`.trim()} aria-hidden="true">
      <div className="gmail-connect-screen__chrome">
        <span className="gmail-connect-screen__dot gmail-connect-screen__dot--red" />
        <span className="gmail-connect-screen__dot gmail-connect-screen__dot--amber" />
        <span className="gmail-connect-screen__dot gmail-connect-screen__dot--green" />
        <span className="gmail-connect-screen__url">{url}</span>
      </div>
      <div className="gmail-connect-screen__body">{children}</div>
    </div>
  );
}

export function GmailInboxSettingsScreen({ className }: ScreenProps) {
  return (
    <ScreenFrame className={className} url="mail.google.com/mail/u/0">
      <svg viewBox="0 0 520 320" className="gmail-connect-screen__svg">
        <rect width="520" height="320" fill="#f6f8fc" />

        <rect width="520" height="52" fill="#fff" stroke="#e8eaed" />
        <rect x="16" y="16" width="24" height="18" rx="2" fill="#c5221f" />
        <text x="48" y="32" fill="#5f6368" fontSize="11" fontFamily="Roboto, Arial, sans-serif">
          Gmail
        </text>
        <rect x="300" y="14" width="148" height="26" rx="13" fill="#f1f3f4" stroke="#e8eaed" />
        <text x="318" y="31" fill="#80868b" fontSize="10" fontFamily="Roboto, Arial, sans-serif">
          Search mail
        </text>
        <circle cx="468" cy="27" r="12" fill="#fff" stroke="#1a73e8" strokeWidth="2" className="gmail-connect-screen__highlight" />
        <path
          d="M464 27h8M468 23v8"
          stroke="#1a73e8"
          strokeWidth="1.4"
          transform="rotate(45 468 27)"
          className="gmail-connect-screen__highlight"
        />
        <rect x="488" y="16" width="20" height="20" rx="10" fill="#1a73e8" />

        <rect x="0" y="52" width="112" height="268" fill="#fff" stroke="#e8eaed" />
        <rect x="14" y="72" width="84" height="14" rx="7" fill="#e8f0fe" />
        {[0, 1, 2, 3, 4].map((row) => (
          <rect key={row} x="14" y={98 + row * 22} width={68 + (row % 2) * 12} height="8" rx="4" fill="#f1f3f4" />
        ))}

        <rect x="112" y="52" width="408" height="268" fill="#fff" />
        {[0, 1, 2].map((row) => (
          <g key={row}>
            <rect x="128" y={72 + row * 52} width="14" height="14" rx="2" fill="#f1f3f4" />
            <rect x="152" y={70 + row * 52} width="130" height="9" rx="4" fill="#202124" opacity="0.85" />
            <rect x="152" y={86 + row * 52} width="240" height="7" rx="3.5" fill="#5f6368" opacity="0.5" />
          </g>
        ))}

        <rect x="286" y="58" width="210" height="188" rx="10" fill="#fff" stroke="#dadce0" strokeWidth="1.5" className="gmail-connect-screen__highlight" />
        <text x="302" y="82" fill="#202124" fontSize="11" fontWeight="600" fontFamily="Roboto, Arial, sans-serif">
          Quick settings
        </text>
        <rect x="302" y="94" width="178" height="30" rx="6" fill="#e8f0fe" stroke="#1a73e8" strokeWidth="1.5" />
        <text x="314" y="114" fill="#1a73e8" fontSize="10" fontWeight="700" fontFamily="Roboto, Arial, sans-serif">
          See all settings
        </text>
        <rect x="302" y="134" width="178" height="24" rx="6" fill="#f8f9fa" stroke="#e8eaed" />
        <text x="314" y="150" fill="#5f6368" fontSize="9" fontFamily="Roboto, Arial, sans-serif">
          Density · Theme · Inbox type
        </text>

        <rect x="24" y="252" width="472" height="52" rx="8" fill="#e8f0fe" stroke="#d2e3fc" />
        <text x="40" y="274" fill="#174ea6" fontSize="10" fontWeight="600" fontFamily="Roboto, Arial, sans-serif">
          Tip
        </text>
        <text x="68" y="274" fill="#3c4043" fontSize="9.5" fontFamily="Roboto, Arial, sans-serif">
          Gear icon → See all settings opens the full Settings page for IMAP.
        </text>
        <text x="68" y="290" fill="#5f6368" fontSize="9" fontFamily="Roboto, Arial, sans-serif">
          Avoid stopping at Quick settings only.
        </text>
      </svg>
    </ScreenFrame>
  );
}

export function GmailImapTabScreen({ className }: ScreenProps) {
  return (
    <ScreenFrame className={className} url="mail.google.com/mail/#settings/fwdandpop">
      <svg viewBox="0 0 520 320" className="gmail-connect-screen__svg">
        <rect width="520" height="320" fill="#fff" />

        <text x="24" y="32" fill="#202124" fontSize="17" fontWeight="600" fontFamily="Roboto, Arial, sans-serif">
          Settings
        </text>

        <rect x="24" y="44" width="472" height="34" rx="8" fill="#f8f9fa" stroke="#e8eaed" />
        {[
          { label: "General", x: 36, active: false },
          { label: "Labels", x: 98, active: false },
          { label: "Inbox", x: 148, active: false },
          { label: "Forwarding and POP/IMAP", x: 198, active: true },
        ].map((tab) => (
          <g key={tab.label}>
            <text
              x={tab.x}
              y="65"
              fill={tab.active ? "#1a73e8" : "#5f6368"}
              fontSize={tab.active ? "10" : "9"}
              fontWeight={tab.active ? "700" : "500"}
              fontFamily="Roboto, Arial, sans-serif"
              className={tab.active ? "gmail-connect-screen__highlight" : undefined}
            >
              {tab.label}
            </text>
            {tab.active ? <rect x={tab.x - 2} y="70" width="118" height="2" rx="1" fill="#1a73e8" /> : null}
          </g>
        ))}

        <rect x="24" y="88" width="472" height="52" rx="8" fill="#e8f0fe" stroke="#d2e3fc" />
        <circle cx="42" cy="114" r="10" fill="#1a73e8" opacity="0.12" />
        <text x="42" y="118" textAnchor="middle" fill="#1a73e8" fontSize="12" fontWeight="700" fontFamily="Roboto, Arial, sans-serif">
          i
        </text>
        <text x="60" y="110" fill="#174ea6" fontSize="10" fontWeight="600" fontFamily="Roboto, Arial, sans-serif">
          Personal Gmail (2025+)
        </text>
        <text x="60" y="126" fill="#3c4043" fontSize="9.5" fontFamily="Roboto, Arial, sans-serif">
          IMAP stays on automatically — you should see access as enabled below.
        </text>

        <text x="24" y="162" fill="#202124" fontSize="11" fontWeight="600" fontFamily="Roboto, Arial, sans-serif">
          IMAP access
        </text>

        <rect
          x="24"
          y="172"
          width="472"
          height="58"
          rx="8"
          fill="#f6ffed"
          stroke="#34a853"
          strokeWidth="1.5"
          className="gmail-connect-screen__highlight"
        />
        <circle cx="44" cy="201" r="11" fill="#34a853" />
        <path d="M39 201 L42 204 L49 196" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
        <text x="64" y="196" fill="#137333" fontSize="11" fontWeight="700" fontFamily="Roboto, Arial, sans-serif">
          IMAP access is enabled
        </text>
        <text x="64" y="212" fill="#3c4043" fontSize="9.5" fontFamily="Roboto, Arial, sans-serif">
          Mail clients can sync folders and messages from this inbox.
        </text>

        <rect x="24" y="244" width="472" height="56" rx="8" fill="#f8f9fa" stroke="#e8eaed" />
        <text x="36" y="264" fill="#5f6368" fontSize="9" fontWeight="600" fontFamily="Roboto, Arial, sans-serif">
          INCOMING MAIL (IMAP)
        </text>
        <text x="36" y="282" fill="#202124" fontSize="10" fontFamily="Roboto Mono, monospace">
          imap.gmail.com
        </text>
        <text x="170" y="282" fill="#5f6368" fontSize="10" fontFamily="Roboto, Arial, sans-serif">
          Port 993 · SSL/TLS
        </text>
        <rect x="390" y="258" width="94" height="24" rx="4" fill="#fff" stroke="#dadce0" />
        <text x="404" y="274" fill="#5f6368" fontSize="9" fontFamily="Roboto, Arial, sans-serif">
          Save Changes
        </text>
      </svg>
    </ScreenFrame>
  );
}

export function GmailTwoStepScreen({ className }: ScreenProps) {
  return (
    <ScreenFrame className={className} url="myaccount.google.com/security">
      <svg viewBox="0 0 520 240" className="gmail-connect-screen__svg">
        <rect width="520" height="240" fill="#f8f9fa" />
        <rect width="520" height="48" fill="#fff" stroke="#e8eaed" />
        <text x="24" y="30" fill="#5f6368" fontSize="11" fontFamily="Roboto, Arial, sans-serif">
          Google Account › Security
        </text>
        <rect x="24" y="64" width="472" height="56" rx="8" fill="#fff" stroke="#1a73e8" strokeWidth="2" className="gmail-connect-screen__highlight" />
        <text x="40" y="88" fill="#202124" fontSize="11" fontWeight="700" fontFamily="Roboto, Arial, sans-serif">
          2-Step Verification
        </text>
        <text x="40" y="106" fill="#5f6368" fontSize="10" fontFamily="Roboto, Arial, sans-serif">
          Tap here on the next step to turn this on
        </text>
        <text x="400" y="98" fill="#5f6368" fontSize="10" fontFamily="Roboto, Arial, sans-serif">
          ›
        </text>
      </svg>
    </ScreenFrame>
  );
}

export function GmailActivateTwoStepScreen({ className }: ScreenProps) {
  return (
    <ScreenFrame className={className} url="myaccount.google.com/signinoptions/two-step-verification">
      <svg viewBox="0 0 520 280" className="gmail-connect-screen__svg">
        <rect width="520" height="280" fill="#f8f9fa" />
        <rect width="520" height="48" fill="#fff" stroke="#e8eaed" />
        <text x="24" y="30" fill="#5f6368" fontSize="11" fontFamily="Roboto, Arial, sans-serif">
          2-Step Verification
        </text>
        <text x="24" y="72" fill="#202124" fontSize="15" fontWeight="600" fontFamily="Roboto, Arial, sans-serif">
          Protect your account
        </text>
        <text x="24" y="94" fill="#5f6368" fontSize="10" fontFamily="Roboto, Arial, sans-serif">
          Required before App passwords can be created
        </text>
        <rect x="24" y="112" width="472" height="72" rx="8" fill="#fff" stroke="#dadce0" />
        <text x="40" y="136" fill="#202124" fontSize="11" fontWeight="600" fontFamily="Roboto, Arial, sans-serif">
          2-Step Verification
        </text>
        <text x="40" y="154" fill="#5f6368" fontSize="10" fontFamily="Roboto, Arial, sans-serif">
          Status: Off — turn on to continue
        </text>
        <rect x="360" y="126" width="120" height="32" rx="16" fill="#1a73e8" className="gmail-connect-screen__highlight" />
        <text x="386" y="147" fill="#fff" fontSize="10" fontWeight="700" fontFamily="Roboto, Arial, sans-serif">
          Turn on
        </text>
        <rect x="24" y="198" width="472" height="58" rx="8" fill="#e6f4ea" stroke="#34a853" strokeWidth="1.5" />
        <text x="40" y="222" fill="#137333" fontSize="10" fontWeight="700" fontFamily="Roboto, Arial, sans-serif">
          When finished
        </text>
        <text x="40" y="240" fill="#3c4043" fontSize="9.5" fontFamily="Roboto, Arial, sans-serif">
          Status must show On before you search for App passwords.
        </text>
      </svg>
    </ScreenFrame>
  );
}

export function GmailAppPasswordSearchScreen({ className }: ScreenProps) {
  return (
    <ScreenFrame className={className} url="myaccount.google.com">
      <svg viewBox="0 0 520 320" className="gmail-connect-screen__svg">
        <rect width="520" height="320" fill="#f8f9fa" />

        <rect width="520" height="56" fill="#fff" stroke="#e8eaed" />
        <circle cx="36" cy="28" r="14" fill="#1a73e8" />
        <text x="36" y="33" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700" fontFamily="Roboto, Arial, sans-serif">
          G
        </text>
        <text x="58" y="24" fill="#5f6368" fontSize="10" fontFamily="Roboto, Arial, sans-serif">
          Google Account
        </text>
        <text x="58" y="38" fill="#202124" fontSize="11" fontWeight="600" fontFamily="Roboto, Arial, sans-serif">
          you@gmail.com
        </text>

        <rect x="168" y="14" width="280" height="30" rx="15" fill="#f1f3f4" stroke="#1a73e8" strokeWidth="2" className="gmail-connect-screen__highlight" />
        <circle cx="188" cy="29" r="7" fill="none" stroke="#5f6368" strokeWidth="1.5" />
        <path d="M193 34 L198 39" stroke="#5f6368" strokeWidth="1.5" />
        <text x="208" y="33" fill="#202124" fontSize="11" fontFamily="Roboto, Arial, sans-serif">
          App passwords
        </text>
        <rect x="418" y="20" width="18" height="18" rx="9" fill="#dadce0" />
        <text x="425" y="33" fill="#5f6368" fontSize="10" fontFamily="Roboto, Arial, sans-serif">
          ×
        </text>

        <rect x="168" y="50" width="280" height="118" rx="8" fill="#fff" stroke="#dadce0" strokeWidth="1.5" />
        <text x="184" y="72" fill="#5f6368" fontSize="9" fontWeight="600" fontFamily="Roboto, Arial, sans-serif">
          SEARCH RESULTS
        </text>
        <rect x="184" y="82" width="248" height="34" rx="6" fill="#e8f0fe" stroke="#1a73e8" strokeWidth="1.5" className="gmail-connect-screen__highlight" />
        <text x="196" y="98" fill="#1a73e8" fontSize="10" fontWeight="700" fontFamily="Roboto, Arial, sans-serif">
          App passwords
        </text>
        <text x="196" y="110" fill="#5f6368" fontSize="9" fontFamily="Roboto, Arial, sans-serif">
          Security · Sign in to third-party apps
        </text>
        <rect x="184" y="124" width="248" height="28" rx="6" fill="#fff" stroke="#e8eaed" />
        <text x="196" y="142" fill="#202124" fontSize="9.5" fontFamily="Roboto, Arial, sans-serif">
          2-Step Verification
        </text>

        <text x="24" y="196" fill="#202124" fontSize="14" fontWeight="600" fontFamily="Roboto, Arial, sans-serif">
          Security
        </text>
        <rect x="24" y="210" width="472" height="88" rx="8" fill="#fff" stroke="#dadce0" />
        <text x="40" y="236" fill="#202124" fontSize="11" fontWeight="600" fontFamily="Roboto, Arial, sans-serif">
          How to reach search from Gmail
        </text>
        <text x="40" y="254" fill="#5f6368" fontSize="9.5" fontFamily="Roboto, Arial, sans-serif">
          Profile photo (top right) → Manage your Google Account → search App passwords
        </text>
        <rect x="40" y="266" width="200" height="22" rx="4" fill="#f8f9fa" stroke="#e8eaed" />
        <text x="52" y="281" fill="#3c4043" fontSize="9" fontFamily="Roboto, Arial, sans-serif">
          Opens the same Google Account search
        </text>
      </svg>
    </ScreenFrame>
  );
}

export function GmailAppPasswordScreen({ className }: ScreenProps) {
  return (
    <ScreenFrame className={className} url="myaccount.google.com/apppasswords">
      <svg viewBox="0 0 520 280" className="gmail-connect-screen__svg">
        <rect width="520" height="280" fill="#f8f9fa" />
        <text x="24" y="36" fill="#202124" fontSize="15" fontWeight="600" fontFamily="Roboto, Arial, sans-serif">
          App passwords
        </text>
        <text x="24" y="58" fill="#5f6368" fontSize="10" fontFamily="Roboto, Arial, sans-serif">
          Create a password for Mail on your device
        </text>
        <rect x="24" y="74" width="472" height="120" rx="8" fill="#fff" stroke="#dadce0" />
        <text x="40" y="98" fill="#5f6368" fontSize="10" fontFamily="Roboto, Arial, sans-serif">
          App name
        </text>
        <rect x="40" y="106" width="200" height="28" rx="4" fill="#fff" stroke="#dadce0" />
        <text x="52" y="124" fill="#202124" fontSize="10" fontFamily="Roboto, Arial, sans-serif">
          PMail+
        </text>
        <rect x="40" y="148" width="88" height="28" rx="4" fill="#1a73e8" />
        <text x="62" y="166" fill="#fff" fontSize="10" fontWeight="600" fontFamily="Roboto, Arial, sans-serif">
          Create
        </text>
        <rect x="24" y="206" width="472" height="48" rx="8" fill="#e8f0fe" stroke="#1a73e8" strokeWidth="1.5" className="gmail-connect-screen__highlight" />
        <text x="40" y="228" fill="#1a73e8" fontSize="10" fontWeight="600" fontFamily="Roboto, Arial, sans-serif">
          Your app password
        </text>
        <text x="40" y="246" fill="#202124" fontSize="14" fontWeight="700" fontFamily="Roboto Mono, monospace" letterSpacing="2">
          abcd efgh ijkl mnop
        </text>
      </svg>
    </ScreenFrame>
  );
}

export function PmailSignInScreen({ className }: ScreenProps) {
  return (
    <ScreenFrame className={`gmail-connect-screen--pmail ${className ?? ""}`.trim()} url="mail.prohost.cloud">
      <svg viewBox="0 0 520 280" className="gmail-connect-screen__svg">
        <rect width="520" height="280" fill="#f8fbff" />
        <text x="24" y="36" fill="#0f2744" fontSize="14" fontWeight="700" fontFamily="Roboto, Arial, sans-serif">
          Sign in to PMail+
        </text>
        <text x="24" y="58" fill="#475569" fontSize="10" fontFamily="Roboto, Arial, sans-serif">
          Mail provider: Google
        </text>
        <rect x="24" y="74" width="472" height="36" rx="6" fill="#fff" stroke="#1a73e8" strokeWidth="2" className="gmail-connect-screen__highlight" />
        <text x="36" y="86" fill="#64748b" fontSize="9" fontFamily="Roboto, Arial, sans-serif">
          Your Email
        </text>
        <text x="36" y="102" fill="#202124" fontSize="11" fontFamily="Roboto, Arial, sans-serif">
          you@gmail.com
        </text>
        <rect x="24" y="122" width="472" height="36" rx="6" fill="#fff" stroke="#1a73e8" strokeWidth="2" className="gmail-connect-screen__highlight" />
        <text x="36" y="134" fill="#64748b" fontSize="9" fontFamily="Roboto, Arial, sans-serif">
          Password / App Password
        </text>
        <text x="36" y="150" fill="#202124" fontSize="11" fontFamily="Roboto Mono, monospace">
          •••• •••• •••• ••••
        </text>
        <rect x="24" y="176" width="472" height="34" rx="6" fill="#0d4f6c" className="gmail-connect-screen__highlight" />
        <text x="190" y="198" fill="#fff" fontSize="11" fontWeight="700" fontFamily="Roboto, Arial, sans-serif">
          Sign in to mailbox
        </text>
      </svg>
    </ScreenFrame>
  );
}

export function GmailConnectScreenArt({ screen }: { screen: GmailConnectSlide["screen"] }) {
  switch (screen) {
    case "inbox-settings":
      return <GmailInboxSettingsScreen />;
    case "imap-tab":
      return <GmailImapTabScreen />;
    case "two-step":
      return <GmailTwoStepScreen />;
    case "activate-two-step":
      return <GmailActivateTwoStepScreen />;
    case "app-password-search":
      return <GmailAppPasswordSearchScreen />;
    case "app-password":
      return <GmailAppPasswordScreen />;
    case "pmail-signin":
      return <PmailSignInScreen />;
    default:
      return null;
  }
}
