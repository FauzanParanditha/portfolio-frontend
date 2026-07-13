import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

// Konfigurasi Vitest untuk unit test (fungsi murni) & test komponen React.
// `tsconfigPaths()` membuat alias `@/` → `src/` ikut resolve saat test.
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    // jsdom agar bisa merender komponen React & memakai DOM API.
    environment: "jsdom",
    // `describe`/`it`/`expect` tersedia global tanpa import.
    globals: true,
    // Setup Testing Library (matcher `toBeInTheDocument`, dll) sebelum test jalan.
    setupFiles: ["./src/test/setup.ts"],
  },
});
