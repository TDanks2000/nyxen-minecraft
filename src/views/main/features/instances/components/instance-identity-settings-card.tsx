import type {
  LauncherProfile,
  LoaderVersionSummary,
  MinecraftVersionSummary,
  ModLoader,
} from "@/shared/types";
import { Badge } from "@/views/main/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/views/main/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/views/main/components/ui/field";
import { Input } from "@/views/main/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/views/main/components/ui/select";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/views/main/components/ui/toggle-group";
import { InstanceSettingsLoadingBox } from "@/views/main/features/instances/components/instance-settings-loading-box";
import {
  AUTO_PROFILE_VALUE,
  INSTANCE_SETTINGS_LOADERS,
} from "@/views/main/features/instances/components/instance-settings-model";
import { InstanceSettingsRetryBox } from "@/views/main/features/instances/components/instance-settings-retry-box";

type InstanceIdentitySettingsCardProps = {
  autoProfile: LauncherProfile | null;
  bannerUrl: string;
  iconUrl: string;
  loader: ModLoader;
  loaderLabel: string;
  loaderNeedsVersion: boolean;
  loaderSelectionUnavailable: boolean;
  loaderVersion: string;
  loaderVersionComplete: boolean;
  loaderVersionOptions: Array<LoaderVersionSummary>;
  loaderVersionsError: string | null;
  loaderVersionsLoading: boolean;
  name: string;
  nameValid: boolean;
  onBannerUrlChange: (value: string) => void;
  onIconUrlChange: (value: string) => void;
  onLoaderChange: (value: ModLoader) => void;
  onLoaderVersionChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onProfileValueChange: (value: string) => void;
  onRefreshLoaderVersions: () => void;
  onRefreshVersions: () => void;
  onRefreshVersionsManifest: () => void;
  onVersionChange: (value: string) => void;
  profileCopy: string;
  profileValue: string;
  selectedProfile: LauncherProfile | null;
  unverifiedProfiles: Array<LauncherProfile>;
  verifiedProfiles: Array<LauncherProfile>;
  versionId: string;
  versionLookupError: string | null;
  versionValid: boolean;
  versions: Array<MinecraftVersionSummary> | null;
  versionsEmpty: boolean;
  versionsLoading: boolean;
};

export function InstanceIdentitySettingsCard({
  autoProfile,
  bannerUrl,
  iconUrl,
  loader,
  loaderLabel,
  loaderNeedsVersion,
  loaderSelectionUnavailable,
  loaderVersion,
  loaderVersionComplete,
  loaderVersionOptions,
  loaderVersionsError,
  loaderVersionsLoading,
  name,
  nameValid,
  onBannerUrlChange,
  onIconUrlChange,
  onLoaderChange,
  onLoaderVersionChange,
  onNameChange,
  onProfileValueChange,
  onRefreshLoaderVersions,
  onRefreshVersions,
  onRefreshVersionsManifest,
  onVersionChange,
  profileCopy,
  profileValue,
  selectedProfile,
  unverifiedProfiles,
  verifiedProfiles,
  versionId,
  versionLookupError,
  versionValid,
  versions,
  versionsEmpty,
  versionsLoading,
}: InstanceIdentitySettingsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Instance Settings</CardTitle>
        <CardDescription>
          Edit launch identity, version, memory, and Java arguments.
        </CardDescription>
        <CardAction>
          <Badge variant={selectedProfile ? "default" : "outline"}>
            {selectedProfile ? "Profile ready" : "Needs profile"}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field data-invalid={!nameValid}>
            <FieldLabel htmlFor="instance-name">Instance Name</FieldLabel>
            <Input
              aria-invalid={!nameValid}
              id="instance-name"
              maxLength={64}
              minLength={2}
              onChange={(event) => onNameChange(event.target.value)}
              value={name}
            />
            <FieldDescription>
              Use 2 to 64 characters. This name appears in the library and
              launch report.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="instance-profile">Launch Profile</FieldLabel>
            <Select
              onValueChange={(value) =>
                onProfileValueChange(value ?? AUTO_PROFILE_VALUE)
              }
              value={profileValue}
            >
              <SelectTrigger className="w-full" id="instance-profile">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Automatic</SelectLabel>
                  <SelectItem value={AUTO_PROFILE_VALUE}>
                    First verified Microsoft profile
                    {autoProfile ? (
                      <span className="text-muted-foreground text-xs">
                        {autoProfile.displayName}
                      </span>
                    ) : null}
                  </SelectItem>
                </SelectGroup>
                {verifiedProfiles.length > 0 ? (
                  <>
                    <SelectSeparator />
                    <SelectGroup>
                      <SelectLabel>Verified Profiles</SelectLabel>
                      {verifiedProfiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.displayName}
                          <span className="text-muted-foreground text-xs">
                            Microsoft
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </>
                ) : null}
                {unverifiedProfiles.length > 0 ? (
                  <>
                    <SelectSeparator />
                    <SelectGroup>
                      <SelectLabel>Unavailable</SelectLabel>
                      {unverifiedProfiles.map((profile) => (
                        <SelectItem
                          disabled
                          key={profile.id}
                          value={`disabled-${profile.id}`}
                        >
                          {profile.displayName}
                          <span className="text-muted-foreground text-xs">
                            verify first
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </>
                ) : null}
              </SelectContent>
            </Select>
            <FieldDescription>{profileCopy}</FieldDescription>
          </Field>

          <FieldGroup className="grid gap-4 lg:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="instance-icon">Instance Icon</FieldLabel>
              <Input
                id="instance-icon"
                onChange={(event) => onIconUrlChange(event.target.value)}
                placeholder="https://example.com/icon.png or /path/icon.png"
                value={iconUrl}
              />
              <FieldDescription>
                Square artwork used in cards, lists, and the header.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="instance-banner">Instance Banner</FieldLabel>
              <Input
                id="instance-banner"
                onChange={(event) => onBannerUrlChange(event.target.value)}
                placeholder="https://example.com/banner.jpg or /path/banner.jpg"
                value={bannerUrl}
              />
              <FieldDescription>
                Wide artwork used behind instance cards and details.
              </FieldDescription>
            </Field>
          </FieldGroup>

          <FieldGroup className="grid gap-4 lg:grid-cols-2">
            <Field data-invalid={!!versionLookupError || versionsEmpty}>
              <FieldLabel htmlFor="instance-version">
                Minecraft Version
              </FieldLabel>
              {versionsLoading ? (
                <InstanceSettingsLoadingBox label="Loading versions" />
              ) : versionsEmpty ? (
                <InstanceSettingsRetryBox
                  label="No versions available"
                  onRetry={onRefreshVersionsManifest}
                />
              ) : versionLookupError ? (
                <InstanceSettingsRetryBox
                  label="Failed to load versions"
                  onRetry={onRefreshVersions}
                />
              ) : (
                <Select
                  onValueChange={(value) => {
                    if (!value) return;
                    onVersionChange(value);
                  }}
                  value={versionId}
                >
                  <SelectTrigger
                    aria-invalid={!versionValid}
                    className="w-full"
                    id="instance-version"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {versions?.map((version) => (
                        <SelectItem key={version.id} value={version.id}>
                          {version.id}
                          <span className="text-muted-foreground text-xs">
                            {version.type}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            </Field>

            <FieldSet>
              <FieldLegend variant="label">Mod Loader</FieldLegend>
              <ToggleGroup
                aria-label="Mod loader"
                className="grid w-full grid-cols-2 gap-px overflow-hidden rounded-lg border border-input bg-border sm:grid-cols-5 lg:grid-cols-3 2xl:grid-cols-5"
                onValueChange={(value) => {
                  const nextLoader = value[0] as ModLoader | undefined;
                  if (!nextLoader || nextLoader === loader) return;
                  onLoaderChange(nextLoader);
                }}
                value={[loader]}
              >
                {INSTANCE_SETTINGS_LOADERS.map((loaderOption) => (
                  <ToggleGroupItem
                    className="min-h-9 w-full rounded-none border-0 bg-background px-2 py-2 font-semibold text-xs data-[pressed]:bg-primary data-[pressed]:text-primary-foreground data-[pressed]:hover:bg-primary data-[pressed]:hover:text-primary-foreground"
                    key={loaderOption.value}
                    type="button"
                    value={loaderOption.value}
                  >
                    {loaderOption.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </FieldSet>
          </FieldGroup>

          <Field
            data-invalid={loaderNeedsVersion && loaderSelectionUnavailable}
          >
            <FieldLabel htmlFor="instance-loader-version">
              {loader !== "vanilla"
                ? `${loaderLabel} Version`
                : "Loader Version"}
            </FieldLabel>
            {loader === "vanilla" ? (
              <div className="flex h-8 items-center rounded-lg border border-input bg-muted px-2.5 text-muted-foreground text-sm">
                Not required for Vanilla
              </div>
            ) : loaderVersionsLoading ? (
              <InstanceSettingsLoadingBox label="Loading loader versions" />
            ) : loaderVersionsError ? (
              <InstanceSettingsRetryBox
                label="Failed to load loader versions"
                onRetry={onRefreshLoaderVersions}
              />
            ) : loaderVersionOptions.length === 0 ? (
              <div className="flex h-8 items-center rounded-lg border border-input bg-muted px-2.5 text-muted-foreground text-sm">
                No loader versions available for {versionId}
              </div>
            ) : (
              <Select
                onValueChange={(value) => value && onLoaderVersionChange(value)}
                value={loaderVersion}
              >
                <SelectTrigger
                  aria-invalid={loaderNeedsVersion && !loaderVersionComplete}
                  className="w-full"
                  id="instance-loader-version"
                >
                  <SelectValue placeholder="Select loader version" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {loaderVersionOptions.map((version) => (
                      <SelectItem key={version.id} value={version.id}>
                        {version.id}
                        {!version.stable ? (
                          <span className="text-muted-foreground text-xs">
                            beta
                          </span>
                        ) : null}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
            <FieldDescription>
              Loader changes are applied on the next launch report.
            </FieldDescription>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
