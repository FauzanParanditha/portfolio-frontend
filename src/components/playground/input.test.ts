import { afterEach, describe, expect, it } from "vitest";

import {
  allowsArrowMovement,
  isPageTarget,
  isTypingTarget,
} from "@/components/playground/input";

function mount(html: string): HTMLElement {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  return host;
}

describe("input", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("isTypingTarget: hanya kontrol tempat mengetik", () => {
    const host = mount(
      `<input id="i" /><textarea id="t"></textarea><select id="s"></select>
       <div id="e" contenteditable="true"></div><button id="b"></button><a id="a" href="/"></a>`,
    );
    const get = (id: string) => host.querySelector(`#${id}`);
    expect(isTypingTarget(get("i"))).toBe(true);
    expect(isTypingTarget(get("t"))).toBe(true);
    expect(isTypingTarget(get("s"))).toBe(true);
    expect(isTypingTarget(get("b"))).toBe(false);
    expect(isTypingTarget(get("a"))).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
    expect(isTypingTarget(window)).toBe(false);
  });

  it("isPageTarget: body dan elemen akar saja", () => {
    const host = mount(`<button id="b"></button>`);
    expect(isPageTarget(document.body)).toBe(true);
    expect(isPageTarget(document.documentElement)).toBe(true);
    expect(isPageTarget(host.querySelector("#b"))).toBe(false);
  });

  it("allowsArrowMovement: panah untuk berjalan kecuali di daftar rak, dialog, atau kontrol ketik", () => {
    const host = mount(
      `<a id="back" href="/"></a>
       <button id="inspect"></button>
       <nav id="rack-list"><a id="rack" href="/projects/x"></a></nav>
       <div role="dialog"><button id="close"></button></div>
       <input id="field" />`,
    );
    const get = (id: string) => host.querySelector(`#${id}`);

    expect(allowsArrowMovement(document.body)).toBe(true);
    // Fokus di tombol Inspect / tautan kembali: panah tidak punya arti lain.
    expect(allowsArrowMovement(get("inspect"))).toBe(true);
    expect(allowsArrowMovement(get("back"))).toBe(true);
    // Daftar rak bisa digulir; dialog dan kolom isian punya makna panah sendiri.
    expect(allowsArrowMovement(get("rack"))).toBe(false);
    expect(allowsArrowMovement(get("close"))).toBe(false);
    expect(allowsArrowMovement(get("field"))).toBe(false);
    expect(allowsArrowMovement(null)).toBe(false);
  });
});
