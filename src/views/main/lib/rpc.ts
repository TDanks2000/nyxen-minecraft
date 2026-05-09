import { Electroview } from "electrobun/view";
import { MAIN_VIEW_RPC_MAX_REQUEST_TIME_MS } from "@/shared/constants";
import type { MainViewRPC } from "@/shared/rpc/types";

const viewRpc = Electroview.defineRPC<MainViewRPC>({
  handlers: {
    messages: {
      logToWebview: ({ message }) => {
        console.log(`[bun] ${message}`);
      },
    },
    requests: {
      getViewStatus: () => ({ ready: true }),
    },
  },
  maxRequestTime: MAIN_VIEW_RPC_MAX_REQUEST_TIME_MS,
});

export const electroview = new Electroview({ rpc: viewRpc });

const rpcClient = electroview.rpc;

if (!rpcClient) {
  throw new Error("Electrobun RPC was not initialized.");
}

export const rpc = rpcClient;
