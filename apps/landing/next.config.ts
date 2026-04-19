import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  serverExternalPackages: ["bcryptjs"],
  transpilePackages: ["@kalit/broker-client", "@kalit/i18n", "@kalit/studio-ui"],
  images: {
    qualities: [25, 50, 75, 80, 100]
  },
  async rewrites() {
    const brokerUrl = (process.env.BROKER_URL || "http://localhost:9000").replace(/\/+$/, "")
    // Use `fallback` so Next.js filesystem routes (including dynamic catch-all
    // ones like /api/broker/find-assets/[...path]) take priority. With the
    // default `afterFiles`, dynamic routes lose to :path* rewrites.
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [
        {
          source: "/api/broker/:path*",
          destination: `${brokerUrl}/api/flow/:path*`
        }
      ]
    }
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin"
          },
          { key: "X-XSS-Protection", value: "0" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()"
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload"
          }
        ]
      },
      // Allow Capacitor mobile builds (iOS: capacitor://localhost, Android:
      // http://localhost) to reach the broker proxy. Scoped to /api/broker/*
      // so it doesn't relax CORS for auth/session routes.
      {
        source: "/api/broker/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Authorization,Content-Type" },
          { key: "Access-Control-Max-Age", value: "86400" }
        ]
      }
    ]
  }
}

export default nextConfig
