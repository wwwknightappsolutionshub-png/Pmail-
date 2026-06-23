const DONT_ASK_KEY = "pmail_job_hunter_cv_dont_ask";
const WEEK_KEY = "pmail_job_hunter_cv_toast_week";
const COUNT_KEY = "pmail_job_hunter_cv_toast_count";
const WEEKLY_CAP = 3;

function currentIsoWeek(): string {
  const now = new Date();
  const day = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((day.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${day.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function cvScannerToastBlocked(): boolean {
  try {
    return localStorage.getItem(DONT_ASK_KEY) === "1";
  } catch {
    return false;
  }
}

export function setCvScannerDontAskAgain(): void {
  try {
    localStorage.setItem(DONT_ASK_KEY, "1");
  } catch {
    // ignore storage errors
  }
}

export function recordCvScannerToastShown(): void {
  try {
    const week = currentIsoWeek();
    const storedWeek = localStorage.getItem(WEEK_KEY);
    if (storedWeek !== week) {
      localStorage.setItem(WEEK_KEY, week);
      localStorage.setItem(COUNT_KEY, "1");
      return;
    }
    const count = Number(localStorage.getItem(COUNT_KEY) ?? "0");
    localStorage.setItem(COUNT_KEY, String(count + 1));
  } catch {
    // ignore storage errors
  }
}

export function canShowCvScannerToast(): boolean {
  if (cvScannerToastBlocked()) return false;
  try {
    const week = currentIsoWeek();
    if (localStorage.getItem(WEEK_KEY) !== week) return true;
    const count = Number(localStorage.getItem(COUNT_KEY) ?? "0");
    return count < WEEKLY_CAP;
  } catch {
    return true;
  }
}
