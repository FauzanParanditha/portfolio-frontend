import { describe, expect, it } from "vitest";

import { serverApiBase } from "@/lib/server/apiBase";

describe("serverApiBase", () => {
  it("memakai alamat publik bila alamat internal tidak diisi", () => {
    expect(serverApiBase(undefined, "https://api.contoh.id/api/v1")).toBe(
      "https://api.contoh.id/api/v1",
    );
    expect(serverApiBase("", "https://api.contoh.id/api/v1")).toBe(
      "https://api.contoh.id/api/v1",
    );
    expect(serverApiBase("   ", "https://api.contoh.id/api/v1")).toBe(
      "https://api.contoh.id/api/v1",
    );
  });

  it("mendahulukan alamat internal", () => {
    expect(
      serverApiBase(
        "http://host.docker.internal:8080/api/v1",
        "https://api.contoh.id/api/v1",
      ),
    ).toBe("http://host.docker.internal:8080/api/v1");
  });

  it("membuang garis miring di akhir", () => {
    expect(serverApiBase(undefined, "https://api.contoh.id/api/v1//")).toBe(
      "https://api.contoh.id/api/v1",
    );
    expect(serverApiBase("http://api:8080/api/v1/", undefined)).toBe(
      "http://api:8080/api/v1",
    );
  });

  it("null bila keduanya kosong", () => {
    expect(serverApiBase(undefined, undefined)).toBeNull();
    expect(serverApiBase("", "")).toBeNull();
  });

  // Deploy satu-origin: alamat publik berupa path relatif. Server tidak bisa
  // mem-fetch-nya, jadi tanpa alamat internal data dilewati (bukan melempar).
  it("null untuk path relatif tanpa alamat internal", () => {
    expect(serverApiBase(undefined, "/api/v1")).toBeNull();
  });

  it("alamat internal menyelamatkan deploy satu-origin", () => {
    expect(serverApiBase("http://api:8080/api/v1", "/api/v1")).toBe(
      "http://api:8080/api/v1",
    );
  });

  it("menolak skema selain http/https", () => {
    expect(serverApiBase("file:///etc/passwd", undefined)).toBeNull();
    expect(serverApiBase(undefined, "javascript:alert(1)")).toBeNull();
  });
});
