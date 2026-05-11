import { toast } from "sonner";
import { toLocalFileUrl } from "@/views/main/lib/file-url";
import { rpc } from "@/views/main/lib/rpc";

export const openLocalPath = async (
  path: string,
  {
    failureMessage = "Path unavailable.",
    successMessage,
  }: { failureMessage?: string; successMessage?: string } = {},
): Promise<void> => {
  try {
    const result = await rpc.requestProxy.openExternal({
      url: toLocalFileUrl(path),
    });

    if (!result.opened) {
      throw new Error("The path could not be opened.");
    }

    if (successMessage) {
      toast.success(successMessage);
    }
  } catch (error) {
    toast.error(error instanceof Error ? error.message : failureMessage);
  }
};
