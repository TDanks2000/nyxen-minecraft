import { createFileRoute } from "@tanstack/react-router";
import { ModpacksPage } from "@/views/main/features/catalog/pages/modpacks-page";

export const Route = createFileRoute("/modpacks")({
  component: ModpacksPage,
});
