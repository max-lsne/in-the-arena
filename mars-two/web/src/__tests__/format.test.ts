import { describe, expect, it } from "vitest";
import { formatMetric, formatEuros, share } from "../lib/format";

describe("formatMetric", () => {
  it("reads euros from cents rather than guessing", () => {
    expect(formatMetric("1200000000", "eur_cents")).toBe("€12.0M");
  });

  it("renders a ratio as a percentage", () => {
    expect(formatMetric("1.027", "ratio")).toBe("102.7%");
  });

  // Coverage of 3.7x rendered as "370.8%" is the same class of error as a bare
  // number whose unit has to be guessed.
  it("renders a multiple as a multiple, not a percentage", () => {
    expect(formatMetric("3.708", "multiple")).toBe("3.7x");
    expect(formatMetric("3.708", "ratio")).toBe("370.8%");
  });

  it("renders counts and days in their own units", () => {
    expect(formatMetric("118", "count")).toBe("118");
    expect(formatMetric("42.4", "days")).toBe("42d");
  });

  // The platform ships a unit with every figure precisely so nothing downstream
  // has to infer one. A display that guessed would undo that at the last step.
  it("shows the raw value for a unit it does not know", () => {
    expect(formatMetric("1097197248", "furlongs")).toBe("1097197248");
  });

  it("does not render a non-number as zero", () => {
    expect(formatMetric("", "eur_cents")).toBe("—");
    expect(formatMetric("n/a", "ratio")).toBe("—");
  });
});

describe("formatEuros", () => {
  it("scales to millions and thousands", () => {
    expect(formatEuros(1_450_000_000)).toBe("€14.5M");
    expect(formatEuros(31_492_119)).toBe("€315k");
    expect(formatEuros(4_200)).toBe("€42");
  });

  it("keeps the sign on a negative", () => {
    expect(formatEuros(-1_200_000_00)).toBe("€-1.2M");
  });
});

describe("share", () => {
  it("is zero rather than NaN when the whole is zero", () => {
    expect(share(5, 0)).toBe(0);
  });
});
