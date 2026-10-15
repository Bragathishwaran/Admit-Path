/**
 * AdmitPath — optional Tailwind config.
 *
 * The site ships with the Tailwind Play CDN and an inline `tailwind.config`
 * object, so no build step is required to run it. This file is provided only
 * if you prefer to precompile Tailwind into assets/css/tailwind.css via the
 * Tailwind CLI (npx tailwindcss -i ./src/tailwind.css -o ./assets/css/tailwind.css --minify).
 *
 * Preflight is disabled because Bootstrap 5 supplies the reset/base layer and
 * the two would otherwise conflict.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./**/*.html", "./assets/js/**/*.js"],
  corePlugins: {
    preflight: false
  },
  theme: {
    extend: {
      colors: {
        jade: { DEFAULT: "#0E7C6B", 50: "#E7F3F0", 600: "#12907C" },
        coral: "#E4572E",
        mist: "#E7F3F0",
        gold: "#E1A93E"
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["'Plus Jakarta Sans'", "Inter", "sans-serif"]
      }
    }
  },
  plugins: []
};
