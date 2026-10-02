import { expect, test } from "vitest";
import { generateQrCodeSvg } from "./generate-qr-code-svg";

test("文字列から、スクリプトを含まない SVG の QR コードを作る", async () => {
  const svg = await generateQrCodeSvg("https://tackup.example.com/posts/abc");

  expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  expect(svg).toContain("viewBox");
  expect(svg).not.toMatch(/<script|onload|href/i);
});

test("同じ文字列からは、同じ QR コードができる", async () => {
  const url = "https://tackup.example.com/posts/abc";

  expect(await generateQrCodeSvg(url)).toBe(await generateQrCodeSvg(url));
  expect(await generateQrCodeSvg(url)).not.toBe(
    await generateQrCodeSvg(`${url}d`),
  );
});
