import { describe, expect, it } from "vitest";
import { chunkValues } from "./queryChunks";

describe("chunkValues", () => {
    it("splits values into bounded chunks", () => {
        expect(chunkValues([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });

    it("rejects invalid chunk sizes", () => {
        expect(() => chunkValues(["a"], 0)).toThrow("chunkSize must be greater than 0");
    });
});
