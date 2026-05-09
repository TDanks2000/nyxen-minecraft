import { createFileRoute } from "@tanstack/react-router";
import { InstanceDetailsPage } from "@/views/main/features/instances/instance-details-page";

export const Route = createFileRoute("/instances_/$instanceId")({
  component: InstanceDetailsRoute,
});

function InstanceDetailsRoute() {
  const { instanceId } = Route.useParams();

  return <InstanceDetailsPage instanceId={instanceId} />;
}
