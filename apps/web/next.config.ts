import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@erp/config",
    "@erp/devices",
    "@erp/front-experience",
    "@erp/i18n",
    "@erp/ui",
    "@erp/module-auth",
    "@erp/module-storefront",
    "@erp/module-users",
  ],
  turbopack: {
    root: path.resolve(process.cwd(), "../.."),
  },
};

export default nextConfig;
