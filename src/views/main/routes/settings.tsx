import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/views/main/features/settings/settings-page";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});
