import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/views/main/components/ui/button";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("App error boundary caught:", error, info.componentStack);
  }

  handleReload = (): void => {
    this.setState({ error: null });
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.error) {
      return this.props.children;
    }

    const message = this.state.error.message || "An unexpected error occurred.";

    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background p-6 text-foreground">
        <div className="flex max-w-md flex-col gap-4 rounded-lg border border-destructive/40 bg-card/70 p-6 text-center shadow-lg">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <AlertTriangleIcon className="size-6" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="font-heading font-semibold text-lg">
              Nyxen ran into a problem
            </h1>
            <p className="text-muted-foreground text-sm">
              The launcher hit an unexpected error. Reload to recover; if it
              repeats, capture the message below in a support bundle.
            </p>
          </div>
          <pre className="max-h-40 overflow-auto rounded-md border border-border bg-muted/40 px-3 py-2 text-left font-mono text-muted-foreground text-xs">
            {message}
          </pre>
          <Button onClick={this.handleReload}>
            <RefreshCwIcon data-icon="inline-start" />
            Reload launcher
          </Button>
        </div>
      </div>
    );
  }
}
