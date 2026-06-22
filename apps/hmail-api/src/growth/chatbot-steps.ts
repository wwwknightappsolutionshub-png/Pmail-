import type { GrowthWizardProfile } from "./wizard-profile.js";
import { wizardBusinessName, wizardCommunicationStyle } from "./wizard-profile.js";

export type GrowthChatbotStep = {
  id: string;
  kind: "say" | "ask";
  message: string;
  field?: string;
  inputType?: "text" | "email" | "tel" | "textarea" | "choice";
  choices?: string[];
  required?: boolean;
  placeholder?: string;
};

export const GROWTH_QUALIFICATION_BOT_KEY = "qualification";

function toneOpener(style: string): string {
  switch (style) {
    case "friendly":
      return "Happy to help!";
    case "luxury":
      return "It would be our pleasure to assist you.";
    case "playful":
      return "Let's find the perfect fit for you!";
    case "technical":
      return "I'll gather a few details so our team can respond accurately.";
    default:
      return "I can help you get started.";
  }
}

export function buildQualificationChatbotSteps(profile: GrowthWizardProfile): GrowthChatbotStep[] {
  const business = wizardBusinessName(profile);
  const style = wizardCommunicationStyle(profile);
  const services = profile.step1?.productsServices?.trim() || "our services";
  const mainOffer = profile.step4?.mainOffer?.trim() || "a free consultation";
  const painHint = profile.step2?.customerProblems?.trim() || "your goals";

  return [
    {
      id: "welcome",
      kind: "say",
      message: `Hi! I'm the assistant for ${business}. ${toneOpener(style)} I'll ask a few quick questions so we can follow up.`,
    },
    {
      id: "ask_name",
      kind: "ask",
      message: "What's your name?",
      field: "fullName",
      inputType: "text",
      required: true,
      placeholder: "Jane Doe",
    },
    {
      id: "ask_email",
      kind: "ask",
      message: "What's the best email to reach you?",
      field: "email",
      inputType: "email",
      required: true,
      placeholder: "jane@example.com",
    },
    {
      id: "ask_phone",
      kind: "ask",
      message: "Phone number (optional — helps us respond faster)",
      field: "phone",
      inputType: "tel",
      required: false,
      placeholder: "+1 555 0100",
    },
    {
      id: "context",
      kind: "say",
      message: `We specialize in ${services}. Many visitors ask about ${painHint}.`,
    },
    {
      id: "ask_need",
      kind: "ask",
      message: "What would you like help with today?",
      field: "need",
      inputType: "textarea",
      required: true,
      placeholder: "Tell us about your project or question…",
    },
    {
      id: "ask_timeline",
      kind: "ask",
      message: "When are you hoping to get started?",
      field: "timeline",
      inputType: "choice",
      choices: ["ASAP", "This month", "Just researching"],
      required: true,
    },
    {
      id: "offer",
      kind: "say",
      message: `Great — our team can follow up with ${mainOffer}. Watch for an email from us shortly!`,
    },
  ];
}

export function validateChatbotAnswer(step: GrowthChatbotStep, raw: string): string {
  const value = raw.trim();
  if (step.kind !== "ask") throw new Error("Invalid step");
  if (!value && step.required !== false) {
    throw new Error("Please provide an answer");
  }
  if (!value) return "";

  if (step.inputType === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error("Enter a valid email address");
  }
  if (step.inputType === "choice" && step.choices?.length) {
    const match = step.choices.find((c) => c.toLowerCase() === value.toLowerCase());
    if (!match) throw new Error("Choose one of the offered options");
    return match;
  }
  return value;
}

export function formatChatTranscript(
  messages: Array<{ role: string; content: string }>,
): string {
  return messages
    .map((m) => `${m.role === "bot" ? "Bot" : "Visitor"}: ${m.content}`)
    .join("\n");
}
