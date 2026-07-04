import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" keeps asset URLs relative so the same build works on GitHub
// Pages project sites (/repo-name/), custom domains, and Capacitor webviews.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
