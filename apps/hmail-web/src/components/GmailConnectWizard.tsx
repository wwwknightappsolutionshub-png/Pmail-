import "./GmailConnectWizard.css";

const GMAIL_IMAP_SETTINGS_URL = "https://mail.google.com/mail/u/0/#settings/fwdandpop";
const GMAIL_APP_PASSWORDS_URL = "https://myaccount.google.com/apppasswords";

export function GmailConnectWizard() {
  return (
    <aside className="gmail-connect-wizard" aria-label="How to connect Gmail">
      <p className="gmail-connect-wizard__title">Connect Gmail in 3 steps</p>
      <ol className="gmail-connect-wizard__steps">
        <li>
          <strong>Enable IMAP</strong>
          <span>
            In Gmail open Settings → Forwarding and POP/IMAP → turn on <em>Enable IMAP</em> → Save.
          </span>
          <a href={GMAIL_IMAP_SETTINGS_URL} target="_blank" rel="noopener noreferrer">
            Open Gmail IMAP settings
          </a>
        </li>
        <li>
          <strong>Get your App Password</strong>
          <span>
            If 2-Step Verification is on, create a Google App Password. Use that here — not your normal
            Gmail password.
          </span>
          <a href={GMAIL_APP_PASSWORDS_URL} target="_blank" rel="noopener noreferrer">
            Create App Password
          </a>
        </li>
        <li>
          <strong>Sign in on this page</strong>
          <span>
            Enter your Gmail address and paste the App Password in the password field, then click{" "}
            <em>Sign in to mailbox</em>.
          </span>
        </li>
      </ol>
    </aside>
  );
}
