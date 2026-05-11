import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  serverExternalPackages: ["bcryptjs"],
  transpilePackages: ["@kalit/broker-client", "@kalit/i18n", "@kalit/studio-ui"],
  images: {
    qualities: [25, 50, 75, 80, 100]
  },
  async redirects() {
    // Project (the suite landing page) was folded into Flow — preserve any
    // inbound links/SEO. The `:locale` segment HAS to be constrained: an
    // unrestricted /:locale/project/:path* greedy-matches /studio/project/<id>
    // (treats `studio` as a locale), redirects it to /studio/flow/<id>, which
    // then bounces back via the studio/flow→studio/project compatibility
    // redirect → infinite loop / ERR_TOO_MANY_REDIRECTS.
    //
    // Whitelist the known LOCALES so the redirect only fires on real
    // localized URLs like /en/project, /fr/project, etc.
    const localeRegex =
      "(en|fr|es|de|pt|ja|it|nl|ko|zh|ru|tr|pl|ar|hi|sv)"
    return [
      { source: "/project", destination: "/flow", permanent: true },
      { source: "/project/:path*", destination: "/flow/:path*", permanent: true },
      {
        source: `/:locale${localeRegex}/project`,
        destination: "/:locale/flow",
        permanent: true,
      },
      {
        source: `/:locale${localeRegex}/project/:path*`,
        destination: "/:locale/flow/:path*",
        permanent: true,
      },
    ]
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
