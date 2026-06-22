export const GROWTH_AUTOMATION_TRIGGERS = [
  "lead_created",
  "stage_changed",
  "chat_completed",
] as const;

export const GROWTH_AUTOMATION_ACTIONS = [
  "send_nurture_email",
  "notify_owner",
  "move_stage",
] as const;

export type GrowthAutomationTrigger = (typeof GROWTH_AUTOMATION_TRIGGERS)[number];
export type GrowthAutomationAction = (typeof GROWTH_AUTOMATION_ACTIONS)[number];

export type GrowthAutomationTriggerFilter = {
  toStage?: string;
  fromStage?: string;
  sources?: string[];
  excludeSources?: string[];
};

export type GrowthAutomationActionConfig = {
  emailStep?: number;
  stageSlug?: string;
};

export function isGrowthAutomationTrigger(value: string): value is GrowthAutomationTrigger {
  return (GROWTH_AUTOMATION_TRIGGERS as readonly string[]).includes(value);
}

export function isGrowthAutomationAction(value: string): value is GrowthAutomationAction {
  return (GROWTH_AUTOMATION_ACTIONS as readonly string[]).includes(value);
}

export function describeAutomationTrigger(
  triggerType: GrowthAutomationTrigger,
  filter: GrowthAutomationTriggerFilter,
): string {
  if (triggerType === "lead_created") {
    if (filter.excludeSources?.length) {
      return `When a lead is captured (not ${filter.excludeSources.join(", ")})`;
    }
    return "When a new lead is captured";
  }
  if (triggerType === "stage_changed") {
    return filter.toStage
      ? `When a lead moves to “${filter.toStage}”`
      : "When a lead’s pipeline stage changes";
  }
  return "When a qualification chat completes";
}

export function describeAutomationAction(
  actionType: GrowthAutomationAction,
  config: GrowthAutomationActionConfig,
): string {
  if (actionType === "send_nurture_email") {
    const step = config.emailStep ?? 1;
    return `Send nurture email #${step} from Content Studio sequence`;
  }
  if (actionType === "notify_owner") {
    return "Email the panel owner about the lead";
  }
  return `Move lead to “${config.stageSlug ?? "stage"}”`;
}
