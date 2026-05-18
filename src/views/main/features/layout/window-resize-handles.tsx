import { useCallback, useRef } from "react";
import { MIN_WINDOW_HEIGHT, MIN_WINDOW_WIDTH } from "@/shared/constants";
import { rpc } from "@/views/main/lib/rpc";

type ResizeDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

type DragState = {
  dir: ResizeDir;
  startX: number;
  startY: number;
  frame: { x: number; y: number; width: number; height: number };
};

const EDGE = 6;

const cursorForDir: Record<ResizeDir, string> = {
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
  ne: "ne-resize",
  nw: "nw-resize",
  se: "se-resize",
  sw: "sw-resize",
};

const styleForDir: Record<ResizeDir, React.CSSProperties> = {
  nw: { top: 0, left: 0, width: EDGE, height: EDGE },
  n: { top: 0, left: EDGE, right: EDGE, height: EDGE },
  ne: { top: 0, right: 0, width: EDGE, height: EDGE },
  e: { top: EDGE, right: 0, bottom: EDGE, width: EDGE },
  se: { bottom: 0, right: 0, width: EDGE, height: EDGE },
  s: { bottom: 0, left: EDGE, right: EDGE, height: EDGE },
  sw: { bottom: 0, left: 0, width: EDGE, height: EDGE },
  w: { top: EDGE, left: 0, bottom: EDGE, width: EDGE },
};

const ALL_DIRS: ResizeDir[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

const computeFrame = (
  dir: ResizeDir,
  drag: DragState,
  screenX: number,
  screenY: number,
): { x: number; y: number; width: number; height: number } => {
  const { frame } = drag;
  const dx = screenX - drag.startX;
  const dy = screenY - drag.startY;

  let { x, y, width, height } = frame;

  if (dir.includes("e")) width = Math.max(MIN_WINDOW_WIDTH, frame.width + dx);
  if (dir.includes("w")) {
    width = Math.max(MIN_WINDOW_WIDTH, frame.width - dx);
    x = frame.x + frame.width - width;
  }
  if (dir.includes("s")) height = Math.max(MIN_WINDOW_HEIGHT, frame.height + dy);
  if (dir.includes("n")) {
    height = Math.max(MIN_WINDOW_HEIGHT, frame.height - dy);
    y = frame.y + frame.height - height;
  }

  return { x, y, width, height };
};

function ResizeHandle({ dir }: { dir: ResizeDir }) {
  const drag = useRef<DragState | null>(null);
  const rafId = useRef<number | null>(null);
  const pending = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  const flush = useCallback(() => {
    rafId.current = null;
    if (!pending.current) return;
    const frame = pending.current;
    pending.current = null;
    rpc.requestProxy.setWindowFrame(frame).catch(console.error);
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const el = e.currentTarget as HTMLDivElement;
      el.setPointerCapture(e.pointerId);

      const startX = e.screenX;
      const startY = e.screenY;

      rpc.requestProxy
        .getWindowFrame(null)
        .then((frame) => {
          drag.current = { dir, startX, startY, frame };
        })
        .catch(console.error);
    },
    [dir],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!drag.current) return;
      e.preventDefault();
      pending.current = computeFrame(drag.current.dir, drag.current, e.screenX, e.screenY);
      if (!rafId.current) {
        rafId.current = requestAnimationFrame(flush);
      }
    },
    [flush],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!drag.current) return;
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
      drag.current = null;

      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      if (pending.current) {
        rpc.requestProxy.setWindowFrame(pending.current).catch(console.error);
        pending.current = null;
      }
    },
    [],
  );

  return (
    <div
      style={{
        position: "fixed",
        zIndex: 99999,
        cursor: cursorForDir[dir],
        ...styleForDir[dir],
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    />
  );
}

export function WindowResizeHandles() {
  return (
    <>
      {ALL_DIRS.map((dir) => (
        <ResizeHandle key={dir} dir={dir} />
      ))}
    </>
  );
}
