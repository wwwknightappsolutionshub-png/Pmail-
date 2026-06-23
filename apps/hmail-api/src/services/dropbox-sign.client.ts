import { getEnv } from "../config/env.js";
import { mapDropboxSignStatus, type EsignRequestStatus } from "../lib/esign-mime.js";

const DROPBOX_SIGN_API_BASE = "https://api.hellosign.com/v3";

export type DropboxSignSendInput = {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  title: string;
  subject: string;
  message: string;
  signerEmail: string;
  signerName: string;
};

export type DropboxSignSendResult = {
  signatureRequestId: string;
  signingUrl: string | null;
  status: EsignRequestStatus;
};

export type DropboxSignStatusResult = {
  signatureRequestId: string;
  status: EsignRequestStatus;
  signingUrl: string | null;
  isComplete: boolean;
};

export function isDropboxSignConfigured(): boolean {
  return Boolean(getEnv().DROPBOX_SIGN_API_KEY?.trim());
}

export function dropboxSignTestModeEnabled(): boolean {
  return getEnv().DROPBOX_SIGN_TEST_MODE;
}

function authHeader(): string {
  const apiKey = getEnv().DROPBOX_SIGN_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Dropbox Sign is not configured");
  }
  return `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`;
}

function parseSigningUrl(payload: {
  signatures?: Array<{ sign_url?: string | null }>;
}): string | null {
  for (const signature of payload.signatures ?? []) {
    if (signature.sign_url) return signature.sign_url;
  }
  return null;
}

export async function sendDropboxSignRequest(input: DropboxSignSendInput): Promise<DropboxSignSendResult> {
  const form = new FormData();
  const blob = new Blob([new Uint8Array(input.fileBuffer)], { type: input.mimeType });
  form.append("file[0]", blob, input.fileName);
  form.append("title", input.title);
  form.append("subject", input.subject);
  form.append("message", input.message);
  form.append("signers[0][email_address]", input.signerEmail);
  form.append("signers[0][name]", input.signerName);
  if (dropboxSignTestModeEnabled()) {
    form.append("test_mode", "1");
  }

  const response = await fetch(`${DROPBOX_SIGN_API_BASE}/signature_request/send`, {
    method: "POST",
    headers: { Authorization: authHeader() },
    body: form,
  });

  const payload = (await response.json()) as {
    signature_request?: {
      signature_request_id?: string;
      is_complete?: boolean;
      is_declined?: boolean;
      has_error?: boolean;
      signatures?: Array<{ status_code?: string; sign_url?: string | null }>;
    };
    error?: { error_msg?: string };
  };

  if (!response.ok) {
    throw new Error(payload.error?.error_msg ?? `Dropbox Sign request failed (${response.status})`);
  }

  const request = payload.signature_request;
  if (!request?.signature_request_id) {
    throw new Error("Dropbox Sign did not return a signature request id");
  }

  const signatures = (request.signatures ?? []).map((row) => ({
    statusCode: row.status_code ?? "awaiting_signature",
  }));

  return {
    signatureRequestId: request.signature_request_id,
    signingUrl: parseSigningUrl(request),
    status: mapDropboxSignStatus({
      isComplete: Boolean(request.is_complete),
      isDeclined: Boolean(request.is_declined),
      hasError: Boolean(request.has_error),
      signatures,
    }),
  };
}

export async function fetchDropboxSignStatus(signatureRequestId: string): Promise<DropboxSignStatusResult> {
  const response = await fetch(`${DROPBOX_SIGN_API_BASE}/signature_request/${signatureRequestId}`, {
    headers: { Authorization: authHeader() },
  });

  const payload = (await response.json()) as {
    signature_request?: {
      signature_request_id?: string;
      is_complete?: boolean;
      is_declined?: boolean;
      has_error?: boolean;
      signatures?: Array<{ status_code?: string; sign_url?: string | null }>;
    };
    error?: { error_msg?: string };
  };

  if (!response.ok) {
    throw new Error(payload.error?.error_msg ?? `Dropbox Sign status failed (${response.status})`);
  }

  const request = payload.signature_request;
  if (!request?.signature_request_id) {
    throw new Error("Dropbox Sign status response missing request id");
  }

  const signatures = (request.signatures ?? []).map((row) => ({
    statusCode: row.status_code ?? "awaiting_signature",
  }));

  return {
    signatureRequestId: request.signature_request_id,
    signingUrl: parseSigningUrl(request),
    isComplete: Boolean(request.is_complete),
    status: mapDropboxSignStatus({
      isComplete: Boolean(request.is_complete),
      isDeclined: Boolean(request.is_declined),
      hasError: Boolean(request.has_error),
      signatures,
    }),
  };
}
