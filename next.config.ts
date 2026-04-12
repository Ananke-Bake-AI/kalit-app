import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  serverExternalPackages: ["bcryptjs"],
  images: {
    qualities: [25, 50, 75, 80, 100]
  },
  async rewrites() {
    const brokerUrl = (process.env.BROKER_URL || "http://localhost:9000").replace(/\/+$/, "")
    return [
      {
        source: "/api/broker/:path*",
        destination: `${brokerUrl}/api/flow/:path*`
      }
    ]
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
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
      }
    ]
  }
}

export default nextConfig
