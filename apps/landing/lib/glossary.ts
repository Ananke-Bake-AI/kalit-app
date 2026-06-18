// Glossary of terms founders search ("what is X"). Each term gets its own
// page with DefinedTerm schema for SEO + answer engines. Bodies are Markdown.

export type GlossaryCategory = "Security" | "Building & launching" | "Research & growth"

export interface GlossaryTerm {
  slug: string
  term: string
  category: GlossaryCategory
  /** One-sentence definition — used as the meta description + schema definition. */
  short: string
  /** Markdown body (2–4 short paragraphs). */
  body: string
}

export const GLOSSARY_CATEGORIES: GlossaryCategory[] = [
  "Security",
  "Building & launching",
  "Research & growth"
]

export const GLOSSARY: GlossaryTerm[] = [
  {
    slug: "idor",
    term: "IDOR (Insecure Direct Object Reference)",
    category: "Security",
    short: "An access-control flaw where changing an ID in a request lets a user read or edit records that belong to someone else.",
    body: "IDOR happens when your app uses a user-supplied identifier (like `/invoice/1043`) to fetch data without checking that the requester is allowed to see it. Change the number to `1044` and you get someone else's invoice. The bug is one missing ownership check, not anything exotic.\n\nFor a solo founder, this is one of the most common ways early products leak customer data. It rarely shows up in normal testing because you only ever look at your own account. It also tends to multiply: every endpoint that takes an ID is a potential leak.\n\nThe fix is to scope every query to the authenticated user and verify ownership server-side on each request. If you want to know whether yours is exposed before launch, [IDOR explained](/blog/idor-explained) walks through real cases, and [Kalit Pentest](/pentest) probes your endpoints for it automatically."
  },
  {
    slug: "ssrf",
    term: "SSRF (Server-Side Request Forgery)",
    category: "Security",
    short: "A flaw where an attacker tricks your server into making requests to internal systems or cloud metadata it should never reach.",
    body: "SSRF occurs when your backend fetches a URL that a user controls. An image-from-URL feature, a webhook tester, or a PDF renderer can all be abused. Instead of pointing at an external image, the attacker points your server at `http://169.254.169.254/` (cloud metadata) or an internal admin service, and your server happily makes the request from inside your network.\n\nThis matters because the danger is hidden behind a normal-looking feature. On cloud hosting, a single SSRF can hand over credentials that unlock your whole account. It's one of [the OWASP Top 10](/blog/owasp-top-10-explained-for-founders) for good reason.\n\nDefend it by validating and allowlisting outbound destinations, blocking internal IP ranges, and never trusting a user-supplied URL. [Kalit Pentest](/pentest) checks whether your fetch features can be redirected at internal targets."
  },
  {
    slug: "sql-injection",
    term: "SQL injection (SQLi)",
    category: "Security",
    short: "A flaw where untrusted input is mixed into a database query, letting an attacker read, change, or destroy your data.",
    body: "SQL injection happens when user input is concatenated directly into a SQL query. A login field that builds `SELECT * FROM users WHERE email = '<input>'` can be fed `' OR '1'='1` and return every row. In the worst cases an attacker can dump your entire database or delete tables.\n\nFor a founder this is the classic catastrophic bug: it can expose every customer record at once, and it's been a top web risk for two decades. It stays one of [the OWASP Top 10](/blog/owasp-top-10-explained-for-founders) because new code keeps reintroducing it.\n\nThe defense is well understood: use parameterized queries (prepared statements) or a query builder that escapes input for you, and never build SQL by string concatenation. Most modern ORMs handle this by default, but raw queries you write by hand are where the risk creeps back in."
  },
  {
    slug: "xss",
    term: "XSS (Cross-Site Scripting)",
    category: "Security",
    short: "A flaw where attacker-controlled script runs in another user's browser, letting it steal sessions or act as that user.",
    body: "XSS happens when your app renders user-supplied content as HTML without escaping it. If a comment, profile name, or support message containing `<script>` is shown to other users unescaped, that script runs in their browser with their session. The attacker can read tokens, submit actions as the victim, or rewrite the page.\n\nFor a founder, XSS is dangerous because it turns your own users into the delivery channel and often hits your admins, who have the most access. It's a long-standing entry on [the OWASP Top 10](/blog/owasp-top-10-explained-for-founders).\n\nThe fix is to escape output by context, avoid injecting raw HTML, and add a Content Security Policy as a backstop. Modern frameworks like React escape by default, so the risk usually appears where you reach for `dangerouslySetInnerHTML` or its equivalents."
  },
  {
    slug: "csrf",
    term: "CSRF (Cross-Site Request Forgery)",
    category: "Security",
    short: "An attack that tricks a logged-in user's browser into sending an unwanted state-changing request to your app.",
    body: "CSRF abuses the fact that browsers attach your cookies to any request to your domain. If a logged-in user visits a malicious page, that page can silently make their browser POST to your app, changing a password or transferring funds, without the attacker ever seeing the response. The request looks legitimate because it carries the victim's real session.\n\nFor a founder it matters because the danger sits in any cookie-authenticated action that changes state, and it's easy to overlook while focusing on features. It remains part of [the OWASP Top 10](/blog/owasp-top-10-explained-for-founders) family of access flaws.\n\nDefend it with anti-CSRF tokens on state-changing requests and `SameSite` cookies. APIs that authenticate with bearer tokens instead of cookies are largely immune, which is why token-based setups dodge this class of bug."
  },
  {
    slug: "owasp-top-10",
    term: "OWASP Top 10",
    category: "Security",
    short: "A widely used list of the ten most critical web application security risks, maintained by the OWASP foundation.",
    body: "The OWASP Top 10 is a consensus ranking of the web security risks that cause the most real-world damage, from broken access control and injection to misconfiguration. It's updated every few years and is the closest thing the industry has to a shared baseline checklist.\n\nFor a solo founder it's useful precisely because you can't read every security paper. The list tells you where attacks actually concentrate, so you spend your limited time on the bugs that matter instead of obscure edge cases. Most breaches of small products trace back to one of these ten categories.\n\nIf you want it in founder terms rather than security jargon, [the OWASP Top 10, explained for founders](/blog/owasp-top-10-explained-for-founders) breaks each category down with concrete examples. [Kalit Pentest](/pentest) checks your app against these categories before you launch."
  },
  {
    slug: "broken-access-control",
    term: "Broken access control",
    category: "Security",
    short: "When users can act outside their permissions, reaching data or actions that should be restricted to other roles or owners.",
    body: "Broken access control is the umbrella for any failure to enforce who can do what. It covers a user reaching another user's records, a regular account hitting admin-only endpoints, or a request changing data it shouldn't. The common cause is that checks happen in the UI but not on the server.\n\nIt's worth knowing because it's currently the most frequently found web security risk, ahead of injection. For a founder the trap is that the app works perfectly in your own testing, since you never try to access what you're not allowed to. [IDOR explained](/blog/idor-explained) covers one of its most common forms.\n\nThe fix is to enforce authorization server-side on every request, deny by default, and test as a low-privilege user. It sits at the top of [the OWASP Top 10](/blog/owasp-top-10-explained-for-founders)."
  },
  {
    slug: "cvss",
    term: "CVSS (severity scoring)",
    category: "Security",
    short: "A standard 0-to-10 scoring system that rates how severe a security vulnerability is so you can prioritize fixes.",
    body: "CVSS (Common Vulnerability Scoring System) turns a vulnerability's traits, how easy it is to exploit, what access it needs, and what it impacts, into a single number from 0.0 to 10.0, grouped into Low, Medium, High, and Critical. It's the standard language for comparing one finding against another.\n\nFor a founder with a long list of issues and no security team, CVSS answers the only question that matters at first: what do I fix today versus next month. A Critical on a public endpoint outranks a Low in an admin-only corner. It keeps you from spending a weekend on a cosmetic warning while a real hole stays open.\n\nIt's a guide, not gospel: a Medium that exposes customer data in your specific app can deserve priority over its score. [Kalit Pentest](/pentest) assigns a CVSS rating to each finding so you can triage in order."
  },
  {
    slug: "sarif",
    term: "SARIF",
    category: "Security",
    short: "A standard JSON format for security and static-analysis results so different tools and platforms can read the same findings.",
    body: "SARIF (Static Analysis Results Interchange Format) is a standardized JSON structure for reporting scan findings: what the issue is, where it lives, and how severe it is. Because it's a common format, results from one tool can be imported by another, displayed in GitHub's code-scanning UI, or fed into your CI pipeline without custom parsing.\n\nFor a founder this matters once security stops being a one-off check. SARIF lets findings flow into the tools you already use, so a scan result shows up as an annotation on your pull request instead of a PDF you forget about. It makes security a step in your workflow rather than a separate chore.\n\n[Kalit Pentest](/pentest) exports its findings as SARIF, so you can pull results straight into GitHub or your existing pipeline."
  },
  {
    slug: "penetration-testing",
    term: "Penetration testing (pentest)",
    category: "Security",
    short: "A security assessment that actively tries to exploit your app the way a real attacker would, then reports what it found.",
    body: "A penetration test goes beyond scanning for known issues: it actively attempts to exploit your application, chaining weaknesses to see what an attacker could really reach. The output is a report of confirmed findings, usually with severity ratings, evidence, and steps to reproduce, rather than a list of theoretical warnings.\n\nFor a founder, a pentest is how you find out whether your product is safe to put in front of customers, before they (or an attacker) find out for you. The catch has traditionally been cost and turnaround: a human engagement runs into the thousands and takes weeks. [How much a pentest costs](/blog/how-much-does-a-penetration-test-cost) covers the real numbers, and [how to pentest your web app before launch](/blog/how-to-pentest-your-web-app-before-launch) walks through the process.\n\n[Kalit Pentest](/pentest) runs an autonomous, non-destructive pentest with CVSS findings, evidence, and remediation, sized for a pre-launch budget."
  },
  {
    slug: "mvp",
    term: "MVP (Minimum Viable Product)",
    category: "Building & launching",
    short: "The smallest version of your product that delivers real value, built to test whether people actually want it.",
    body: "An MVP is the leanest thing you can ship that still solves a real problem for real users. The point isn't to be unfinished, it's to learn fast: you build only enough to test your core bet, put it in front of people, and let their behavior tell you whether to keep going.\n\nFor a solo founder the MVP is a discipline against the biggest failure mode, spending months building something nobody wanted. Every feature you cut is time you get back to validate the idea sooner. The goal is evidence, not polish.\n\nThe trap is over-building \"just one more thing\" before launch. You often don't need much code at all to test demand. [Launch an MVP without code](/blog/how-to-launch-an-mvp-without-writing-code-in-one-sitting) shows how to get a testable version live in a single sitting."
  },
  {
    slug: "landing-page",
    term: "Landing page",
    category: "Building & launching",
    short: "A focused single page built around one offer and one action, designed to turn visitors into signups or customers.",
    body: "A landing page is a standalone page with a single goal: get the visitor to take one specific action, usually signing up, joining a list, or buying. Unlike a homepage that links everywhere, it strips away distractions and builds one clear argument from headline to call-to-action.\n\nFor a founder it's often the first real thing you ship, the page that tests whether your message lands and whether anyone will convert. A good landing page tells you if the problem and pitch resonate before you invest in the full product. Clarity beats cleverness: visitors should understand what you offer in seconds.\n\nYou don't need a designer or a week of work to make one. [Build a landing page with AI](/blog/how-to-build-a-landing-page-with-ai) covers the approach, and [Kalit Flow](/flow) builds one from a prompt with custom AI-sourced assets and publishes it to a live URL."
  },
  {
    slug: "waitlist",
    term: "Waitlist",
    category: "Building & launching",
    short: "A signup list that captures interested people before launch, giving you early demand signal and a warm audience to launch to.",
    body: "A waitlist is a page that collects emails from people who want your product before it's ready. It does two jobs at once: it measures whether anyone actually wants what you're building, and it gives you an audience to message the day you launch instead of starting from zero.\n\nFor a founder, a waitlist is the cheapest validation you can run. If you can't get signups for an idea, that's signal worth having before you write code. If you can, you've got both proof and momentum. The signups also let you talk to early users and refine the product before it ships.\n\nA waitlist only works if the page makes the value obvious and the signup effortless. [Build a waitlist page that converts](/blog/build-a-waitlist-page-that-actually-converts) covers what to put on it and what to leave off."
  },
  {
    slug: "vibe-coding",
    term: "Vibe coding",
    category: "Building & launching",
    short: "Building software by prompting an AI in natural language and accepting its output, often without reviewing the underlying code.",
    body: "Vibe coding is the practice of building an app by describing what you want to an AI and running whatever it generates, steering by feel rather than by reading the code. It lets non-engineers ship working features fast, and it's how a lot of indie products now get built.\n\nFor a founder it's genuinely useful for getting to a prototype quickly. The risk is that AI-generated code tends to look correct while hiding gaps the model didn't think about: missing access checks, unhandled inputs, and security holes you can't see because you never read the code. Those problems stay invisible until real traffic hits them.\n\nThe takeaway isn't to stop, it's to verify what you ship. [Why your AI-generated app breaks in production](/blog/why-your-ai-generated-app-breaks-in-production) covers the failure patterns and how to catch them before users do."
  },
  {
    slug: "tam-sam-som",
    term: "TAM, SAM, SOM",
    category: "Research & growth",
    short: "Three nested estimates of market size: total demand, the slice you can serve, and the share you can realistically win.",
    body: "TAM, SAM, and SOM are three layers of market sizing. TAM (Total Addressable Market) is everyone who could ever want the product. SAM (Serviceable Addressable Market) narrows that to the segment your offering and reach actually fit. SOM (Serviceable Obtainable Market) is the realistic share you can capture in the near term given your resources.\n\nFor a founder this framework keeps you honest. A huge TAM looks exciting on a slide, but SOM is the number that tells you whether this can be a real business for you, now, not in theory. It also forces you to define who you're actually selling to.\n\nThe hard part is grounding the numbers in real data instead of guesses. [How to size your market](/blog/how-to-size-your-market-tam-sam-som) walks through the method, and [Kalit Search](/search) pulls market and competitor research from a prompt to back the estimates."
  },
  {
    slug: "product-market-fit",
    term: "Product-market fit",
    category: "Research & growth",
    short: "The point where your product satisfies a real market demand strongly enough that growth and retention start to pull on their own.",
    body: "Product-market fit is the moment your product clearly serves a market that wants it: users stick around, tell others, and would be genuinely disappointed to lose it. Before fit, growth feels like pushing a boulder; after fit, demand starts pulling you forward and the main problem becomes keeping up.\n\nFor a founder it's the milestone that matters more than any feature. Chasing growth tactics before you have fit usually just burns money pouring users into a product they leave. The signal lives in retention and word of mouth, not in vanity signups.\n\nYou reach it faster by validating demand before building, not after. [Validate a SaaS idea](/blog/how-to-validate-a-saas-idea-before-you-build-anything) covers how to test whether the demand is real before you commit months to writing code."
  }
]

export const getTerm = (slug: string) => GLOSSARY.find((t) => t.slug === slug)
