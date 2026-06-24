import { FormEvent, useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { PMAIL_TESTER_TENANT_SLUG } from "../constants/tenant";
import {
  defaultMailConfig,
  resolveMailConfigFromPreset,
  type MailConfigValues,
  type MailProviderPresetKey,
} from "../constants/mailProviders";
import { clearReferralRef, persistReferralRef, readReferralRef } from "../utils/referralStorage";

export function useLoginForm(tenantSlug: string, options?: { onLoginSuccess?: () => void }) {
  const isTesterRoute = tenantSlug === PMAIL_TESTER_TENANT_SLUG;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [email, setEmail] = useState(isTesterRoute ? "pmailtester@gmail.com" : "");
  const [password, setPassword] = useState("");
  const [mailConfig, setMailConfig] = useState<MailConfigValues>(() => defaultMailConfig());
  const [needsProviderSetup, setNeedsProviderSetup] = useState<boolean | null>(isTesterRoute ? false : null);
  const [providerPresetTouched, setProviderPresetTouched] = useState(false);
  const [testerBypass, setTesterBypass] = useState(isTesterRoute);
  const [suggestedTenantSlug, setSuggestedTenantSlug] = useState<string | null>(null);
  const [greetingName, setGreetingName] = useState<string | null>(isTesterRoute ? "PMail Tester" : null);
  const [preflightLoading, setPreflightLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    persistReferralRef(searchParams.get("ref"));
  }, [searchParams]);

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
      return;
    }

    let cancelled = false;
    setPreflightLoading(true);
    api
      .loginPreflight(tenantSlug, normalized)
      .then((result) => {
        if (!cancelled) {
          setNeedsProviderSetup(result.needsProviderSetup);
          setTesterBypass(Boolean(result.testerBypass));
          setSuggestedTenantSlug(result.suggestedTenantSlug ?? null);
          setGreetingName(result.displayName);
          if (result.needsProviderSetup && result.suggestedMailConfig && !providerPresetTouched) {
            setMailConfig({
              providerPreset: result.suggestedMailConfig.providerPreset as MailProviderPresetKey,
              imapHost: result.suggestedMailConfig.imapHost,
              imapPort: result.suggestedMailConfig.imapPort,
              imapSecure: result.suggestedMailConfig.imapSecure,
              smtpHost: result.suggestedMailConfig.smtpHost,
              smtpPort: result.suggestedMailConfig.smtpPort,
              smtpSecure: result.suggestedMailConfig.smtpSecure,
            });
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNeedsProviderSetup(true);
          setTesterBypass(false);
          setSuggestedTenantSlug(null);
          setGreetingName(null);
        }
      })
      .finally(() => {
        if (!cancelled) setPreflightLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [email, tenantSlug, isTesterRoute, providerPresetTouched]);

  const applyPreset = useCallback((key: MailProviderPresetKey) => {
    setProviderPresetTouched(true);
    setMailConfig((current) =>
      resolveMailConfigFromPreset(key, key === "custom" ? current : undefined),
    );
  }, []);

  const showProviderSetup = !isTesterRoute && !testerBypass && needsProviderSetup !== false;
  const showCustomFields = mailConfig.providerPreset === "custom";

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setSubmitting(true);
    try {
      const referrerEmail = readReferralRef(searchParams.get("ref"));
      const result = isTesterRoute
        ? await api.testerLogin({ email, password })
        : await api.login({
            tenantSlug,
            email,
            password,
            ...(showProviderSetup ? mailConfig : {}),
            ...(referrerEmail ? { referrerEmail } : {}),
          });
      sessionStorage.setItem("pmail_tenant_slug", isTesterRoute ? PMAIL_TESTER_TENANT_SLUG : tenantSlug);
      if (referrerEmail) clearReferralRef();
      options?.onLoginSuccess?.();
      setUser(result.user);
      navigate("/");
    } catch (err) {
      setLoginError(err instanceof ApiError ? err.message : "Login failed");
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
    suggestedTenantSlug,
    greetingName,
    preflightLoading,
    loginError,
    setLoginError,
    submitting,
    onSubmit,
  };
}
