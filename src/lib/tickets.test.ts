import { describe, expect, it } from "vitest";
import { getOrderTotal, validateParticipants, type Participant } from "./tickets";

const person = (id: string, age: string): Participant => ({ id, age, name: "Тестовый участник" });

describe("ticket rules", () => {
  it("calculates full and child prices", () => {
    expect(getOrderTotal([person("1", "35"), person("2", "8")])).toBe(3000);
    expect(getOrderTotal([{ id: "3", name: "", age: "" }])).toBe(0);
  });

  it("requires an adult companion for a child", () => {
    expect(validateParticipants([person("1", "12"), person("2", "17")]).guardianError).not.toBe("");
    expect(validateParticipants([person("1", "12"), person("2", "18")]).guardianError).toBe("");
  });

  it("validates missing participant data", () => {
    const result = validateParticipants([{ id: "1", name: "", age: "" }]);
    expect(result.fieldErrors["1"].name).toBeTruthy();
    expect(result.fieldErrors["1"].age).toBeTruthy();
  });
});
