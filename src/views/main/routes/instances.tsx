import { createFileRoute } from "@tanstack/react-router";
import { InstancesPage } from "@/views/main/features/instances/instances-page";

export const Route = createFileRoute("/instances")({
  component: InstancesPage,
});
