import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getGitHubAppConfig, getInstallation } from "@/lib/github-app"

// GET /api/auth/github-app/callback?installation_id=...&setup_action=install&state=...
// Returns an HTML page that posts a message to the opener window and closes.
// The parent modal listens for "kalit:github-installed" and refreshes its list.
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return htmlResponse(renderError("Unauthorized — please sign in first."))
  }
  const cfg = getGitHubAppConfig()
  if (!cfg) {
    return htmlResponse(renderError("GitHub App is not configured on this server."))
  }

  const { searchParams } = new URL(req.url)
  const installationId = searchParams.get("installation_id")
  const stateParam = searchParams.get("state")
  const setupAction = searchParams.get("setup_action") || ""
  const stateCookie = req.cookies.get("gh_app_state")?.value

  if (!installationId) {
    return htmlResponse(renderError("Missing installation_id from GitHub."))
  }
  if (!stateCookie || !stateParam || stateCookie !== stateParam) {
    return htmlResponse(renderError("Invalid install state — please try again."))
  }

  try {
    const info = await getInstallation(cfg, installationId)
    await prisma.gitHubInstallation.upsert({
      where: { installationId: String(info.id) },
      create: {
        userId: session.user.id,
        installationId: String(info.id),
        accountLogin: info.account.login,
        accountType: info.account.type,
        accountId: String(info.account.id),
        suspended: !!info.suspended_at,
      },
      update: {
        userId: session.user.id,
        accountLogin: info.account.login,
        accountType: info.account.type,
        accountId: String(info.account.id),
        suspended: !!info.suspended_at,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error"
    return htmlResponse(renderError(`Could not finalize install: ${msg}`))
  }

  const res = htmlResponse(renderSuccess(setupAction))
  res.cookies.delete("gh_app_state")
  return res
}

function htmlResponse(body: string): NextResponse {
  return new NextResponse(body, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  })
}

function renderSuccess(setupAction: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Kalit · GitHub connected</title><style>
body{margin:0;background:#0a0a0c;color:#eee;font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh}
.card{text-align:center;padding:2rem;max-width:360px}
h1{font-size:1.1rem;margin:0 0 .5rem}
p{font-size:.85rem;color:#aaa;margin:0;line-height:1.5}
</style></head><body><div class="card"><h1>GitHub connected ✓</h1><p>You can close this window and return to Kalit.</p></div>
<script>
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: "kalit:github-installed", setupAction: ${JSON.stringify(setupAction)} }, window.location.origin);
    }
  } catch (e) {}
  setTimeout(function(){ window.close(); }, 800);
</script></body></html>`
}

function renderError(msg: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Kalit · GitHub install error</title><style>
body{margin:0;background:#0a0a0c;color:#eee;font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh}
.card{text-align:center;padding:2rem;max-width:360px}
h1{font-size:1.05rem;margin:0 0 .5rem;color:#ff8a8a}
p{font-size:.85rem;color:#aaa;margin:0;line-height:1.5}
</style></head><body><div class="card"><h1>Install failed</h1><p>${escapeHtml(msg)}</p></div>
<script>
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: "kalit:github-install-error", error: ${JSON.stringify(msg)} }, window.location.origin);
    }
  } catch (e) {}
</script></body></html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
