import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";
import prettier from "eslint-config-prettier";

// Flat config built from the plugins directly. (We avoid FlatCompat +
// `eslint-config-next` here because that path crashes on ESLint 9 with a
// circular-structure error from the bundled React config.)
export default tseslint.config(
  {
    ignores: [".next/**", "node_modules/**", "drizzle/**", "next-env.d.ts", ".qa/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { "@next/next": nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
  // Keep Prettier the source of truth for formatting — disable conflicting rules.
  prettier,
);
