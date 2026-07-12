import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { PMAIL_TESTER_TENANT_SLUG } from "../constants/tenant";
import {
  applySuggestedMailConfig,
  emptyMailConfig,
  isHostingerForcedEmailDomain,
  providerPresetDisplayLabel,
  resolveHostingerForcedDomainMailConfig,
  resolveMailConfigFromPreset,
  resolveProviderPresetFromEmail,
  type LoginMailConfigValues,
  type MailProviderPresetKey,
} from "../constants/mailProviders";
import { formatUserFacingError } from "../utils/userFacingErrors";
import { clearReferralRef, persistReferralRef, readReferralRef } from "../utils/referralStorage";

export function useLoginForm(tenantSlug: string, options?: { onLoginSuccess?: () => void }) {
  const isTesterRoute = tenantSlug === PMAIL_TESTER_TENANT_SLUG;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [email, setEmail] = useState(isTesterRoute ? "pmailtester@gmail.com" : "");
  const [password, setPassword] = useState("");
  const [mailConfig, setMailConfig] = useState<LoginMailConfigValues>(() => emptyMailConfig());
  const [needsProviderSetup, setNeedsProviderSetup] = useState<boolean | null>(isTesterRoute ? false : null);
  const [showProviderCorrector, setShowProviderCorrector] = useState(false);
  const [testerBypass, setTesterBypass] = useState(isTesterRoute);
  const [suggestedTenantSlug, setSuggestedTenantSlug] = useState<string | null>(null);
  const [greetingName, setGreetingName] = useState<string | null>(isTesterRoute ? "PMail Tester" : null);
  const [preflightLoading, setPreflightLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [gmailGuideNotice, setGmailGuideNotice] = useState(false);
  const providerOverrideRef = useRef(false);
  const gmailGuideRequestedForRef = useRef<string | null>(null);
  const needsProviderSetupRef = useRef<boolean | null>(isTesterRoute ? false : null);
  const testerBypassRef = useRef(isTesterRoute);

  useEffect(() => {
    persistReferralRef(searchParams.get("ref"));
  }, [searchParams]);

  useEffect(() => {
    providerOverrideRef.current = false;
    setShowProviderCorrector(false);
  }, [email]);

  useEffect(() => {
    needsProviderSetupRef.current = needsProviderSetup;
  }, [needsProviderSetup]);

  useEffect(() => {
    testerBypassRef.current = testerBypass;
  }, [testerBypass]);

  useEffect(() => {
    const normalized = email.trim().toLowerCase();
    if (isTesterRoute) {
      setNeedsProviderSetup(false);
      setTesterBypass(true);
      setSuggestedTenantSlug(null);
      return;
    }

    if (!normalized.includes("@")) {
      setNeedsProviderSetup(null);
      setTesterBypass(false);
      setSuggestedTenantSlug(null);
      setGreetingName(null);
      setMailConfig(emptyMailConfig());
      return;
    }

    if (isHostingerForcedEmailDomain(normalized)) {
      providerOverrideRef.current = false;
      setMailConfig(resolveHostingerForcedDomainMailConfig());
    } else if (!providerOverrideRef.current) {
      const resolved = resolveProviderPresetFromEmail(normalized);
      if (resolved) {
        setMailConfig(resolveMailConfigFromPreset(resolved));
      }
    }

    let cancelled = false;
    setPreflightLoading(true);
    api
      .loginPreflight(tenantSlug, normalized)
      .then((result) => {
        if (cancelled) return;
        setNeedsProviderSetup(result.needsProviderSetup);
        setTesterBypass(Boolean(result.testerBypass));
        setSuggestedTenantSlug(result.suggestedTenantSlug ?? null);
        setGreetingName(result.displayName);

        if (!providerOverrideRef.current) {
          if (isHostingerForcedEmailDomain(normalized)) {
            setMailConfig(resolveHostingerForcedDomainMailConfig());
          } else if (result.suggestedMailConfig?.providerPreset) {
            setMailConfig(
              applySuggestedMailConfig({
                providerPreset: result.suggestedMailConfig.providerPreset as MailProviderPresetKey,
                imapHost: result.suggestedMailConfig.imapHost,
                imapPort: result.suggestedMailConfig.imapPort,
                imapSecure: result.suggestedMailConfig.imapSecure,
                smtpHost: result.suggestedMailConfig.smtpHost,
                smtpPort: result.suggestedMailConfig.smtpPort,
                smtpSecure: result.suggestedMailConfig.smtpSecure,
              }),
            );
          } else {
            const resolved = resolveProviderPresetFromEmail(normalized);
            if (resolved) {
              setMailConfig(resolveMailConfigFromPreset(resolved));
            }
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNeedsProviderSetup(true);
          setTesterBypass(false);
          setSuggestedTenantSlug(null);
          setGreetingName(null);
          if (!providerOverrideRef.current) {
            const resolved = resolveProviderPresetFromEmail(normalized);
            if (resolved) {
              setMailConfig(resolveMailConfigFromPreset(resolved));
            }
          }
          setLoginError(
            "Could not verify mailbox setup right now. You can still sign in with the detected provider settings.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setPreflightLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [email, tenantSlug, isTesterRoute]);

  const requestGmailAppPasswordGuideOnBlur = useCallback(async () => {
    if (isTesterRoute) return;

    const normalized = email.trim().toLowerCase();
    if (!normalized.includes("@")) return;

    const detected = resolveProviderPresetFromEmail(normalized);
    if (detected !== "google") return;
    if (testerBypassRef.current) return;
    if (needsProviderSetupRef.current === false) return;
    if (gmailGuideRequestedForRef.current === normalized) return;

    try {
      const guide = await api.requestGmailAppPasswordGuide({
        tenantSlug,
        email: normalized,
        loginResumePath: `${window.location.pathname}${window.location.search}`,
      });
      if (guide.sent) {
        gmailGuideRequestedForRef.current = normalized;
        setGmailGuideNotice(true);
      }
    } catch {
      // Guide send is best-effort; login wizard remains available.
    }
  }, [email, isTesterRoute, tenantSlug]);

  const applyPreset = useCallback((key: MailProviderPresetKey) => {
    providerOverrideRef.current = true;
    setShowProviderCorrector(false);
    setMailConfig((current) =>
      resolveMailConfigFromPreset(key, key === "custom" ? current : undefined),
    );
  }, []);

  const showProviderSetup = !isTesterRoute && !testerBypass && needsProviderSetup !== false;
  const showCustomFields = mailConfig.providerPreset === "custom";
  const detectedProviderLabel = providerPresetDisplayLabel(mailConfig.providerPreset);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (showProviderSetup && !mailConfig.providerPreset) {
      setShowProviderCorrector(true);
      setLoginError("Confirm who hosts your email, then sign in.");
      return;
    }

    if (showProviderSetup && mailConfig.providerPreset === "custom") {
      if (!mailConfig.imapHost.trim()) {
        setLoginError("Enter your incoming mail server (IMAP) from your provider's manual settings.");
        return;
      }
      if (!mailConfig.smtpHost.trim()) {
        setLoginError("Enter your outgoing mail server (SMTP) from your provider's manual settings.");
        return;
      }
    }

    if (suggestedTenantSlug && !isTesterRoute) {
      setLoginError("Use the tester workspace link above, or open /login/pmail-tester for local demo login.");
      return;
    }

    setSubmitting(true);
    try {
      const referrerEmail = readReferralRef(searchParams.get("ref"));
      const mailPayload =
        showProviderSetup && mailConfig.providerPreset
          ? { ...mailConfig, providerPreset: mailConfig.providerPreset }
          : {};
      const result = isTesterRoute
        ? await api.testerLogin({ email, password })
        : await api.login({
            tenantSlug,
            email,
            password,
            ...mailPayload,
            ...(referrerEmail ? { referrerEmail } : {}),
          });
      sessionStorage.setItem("pmail_tenant_slug", isTesterRoute ? PMAIL_TESTER_TENANT_SLUG : tenantSlug);
      if (referrerEmail) clearReferralRef();
      options?.onLoginSuccess?.();
      setUser(result.user);
      navigate("/");
    } catch (err) {
      setLoginError(formatUserFacingError(err, "Login failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return {
    isTesterRoute,
    email,
    setEmail,
    password,
    setPassword,
    mailConfig,
    setMailConfig,
    applyPreset,
    showProviderSetup,
    showCustomFields,
    detectedProviderLabel,
    suggestedTenantSlug,
    greetingName,
    preflightLoading,
    loginError,
    setLoginError,
    showProviderCorrector,
    setShowProviderCorrector,
    gmailGuideNotice,
    setGmailGuideNotice,
    requestGmailAppPasswordGuideOnBlur,
    submitting,
    onSubmit,
  };
}
