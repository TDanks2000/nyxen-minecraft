import { createFileRoute } from "@tanstack/react-router";
import { ScreenshotsPage } from "@/views/main/features/catalog/pages/screenshots-page";

export const Route = createFileRoute("/screenshots")({
  component: ScreenshotsPage,
});
