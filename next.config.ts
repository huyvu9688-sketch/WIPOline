import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1MB. The Warehouse Plan page uploads real MSS/MOBOM
      // production prints (~10-24MB .xlsb, ref/1.MSS1004.xlsx is ~24MB) as
      // multipart/form-data through a Server Action, so the limit needs to
      // cover the raw file plus multipart overhead. See
      // node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.md.
      bodySizeLimit: "30mb",
    },
    // Separate from serverActions.bodySizeLimit above, and easy to miss: this
    // project's proxy.ts (Next 16's renamed middleware.ts) runs on every
    // route via its catch-all matcher, and whenever proxy is used Next.js
    // buffers the whole request body in memory (so both proxy and the route
    // handler can read it) capped at a default 10MB — confirmed by hitting it
    // directly: uploading a >10MB file silently truncated the body and broke
    // FormData parsing ("Failed to parse body as FormData" / "Unexpected end
    // of form"), even with serverActions.bodySizeLimit raised. Renamed from
    // `middlewareClientMaxBodySize` for the proxy.ts convention — see
    // node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/proxyClientMaxBodySize.md
    // and .../upgrading/codemods.md.
    proxyClientMaxBodySize: "30mb",
  },
}

export default nextConfig
