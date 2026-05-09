import * as React from "react"
import { CheckIcon } from "lucide-react"

import { Button } from "@/views/main/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/views/main/components/ui/dialog"
import { Progress } from "@/views/main/components/ui/progress"
import { ScrollArea } from "@/views/main/components/ui/scroll-area"
import { Spinner } from "@/views/main/components/ui/spinner"
import { cn } from "@/views/main/lib/utils"

type ButtonProps = React.ComponentProps<typeof Button>

type MultiStepDialogStep = {
  id: string
  title: React.ReactNode
  description?: React.ReactNode
  completed?: boolean
  disabled?: boolean
}

type MultiStepDialogAction = {
  label: React.ReactNode
  loadingLabel?: React.ReactNode
  loading?: boolean
} & Pick<ButtonProps, "disabled" | "form" | "onClick" | "type" | "variant">

type MultiStepDialogContentProps = Omit<
  React.ComponentProps<typeof DialogContent>,
  "children"
> & {
  title: React.ReactNode
  description?: React.ReactNode
  steps: ReadonlyArray<MultiStepDialogStep>
  stepIndex: number
  children: React.ReactNode
  onStepChange?: (stepIndex: number) => void
  maxSelectableStepIndex?: number
  primaryAction?: MultiStepDialogAction
  secondaryAction?: MultiStepDialogAction
  supportingAction?: React.ReactNode
}

function MultiStepDialog(props: React.ComponentProps<typeof Dialog>) {
  return <Dialog {...props} />
}

function MultiStepDialogContent({
  title,
  description,
  steps,
  stepIndex,
  children,
  className,
  onStepChange,
  maxSelectableStepIndex = stepIndex,
  primaryAction,
  secondaryAction,
  supportingAction,
  ...props
}: MultiStepDialogContentProps) {
  const lastStepIndex = steps.length - 1
  const safeStepIndex =
    steps.length > 0 ? clamp(stepIndex, 0, lastStepIndex) : 0
  const safeMaxSelectableStepIndex =
    steps.length > 0 ? clamp(maxSelectableStepIndex, 0, lastStepIndex) : -1
  const currentStep = steps[safeStepIndex]
  const progressValue =
    steps.length === 0 ? 0 : ((safeStepIndex + 1) / steps.length) * 100

  React.useEffect(() => {
    if (stepIndex !== safeStepIndex) {
      onStepChange?.(safeStepIndex)
    }
  }, [onStepChange, safeStepIndex, stepIndex])

  return (
    <DialogContent
      className={cn(
        "flex flex-col max-h-[calc(100dvh-2rem)] gap-0 overflow-hidden p-0 sm:max-w-xl md:max-w-2xl",
        className
      )}
      {...props}
    >
      <DialogHeader className="shrink-0 gap-3 px-4 pt-4 pr-12 pb-3 md:px-5 md:pt-5">
        <div className="flex min-w-0 flex-col gap-1">
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </div>
        <Progress
          value={progressValue}
          aria-label="Step progress"
          aria-valuetext={
            steps.length > 0
              ? `Step ${safeStepIndex + 1} of ${steps.length}`
              : "No steps"
          }
        />
      </DialogHeader>

      <p aria-live="polite" className="sr-only">
        {steps.length > 0 ? (
          <>
            Step {safeStepIndex + 1} of {steps.length}
            {currentStep ? <>: {currentStep.title}</> : null}
          </>
        ) : (
          "No steps available"
        )}
      </p>

      <div
        className={cn(
          "grid flex-1 min-h-0 overflow-hidden border-t border-border grid-rows-[auto_1fr] md:grid-rows-[1fr] md:grid-cols-[12rem_minmax(0,1fr)]",
          steps.length === 0 && "grid-rows-[1fr] md:grid-cols-1"
        )}
      >
        {steps.length > 0 && (
          <StepRail
            steps={steps}
            stepIndex={safeStepIndex}
            maxSelectableStepIndex={safeMaxSelectableStepIndex}
            onStepChange={onStepChange}
          />
        )}

        <div className="flex min-w-0 flex-col min-h-0 overflow-hidden">
          <ScrollArea className="flex-1 min-h-0 overflow-hidden">
            <div className="p-4 md:p-5">{children}</div>
          </ScrollArea>

          <div className="flex shrink-0 flex-col gap-3 border-t border-border bg-muted/45 p-3 sm:flex-row sm:items-center sm:justify-between md:p-4">
            <div className="min-w-0 flex-1 text-muted-foreground text-sm">
              {supportingAction}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {secondaryAction && (
                <DialogAction
                  action={secondaryAction}
                  defaultVariant="outline"
                />
              )}
              {primaryAction && (
                <DialogAction action={primaryAction} defaultVariant="default" />
              )}
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  )
}

function StepRail({
  steps,
  stepIndex,
  maxSelectableStepIndex,
  onStepChange,
}: {
  steps: ReadonlyArray<MultiStepDialogStep>
  stepIndex: number
  maxSelectableStepIndex: number
  onStepChange?: (stepIndex: number) => void
}) {
  return (
    <nav
      aria-label="Dialog steps"
      className="border-b border-border bg-muted/30 p-3 md:border-r md:border-b-0 md:p-4"
    >
      <ol className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
        {steps.map((step, index) => {
          const active = index === stepIndex
          const completed = step.completed ?? index < stepIndex
          const selectable =
            !!onStepChange && !step.disabled && index <= maxSelectableStepIndex

          return (
            <li key={step.id} className="min-w-[9.5rem] flex-1 md:min-w-0">
              <button
                type="button"
                className={cn(
                  "flex w-full items-start gap-2 rounded-md p-2 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                  active
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground",
                  selectable && !active && "hover:bg-background/70 hover:text-foreground",
                  !selectable && "cursor-default"
                )}
                aria-current={active ? "step" : undefined}
                aria-disabled={!selectable}
                disabled={!selectable}
                onClick={() => onStepChange?.(index)}
              >
                <span className="sr-only">
                  {active
                    ? "Current step, "
                    : completed
                      ? "Completed step, "
                      : ""}
                </span>
                <span
                  className={cn(
                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : completed
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground"
                  )}
                >
                  {completed && !active ? (
                    <CheckIcon className="size-3.5" aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-sm font-semibold">
                    {step.title}
                  </span>
                  {step.description && (
                    <span className="line-clamp-2 text-xs leading-snug">
                      {step.description}
                    </span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function DialogAction({
  action,
  defaultVariant,
}: {
  action: MultiStepDialogAction
  defaultVariant: NonNullable<ButtonProps["variant"]>
}) {
  const loading = !!action.loading

  return (
    <Button
      type={action.type ?? "button"}
      form={action.form}
      variant={action.variant ?? defaultVariant}
      disabled={action.disabled || loading}
      onClick={action.onClick}
    >
      {loading && <Spinner data-icon="inline-start" />}
      {loading ? (action.loadingLabel ?? action.label) : action.label}
    </Button>
  )
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export {
  MultiStepDialog,
  MultiStepDialogContent,
  DialogTrigger as MultiStepDialogTrigger,
}
export type {
  MultiStepDialogAction,
  MultiStepDialogContentProps,
  MultiStepDialogStep,
}
