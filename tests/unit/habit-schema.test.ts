import { describe, expect, it } from "vitest";
import { habitSchema, parseHabitForm } from "@/lib/habit-schema";

/** Builds a complete valid raw input; overrides tweak individual fields. */
function rawHabit(overrides: Partial<Record<string, string>> = {}) {
  return {
    name: "Morning run",
    description: "5k around the park",
    color: "#ef4444",
    targetDays: "1111111",
    tags: "health, morning",
    ...overrides,
  };
}

describe("habitSchema — valid inputs", () => {
  it("accepts a fully populated habit and normalizes the tag list", () => {
    const result = habitSchema.safeParse(rawHabit());
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      name: "Morning run",
      description: "5k around the park",
      color: "#ef4444",
      targetDays: "1111111",
      tags: ["health", "morning"],
    });
  });

  it("accepts a minimal habit: trimmed name, empty description becomes null, no tags", () => {
    const result = habitSchema.safeParse(
      rawHabit({ name: "  X  ", description: "   ", color: "#3b82f6", tags: "" }),
    );
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      name: "X",
      description: null,
      color: "#3b82f6",
      targetDays: "1111111",
      tags: [],
    });
  });

  it("accepts every boundary at once: 50-char name, 200-char description, 5 tags, one target day", () => {
    const result = habitSchema.safeParse(
      rawHabit({
        name: "n".repeat(50),
        description: "d".repeat(200),
        targetDays: "0000001",
        tags: `a, b, c, d, ${"e".repeat(20)}`,
      }),
    );
    expect(result.success).toBe(true);
    expect(result.data?.tags).toHaveLength(5);
    expect(result.data?.targetDays).toBe("0000001");
  });

  it("dedupes tags after normalization (case/whitespace variants collapse)", () => {
    const result = habitSchema.safeParse(rawHabit({ tags: "Health, HEALTH ,  health  " }));
    expect(result.success).toBe(true);
    expect(result.data?.tags).toEqual(["health"]);
  });
});

describe("habitSchema — invalid inputs", () => {
  it("rejects an empty or whitespace-only name", () => {
    for (const name of ["", "   "]) {
      const result = habitSchema.safeParse(rawHabit({ name }));
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("Name is required.");
    }
  });

  it("rejects a 51-character name", () => {
    const result = habitSchema.safeParse(rawHabit({ name: "n".repeat(51) }));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Name must be at most 50 characters.");
  });

  it("rejects a 201-character description", () => {
    const result = habitSchema.safeParse(rawHabit({ description: "d".repeat(201) }));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Description must be at most 200 characters.");
  });

  it("rejects colors outside the preset palette", () => {
    for (const color of ["#123456", "red", ""]) {
      const result = habitSchema.safeParse(rawHabit({ color }));
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("Choose one of the preset colors.");
    }
  });

  it("rejects masks without a target day or with the wrong shape", () => {
    for (const targetDays of ["0000000", "11111", "11111111", "abcdefg"]) {
      const result = habitSchema.safeParse(rawHabit({ targetDays }));
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("Pick at least one target day.");
    }
  });

  it("rejects more than 5 tags", () => {
    const result = habitSchema.safeParse(rawHabit({ tags: "a, b, c, d, e, f" }));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("At most 5 tags per habit.");
  });

  it("rejects a tag longer than 20 characters", () => {
    const result = habitSchema.safeParse(rawHabit({ tags: `ok, ${"x".repeat(21)}` }));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Each tag must be at most 20 characters.");
  });
});

describe("parseHabitForm — FormData wrapper", () => {
  /** Builds a habit FormData; `days` are the checked target-day checkbox values. */
  function habitFormData(fields: Record<string, string>, days: number[]): FormData {
    const formData = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      formData.set(key, value);
    }
    for (const day of days) {
      formData.append("targetDays", String(day));
    }
    return formData;
  }

  it("folds the checked day checkboxes into the 0/1 mask (Mon/Wed/Fri)", () => {
    const parsed = parseHabitForm(
      habitFormData({ name: "Read", description: "", color: "#10b981", tags: "" }, [1, 3, 5]),
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.targetDays).toBe("0101010");
      expect(parsed.data).toMatchObject({ name: "Read", description: null, tags: [] });
    }
  });

  it("returns one message per invalid field and echoes the submitted values", () => {
    const parsed = parseHabitForm(
      habitFormData({ name: "  ", description: "ok", color: "nope", tags: "a,b,c,d,e,f" }, []),
    );
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.state.status).toBe("error");
      expect(parsed.state.fieldErrors).toEqual({
        name: "Name is required.",
        color: "Choose one of the preset colors.",
        targetDays: "Pick at least one target day.",
        tags: "At most 5 tags per habit.",
      });
      // Submitted values come back so the form can re-render what was typed.
      expect(parsed.state.values).toEqual({
        name: "  ",
        description: "ok",
        color: "nope",
        targetDays: "0000000",
        tags: "a,b,c,d,e,f",
      });
    }
  });

  it("treats missing fields as empty strings (unchecked boxes -> all-zero mask)", () => {
    const parsed = parseHabitForm(new FormData());
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.state.fieldErrors?.name).toBe("Name is required.");
      expect(parsed.state.values?.targetDays).toBe("0000000");
    }
  });
});
