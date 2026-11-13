import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MetricGrid } from "./metric-grid";

describe("MetricGrid", () => {
  it("exposes percentile context accessibly", () => {
    render(<MetricGrid metrics={[{ key: "ts", label: "True shooting", value: 64.2, display: "64.2%", percentile: 94, definition: "True shooting formula" }]} />);
    expect(screen.getByText("64.2%")).toBeInTheDocument();
    expect(screen.getByLabelText("True shooting, 94th percentile")).toBeInTheDocument();
  });
});
