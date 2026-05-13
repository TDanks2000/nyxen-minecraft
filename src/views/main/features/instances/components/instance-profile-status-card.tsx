import { InfoIcon, UserRoundIcon } from "lucide-react";
import type { LauncherProfile } from "@/shared/types";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/views/main/components/ui/alert";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/views/main/components/ui/card";
import { Separator } from "@/views/main/components/ui/separator";

export function InstanceProfileStatusCard({
  selectedProfile,
}: {
  selectedProfile: LauncherProfile | null;
}) {
  return (
    <>
      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRoundIcon className="size-4 text-primary" />
            Profile Status
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div>
            <div className="text-muted-foreground text-xs">Selected</div>
            <div className="mt-1 truncate font-semibold">
              {selectedProfile?.displayName ?? "No verified profile"}
            </div>
          </div>
          <Separator />
          <p className="text-muted-foreground text-xs leading-5">
            Instances require a verified Microsoft profile. Automatic profile
            selection uses the first verified account in Profiles.
          </p>
        </CardContent>
      </Card>

      {!selectedProfile ? (
        <Alert>
          <InfoIcon />
          <AlertTitle>Profile Required</AlertTitle>
          <AlertDescription>
            Save settings now if you need to, then add or verify a Microsoft
            profile before launching.
          </AlertDescription>
        </Alert>
      ) : null}
    </>
  );
}
