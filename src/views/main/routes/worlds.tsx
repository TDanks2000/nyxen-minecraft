import { createFileRoute } from "@tanstack/react-router";
import { WorldsPage } from "@/views/main/features/catalog/pages/worlds-page";

export const Route = createFileRoute("/worlds")({
  component: WorldsPage,
});
