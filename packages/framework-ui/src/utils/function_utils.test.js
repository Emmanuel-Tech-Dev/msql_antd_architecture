import { describe, expect, test } from "vitest";
import utils from "./function_utils";

describe("shared UI utilities", () => {
  test("text and lists", () => {
    expect(utils.isBlank("  ")).toBe(true);
    expect(utils.isBlank([])).toBe(true);
    expect(utils.isBlank(0)).toBe(false);
    expect(utils.toList("a, b,,c")).toEqual(["a", "b", "c"]);
    expect(utils.humanize("created_by")).toBe("Created by");
    expect(utils.humanize("phoneNo")).toBe("Phone no");
    expect(utils.initials("Ama  Mensah Owusu")).toBe("AM");
    expect(utils.initials("")).toBe("U");
    expect(utils.pluralize(1, "Contact")).toBe("1 contact");
    expect(utils.pluralize(3, "Contact")).toBe("3 contacts");
    expect(utils.listPhrase(["email", "phone", "ID"])).toBe("email, phone or ID");
    expect(utils.truncateText("abcdefghij", 6)).toBe("abc...");
    expect(utils.truncateText("abcdefghij", 6, "…")).toBe("abcde…");
    expect(utils.asText(null)).toBe("");
  });

  test("numbers, sets and identifiers", () => {
    expect(utils.toNumber("x")).toBe(0);
    expect(utils.percentOf(1, 3)).toBe(33);
    expect(utils.percentOf(1, 0)).toBe(0);
    expect(utils.clamp(5, 0, 1)).toBe(1);
    expect([...utils.toggleInSet(new Set(["a"]), "a")]).toEqual([]);
    expect(utils.formatBytes(1572864)).toBe("1.5 MB");
    expect(utils.formatBytes(0)).toBe("0 B");
    expect(utils.isIdentifier("order_key")).toBe(true);
    expect(utils.isIdentifier("1bad")).toBe(false);
    expect(utils.parseJson("{bad", "fallback")).toBe("fallback");
  });

  test("soft validators", () => {
    const phone = utils.ValidationFactory.validateTelephoneNumber;
    expect([phone("0241234567"), phone("+233 24 123 4567"), phone("(030) 221-1234")]).toEqual([true, true, true]);
    expect([phone("12345"), phone("call me"), phone(""), phone("+1234567890123456")]).toEqual([false, false, false, false]);
    expect(utils.validateSoftListData([
      { name: "email", value: "a@b.co", validator: "validateSimpleEmail", required: true },
      { name: "first_name", value: "Al", validator: "validateAlphaMinCharLength(3)", required: true },
    ])).toEqual({ valid: false, name: "first_name" });
    expect(utils.validateSoftListData([{ name: "first_name", value: "Ama", validator: "validateAlphaMinCharLength(3)", required: true }]).valid).toBe(true);
    expect("bootstrap" in utils).toBe(false);
  });

  test("urls and files", () => {
    expect(utils.joinUrl("http://x/", "/api/a")).toBe("http://x/api/a");
    expect(utils.fileNameFromUrl("https://f/x/photo%201.png?v=1")).toBe("photo 1.png");
  });
});
