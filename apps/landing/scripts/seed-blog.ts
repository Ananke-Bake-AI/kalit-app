/**
 * One-time migration: insert the three inline blog posts from the original
 * (home)/blog/posts.ts into the BlogPost DB table. Idempotent via upsert on
 * slug. Body content is converted from structured BlogBlock[] to markdown.
 *
 * Run: pnpm tsx scripts/seed-blog.ts
 */
import { prisma } from "../lib/prisma"

interface SeedPost {
  slug: string
  title: string
  description: string
  body: string // markdown
  authorName: string
  publishedAt: Date
  tags: string[]
}

const POSTS: SeedPost[] = [
  {
    slug: "why-we-built-kalit",
    title: "Why we built Kalit AI",
    description:
      "The category isn't \"AI app builder.\" The category is \"AI software factory\" — and that's a bigger bet, but a better one for founders.",
    authorName: "Frederick Marinho",
    publishedAt: new Date("2026-05-13"),
    tags: ["product", "founder-notes"],
    body: `We didn't set out to build another Lovable. We set out to compress the time between "I have an idea" and "my product is live, monitored and ready to grow." Those are not the same problem.

## What AI app builders actually solve

Lovable, Base44, Emergent, Bolt and Replit have all done the same hard work: turn a prompt into runnable code. That's a real, valuable primitive. Three years ago it was science fiction. Today it's a category.

But every founder we talked to had the same complaint after their first "wow" moment. The app works. Now what?

- It has no marketing site.
- It has no analytics.
- It hasn't been security-tested.
- Nobody knows it exists.
- If something breaks at 2am, you're alone.

Each gap is its own project. Each project has its own AI tool. Each tool has its own prompt language. The compression you got from generating the app evaporates as soon as you try to actually ship it.

## The software factory bet

We think the next interesting product isn't a smarter app generator. It's a coordinated team of AI agents that ship the whole stack — product, landing site, growth, security — from one workspace.

That's why Kalit has four suites and not one:

- **Flow** — generate and deploy the actual product, powered by a 21-agent taskforce that plans, codes, tests and Dockerizes.
- **Pentest** — autonomously scan the product before launch, with 12 specialist agents and OWASP / CWE / SOC 2 mapping baked in.
- **Search** — research the market, competitors and angle before you commit.
- **Marketing** — once you have a product, plan and run the first growth motions.

These aren't four products glued together. They share a workspace, a credit system, a memory of your project, and an orchestrator (we call it the broker) that lets agents from one suite call agents from another. The Pentest agents know what Flow built. The Search agents seed what Marketing campaigns. The Taskforce knows what the launch landing page promised.

## Why Pentest is in the launch lineup

Most launches ship without any security testing. It's not because founders don't care — it's because pentest is expensive, slow and intimidating. The first quote we ever got for an external pentest on a tiny MVP was €18,000 and a six-week wait.

Kalit Pentest runs in 30–40 minutes, exports SARIF, maps to the standards your auditor will ask about, and costs a fraction of a single human engagement. It isn't a replacement for serious manual pentest at scale. It's the missing first step that most products skip entirely.

We think every product launched on Kalit Flow should ship with a security report attached. Over time, we want "scanned by Kalit" to mean something on a landing page — the way "hosted on Vercel" does today.

## What we're not

We're not a no-code tool. The whole point is that Kalit writes real code in a real framework you can take with you. We're not an enterprise platform with a six-month sales cycle — we want a founder to ship their first project in their first hour on the platform. And we're not infinitely automated. There's a human in the loop, by design, at the moments where judgment matters.

## Where we're going

We launch Kalit publicly this quarter with Flow and Pentest as the lead suites. Search stays free. Marketing follows once we've earned the right to ship it. We're a small team of three founders in Malta, building openly. If you want to follow along, the changelog is honest, the Discord is open, and the founders are on X.

The compressed thing in front of us isn't "write a CRUD app." It's "launch a company." That's the bet.`
  },
  {
    slug: "inside-the-21-agent-taskforce",
    title: "Inside the 21-agent Taskforce",
    description:
      "How Kalit Flow turns a prompt into a deployed, Dockerized web app — using a coordinated team of 21 specialist agents instead of one big model.",
    authorName: "Jeremy Guyet",
    publishedAt: new Date("2026-05-09"),
    tags: ["engineering", "agents"],
    body: `A single LLM call can write a React component. A single LLM call cannot ship a product. The gap between those two facts is where multi-agent systems earn their keep.

Kalit Flow is powered by an engine we call Taskforce. It coordinates 21 specialist agents that build, test and deploy a complete web app from a project brief. Here's how it actually works.

## Why 21 agents and not one

Three reasons:

- **Specialization beats generalization** on a long task. A focused "Designer" agent that does one thing is more reliable than a generalist that does ten.
- **Parallelism shortens wall-clock time.** Bug-Tester can run while Documenter writes the README.
- **Recovery is local.** If one agent fails, we re-run that agent — not the whole job.

## The roles

The 21 agent roles split into four broad layers:

### Orchestration

- **CEO** — takes the user brief, writes a spec, decomposes into a Kanban of tasks.
- **GPM** — project ops, status, scheduling.

### Build

- **Developer / Solo-Developer** — implement features in isolated git worktrees.
- **Designer** — pick and apply a design system.
- **Design-System-Builder** — generate the actual design tokens.
- **Design-Explorer** — explore reference UIs and capture what works.
- **Image-Analyzer** — read user-supplied design assets.
- **Asset-Manager** — fetch and place imagery.

### Quality and ship

- **Bug-Tester** — exercise the app, file issues.
- **Patch / Hotfix** — apply targeted fixes.
- **Merger** — resolve worktree conflicts.
- **Shipper** — write the Dockerfile and runtime config.
- **Deployer** — bring the container up on an isolated network.
- **Site-Analyzer** — verify the deployed app behaves like the spec.
- **Documenter** — generate README, env docs, runbook.

### Discovery

- **Researcher** — gather domain knowledge for the build.
- **Marketing-Analyst / Marketing-Planner** — connect the build to a launch plan.

## A run, end to end

When you submit a prompt to Flow, the broker hands the job to Taskforce. CEO writes the spec and lays down a Kanban. Workers claim tasks they're qualified for; multiple Developers can work in parallel git worktrees. Bug-Tester picks up tasks as they get marked ready. Shipper writes a Dockerfile once the app boots locally. Deployer brings the container up on a shared kalit-webapps network.

You watch the whole thing live in the Studio: every agent message, every task status, every artifact. When the run finishes you get a deployed URL, a Docker image, a code repo and a documented runbook.

## What this gets you that a single-shot generator doesn't

- A real Dockerfile, not just code in a sandbox you can't take with you.
- Episodic memory across sprints — the Taskforce remembers what it built last week.
- A design system instead of one-off CSS.
- Recovery from partial failures without re-running everything.
- An audit trail of every decision.

## What's next

We're working on three things: deeper integration between Taskforce and Pentest (so the build agents learn from the scan findings), better parallelism on long sprints, and an SDK so other teams can plug their own agents into the workflow.

Want to see Taskforce run on your idea? Start a session at kalit.ai and watch the Kanban fill itself in.`
  },
  {
    slug: "what-an-autonomous-pentest-actually-looks-like",
    title: "What an autonomous pentest actually looks like",
    description:
      "30 to 40 minutes. 12 specialist agents. 11 vulnerability classes. SARIF export. Here's exactly what happens inside a Kalit Pentest scan.",
    authorName: "Nicolas Martins",
    publishedAt: new Date("2026-05-06"),
    tags: ["security", "pentest"],
    body: `"AI pentest" is a marketing phrase that hides an enormous range of actual capability. Some tools just rebrand a vulnerability scanner. Others ship a chatbot that explains findings from a third-party engine. Kalit Pentest is different: it's a multi-agent system that does the work itself, end-to-end, on a target you authorize.

Here's what an actual run looks like.

## Phase 1 — Discovery

You provide a target — a domain you own, a staging environment, or a bug-bounty target in scope. We confirm authorization. Then a Discovery agent maps the surface: hostnames, IPs, exposed services, framework fingerprints.

## Phase 2 — Reconnaissance

A Recon agent enumerates subdomains, ports, SSL certificate details and the tech stack. Where useful, it shells out to subfinder, dig, openssl and httpx. Where those tools aren't installed, it falls back to built-in HTTP/DNS probes.

## Phase 3 — Enumeration

An Enumeration agent looks for sensitive paths and files: \`/.env\`, \`/.git/config\`, \`/admin\`, \`/backup.sql\`. It also runs path traversal probes and looks at error responses for information leaks.

## Phase 4 — Analysis

An Analysis agent reads everything gathered so far and generates concrete vulnerability hypotheses: "the login form at /auth looks like a candidate for SQL injection," "the file upload at /api/avatar might be vulnerable to SSRF." These hypotheses feed the next phase.

## Phase 5 — Exploitation

This is where it gets interesting. We spawn 12 specialist agents in parallel, each focused on one vulnerability class:

- **SQL Injection Hunter** — error-based, UNION, blind (time and boolean), out-of-band.
- **XSS Specialist** — reflected, stored, DOM-based; context-aware payload mutation.
- **SSRF Specialist** — cloud metadata (AWS, GCP, Azure), DNS rebinding, IP encoding bypasses.
- **Command Injection** — direct and blind (DNS, time, HTTP callbacks).
- **Deserialization** — Java, PHP, Python, .NET, Ruby gadget chains.
- **Auth Bypass** — session fixation, JWT flaws, privilege escalation.
- **IDOR Tester** — object reference manipulation.
- **Credential Spray** — reuse testing across endpoints.
- **Subdomain Takeover** — CNAME fingerprinting against 15+ cloud services.
- **Cloud Auditor** — open buckets, serverless endpoint leaks.
- **WebSocket Security** — CSWSH, auth bypass, message tampering.
- **GraphQL Security** — introspection, depth and complexity attacks, field auth.

If a WAF is in front of the target, a WAF engine fingerprints it (Cloudflare, AWS WAF, Akamai, Imperva, Sucuri, F5, ModSecurity, …) and applies a tailored mutation strategy: URL encoding, Base64 layering, HTML-entity wrapping, null-byte injection, comment-based evasion.

## Phase 6 — Reporting

Findings are deduplicated, false-positive validated, and scored on CVSS 3.1. Each finding gets:

- A description and severity.
- Proof-of-concept evidence (request, response, payload).
- Remediation guidance.
- Mappings to OWASP Top 10, CWE/SANS Top 25, PCI DSS 4.0, NIST 800-53, ISO 27001 and SOC 2.

We render that as a professional HTML report (self-contained, no external assets needed), a PDF, a CSV, raw JSON, and SARIF 2.1.0. The SARIF export drops into GitHub Advanced Security and your CI/CD pipeline.

## What this is, and isn't

Kalit Pentest is the first security pass most products will ever get. It's fast enough to run on every release. It catches the OWASP-class issues that 80% of real breaches are built on. It's defensible in front of an auditor.

It is not a replacement for serious manual pentest on a high-risk product. Human judgment still matters for business-logic flaws, multi-step exploits and creative chains. We're working on that next.

## Trying it

Pentest is on Enterprise today and rolling out to Pro in beta. You need to confirm authorization before your first scan. See our Responsible Use Policy for the rules of the road.

If you're a security team and you want to evaluate Kalit Pentest against your environment, email security@kalit.ai and we'll set you up.`
  }
]

async function main() {
  for (const post of POSTS) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      create: {
        slug: post.slug,
        status: "PUBLISHED",
        title: post.title,
        description: post.description,
        body: post.body,
        authorName: post.authorName,
        tags: post.tags,
        publishedAt: post.publishedAt
      },
      update: {
        // Don't clobber edits made through the admin UI on re-run.
      }
    })
    console.log(`✓ ${post.slug}`)
  }
  console.log(`Seeded ${POSTS.length} posts.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
