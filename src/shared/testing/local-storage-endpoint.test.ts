import { expect, test } from "vitest";
import { assertLocalStorageEndpoint } from "./local-storage-endpoint";

test.each([
  "http://127.0.0.1:4443",
  "http://localhost:4443",
  "http://[::1]:4443",
])("ローカルのエミュレーター（%s）は許す", (endpoint) => {
  expect(assertLocalStorageEndpoint(endpoint)).toBe(endpoint);
});

test.each([
  "https://storage.googleapis.com",
  "http://storage.googleapis.com",
  "https://127.0.0.1:4443",
  "http://127.0.0.1.example.com:4443",
  "http://192.168.0.10:4443",
  "not a url",
])("ローカルのエミュレーター以外（%s）は止める", (endpoint) => {
  expect(() => assertLocalStorageEndpoint(endpoint)).toThrow(
    "ローカルのエミュレーター専用",
  );
});

test("未設定なら止める", () => {
  expect(() => assertLocalStorageEndpoint(undefined)).toThrow(
    "ローカルのエミュレーター専用",
  );
});
