import { describe, expect, it } from "vitest";
import { isCircleFree, rectFromCenter } from "@/lib/playground/collision";
import { blockRect, routeLength } from "@/lib/playground/grid";
import {
  buildLayout,
  type FixtureKind,
  MAX_STATIONS,
  RACK,
} from "@/lib/playground/layout";
import {
  buildTour,
  ease,
  plateaus,
  pointAlong,
  progressAt,
  type Span,
  TOUR_DOG_RADIUS,
  tourState,
} from "./tour";

const ALL: FixtureKind[] = ["terminal", "wall", "mailbox"];
const NO_WALL: FixtureKind[] = ["terminal", "mailbox"];
// Satu jumlah rak per jumlah baris (2–6): kedalaman ruangan berbeda di tiap
// kasus, jadi posisi kamera relatif dinding belakang ikut berbeda.
const LAYOUTS = [0, 1, 8, 9, 13, 17, 21, MAX_STATIONS].flatMap((count) => [
  { name: `${count} rak, lengkap`, layout: buildLayout(count, ALL) },
  { name: `${count} rak, tanpa dinding`, layout: buildLayout(count, NO_WALL) },
]);

describe("buildTour", () => {
  it("perhentian mengikuti perabot yang terpasang", () => {
    expect(buildTour(buildLayout(8, ALL)).stops.map((s) => s.id)).toEqual([
      "top",
      "about",
      "projects",
      "experience",
      "status",
      "contact",
    ]);
    // Tanpa data pengalaman dindingnya absen, begitu pula perhentiannya.
    expect(buildTour(buildLayout(8, NO_WALL)).stops.map((s) => s.id)).toEqual([
      "top",
      "about",
      "projects",
      "status",
      "contact",
    ]);
    // Tanpa perabot sama sekali tur tetap punya tiga perhentian.
    expect(buildTour(buildLayout(8)).stops).toHaveLength(3);
  });

  it.each(LAYOUTS)(
    "$name: satu jalur antara tiap dua perhentian, menyambung ujung ke ujung",
    ({ layout }) => {
      const { stops, routes } = buildTour(layout);
      expect(routes).toHaveLength(stops.length - 1);
      routes.forEach((route, i) => {
        expect(route.length).toBeGreaterThanOrEqual(2);
        expect(route[0]).toEqual(stops[i].dog);
        const end = route[route.length - 1];
        expect(end.x).toBeCloseTo(stops[i + 1].dog.x);
        expect(end.z).toBeCloseTo(stops[i + 1].dog.z);
        expect(routeLength(route)).toBeGreaterThan(0.5);
      });
    },
  );

  it.each(LAYOUTS)(
    "$name: robot berdiri di tempat yang bebas di tiap perhentian",
    ({ layout }) => {
      for (const stop of buildTour(layout).stops) {
        expect(
          isCircleFree(
            stop.dog.x,
            stop.dog.z,
            TOUR_DOG_RADIUS,
            layout.obstacles,
            layout.bounds,
          ),
          stop.id,
        ).toBe(true);
      }
    },
  );

  it("perhentian perabot memakai titik berdiri dan arah hadap perabotnya", () => {
    const layout = buildLayout(8, ALL);
    const { stops } = buildTour(layout);
    const [terminal, wall, mailbox] = layout.fixtures;
    const byId = Object.fromEntries(stops.map((s) => [s.id, s]));
    expect(byId.status.dog).toEqual(terminal.approach);
    expect(byId.status.face).toBe(terminal.face);
    expect(byId.experience.dog).toEqual(wall.approach);
    expect(byId.experience.face).toBe(wall.face);
    expect(byId.contact.dog).toEqual(mailbox.approach);
    expect(byId.contact.face).toBe(mailbox.face);
    expect(byId.projects.dog).toEqual(layout.slots[0].approach);
  });
});

describe("tourState", () => {
  it.each(LAYOUTS)(
    "$name: di sepanjang tur robot tidak pernah menindih rak, perabot, atau dinding",
    ({ layout }) => {
      const tour = buildTour(layout);
      const last = tour.stops.length - 1;
      for (let p = 0; p <= last; p += 0.002) {
        const { dog } = tourState(tour, p);
        // Jalur diikuti di grid, jadi badan boleh menyinggung geometri tepat
        // beberapa sentimeter (sama seperti klik-untuk-jalan di playground).
        const free = isCircleFree(
          dog.x,
          dog.z,
          TOUR_DOG_RADIUS - 0.09,
          layout.obstacles,
          layout.bounds,
        );
        if (!free) {
          throw new Error(
            `robot menindih halangan di progress ${p.toFixed(3)}: (${dog.x.toFixed(2)}, ${dog.z.toFixed(2)})`,
          );
        }
      }
    },
  );

  it.each(LAYOUTS)(
    "$name: kamera tidak pernah masuk ke dalam rak dan tidak di bawah lantai",
    ({ layout }) => {
      const tour = buildTour(layout);
      const last = tour.stops.length - 1;
      for (let p = 0; p <= last; p += 0.002) {
        const { camera } = tourState(tour, p);
        expect(camera.y).toBeGreaterThan(1.5);
        for (const slot of layout.slots) {
          const inside =
            camera.y < RACK.height + 0.3 &&
            Math.abs(camera.x - slot.x) < RACK.width / 2 + 0.3 &&
            Math.abs(camera.z - slot.z) < RACK.depth / 2 + 0.3;
          if (inside) {
            throw new Error(
              `kamera di dalam rak ${slot.index} pada progress ${p.toFixed(3)}`,
            );
          }
        }
      }
    },
  );

  it("halangan baru di tengah jalur lurus: robot memutarinya, tidak menembus", () => {
    // Di tata letak sekarang semua jalur antar-perhentian kebetulan lurus dan
    // bebas. Test ini menaruh peti tepat di garis lurus dinding → terminal
    // (dan terminal → kotak surat), supaya pencarian jalur benar-benar diuji.
    const layout = buildLayout(8, ALL);
    const crate = rectFromCenter(1.8, 4.65, 0.8, 0.8);
    layout.obstacles.push(crate);
    blockRect(layout.grid, 1.8, 4.65, 0.8, 0.8, 0.155);

    const tour = buildTour(layout);
    const wallToTerminal = tour.routes[3];
    // Jalurnya berbelok: lebih dari dua titik, dan lebih panjang dari garis lurus.
    expect(wallToTerminal.length).toBeGreaterThan(2);
    const [from, to] = [tour.stops[3].dog, tour.stops[4].dog];
    expect(routeLength(wallToTerminal)).toBeGreaterThan(
      Math.hypot(to.x - from.x, to.z - from.z) + 0.01,
    );

    for (let p = 0; p <= tour.stops.length - 1; p += 0.002) {
      const { dog } = tourState(tour, p);
      expect(
        isCircleFree(
          dog.x,
          dog.z,
          TOUR_DOG_RADIUS - 0.09,
          layout.obstacles,
          layout.bounds,
        ),
        `progress ${p.toFixed(3)}`,
      ).toBe(true);
    }
  });

  it.each(LAYOUTS)(
    "$name: kamera tidak pernah masuk ke dalam perabot, properti, atau melewati dinding samping/belakang",
    ({ layout }) => {
      const tour = buildTour(layout);
      const last = tour.stops.length - 1;
      const { bounds } = layout;
      // Halangan selain rak: meja terminal (+ monitor), kotak surat, properti.
      const furniture = layout.obstacles.slice(layout.slots.length);
      for (let p = 0; p <= last; p += 0.002) {
        const { camera } = tourState(tour, p);
        for (const rect of furniture) {
          const inside =
            camera.y < 2.3 &&
            camera.x > rect.minX - 0.3 &&
            camera.x < rect.maxX + 0.3 &&
            camera.z > rect.minZ - 0.3 &&
            camera.z < rect.maxZ + 0.3;
          if (inside) {
            throw new Error(
              `kamera di dalam perabot pada progress ${p.toFixed(3)}: (${camera.x.toFixed(2)}, ${camera.y.toFixed(2)}, ${camera.z.toFixed(2)})`,
            );
          }
        }
        // Dinding barat dan belakang tergambar dari dalam: kamera tidak boleh
        // berada di baliknya (yang terlihat hanya latar kosong). Sisi depan dan
        // kanan boleh — dari sanalah ruangan dilihat.
        expect(camera.x, `progress ${p.toFixed(3)}`).toBeGreaterThan(
          bounds.minX,
        );
        expect(camera.z, `progress ${p.toFixed(3)}`).toBeGreaterThan(
          bounds.minZ,
        );
      }
    },
  );

  it("berlama-lama di perhentian: 10% pertama gulir hampir tidak menggerakkan kamera", () => {
    const tour = buildTour(buildLayout(8, ALL));
    for (let i = 0; i < tour.stops.length - 1; i++) {
      const from = tour.stops[i].camera;
      const to = tour.stops[i + 1].camera;
      const whole = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
      const { camera } = tourState(tour, i + 0.1);
      const moved = Math.hypot(
        camera.x - from.x,
        camera.y - from.y,
        camera.z - from.z,
      );
      // Tanpa peredam (gerak linear) nilainya 10%.
      expect(moved / whole).toBeLessThan(0.02);
    }
  });

  it("tepat di perhentian: kamera, titik pandang, robot, dan arah hadapnya milik perhentian itu", () => {
    const tour = buildTour(buildLayout(8, ALL));
    tour.stops.forEach((stop, i) => {
      const state = tourState(tour, i);
      expect(state.camera.x).toBeCloseTo(stop.camera.x);
      expect(state.camera.y).toBeCloseTo(stop.camera.y);
      expect(state.camera.z).toBeCloseTo(stop.camera.z);
      expect(state.look.x).toBeCloseTo(stop.look.x);
      expect(state.dog.x).toBeCloseTo(stop.dog.x);
      expect(state.dog.z).toBeCloseTo(stop.dog.z);
      expect(state.face).toBe(stop.face);
    });
  });

  it("di luar rentang dijepit (juga ±tak hingga); NaN dianggap awal", () => {
    const tour = buildTour(buildLayout(8, ALL));
    const last = tour.stops.length - 1;
    expect(tourState(tour, -3)).toEqual(tourState(tour, 0));
    expect(tourState(tour, 99)).toEqual(tourState(tour, last));
    expect(tourState(tour, Infinity)).toEqual(tourState(tour, last));
    expect(tourState(tour, -Infinity)).toEqual(tourState(tour, 0));
    expect(tourState(tour, NaN)).toEqual(tourState(tour, 0));
  });

  it("gerak kamera kontinu: langkah kecil di progress = langkah kecil di ruang", () => {
    const tour = buildTour(buildLayout(8, ALL));
    const last = tour.stops.length - 1;
    let previous = tourState(tour, 0);
    for (let p = 0.001; p <= last; p += 0.001) {
      const state = tourState(tour, p);
      const cameraStep = Math.hypot(
        state.camera.x - previous.camera.x,
        state.camera.y - previous.camera.y,
        state.camera.z - previous.camera.z,
      );
      const dogStep = Math.hypot(
        state.dog.x - previous.dog.x,
        state.dog.z - previous.dog.z,
      );
      expect(cameraStep).toBeLessThan(0.06);
      expect(dogStep).toBeLessThan(0.06);
      previous = state;
    }
  });

  it("arah hadap berganti di tengah jalan antara dua perhentian", () => {
    const tour = buildTour(buildLayout(8, ALL));
    expect(tourState(tour, 2.3).face).toBe(tour.stops[2].face);
    expect(tourState(tour, 2.7).face).toBe(tour.stops[3].face);
  });
});

describe("ease & pointAlong", () => {
  it("ease: 0 → 0, 1 → 1, monoton, datar di kedua ujung", () => {
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(ease(0.5)).toBeCloseTo(0.5);
    expect(ease(-1)).toBe(0);
    expect(ease(2)).toBe(1);
    let previous = 0;
    for (let t = 0; t <= 1; t += 0.01) {
      expect(ease(t)).toBeGreaterThanOrEqual(previous);
      previous = ease(t);
    }
    // Berlama-lama di perhentian: 10% pertama gulir menggerakkan < 1%.
    expect(ease(0.1)).toBeLessThan(0.01);
    expect(ease(0.9)).toBeGreaterThan(0.99);
  });

  it("pointAlong mengukur menurut panjang, bukan jumlah titik", () => {
    const route = [
      { x: 0, z: 0 },
      { x: 1, z: 0 },
      { x: 1, z: 3 },
    ];
    expect(pointAlong(route, 0)).toEqual({ x: 0, z: 0 });
    expect(pointAlong(route, 0.25)).toEqual({ x: 1, z: 0 });
    expect(pointAlong(route, 0.5)).toEqual({ x: 1, z: 1 });
    expect(pointAlong(route, 1)).toEqual({ x: 1, z: 3 });
    expect(pointAlong(route, 5)).toEqual({ x: 1, z: 3 });
  });

  it("pointAlong: jalur kosong, satu titik, atau panjang nol tidak menghasilkan NaN", () => {
    expect(pointAlong([], 0.5)).toEqual({ x: 0, z: 0 });
    expect(pointAlong([{ x: 2, z: 3 }], 0.5)).toEqual({ x: 2, z: 3 });
    const still = [
      { x: 2, z: 3 },
      { x: 2, z: 3 },
    ];
    expect(pointAlong(still, 0.5)).toEqual({ x: 2, z: 3 });
  });
});

/** Dataran satu titik di tiap nilai (bagian yang muat di layar). */
const points = (...centers: number[]): Span[] =>
  centers.map((center) => ({ start: center, end: center }));

describe("plateaus", () => {
  it("bagian yang muat di layar: dataran satu titik di tengahnya", () => {
    expect(plateaus([{ top: 100, height: 600 }], 800)).toEqual([
      { start: 400, end: 400 },
    ]);
    // Tepat setinggi layar masih satu titik.
    expect(plateaus([{ top: 0, height: 800 }], 800)).toEqual([
      { start: 400, end: 400 },
    ]);
  });

  it("bagian lebih tinggi dari layar: dataran selama ia memenuhi layar", () => {
    // Bagian 2400 px di layar 800 px, mulai di y = 1000: memenuhi layar dari
    // gulir 1000 (tengah layar 1400) sampai gulir 2600 (tengah layar 3000).
    expect(plateaus([{ top: 1000, height: 2400 }], 800)).toEqual([
      { start: 1400, end: 3000 },
    ]);
  });

  it("tinggi nol atau NaN tidak menghasilkan dataran terbalik", () => {
    for (const span of plateaus(
      [
        { top: 0, height: 0 },
        { top: 50, height: NaN },
      ],
      800,
    )) {
      expect(span.start <= span.end || Number.isNaN(span.start)).toBe(true);
    }
  });
});

describe("progressAt", () => {
  const centers = points(400, 1200, 2000, 3600);

  it("tepat di tengah bagian ke-k hasilnya k; di antaranya linear", () => {
    expect(progressAt(centers, 400)).toBe(0);
    expect(progressAt(centers, 1200)).toBe(1);
    expect(progressAt(centers, 800)).toBe(0.5);
    // Bagian yang lebih tinggi: jaraknya lebih jauh, lajunya lebih pelan.
    expect(progressAt(centers, 2800)).toBe(2.5);
    expect(progressAt(centers, 3600)).toBe(3);
  });

  it("di atas bagian pertama dan di bawah yang terakhir dijepit", () => {
    expect(progressAt(centers, -50)).toBe(0);
    expect(progressAt(centers, 0)).toBe(0);
    expect(progressAt(centers, 99999)).toBe(3);
  });

  it("monoton tak-turun saat halaman digulir", () => {
    let previous = 0;
    for (let y = 0; y <= 4000; y += 7) {
      const p = progressAt(centers, y);
      expect(p).toBeGreaterThanOrEqual(previous);
      previous = p;
    }
  });

  it("bagian tinggi: tepat k di sepanjang datarannya, linear di luar itu", () => {
    // Layar 800. Bagian: 800, 800, 3200 (4 layar), 800.
    const spans = plateaus(
      [
        { top: 0, height: 800 },
        { top: 800, height: 800 },
        { top: 1600, height: 3200 },
        { top: 4800, height: 800 },
      ],
      800,
    );
    // Lompat ke jangkar bagian ke-2 (tepi atasnya di atas layar): tengah
    // layar = 1600 + 400. Dulu hasilnya ≈ 1,2 dan perhentian aktifnya salah.
    expect(progressAt(spans, 2000)).toBe(2);
    // Selama kartunya dibaca, tetap di perhentian itu.
    expect(progressAt(spans, 3200)).toBe(2);
    expect(progressAt(spans, 4400)).toBe(2);
    // Baru bergerak setelah tepi bawahnya naik melewati bawah layar.
    expect(progressAt(spans, 4800)).toBe(2.5);
    expect(progressAt(spans, 5200)).toBe(3);
    // Menjelang bagian tinggi: linear dari tengah bagian sebelumnya.
    expect(progressAt(spans, 1600)).toBe(1.5);

    let previous = 0;
    for (let y = 0; y <= 6000; y += 13) {
      const p = progressAt(spans, y);
      expect(p).toBeGreaterThanOrEqual(previous);
      previous = p;
    }
  });

  it("masukan janggal: daftar kosong, satu bagian, NaN, bagian bertumpuk", () => {
    expect(progressAt([], 100)).toBe(0);
    expect(progressAt(points(500), 100)).toBe(0);
    expect(progressAt(points(500), 900)).toBe(0);
    expect(progressAt(centers, NaN)).toBe(0);
    // Sebelum tata letak (semua tinggi nol): tetap di awal.
    expect(progressAt(points(0, 0, 0), 0)).toBe(0);
    expect(progressAt(points(0, 0, 0), 10)).toBe(0);
    // Dua bagian bertumpuk di tengah daftar: dilompati, tidak membagi nol.
    expect(progressAt(points(0, 100, 100, 200), 100)).toBe(1);
    expect(progressAt(points(0, 100, 100, 200), 150)).toBe(2.5);
  });
});
