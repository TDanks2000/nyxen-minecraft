import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { AppTheme } from "@/shared/types";
import { rpc } from "@/views/main/lib/rpc";

const appThemes = new Set<AppTheme>([
  "dark",
  "midnight",
  "forest",
  "amber",
  "light",
  "system",
]);

export const isAppTheme = (value: unknown): value is AppTheme =>
  typeof value === "string" && appThemes.has(value as AppTheme);

export const normalizeAppTheme = (
  value: unknown,
  fallback: AppTheme,
): AppTheme => (isAppTheme(value) ? value : fallback);

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: AppTheme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<AppTheme>(() =>
    normalizeAppTheme(localStorage.getItem(storageKey), defaultTheme),
  );
  const localThemeChangedRef = useRef(false);

  useEffect(() => {
    const root = window.document.documentElement;
    const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      root.classList.remove("light", "dark");
      root.dataset.theme = theme;

      const resolvedTheme =
        theme === "system"
          ? darkQuery.matches
            ? "dark"
            : "light"
          : theme === "light"
            ? "light"
            : "dark";

      root.classList.add(resolvedTheme);
    };

    applyTheme();

    if (theme !== "system") return undefined;

    darkQuery.addEventListener("change", applyTheme);

    return () => darkQuery.removeEventListener("change", applyTheme);
  }, [theme]);

  useEffect(() => {
    let mounted = true;

    async function loadSavedTheme() {
      try {
        const status = await rpc.requestProxy.getSettingsStatus(null);
        const savedTheme = status.values["app.theme"];

        if (!mounted || !isAppTheme(savedTheme) || localThemeChangedRef.current)
          return;

        localStorage.setItem(storageKey, savedTheme);
        setThemeState(savedTheme);
      } catch {
        // The local fallback keeps the renderer usable in preview or early startup.
      }
    }

    void loadSavedTheme();

    return () => {
      mounted = false;
    };
  }, [storageKey]);

  const value = {
    theme,
    setTheme: (theme: AppTheme) => {
      localThemeChangedRef.current = true;
      localStorage.setItem(storageKey, theme);
      setThemeState(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
