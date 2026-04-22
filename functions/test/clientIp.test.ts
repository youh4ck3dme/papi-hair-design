import { describe, expect, it } from "vitest";
import type { CallableRequest } from "firebase-functions/v2/https";
import { getClientIp } from "../src/clientIp";

type RawCallableRequest = CallableRequest<unknown>["rawRequest"];

function createRawRequest(overrides: Partial<RawCallableRequest> = {}): RawCallableRequest {
  return {
    headers: {},
    ip: undefined,
    socket: {
      remoteAddress: undefined,
    },
    ...overrides,
  } as RawCallableRequest;
}

describe("getClientIp", () => {
  it("prefers the normalized request ip exposed by the platform", () => {
    const rawRequest = createRawRequest({
      ip: "203.0.113.10",
      socket: { remoteAddress: "10.0.0.1" } as RawCallableRequest["socket"],
    });

    expect(getClientIp(rawRequest)).toBe("203.0.113.10");
  });

  it("falls back to the socket remote address when request.ip is missing", () => {
    const rawRequest = createRawRequest({
      socket: { remoteAddress: "10.0.0.8" } as RawCallableRequest["socket"],
    });

    expect(getClientIp(rawRequest)).toBe("10.0.0.8");
  });

  it("returns null when no client address is available", () => {
    expect(getClientIp(createRawRequest())).toBeNull();
  });
});
