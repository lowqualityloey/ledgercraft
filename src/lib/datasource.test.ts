import { describe, expect, test } from "bun:test";
import { DEFAULT_LOCAL_URL, isRemoteDatasource, resolveDatasource } from "./datasource";

describe("resolveDatasource", () => {
  test("defaults to the local SQLite file when DATABASE_URL is unset", () => {
    expect(resolveDatasource({})).toEqual({ url: DEFAULT_LOCAL_URL });
  });

  test("local file URLs never carry an auth token", () => {
    const config = resolveDatasource({ DATABASE_URL: "file:./ledger.db" });
    expect(config).toEqual({ url: "file:./ledger.db" });
    expect(config.authToken).toBeUndefined();
  });

  test("a token alongside a local URL is not attached", () => {
    const config = resolveDatasource({ DATABASE_URL: "file:/tmp/x.db", DATABASE_AUTH_TOKEN: "tok" });
    expect(config).toEqual({ url: "file:/tmp/x.db" });
  });

  test("remote libSQL URLs attach DATABASE_AUTH_TOKEN", () => {
    expect(
      resolveDatasource({
        DATABASE_URL: "libsql://ledgercraft-user.turso.io",
        DATABASE_AUTH_TOKEN: "token-a",
      }),
    ).toEqual({ url: "libsql://ledgercraft-user.turso.io", authToken: "token-a" });
  });

  test("TURSO_AUTH_TOKEN is accepted as the alias", () => {
    expect(
      resolveDatasource({
        DATABASE_URL: "libsql://ledgercraft-user.turso.io",
        TURSO_AUTH_TOKEN: "token-b",
      }),
    ).toEqual({ url: "libsql://ledgercraft-user.turso.io", authToken: "token-b" });
  });

  test("DATABASE_AUTH_TOKEN wins over the alias", () => {
    expect(
      resolveDatasource({
        DATABASE_URL: "libsql://db.turso.io",
        DATABASE_AUTH_TOKEN: "primary",
        TURSO_AUTH_TOKEN: "alias",
      }).authToken,
    ).toBe("primary");
  });

  test("TURSO_DATABASE_URL is accepted as the URL alias", () => {
    expect(
      resolveDatasource({
        TURSO_DATABASE_URL: "libsql://ledgercraft-user.turso.io",
        TURSO_AUTH_TOKEN: "token-c",
      }),
    ).toEqual({ url: "libsql://ledgercraft-user.turso.io", authToken: "token-c" });
  });

  test("DATABASE_URL wins over TURSO_DATABASE_URL", () => {
    expect(
      resolveDatasource({
        DATABASE_URL: "libsql://primary.turso.io",
        TURSO_DATABASE_URL: "libsql://alias.turso.io",
        DATABASE_AUTH_TOKEN: "token-a",
      }).url,
    ).toBe("libsql://primary.turso.io");
  });

  test("a blank DATABASE_URL does not shadow TURSO_DATABASE_URL", () => {
    expect(
      resolveDatasource({
        DATABASE_URL: "   ",
        TURSO_DATABASE_URL: "libsql://alias.turso.io",
        TURSO_AUTH_TOKEN: "token-b",
      }),
    ).toEqual({ url: "libsql://alias.turso.io", authToken: "token-b" });
  });

  test("blank or missing URLs fall back to the local file", () => {
    expect(resolveDatasource({ DATABASE_URL: "" })).toEqual({ url: DEFAULT_LOCAL_URL });
    expect(resolveDatasource({ TURSO_DATABASE_URL: "" })).toEqual({ url: DEFAULT_LOCAL_URL });
  });

  test("a local TURSO_DATABASE_URL stays tokenless", () => {
    expect(
      resolveDatasource({ TURSO_DATABASE_URL: "file:./ledger.db", TURSO_AUTH_TOKEN: "tok" }),
    ).toEqual({ url: "file:./ledger.db" });
  });

  test("remote URL without a token fails closed with an actionable message", () => {
    expect(() => resolveDatasource({ DATABASE_URL: "libsql://db.turso.io" })).toThrow(
      /DATABASE_AUTH_TOKEN/,
    );
    expect(() => resolveDatasource({ DATABASE_URL: "https://db.turso.io" })).toThrow(
      /auth token/,
    );
  });

  test("classifies protocols as local vs remote", () => {
    expect(isRemoteDatasource("file:./ledger.db")).toBe(false);
    expect(isRemoteDatasource("libsql://db.turso.io")).toBe(true);
    expect(isRemoteDatasource("https://db.turso.io")).toBe(true);
    expect(isRemoteDatasource("wss://db.turso.io")).toBe(true);
    // file names containing "http" must not be mistaken for remote
    expect(isRemoteDatasource("file:./http-cache.db")).toBe(false);
  });
});
