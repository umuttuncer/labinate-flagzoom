import { describe, expect, it } from "vitest";
import { safeUrl } from "../src/lib/analytics";

const BASE = "https://umuttuncer.github.io/labinate-app-template/";

describe("safeUrl", () => {
  it.each([
    ["query string", `${BASE}?invite=abc&utm_source=x`, BASE],
    ["hash", `${BASE}#access_token=abc`, BASE],
    ["query and hash", `${BASE}?a=1#b=2`, BASE],
    ["hash containing '?'", `${BASE}#/route?token=1`, BASE],
    ["empty query and hash", `${BASE}?#`, BASE],
    ["keeps trailing slash", BASE, BASE],
    ["no trailing slash", "https://umuttuncer.github.io/labinate-app-template", "https://umuttuncer.github.io/labinate-app-template"],
    ["base path + file", `${BASE}index.html?x=1`, `${BASE}index.html`],
    ["bare origin gets '/'", "https://example.com", "https://example.com/"],
    ["keeps non-default port", "http://localhost:5173/app/?debug=1", "http://localhost:5173/app/"],
    ["drops default port", "https://example.com:443/p", "https://example.com/p"],
    ["drops user:password@", "https://user:pw@example.com/p?q", "https://example.com/p"],
    ["lower-cases the host", "https://EXAMPLE.com/Path", "https://example.com/Path"],
    ["encoded '?' in path stays path", "https://example.com/a%3Fb?c=1", "https://example.com/a%3Fb"],
    ["surrounding whitespace", "  https://example.com/p?q=1  ", "https://example.com/p"],
  ])("%s", (_name, input, expected) => {
    expect(safeUrl(input)).toBe(expected);
  });

  it.each([
    ["empty string", ""],
    ["whitespace", "   "],
    ["relative path", "/labinate-app-template/?x=1"],
    ["not a url", "not a url"],
    ["javascript:", "javascript:alert(document.cookie)"],
    ["data:", "data:text/html,<b>secret</b>"],
    ["file:", "file:///home/user/secret.txt"],
    ["custom scheme", "android-app://com.example/path?x=1"],
  ])("returns '' for %s", (_name, input) => {
    expect(safeUrl(input)).toBe("");
  });

  it("returns '' for null, undefined and non-strings", () => {
    expect(safeUrl(null)).toBe("");
    expect(safeUrl(undefined)).toBe("");
    expect(safeUrl(42 as unknown as string)).toBe("");
  });
});
