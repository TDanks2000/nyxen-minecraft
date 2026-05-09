import type {
  CompleteMicrosoftProfileLoginInput,
  CreateLauncherProfileInput,
  MicrosoftProfileLoginResult,
  MicrosoftProfileLoginStart,
  MicrosoftProfileSignInStatus,
} from "../../../shared/types";
import {
  completeMicrosoftProfileLogin as completeMicrosoftProfileLoginRequest,
  pollMicrosoftProfileSignIn as pollMicrosoftProfileSignInRequest,
  startMicrosoftProfileLogin as startMicrosoftProfileLoginRequest,
} from "../../launcher/microsoft-auth";

export const createLauncherProfile = (
  _input: CreateLauncherProfileInput,
): never => {
  throw new Error(
    "Manual profile creation is disabled. Sign in with a Microsoft account that owns Minecraft.",
  );
};

export const startMicrosoftProfileLogin =
  (): Promise<MicrosoftProfileLoginStart> =>
    startMicrosoftProfileLoginRequest();

export const completeMicrosoftProfileLogin = (
  input: CompleteMicrosoftProfileLoginInput,
): Promise<MicrosoftProfileLoginResult> =>
  completeMicrosoftProfileLoginRequest(input);

export const pollMicrosoftProfileSignIn = (
  input: CompleteMicrosoftProfileLoginInput,
): Promise<MicrosoftProfileSignInStatus> =>
  pollMicrosoftProfileSignInRequest(input);

export { listLauncherProfiles } from "../../launcher/profiles";
