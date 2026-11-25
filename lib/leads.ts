export type PipelineStageId = "inquiry" | "prospect" | "mature" | "pre_closure" | "sold";

export type LeadStageId = PipelineStageId | "lost" | "listed";

/** The pipeline, in board order. `headingClass` tints the two stages the design calls out. */
export const PIPELINE_STAGES: { id: PipelineStageId; label: string; headingClass: string }[] = [
  { id: "inquiry", label: "Inquiry", headingClass: "border-stage-inquiry text-stage-inquiry" },
  { id: "prospect", label: "Prospect", headingClass: "border-border text-ink" },
  { id: "mature", label: "Mature", headingClass: "border-border text-ink" },
  { id: "pre_closure", label: "Pre-Closure", headingClass: "border-border text-ink" },
  { id: "sold", label: "Sold", headingClass: "border-stage-sold text-stage-sold" },
];

export type PipelineColumnId = PipelineStageId | "cold";

/** The board's columns. A cold lead sits in Cold whatever its stage, unless it is already sold. */
export const PIPELINE_COLUMNS: { id: PipelineColumnId; label: string; headingClass: string }[] = [
  ...PIPELINE_STAGES,
  { id: "cold", label: "Cold", headingClass: "border-cold text-cold" },
];

export function pipelineColumnOf(lead: { stage: string; temperature: string }): PipelineColumnId {
  return lead.temperature === "COLD" && lead.stage !== "sold" ? "cold" : (lead.stage as PipelineStageId);
}

/** Every stage a lead can hold. A lost lead has left the pipeline, so it has no board column. */
export const LEAD_STAGES: { id: LeadStageId; label: string }[] = [
  ...PIPELINE_STAGES.map(({ id, label }) => ({ id, label })),
  { id: "lost", label: "Lost" },
  { id: "listed", label: "Listed for sale" },
];

/** Stages a person can pick. Listed is only reached by listing the seller's property, so it shows only once held. */
export function pickableLeadStages(current: string) {
  return LEAD_STAGES.filter((entry) => entry.id !== "listed" || current === "listed");
}

const PAYMENT_STAGES = ["pre_closure", "sold"];

/** Moving forward into Pre-Closure or Sold must record the payment received. Mirrors the server rule. */
export function needsPayment(from: string, to: string) {
  const rank = (stage: string) => PIPELINE_STAGES.findIndex((entry) => entry.id === stage);
  return PAYMENT_STAGES.includes(to) && rank(to) > rank(from);
}

export function leadStageLabel(stage: string) {
  return LEAD_STAGES.find((entry) => entry.id === stage)?.label ?? stage;
}
