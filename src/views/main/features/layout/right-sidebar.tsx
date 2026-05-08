import { CloudIcon, PauseIcon, PlayIcon } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

const mkSpark = (values: Array<number>) => values.map((v, i) => ({ i, v }));

const CPU_DATA = mkSpark([6, 14, 22, 10, 28, 18, 12, 24, 16, 14]);
const MEM_DATA = mkSpark([54, 58, 62, 68, 60, 66, 72, 64, 68, 64]);
const DISK_DATA = mkSpark([22, 24, 26, 25, 28, 26, 30, 27, 24, 25]);

function SparkLine({ data }: { data: Array<{ i: number; v: number }> }) {
  return (
    <div style={{ height: 32, width: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
        >
          <Area
            type="monotone"
            dataKey="v"
            stroke="#4ade80"
            strokeWidth={1.5}
            fill="rgba(74,222,128,0.14)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RightSidebar() {
  return (
    <aside className="w-72 shrink-0 bg-sidebar border-l border-sidebar-border overflow-y-auto flex flex-col">
      {/* Download Queue */}
      <section className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between border-b border-sidebar-border/30 pb-2 mb-3">
          <span className="text-sm font-semibold text-foreground">
            Download Queue
          </span>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[0.6rem] font-bold text-primary-foreground">
            2
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {/* Active download */}
          <div className="flex items-start gap-2.5">
            <div className="relative size-9 rounded shrink-0 bg-yellow-900 flex flex-col items-center justify-center overflow-hidden">
              <span className="text-[0.48rem] font-black text-yellow-300 leading-tight text-center uppercase tracking-tight">
                All the
                <br />
                Mods
              </span>
              <span className="absolute bottom-0.5 right-1 text-[0.55rem] font-black text-yellow-400 leading-none">
                9
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold text-foreground truncate leading-none">
                  All the Mods 9 Update
                </span>
                <button
                  type="button"
                  className="size-5 flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                >
                  <PauseIcon className="size-3 fill-current" />
                </button>
              </div>
              <span className="text-[0.62rem] text-muted-foreground mt-0.5 block">
                Downloading...
              </span>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: "21%" }}
                  />
                </div>
                <span className="text-[0.6rem] text-primary font-semibold shrink-0 tabular-nums">
                  21%
                </span>
              </div>
              <span className="text-[0.58rem] text-muted-foreground/60 mt-0.5 block tabular-nums">
                256.8 MB / 1.2 GB
              </span>
            </div>
          </div>

          {/* Queued */}
          <div className="flex items-start gap-2.5">
            <div className="size-9 rounded shrink-0 bg-stone-700 flex items-center justify-center">
              <div className="size-5 rounded-sm bg-stone-500/60" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold text-foreground truncate leading-none">
                  Immersive Engineering
                </span>
                <button
                  type="button"
                  className="size-5 flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                >
                  <PlayIcon className="size-3 fill-current" />
                </button>
              </div>
              <span className="text-[0.62rem] text-muted-foreground mt-0.5 block">
                Queued
              </span>
              <span className="text-[0.58rem] text-muted-foreground/60 mt-0.5 block tabular-nums">
                0 B / 128.4 MB
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="mt-3 text-[0.7rem] text-primary hover:text-primary/80 transition-colors"
        >
          View full queue →
        </button>
      </section>

      {/* Recent Activity */}
      <section className="p-4 border-b border-sidebar-border">
        <div className="text-sm font-semibold text-foreground border-b border-sidebar-border/30 pb-2 mb-3">
          Recent Activity
        </div>
        <div className="flex flex-col gap-2.5">
          {[
            {
              id: "atm9",
              bg: "bg-yellow-900",
              abbr: "ATM",
              name: "All the Mods 9",
              desc: "Updated to 1.20.1",
              time: "2h ago",
            },
            {
              id: "cf",
              bg: "bg-cyan-900",
              abbr: "CF",
              name: "Creative Flat",
              desc: "World backup created",
              time: "6h ago",
            },
            {
              id: "rl",
              bg: "bg-red-950",
              abbr: "RL",
              name: "RLCraft",
              desc: "Played for 3h 24m",
              time: "1d ago",
            },
          ].map((item) => (
            <div key={item.id} className="flex items-start gap-2.5">
              <div
                className={`size-7 rounded shrink-0 flex items-center justify-center text-[0.5rem] font-bold text-white/60 ${item.bg}`}
              >
                {item.abbr}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-foreground truncate leading-none">
                  {item.name}
                </div>
                <div className="text-[0.62rem] text-muted-foreground mt-0.5">
                  {item.desc}
                </div>
              </div>
              <span className="text-[0.6rem] text-muted-foreground shrink-0 mt-0.5">
                {item.time}
              </span>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-3 text-[0.7rem] text-primary hover:text-primary/80 transition-colors"
        >
          View all activity →
        </button>
      </section>

      {/* System Overview */}
      <section className="p-4 border-b border-sidebar-border">
        <div className="text-sm font-semibold text-foreground border-b border-sidebar-border/30 pb-2 mb-3">
          System Overview
        </div>
        <div className="flex flex-col gap-2">
          {(
            [
              { label: "CPU", value: "14%", data: CPU_DATA },
              { label: "Memory", value: "5.1 / 8 GB", data: MEM_DATA },
              { label: "Disk", value: "120 / 476 GB", data: DISK_DATA },
            ] as const
          ).map((row) => (
            <div key={row.label} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-12 shrink-0">
                {row.label}
              </span>
              <span className="text-xs text-foreground w-24 shrink-0 tabular-nums">
                {row.value}
              </span>
              <div className="flex-1 min-w-0">
                <SparkLine data={row.data} />
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-3 text-[0.7rem] text-primary hover:text-primary/80 transition-colors"
        >
          Open Performance Monitor
        </button>
      </section>

      {/* Cloud Sync */}
      <section className="p-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-semibold text-foreground">
            Cloud Sync
          </span>
          <div className="flex items-center gap-1.5 text-primary">
            <span className="size-2 rounded-full bg-primary shrink-0" />
            <span className="text-[0.65rem] font-semibold">Up to date</span>
          </div>
        </div>
        <p className="text-[0.62rem] text-muted-foreground mb-3">
          Last synced: 2m ago
        </p>
        <button
          type="button"
          className="w-full h-7 flex items-center justify-center gap-1.5 rounded-md border border-border bg-muted/40 hover:bg-muted/70 text-xs font-semibold text-foreground transition-colors"
        >
          <CloudIcon className="size-3.5" />
          Manage
        </button>
      </section>
    </aside>
  );
}
