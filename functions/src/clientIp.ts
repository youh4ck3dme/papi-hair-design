import type { CallableRequest } from "firebase-functions/v2/https";

type RawCallableRequest = CallableRequest<unknown>["rawRequest"];

export function getClientIp(rawRequest: RawCallableRequest): string | null {
  if (typeof rawRequest.ip === "string" && rawRequest.ip.trim().length > 0) {
    return rawRequest.ip.trim();
  }

  if (
    typeof rawRequest.socket?.remoteAddress === "string" &&
    rawRequest.socket.remoteAddress.trim().length > 0
  ) {
    return rawRequest.socket.remoteAddress.trim();
  }

  return null;
}
