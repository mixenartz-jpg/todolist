import { defineConfig } from "vitest/config";
import path from "node:path";

const rootDir = import.meta.dirname;

// Saf mantık testleri — DOM gerekmez, bu yüzden node ortamı (daha hızlı).
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      // Kapsamı yalnızca saf mantığa uygula. Global kapsam hedefi,
      // test edilmemesi gereken bileşenleri test etmeye zorlar.
      include: [
        "src/lib/date/**/*.ts",
        "src/lib/text/**/*.ts",
        "src/features/**/*.ts",
      ],
      exclude: [
        "**/*.test.ts",
        "**/queries.ts",
        "**/mutations.ts",
        "**/types.ts",
        // Tarayıcı API sarmalayıcısı (createImageBitmap/OffscreenCanvas).
        // Mantık içermez ve node ortamında çalıştırılamaz; kapsama
        // dahil edilirse eşiği hak etmeden aşağı çeker.
        "**/compress.ts",
      ],
      thresholds: { lines: 80, functions: 80, branches: 75 },
    },
  },
  resolve: {
    alias: { "@": path.resolve(rootDir, "./src") },
  },
});
