import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Konfigurasi Vitest untuk unit test (fungsi murni) & test komponen React.
export default defineConfig({
  plugins: [react()],
  // Alias `@/` → `src/` dibaca langsung dari tsconfig. Vite mendukung ini
  // secara native sejak versi yang dipakai Vitest 5, jadi plugin
  // `vite-tsconfig-paths` tidak diperlukan lagi.
  resolve: { tsconfigPaths: true },
  test: {
    // jsdom agar bisa merender komponen React & memakai DOM API.
    environment: "jsdom",
    // `describe`/`it`/`expect` tersedia global tanpa import.
    globals: true,
    // Setup Testing Library (matcher `toBeInTheDocument`, dll) sebelum test jalan.
    setupFiles: ["./src/test/setup.ts"],
  },
});
