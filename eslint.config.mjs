// eslint-config-next v16 sudah mengekspor flat config secara native, jadi
// jembatan `FlatCompat` (@eslint/eslintrc) tidak dipakai lagi — memaksanya
// lewat FlatCompat pada v16 membuat ESLint gagal ("Converting circular
// structure to JSON") karena config-nya bukan lagi format eslintrc.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  // Objek khusus global ignores: harus HANYA berisi `ignores` agar
  // ESLint memperlakukannya sebagai pengabaian global (bukan per-config).
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": 0,
    },
  },
];

export default eslintConfig;
