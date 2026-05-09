export type NewInstanceFormSubmitAction = "continue" | "ignore";

type StepActionState = {
  activeStepIndex: number;
  lastStepIndex: number;
};

export function getNewInstanceFormSubmitAction({
  activeStepIndex,
  lastStepIndex,
  canContinue,
  hasSubmitter,
}: StepActionState & {
  canContinue: boolean;
  hasSubmitter: boolean;
}): NewInstanceFormSubmitAction {
  if (hasSubmitter) {
    return "ignore";
  }

  if (activeStepIndex < lastStepIndex && canContinue) {
    return "continue";
  }

  return "ignore";
}

export function canCreateNewInstanceFromAction({
  activeStepIndex,
  lastStepIndex,
  canSubmit,
}: StepActionState & {
  canSubmit: boolean;
}) {
  return activeStepIndex === lastStepIndex && canSubmit;
}
