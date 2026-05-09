import { Outlet } from "@tanstack/react-router";
import { Toaster } from "@/views/main/components/ui/sonner";
import { AppSidebar } from "@/views/main/features/layout/app-sidebar";
import { RightSidebar } from "@/views/main/features/layout/right-sidebar";
import { Titlebar } from "@/views/main/features/layout/titlebar";

export function Shell() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <Titlebar />
      <div className="flex min-h-0 flex-1">
        <AppSidebar />
        <main className="min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
        <RightSidebar />
      </div>
      <Toaster />
    </div>
  );
}
