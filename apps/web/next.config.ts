import type { NextConfig } from "next";
import { resolve } from "node:path";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@ielts/shared"],
  outputFileTracingRoot: resolve(__dirname, "../.."),
};

export default config;
