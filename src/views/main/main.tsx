import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import "./styles/globals.css";
import { AppErrorBoundary } from "./components/app-error-boundary";
import { ThemeProvider } from "./components/theme-provider";
import { TooltipProvider } from "./components/ui/tooltip";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <AppErrorBoundary>
      <ThemeProvider defaultTheme="dark" storageKey="nyxen-theme">
        <TooltipProvider delay={250}>
          <App />
        </TooltipProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  </StrictMode>,
);
