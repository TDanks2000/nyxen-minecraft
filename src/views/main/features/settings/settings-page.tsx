import {
  AlertTriangleIcon,
  BoxIcon,
  ChevronDownIcon,
  CpuIcon,
  DiscIcon,
  DownloadIcon,
  FolderIcon,
  ImageIcon,
  LinkIcon,
  ListIcon,
  RefreshCwIcon,
  SearchIcon,
  ShieldIcon,
  SparklesIcon,
  UploadIcon,
  WrenchIcon,
  XIcon,
  ZapIcon,
} from "lucide-react";
import {
  type CSSProperties,
  type ElementType,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import type { AppSettings, AppTheme, SettingValue } from "@/shared/types";
import {
  normalizeAppTheme,
  useTheme,
} from "@/views/main/components/theme-provider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/views/main/components/ui/alert-dialog";
import { useDownloadQueueStore } from "@/views/main/features/downloads/download-queue-store";
import { useInstanceContentStore } from "@/views/main/features/instances/hooks/use-instance-content-store";
import { useInstances } from "@/views/main/hooks/use-instances";
import { useLauncherStatus } from "@/views/main/hooks/use-launcher-status";
import { useProfiles } from "@/views/main/hooks/use-profiles";
import { useSettings } from "@/views/main/hooks/use-settings";
import { openLocalPath } from "@/views/main/lib/open-local-path";
import { rpc } from "@/views/main/lib/rpc";

// ─── Design palette ───────────────────────────────────────────────────────────

const PALETTE: CSSProperties = {
  // @ts-expect-error CSS custom properties on style
  "--bg": "var(--settings-bg)",
  "--panel": "var(--settings-panel)",
  "--panel-2": "var(--settings-panel-2)",
  "--panel-3": "var(--settings-panel-3)",
  "--border": "var(--settings-border)",
  "--border-strong": "var(--settings-border-strong)",
  "--text": "var(--settings-text)",
  "--text-2": "var(--settings-text-2)",
  "--text-3": "var(--settings-text-3)",
  "--green": "var(--settings-green)",
  "--green-dim": "var(--settings-green-dim)",
  "--green-deep": "var(--settings-green-deep)",
  "--amber": "var(--settings-amber)",
  "--red": "var(--settings-red)",
  "--blue": "var(--settings-blue)",
  "--purple": "var(--settings-purple)",
  "--orange": "var(--settings-orange)",
  fontFamily: "'Inter', system-ui, sans-serif",
  fontSize: 13,
  lineHeight: 1.4,
  color: "var(--text)",
  background: "var(--bg)",
};

const mono: CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
};

// ─── Button styles ────────────────────────────────────────────────────────────

const sBtnSm: CSSProperties = {
  background: "var(--panel-2)",
  color: "var(--text)",
  border: "1px solid var(--border-strong)",
  padding: "5px 10px",
  fontSize: 11,
  fontWeight: 500,
  borderRadius: 4,
  fontFamily: "inherit",
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  cursor: "pointer",
};

const sBtnDanger: CSSProperties = {
  background: "oklch(0.3 0.12 25)",
  color: "var(--red)",
  border: "1px solid oklch(0.4 0.14 25)",
  padding: "6px 12px",
  fontSize: 12,
  fontWeight: 600,
  borderRadius: 5,
  fontFamily: "inherit",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  cursor: "pointer",
};

// ─── Atoms ────────────────────────────────────────────────────────────────────

function SPill({
  children,
  color = "var(--text-2)",
  bg = "transparent",
  border = "var(--border-strong)",
  style,
}: {
  children: ReactNode;
  color?: string;
  bg?: string;
  border?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 7px",
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: "0.02em",
        color,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 4,
        fontFamily: "'JetBrains Mono', monospace",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

function Section({
  icon: Icon,
  eyebrow,
  title,
  sub,
  children,
  action,
}: {
  icon: ElementType;
  eyebrow: string;
  title: string;
  sub: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 8,
            background: "oklch(0.22 0.06 145 / 0.5)",
            border: "1px solid oklch(0.32 0.1 145)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--green)",
            flexShrink: 0,
          }}
        >
          <Icon size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              ...mono,
              fontSize: 10,
              color: "var(--text-3)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            {eyebrow}
          </div>
          <h2
            style={{
              margin: "2px 0 0 0",
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              color: "var(--text)",
            }}
          >
            {title}
          </h2>
          <div style={{ fontSize: 12.5, color: "var(--text-2)", marginTop: 2 }}>
            {sub}
          </div>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function Row({
  label,
  hint,
  children,
  tight,
  last,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  tight?: boolean;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 320px",
        gap: 24,
        padding: tight ? "12px 18px" : "16px 18px",
        alignItems: "center",
        borderBottom: last ? "none" : "1px solid var(--border)",
      }}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
          {label}
        </div>
        {hint && (
          <div
            style={{
              fontSize: 11.5,
              color: "var(--text-3)",
              marginTop: 3,
              lineHeight: 1.4,
            }}
          >
            {hint}
          </div>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

function ToggleSwitch({
  on,
  onChange,
}: {
  on: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <label
      style={{
        position: "relative",
        display: "inline-block",
        width: 36,
        height: 20,
        cursor: onChange ? "pointer" : "default",
      }}
    >
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => onChange?.(e.target.checked)}
        style={{ opacity: 0, width: 0, height: 0 }}
      />
      <span
        style={{
          position: "absolute",
          inset: 0,
          background: on ? "var(--green)" : "var(--panel-3)",
          border: `1px solid ${on ? "var(--green-dim)" : "var(--border-strong)"}`,
          borderRadius: 10,
          transition: "0.2s",
        }}
      />
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 18 : 2,
          width: 14,
          height: 14,
          background: on ? "#0a1a0a" : "var(--text-2)",
          borderRadius: "50%",
          transition: "0.2s",
        }}
      />
    </label>
  );
}

function SelectInline<T extends string>({
  value,
  onChange,
  options,
  width = 180,
  style,
}: {
  value: T;
  onChange?: (v: T) => void;
  options: Array<{ value: T; label: string }>;
  width?: number | string;
  style?: CSSProperties;
}) {
  return (
    <div style={{ position: "relative", width, ...style }}>
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value as T)}
        style={{
          background: "var(--panel-2)",
          border: "1px solid var(--border-strong)",
          borderRadius: 5,
          padding: "7px 28px 7px 10px",
          color: "var(--text)",
          fontSize: 12,
          outline: "none",
          width: "100%",
          appearance: "none",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        {options.map((o) => (
          <option
            key={o.value}
            value={o.value}
            style={{ background: "var(--panel-2)" }}
          >
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon
        size={11}
        style={{
          position: "absolute",
          right: 10,
          top: 10,
          color: "var(--text-3)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

function SliderWithAuto({
  min,
  max,
  step,
  value,
  onChange,
  auto,
  onAutoToggle,
  autoValue,
  suffix,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange?: (v: number) => void;
  auto: boolean;
  onAutoToggle?: (a: boolean) => void;
  autoValue: string;
  suffix?: string;
}) {
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}
    >
      <button
        type="button"
        onClick={() => onAutoToggle?.(!auto)}
        style={{
          padding: "4px 8px",
          fontSize: 10.5,
          fontWeight: 600,
          borderRadius: 4,
          background: auto ? "oklch(0.22 0.06 145)" : "var(--panel-3)",
          border: `1px solid ${auto ? "var(--green-dim)" : "var(--border-strong)"}`,
          color: auto ? "var(--green)" : "var(--text-3)",
          fontFamily: "inherit",
          cursor: "pointer",
          letterSpacing: "0.05em",
        }}
      >
        AUTO
      </button>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange?.(Number(e.target.value))}
        disabled={auto}
        style={{
          flex: 1,
          accentColor: "var(--green)",
          opacity: auto ? 0.4 : 1,
        }}
      />
      <span
        style={{
          ...mono,
          fontSize: 11.5,
          color: auto ? "var(--text-3)" : "var(--text)",
          width: 64,
          textAlign: "right",
        }}
      >
        {auto ? autoValue : `${value}${!auto && suffix ? ` ${suffix}` : ""}`}
      </span>
    </div>
  );
}

// ─── Theme swatches ───────────────────────────────────────────────────────────

const THEMES = [
  { id: "dark", label: "Dark", bg: "#0a0d0a", accent: "#5dd66b" },
  { id: "midnight", label: "Midnight", bg: "#070912", accent: "#6aa9ff" },
  { id: "forest", label: "Forest", bg: "#0a120c", accent: "#5dd66b" },
  { id: "amber", label: "Amber", bg: "#100c08", accent: "#f0b341" },
  { id: "light", label: "Light", bg: "#f3f5ee", accent: "#3f9e4a" },
  {
    id: "system",
    label: "Auto",
    bg: "linear-gradient(135deg, #0a0d0a 50%, #f3f5ee 50%)",
    accent: "#5dd66b",
  },
] satisfies Array<{
  id: AppTheme;
  label: string;
  bg: string;
  accent: string;
}>;

type SectionProps = {
  settings: AppSettings | undefined;
  updateSetting: (key: string, value: SettingValue) => Promise<void>;
};

// ─── Sections ─────────────────────────────────────────────────────────────────

function AppearanceSection({ settings, updateSetting }: SectionProps) {
  const { theme: activeTheme, setTheme } = useTheme();
  const theme = normalizeAppTheme(settings?.["app.theme"], activeTheme);

  function handleTheme(id: AppTheme) {
    setTheme(id);
    void updateSetting("app.theme", id);
  }

  return (
    <Section
      icon={ImageIcon}
      eyebrow="Preferences · 01"
      title="Appearance"
      sub="How the launcher looks. Theme applies live."
    >
      <div
        style={{
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: 10,
        }}
      >
        <Row
          last
          label="Theme"
          hint="Set the application color scheme. System follows your OS setting."
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 6,
            }}
          >
            {THEMES.map((th) => (
              <button
                type="button"
                key={th.id}
                onClick={() => handleTheme(th.id)}
                style={{
                  padding: 8,
                  borderRadius: 6,
                  background: "var(--panel-2)",
                  border: `2px solid ${theme === th.id ? "var(--green)" : "var(--border)"}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: "inherit",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 18,
                    borderRadius: 3,
                    background: th.bg,
                    position: "relative",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      bottom: 3,
                      left: 3,
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: th.accent,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 500,
                    color: theme === th.id ? "var(--text)" : "var(--text-2)",
                  }}
                >
                  {th.label}
                </span>
              </button>
            ))}
          </div>
        </Row>
      </div>
    </Section>
  );
}

type DetectedJava = {
  error: string | null;
  executable: string;
  majorVersion: number | null;
  output: string;
  version: string | null;
} | null;

function JavaSection({ settings, updateSetting }: SectionProps) {
  const javaManagement =
    (settings?.["launcher.javaManagement"] as string) ?? "app-controlled";
  const [detected, setDetected] = useState<DetectedJava>(null);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    void (async () => {
      setDetecting(true);
      try {
        const result = await rpc.requestProxy.detectSystemJava(null);
        setDetected(result);
      } catch {
        setDetected({
          error: "Detection failed",
          executable: "",
          majorVersion: null,
          output: "",
          version: null,
        });
      } finally {
        setDetecting(false);
      }
    })();
  }, []);

  async function reDetect() {
    setDetecting(true);
    try {
      const result = await rpc.requestProxy.detectSystemJava(null);
      setDetected(result);
      if (result.error) toast.error(`Java not found: ${result.error}`);
      else toast.success(`Detected Java ${result.version}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Detection failed");
    } finally {
      setDetecting(false);
    }
  }

  return (
    <Section
      icon={CpuIcon}
      eyebrow="Preferences · 02"
      title="Java"
      sub="Manage runtimes used to launch Minecraft. Most users should leave this on auto."
    >
      <div
        style={{
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: 10,
        }}
      >
        <Row
          label="Java management"
          hint="Use system or per-instance Java, or let Nyxen download the runtime required by each Minecraft version."
        >
          <SelectInline
            value={javaManagement}
            onChange={(v) => void updateSetting("launcher.javaManagement", v)}
            style={{ width: "100%" }}
            options={[
              {
                value: "app-controlled",
                label: "App-controlled (recommended)",
              },
              { value: "per-instance", label: "Per-instance" },
              { value: "auto", label: "System only" },
              { value: "custom", label: "Custom paths" },
            ]}
          />
        </Row>
        <Row
          last
          label="System Java"
          hint="Java installation found on PATH or common locations."
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {detecting ? (
              <span style={{ fontSize: 12, color: "var(--text-3)" }}>
                Detecting…
              </span>
            ) : detected ? (
              detected.error ? (
                <SPill
                  color="var(--red)"
                  border="oklch(0.4 0.14 25)"
                  bg="oklch(0.2 0.08 25)"
                >
                  Not found
                </SPill>
              ) : (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <SPill
                      color="var(--green)"
                      border="oklch(0.4 0.14 145)"
                      bg="oklch(0.2 0.06 145)"
                    >
                      Java {detected.majorVersion}
                    </SPill>
                    <span
                      style={{ ...mono, fontSize: 11, color: "var(--text-3)" }}
                    >
                      {detected.version}
                    </span>
                  </div>
                  <div
                    style={{
                      ...mono,
                      fontSize: 10.5,
                      color: "var(--text-3)",
                      marginTop: 3,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={detected.executable}
                  >
                    {detected.executable}
                  </div>
                </div>
              )
            ) : null}
            <button
              type="button"
              style={sBtnSm}
              onClick={() => void reDetect()}
              disabled={detecting}
            >
              <RefreshCwIcon size={11} /> Detect
            </button>
          </div>
        </Row>
      </div>
    </Section>
  );
}

function DownloadsSection({ settings, updateSetting }: SectionProps) {
  const dlRaw = settings?.["launcher.downloadConcurrency"];
  const dlAuto = dlRaw === null || dlRaw === undefined;
  const dlValue = typeof dlRaw === "number" ? dlRaw : 8;

  const assetRaw = settings?.["launcher.assetConcurrency"];
  const assetAuto = assetRaw === null || assetRaw === undefined;
  const assetValue = typeof assetRaw === "number" ? assetRaw : 16;

  const timeoutRaw = settings?.["launcher.downloadTimeoutSeconds"];
  const timeoutAuto = timeoutRaw === null || timeoutRaw === undefined;
  const timeoutValue = typeof timeoutRaw === "number" ? timeoutRaw : 30;

  const retriesRaw = settings?.["launcher.downloadRetries"];
  const retriesAuto = retriesRaw === null || retriesRaw === undefined;
  const retriesValue = typeof retriesRaw === "number" ? retriesRaw : 4;

  const [cfConfigured, setCfConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    void rpc.requestProxy
      .getCurseForgeStatus(null)
      .then((s) => setCfConfigured(s.configured))
      .catch(() => setCfConfigured(false));
  }, []);

  const modSources = [
    {
      name: "Modrinth",
      host: "api.modrinth.com",
      enabled: true,
      color: "#1bd96a",
    },
    {
      name: "CurseForge",
      host: "api.curseforge.com",
      enabled: cfConfigured ?? false,
      color: "var(--orange)",
    },
    {
      name: "Mojang piston",
      host: "piston-meta.mojang.com",
      enabled: true,
      color: "var(--text-2)",
    },
    {
      name: "NeoForge maven",
      host: "maven.neoforged.net",
      enabled: true,
      color: "var(--orange)",
    },
  ];

  return (
    <Section
      icon={DownloadIcon}
      eyebrow="Preferences · 03"
      title="Downloads & Network"
      sub="Tune how Nyxen fetches game files and mods."
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div
          style={{
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: 18,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "var(--text-2)",
              marginBottom: 12,
            }}
          >
            Concurrency
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              {
                label: "Library downloads",
                sub: "Parallel JARs and libraries",
                min: 1,
                max: 32,
                step: 1,
                value: dlValue,
                auto: dlAuto,
                autoValue: "8",
                suffix: "threads",
                key: "launcher.downloadConcurrency",
              },
              {
                label: "Asset downloads",
                sub: "Textures, sounds, tiny files",
                min: 4,
                max: 64,
                step: 2,
                value: assetValue,
                auto: assetAuto,
                autoValue: "16",
                suffix: "threads",
                key: "launcher.assetConcurrency",
              },
              {
                label: "Request timeout",
                sub: "Per-file abort threshold",
                min: 5,
                max: 120,
                step: 5,
                value: timeoutValue,
                auto: timeoutAuto,
                autoValue: "30",
                suffix: "s",
                key: "launcher.downloadTimeoutSeconds",
              },
              {
                label: "Retry attempts",
                sub: "Failed-download backoff",
                min: 0,
                max: 10,
                step: 1,
                value: retriesValue,
                auto: retriesAuto,
                autoValue: "4",
                key: "launcher.downloadRetries",
              },
            ].map((item) => (
              <div key={item.key}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>
                    {item.label}
                  </span>
                  <span style={{ fontSize: 10.5, color: "var(--text-3)" }}>
                    {item.sub}
                  </span>
                </div>
                <SliderWithAuto
                  min={item.min}
                  max={item.max}
                  step={item.step}
                  value={item.value}
                  onChange={(v) => void updateSetting(item.key, v)}
                  auto={item.auto}
                  onAutoToggle={(isAuto) =>
                    void updateSetting(item.key, isAuto ? null : item.value)
                  }
                  autoValue={item.autoValue}
                  suffix={"suffix" in item ? item.suffix : undefined}
                />
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: 18,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "var(--text-2)",
              marginBottom: 12,
            }}
          >
            Mod sources
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {modSources.map((s) => (
              <div
                key={s.host}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  gap: 10,
                  alignItems: "center",
                  padding: "8px 10px",
                  background: "var(--panel-2)",
                  borderRadius: 5,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: s.enabled ? "var(--green)" : "var(--text-3)",
                    boxShadow: s.enabled ? "0 0 6px var(--green)" : "none",
                  }}
                />
                <div>
                  <div
                    style={{ fontSize: 12, fontWeight: 600, color: s.color }}
                  >
                    {s.name}
                  </div>
                  <div
                    style={{ ...mono, fontSize: 10, color: "var(--text-3)" }}
                  >
                    {s.host}
                  </div>
                </div>
                <SPill
                  color={s.enabled ? "var(--green)" : "var(--text-3)"}
                  border={
                    s.enabled ? "oklch(0.4 0.14 145)" : "var(--border-strong)"
                  }
                  bg={s.enabled ? "oklch(0.2 0.06 145)" : "transparent"}
                  style={{ padding: "1px 5px", fontSize: 9 }}
                >
                  {s.enabled ? "ON" : "OFF"}
                </SPill>
              </div>
            ))}
          </div>
          {cfConfigured === false && (
            <div
              style={{
                fontSize: 11,
                color: "var(--text-3)",
                marginTop: 10,
                lineHeight: 1.4,
              }}
            >
              CurseForge requires a{" "}
              <span style={{ ...mono }}>CURSEFORGE_API_KEY</span> environment
              variable to be set.
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

function BehaviorSection({ settings, updateSetting }: SectionProps) {
  const onLaunchRaw = settings?.["launcher.onLaunch"];
  const keepOpenRaw = settings?.["launcher.keepOpenAfterLaunch"];
  const onLaunch =
    typeof onLaunchRaw === "string"
      ? onLaunchRaw
      : keepOpenRaw === false
        ? "minimize"
        : "keep";
  const showSnapshots = !!settings?.["launcher.showSnapshots"];
  const lowEnd = !!settings?.["launcher.lowEndMode"];

  return (
    <Section
      icon={SparklesIcon}
      eyebrow="Preferences · 04"
      title="Behavior"
      sub="What happens when you click Play, and how the launcher handles updates."
    >
      <div
        style={{
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: 10,
        }}
      >
        <Row
          label="When launching a game"
          hint="What to do with the Nyxen window after a game starts."
        >
          <SelectInline
            value={onLaunch}
            onChange={(v) => void updateSetting("launcher.onLaunch", v)}
            style={{ width: "100%" }}
            options={[
              { value: "keep", label: "Keep launcher open" },
              { value: "minimize", label: "Minimize to tray" },
              { value: "hide", label: "Hide until exit" },
              { value: "close", label: "Close launcher" },
            ]}
          />
        </Row>
        <Row
          label="Show snapshot builds"
          hint="Include pre-release and snapshot versions in pickers."
        >
          <ToggleSwitch
            on={showSnapshots}
            onChange={(v) => void updateSetting("launcher.showSnapshots", v)}
          />
        </Row>
        <Row
          last
          label="Low-end mode"
          hint="Reduce default download concurrency, disable hover art, lazy-load instance grids."
        >
          <ToggleSwitch
            on={lowEnd}
            onChange={(v) => void updateSetting("launcher.lowEndMode", v)}
          />
        </Row>
      </div>
    </Section>
  );
}

function StorageSection({
  dirs,
}: {
  dirs:
    | {
        root: string;
        instances: string;
        assets: string;
        runtimes: string;
        versions: string;
        logs: string;
      }
    | undefined;
}) {
  const fallbackRoot = "~/.local/share/dev.tdanks2000.nyxenminecraft/launcher";
  const paths = [
    { label: "Root", icon: FolderIcon, path: dirs?.root ?? fallbackRoot },
    {
      label: "Instances",
      icon: BoxIcon,
      path: dirs?.instances ?? `${fallbackRoot}/instances`,
    },
    {
      label: "Assets",
      icon: ImageIcon,
      path: dirs?.assets ?? `${fallbackRoot}/assets`,
    },
    {
      label: "Runtimes",
      icon: CpuIcon,
      path: dirs?.runtimes ?? `${fallbackRoot}/runtimes`,
    },
    {
      label: "Versions",
      icon: ZapIcon,
      path: dirs?.versions ?? `${fallbackRoot}/versions`,
    },
    {
      label: "Logs",
      icon: ListIcon,
      path: dirs?.logs ?? `${fallbackRoot}/logs`,
    },
  ];

  async function copy(p: string) {
    try {
      await navigator.clipboard.writeText(p);
      toast.success("Path copied");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  }

  return (
    <Section
      icon={DiscIcon}
      eyebrow="Preferences · 05"
      title="Storage"
      sub="Where Nyxen keeps its files."
      action={
        <button
          type="button"
          style={sBtnSm}
          onClick={() => dirs && void openLocalPath(dirs.root)}
        >
          <FolderIcon size={11} /> Open root
        </button>
      }
    >
      <div
        style={{
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: 10,
        }}
      >
        {paths.map((p, i) => {
          const PathIcon = p.icon;
          return (
            <div
              key={p.label}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                alignItems: "center",
                gap: 12,
                padding: "12px 18px",
                borderBottom:
                  i < paths.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 5,
                  background: "var(--panel-2)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--green)",
                }}
              >
                <PathIcon size={14} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.label}</div>
                <div
                  style={{
                    ...mono,
                    fontSize: 11,
                    color: "var(--text-3)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={p.path}
                >
                  {p.path}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  type="button"
                  style={sBtnSm}
                  title="Open in file manager"
                  onClick={() => void openLocalPath(p.path)}
                >
                  <FolderIcon size={11} />
                </button>
                <button
                  type="button"
                  style={sBtnSm}
                  title="Copy path"
                  onClick={() => void copy(p.path)}
                >
                  <LinkIcon size={11} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function MaintenanceSection({
  onClearCache,
  onClearData,
  clearingStorage,
}: {
  onClearCache: () => void;
  onClearData: () => void;
  clearingStorage: "cache" | "data" | null;
}) {
  return (
    <Section
      icon={WrenchIcon}
      eyebrow="Preferences · 06"
      title="Maintenance"
      sub="Clear caches or reset Nyxen to a clean state."
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 12,
        }}
      >
        <div
          style={{
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: "var(--panel-2)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--green)",
              }}
            >
              <RefreshCwIcon size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Clear cache</div>
            </div>
          </div>
          <div
            style={{ fontSize: 11.5, color: "var(--text-2)", lineHeight: 1.4 }}
          >
            Remove downloaded artifacts, runtimes, temp files and instance cache
            without deleting instances.
          </div>
          <div style={{ marginTop: "auto" }}>
            <button
              type="button"
              style={sBtnSm}
              disabled={clearingStorage !== null}
              onClick={onClearCache}
            >
              Clear cache
            </button>
          </div>
        </div>
        <div
          style={{
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: "var(--panel-2)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--green)",
              }}
            >
              <UploadIcon size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Export backup</div>
            </div>
          </div>
          <div
            style={{ fontSize: 11.5, color: "var(--text-2)", lineHeight: 1.4 }}
          >
            Zip your instances, profiles and settings into a portable archive.
          </div>
          <div style={{ marginTop: "auto" }}>
            <button
              type="button"
              style={{ ...sBtnSm, opacity: 0.5, cursor: "not-allowed" }}
              disabled
            >
              Coming soon
            </button>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div
        style={{
          background: "oklch(0.16 0.08 25 / 0.4)",
          border: "1px solid oklch(0.4 0.16 25)",
          borderRadius: 10,
          padding: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 6,
              background: "oklch(0.25 0.12 25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--red)",
            }}
          >
            <AlertTriangleIcon size={16} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--red)" }}>
              Danger zone
            </div>
            <div style={{ fontSize: 11.5, color: "var(--text-2)" }}>
              These actions cannot be undone. Worlds, mods and profiles will be
              permanently removed.
            </div>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 8,
          }}
        >
          <button
            type="button"
            style={{ ...sBtnDanger, width: "100%", justifyContent: "center" }}
            disabled={clearingStorage !== null}
            onClick={onClearData}
          >
            <XIcon size={12} /> Clear all launcher data
          </button>
          <button
            type="button"
            style={{
              ...sBtnDanger,
              width: "100%",
              justifyContent: "center",
              background: "oklch(0.32 0.16 25)",
              opacity: 0.5,
              cursor: "not-allowed",
            }}
            disabled
          >
            <AlertTriangleIcon size={12} /> Factory reset
          </button>
        </div>
      </div>
    </Section>
  );
}

function AboutSection() {
  return (
    <Section
      icon={ShieldIcon}
      eyebrow="Info · 07"
      title="About Nyxen"
      sub="Build info, licenses and links."
    >
      <div
        style={{
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: 24,
          display: "flex",
          gap: 24,
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 12,
            background:
              "linear-gradient(135deg, var(--green) 0%, var(--green-dim) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 800,
            fontSize: 44,
            color: "#0a1a0a",
            letterSpacing: "-0.05em",
            flexShrink: 0,
          }}
        >
          N
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Nyxen Minecraft</div>
          <div style={{ fontSize: 12, color: "var(--text-2)" }}>
            Next-gen launcher · v0.2.0
          </div>
          <div
            style={{
              ...mono,
              fontSize: 10.5,
              color: "var(--text-3)",
              marginTop: 6,
            }}
          >
            Electrobun · Bun · React 19
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <button
            type="button"
            style={sBtnSm}
            onClick={() =>
              toast.info("No updates available — you're on the latest version")
            }
          >
            <RefreshCwIcon size={11} /> Check for updates
          </button>
          <button
            type="button"
            style={sBtnSm}
            onClick={() => toast.info("Release notes coming soon")}
          >
            <LinkIcon size={11} /> Release notes
          </button>
          <button
            type="button"
            style={sBtnSm}
            onClick={() => toast.info("GitHub link coming soon")}
          >
            <LinkIcon size={11} /> Source on GitHub
          </button>
        </div>
      </div>
    </Section>
  );
}

// ─── Nav config ───────────────────────────────────────────────────────────────

const SECTION_LIST = [
  {
    id: "appearance",
    label: "Appearance",
    icon: ImageIcon,
    group: "PREFERENCES",
  },
  { id: "java", label: "Java", icon: CpuIcon, group: "PREFERENCES" },
  {
    id: "downloads",
    label: "Downloads",
    icon: DownloadIcon,
    group: "PREFERENCES",
  },
  {
    id: "behavior",
    label: "Behavior",
    icon: SparklesIcon,
    group: "PREFERENCES",
  },
  { id: "storage", label: "Storage", icon: DiscIcon, group: "DATA" },
  { id: "maintenance", label: "Maintenance", icon: WrenchIcon, group: "DATA" },
  { id: "about", label: "About", icon: ShieldIcon, group: "INFO" },
] as const;

type SectionId = (typeof SECTION_LIST)[number]["id"];
const GROUPS = ["PREFERENCES", "DATA", "INFO"] as const;

// ─── Main ─────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const settingsHook = useSettings();
  const statusHook = useLauncherStatus();
  const instancesHook = useInstances();
  const profilesHook = useProfiles();
  const clearAllInstanceContent = useInstanceContentStore(
    (state) => state.clearAllContent,
  );
  const clearFinishedDownloadJobs = useDownloadQueueStore(
    (state) => state.clearFinishedDownloadJobs,
  );

  const [section, setSection] = useState<SectionId>("appearance");
  const [search, setSearch] = useState("");
  const [confirmStorageAction, setConfirmStorageAction] = useState<
    "cache" | "data" | null
  >(null);
  const [clearingStorage, setClearingStorage] = useState<
    "cache" | "data" | null
  >(null);
  const [savedAgoSeconds, setSavedAgoSeconds] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updatedAt = settingsHook.data?.updatedAt;
    if (!updatedAt) return;
    const tick = () => {
      setSavedAgoSeconds(
        Math.max(
          0,
          Math.round((Date.now() - new Date(updatedAt).getTime()) / 1000),
        ),
      );
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [settingsHook.data?.updatedAt]);

  function goTo(id: SectionId) {
    setSection(id);
    const el = document.getElementById(`section-${id}`);
    if (el && containerRef.current) {
      containerRef.current.scrollTo({
        top: el.offsetTop - 24,
        behavior: "smooth",
      });
    }
  }

  async function handleClearStorage(action: "cache" | "data") {
    setClearingStorage(action);
    try {
      const result =
        action === "cache"
          ? await rpc.requestProxy.clearLauncherCache(null)
          : await rpc.requestProxy.clearLauncherData(null);
      toast.success(
        action === "cache"
          ? `Cache cleared (${result.removedPaths.length} location${result.removedPaths.length === 1 ? "" : "s"})`
          : "Launcher data cleared",
      );
      await clearFinishedDownloadJobs().catch(() => []);
      statusHook.refresh();
      if (action === "data") {
        instancesHook.refresh();
        profilesHook.refresh();
        clearAllInstanceContent();
      }
      setConfirmStorageAction(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to clear storage",
      );
    } finally {
      setClearingStorage(null);
    }
  }

  const settings = settingsHook.data?.values;
  const dirs = statusHook.data?.directories;
  const storageActionPending =
    confirmStorageAction !== null && clearingStorage === confirmStorageAction;

  const sectionProps: SectionProps = {
    settings,
    updateSetting: settingsHook.updateSetting,
  };

  const filtered = search.trim()
    ? SECTION_LIST.filter((s) =>
        s.label.toLowerCase().includes(search.toLowerCase()),
      )
    : SECTION_LIST;

  return (
    <>
      <div
        style={{
          ...PALETTE,
          display: "flex",
          height: "100%",
          overflow: "hidden",
        }}
      >
        {/* Settings nav */}
        <nav
          style={{
            width: 220,
            padding: 18,
            borderRight: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            background: "var(--panel)",
            flexShrink: 0,
            overflowY: "auto",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                color: "var(--text)",
              }}
            >
              Settings
            </h1>
            <div
              style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 2 }}
            >
              Tune launcher behavior, downloads and storage.
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "var(--panel-2)",
              border: "1px solid var(--border)",
              borderRadius: 5,
              padding: "5px 10px",
              flexGrow: 0,
            }}
          >
            <SearchIcon size={12} color="var(--text-3)" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search settings…"
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: 12,
                color: "var(--text)",
                flex: 1,
                minWidth: 0,
                fontFamily: "inherit",
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {GROUPS.map((g) => {
              const items = filtered.filter((s) => s.group === g);
              if (!items.length) return null;
              return (
                <div key={g}>
                  <div
                    style={{
                      ...mono,
                      fontSize: 9.5,
                      color: "var(--text-3)",
                      letterSpacing: "0.12em",
                      padding: "0 6px 6px",
                    }}
                  >
                    {g}
                  </div>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    {items.map((s) => {
                      const Icon = s.icon;
                      const active = section === s.id;
                      return (
                        <button
                          type="button"
                          key={s.id}
                          onClick={() => goTo(s.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 9,
                            padding: "7px 9px",
                            background: active
                              ? "var(--panel-3)"
                              : "transparent",
                            border: "none",
                            borderRadius: 5,
                            color: active ? "var(--text)" : "var(--text-2)",
                            fontSize: 12.5,
                            fontWeight: active ? 600 : 500,
                            fontFamily: "inherit",
                            cursor: "pointer",
                            position: "relative",
                            textAlign: "left",
                          }}
                        >
                          {active && (
                            <div
                              style={{
                                position: "absolute",
                                left: -6,
                                top: 6,
                                bottom: 6,
                                width: 2,
                                background: "var(--green)",
                                borderRadius: 1,
                              }}
                            />
                          )}
                          <span
                            style={{
                              color: active ? "var(--green)" : "var(--text-3)",
                              display: "flex",
                            }}
                          >
                            <Icon size={14} />
                          </span>
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div
            style={{
              marginTop: "auto",
              padding: 12,
              background: "var(--panel-2)",
              borderRadius: 6,
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                color: "var(--green)",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--green)",
                }}
              />
              Settings synced
            </div>
            <div
              style={{
                ...mono,
                fontSize: 10,
                color: "var(--text-3)",
                marginTop: 3,
              }}
            >
              {savedAgoSeconds !== null
                ? `Auto-saved ${savedAgoSeconds}s ago`
                : "Loading…"}
            </div>
          </div>
        </nav>

        {/* Main scroll */}
        <div
          ref={containerRef}
          style={{ flex: 1, overflow: "auto", minWidth: 0 }}
        >
          <div
            style={{
              maxWidth: 1100,
              margin: "0 auto",
              padding: "24px 32px 64px",
              display: "flex",
              flexDirection: "column",
              gap: 36,
            }}
          >
            <div id="section-appearance">
              <AppearanceSection {...sectionProps} />
            </div>
            <div id="section-java">
              <JavaSection {...sectionProps} />
            </div>
            <div id="section-downloads">
              <DownloadsSection {...sectionProps} />
            </div>
            <div id="section-behavior">
              <BehaviorSection {...sectionProps} />
            </div>
            <div id="section-storage">
              <StorageSection dirs={dirs} />
            </div>
            <div id="section-maintenance">
              <MaintenanceSection
                onClearCache={() => setConfirmStorageAction("cache")}
                onClearData={() => setConfirmStorageAction("data")}
                clearingStorage={clearingStorage}
              />
            </div>
            <div id="section-about">
              <AboutSection />
            </div>
          </div>
        </div>
      </div>

      <AlertDialog
        open={confirmStorageAction !== null}
        onOpenChange={(open) => {
          if (!open && !storageActionPending) setConfirmStorageAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia
              className={
                confirmStorageAction === "data"
                  ? "bg-destructive/10 text-destructive"
                  : ""
              }
            >
              <AlertTriangleIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>
              {confirmStorageAction === "data"
                ? "Clear launcher data?"
                : "Clear cache?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmStorageAction === "data"
                ? "This deletes every launcher instance, profile, saved world, mod, log, and downloaded file. Settings are kept."
                : "This deletes downloaded Minecraft artifacts, Java runtimes, temporary files, and per-instance cache. Instances and profiles are kept."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={storageActionPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={storageActionPending || confirmStorageAction === null}
              onClick={(e) => {
                e.preventDefault();
                if (confirmStorageAction) {
                  void handleClearStorage(confirmStorageAction);
                }
              }}
              variant={
                confirmStorageAction === "data" ? "destructive" : "default"
              }
            >
              {storageActionPending ? "Clearing…" : "Clear"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
