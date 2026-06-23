export const ESIGN_DOCUMENT_MIME: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

export type EsignRequestStatus =
  | "awaiting_signature"
  | "signed"
  | "declined"
  | "expired"
  | "error";

export function mapDropboxSignStatus(input: {
  isComplete: boolean;
  isDeclined: boolean;
  hasError: boolean;
  signatures?: Array<{ statusCode: string }>;
}): EsignRequestStatus {
  if (input.isComplete) return "signed";
  if (input.isDeclined) return "declined";
  if (input.hasError) return "error";
  const codes = (input.signatures ?? []).map((row) => row.statusCode.toLowerCase());
  if (codes.some((code) => code === "declined")) return "declined";
  if (codes.some((code) => code === "expired")) return "expired";
  return "awaiting_signature";
}
