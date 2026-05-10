import { Outlet } from "@tanstack/react-router";
import { useState } from "react";
import { Toaster } from "@/views/main/components/ui/sonner";
import { AppSidebar } from "@/views/main/features/layout/app-sidebar";
import { RightSidebar } from "@/views/main/features/layout/right-sidebar";
import { Titlebar } from "@/views/main/features/layout/titlebar";

export function Shell() {
  const [rightSidebarOpen, setRightSidebarOpen] = useState(
    () =>
      typeof window === "undefined" ||
      window.matchMedia("(min-width: 1536px)").matches,
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <Titlebar
        isRightSidebarOpen={rightSidebarOpen}
        onToggleRightSidebar={() => setRightSidebarOpen((open) => !open)}
      />
      <div className="flex min-h-0 flex-1">
        <AppSidebar />
        <main className="min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
        <RightSidebar open={rightSidebarOpen} />
      </div>
      <Toaster />
    </div>
  );
}
