/**
 * Intro pembuka — versi yang TIDAK menghalangi isi.
 *
 * Pengganti `WelcomeAnimation`, yang dulu menjadi gerbang: beranda menahan
 * seluruh isinya di balik `useState(true)` selama 2,4 detik, sehingga HTML
 * pertama hanya berisi layar pembuka dan crawler maupun pengunjung berkoneksi
 * lambat tidak melihat apa pun.
 *
 * Tiga hal yang membuat versi ini aman:
 *
 * 1. Ia LAPISAN, bukan gerbang. Isi beranda dirender penuh di HTML, intro cuma
 *    menumpuk di atasnya.
 * 2. `pointer-events: none` — pengunjung bisa langsung menggulir dan mengklik
 *    menembusnya. Tidak ada yang perlu ditunggu, jadi tidak perlu tombol lewati.
 * 3. Hilang sendiri lewat animasi CSS, bukan timer JavaScript. Kalau JS gagal
 *    dimuat sekalipun, intro tetap menyingkir dan isi tetap terbaca.
 *
 * Skrip kecil di bawah menandai sesi supaya kunjungan berikutnya langsung
 * melihat isi tanpa intro. Ia sengaja ditaruh SEBELUM markup intro agar sudah
 * dieksekusi saat parser mencapai elemennya — tanpa kedip.
 */

const INTRO_SESSION_SCRIPT = `
try {
  if (sessionStorage.getItem('introSeen')) {
    document.documentElement.setAttribute('data-intro', 'seen');
  } else {
    sessionStorage.setItem('introSeen', '1');
  }
} catch (e) {
  /* mode privat / storage diblokir — intro tampil seperti biasa */
}
`.trim();

const NAME = "PARANDITHA";

export const IntroOverlay = () => {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: INTRO_SESSION_SCRIPT }} />

      <div className="intro-overlay" aria-hidden="true">
        <div className="intro-overlay__dot" />

        <div className="intro-overlay__center">
          <div className="intro-overlay__word">
            {NAME.split("").map((letter, i) => (
              <span
                key={i}
                className="intro-overlay__letter"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {letter}
              </span>
            ))}
          </div>
        </div>

        <div className="intro-overlay__foot">
          <span>Fullstack Programmer</span>
          <span>Go &middot; Next.js</span>
        </div>
      </div>
    </>
  );
};
