import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NonWorkingOverlay from "./NonWorkingOverlay";

describe("NonWorkingOverlay", () => {
  it("renders overlays only for non-working and break segments", () => {
    const { container } = render(
      <NonWorkingOverlay
        hourHeight={80}
        startHour={6}
        segments={[
          { startMinutes: 360, endMinutes: 420, kind: "working" },
          { startMinutes: 420, endMinutes: 450, kind: "break" },
          { startMinutes: 450, endMinutes: 540, kind: "nonWorking" },
        ]}
      />,
    );

    const breakOverlays = container.querySelectorAll(".cal-break-overlay");
    const nonWorkingOverlays = container.querySelectorAll(".cal-non-working-overlay");
    expect(breakOverlays).toHaveLength(1);
    expect(nonWorkingOverlays).toHaveLength(1);
  });

  it("computes top and height style based on minutes and hour height", () => {
    const { container } = render(
      <NonWorkingOverlay
        hourHeight={100}
        startHour={6}
        segments={[
          { startMinutes: 450, endMinutes: 510, kind: "nonWorking" },
        ]}
      />,
    );

    const overlay = container.querySelector(".cal-non-working-overlay") as HTMLDivElement;
    expect(overlay.style.top).toBe("150px");
    expect(overlay.style.height).toBe("100px");
  });

  it("renders nothing when all segments are working", () => {
    const { container } = render(
      <NonWorkingOverlay
        hourHeight={80}
        startHour={6}
        segments={[
          { startMinutes: 360, endMinutes: 420, kind: "working" },
          { startMinutes: 420, endMinutes: 480, kind: "working" },
        ]}
      />,
    );

    expect(container.firstChild).toBeNull();
  });
});
