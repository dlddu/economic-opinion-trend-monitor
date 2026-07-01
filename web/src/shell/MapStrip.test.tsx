import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { MapStrip } from "./MapStrip";

describe("MapStrip", () => {
  it("renders one chip per item with values and text", () => {
    const { container } = render(
      <MapStrip chips={[{ value: "J1", text: "단계 1" }, { text: "AC3.2" }]} />,
    );
    expect(container.querySelectorAll(".chip")).toHaveLength(2);
    expect(container.textContent).toContain("visualizes");
    expect(container.textContent).toContain("J1");
    expect(container.textContent).toContain("단계 1");
    expect(container.textContent).toContain("AC3.2");
  });
});
