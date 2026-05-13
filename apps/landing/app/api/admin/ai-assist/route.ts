import { requireAdmin } from "@/lib/admin"
import { NextRequest, NextResponse } from "next/server"

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
const GROQ_MODEL = "llama-3.3-70b-versatile"

const BLOG_SYSTEM_PROMPT = `You are a senior content writer for Kalit AI — an AI software factory that helps founders build, secure and launch products. You write blog posts that are technical, opinionated and honest, in the voice of a builder talking to other builders.

Output ONLY valid JSON with these fields:
- "title": Compelling, specific. No clickbait. 40–70 chars.
- "description": One-sentence summary used as the SEO meta description and post subtitle. 110–160 chars.
- "slug": URL slug, kebab-case, lowercase, ASCII only. Example: "why-we-built-kalit".
- "body": Full post body in Markdown. Use ## for sections, ### for sub-sections, **bold**, lists, > quotes, \`inline code\` and \`\`\`fenced code\`\`\` where appropriate. 700–1500 words. Avoid AI-cliche openings ("In today's fast-paced world…"). Write in first person plural ("we") when speaking for Kalit.
- "tags": 2–4 short tags, lowercase, kebab-case. Example: ["engineering", "agents"].
- "seoTitle": Optional override for the HTML <title>. Leave empty if title is good as-is.
- "seoDescription": Optional override for meta description. Leave empty if description is good as-is.

Voice rules:
- Be specific. Use concrete numbers (e.g. "12 specialist agents", "30–40 minutes").
- No corporate filler. No "leverage", "synergy", "best-in-class", etc.
- Honest about limits. If something is partial or beta, say so.
- Reference real Kalit suites when relevant: Flow, Pentest, Search, Marketing.

IMPORTANT: Return ONLY the JSON object, no markdown fences, no explanation.`

const SYSTEM_PROMPT = `You are an email copywriter for Kalit AI, a platform that helps businesses build, launch, grow, and secure their AI products.

You write marketing/announcement emails for our users. Output ONLY valid JSON with two fields:
- "subject": A concise, compelling email subject line
- "body": The email body using our template syntax

Template syntax rules:
- {{name}} — replaced with the recipient's name
- {{email}} — replaced with the recipient's email
- **text** — renders as bold
- [button:Label|URL] — renders as a Kalit-branded gradient CTA button
- [link:Label|URL] — renders as an inline purple link
- Use blank lines for paragraph breaks
- Keep tone professional but warm
- Always start with "Hi {{name}},"
- Always end with a sign-off like "The Kalit Team"
- Include a CTA button when relevant
- Keep emails concise (3-5 short paragraphs max)

Example output:
{
  "subject": "Introducing AI Flow — Automate Your Workflows",
  "body": "Hi {{name}},\\n\\nWe're thrilled to announce **AI Flow**, a brand new way to automate your workflows with intelligent agents.\\n\\nWith AI Flow, you can:\\n- Build custom automation pipelines\\n- Connect your favorite tools\\n- Let AI handle the heavy lifting\\n\\n[button:Try AI Flow Now|https://kalit.ai/flow]\\n\\nWe'd love to hear your feedback — just reply to this email.\\n\\nThe Kalit Team"
}

IMPORTANT: Return ONLY the JSON object, no markdown fences, no explanation.`

async function callGroq(messages: { role: string; content: string }[], apiKey: string) {
  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error("[ai-assist] Groq API error:", err)
    return null
  }

  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content?.trim()
  if (!raw) return null

  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
  const parsed = JSON.parse(cleaned)

  if (!parsed.subject || !parsed.body) return null
  return { subject: parsed.subject as string, body: parsed.body as string }
}

// Blog generation needs a larger context budget than emails (4× the body).
async function callGroqBlog(messages: { role: string; content: string }[], apiKey: string) {
  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.75,
      max_tokens: 4096,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error("[ai-assist:blog] Groq API error:", err)
    return null
  }

  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content?.trim()
  if (!raw) return null

  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(cleaned)
  } catch (e) {
    console.error("[ai-assist:blog] JSON parse failed:", e, "\nRaw:", raw.slice(0, 500))
    return null
  }

  if (!parsed.title || !parsed.body) return null
  return {
    title: String(parsed.title || ""),
    description: String(parsed.description || ""),
    slug: String(parsed.slug || ""),
    body: String(parsed.body || ""),
    tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
    seoTitle: parsed.seoTitle ? String(parsed.seoTitle) : "",
    seoDescription: parsed.seoDescription ? String(parsed.seoDescription) : ""
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not configured. Add it to your .env file (free at console.groq.com)." },
      { status: 500 }
    )
  }

  const body = await req.json()
  const { prompt, currentSubject, currentBody, translate, mode, blog, translateBlog } = body
  const isBlog = mode === "blog" || blog || translateBlog

  // ─── Blog: translation mode ────────────────────────────
  if (translateBlog) {
    const { sourceTitle, sourceDescription, sourceBody, targetLanguages } = translateBlog as {
      sourceTitle: string
      sourceDescription: string
      sourceBody: string
      targetLanguages: { code: string; name: string }[]
    }

    if (!sourceTitle || !sourceBody || !targetLanguages?.length) {
      return NextResponse.json({ error: "Missing translation parameters" }, { status: 400 })
    }

    const results: Record<string, { title: string; description: string; body: string }> = {}
    const errors: string[] = []

    for (const lang of targetLanguages) {
      try {
        const res = await callGroqBlog([
          {
            role: "system",
            content: `You are a professional translator for Kalit AI blog posts. Translate the following post to ${lang.name} (${lang.code}).

RULES:
- Translate naturally — never literal/word-by-word.
- Preserve all Markdown syntax (## headings, **bold**, lists, code fences, > quotes, [links](urls)).
- Keep URLs and code unchanged.
- Keep brand names "Kalit", "Kalit AI", "Flow", "Pentest", "Search", "Marketing" as-is.
- Match the original tone (technical, opinionated, honest).
- Output ONLY valid JSON: { "title": "...", "description": "...", "body": "..." } — no other fields, no explanation.`
          },
          {
            role: "user",
            content: JSON.stringify({ title: sourceTitle, description: sourceDescription, body: sourceBody })
          }
        ], apiKey)

        if (res && res.title && res.body) {
          results[lang.code] = {
            title: res.title,
            description: res.description || sourceDescription,
            body: res.body
          }
        } else {
          errors.push(lang.code)
        }
      } catch {
        errors.push(lang.code)
      }
    }

    return NextResponse.json({ translations: results, errors })
  }

  // ─── Blog: generation / refine mode ───────────────────
  if (isBlog) {
    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    const messages: { role: string; content: string }[] = [
      { role: "system", content: BLOG_SYSTEM_PROMPT }
    ]

    if (blog?.currentTitle || blog?.currentBody) {
      messages.push({
        role: "assistant",
        content: JSON.stringify({
          title: blog?.currentTitle || "",
          description: blog?.currentDescription || "",
          slug: blog?.currentSlug || "",
          body: blog?.currentBody || "",
          tags: blog?.currentTags || []
        })
      })
      messages.push({ role: "user", content: `Refine the post above based on this feedback: ${prompt}` })
    } else {
      messages.push({ role: "user", content: prompt })
    }

    try {
      const result = await callGroqBlog(messages, apiKey)
      if (!result) {
        return NextResponse.json({ error: "Failed to generate post" }, { status: 502 })
      }
      return NextResponse.json(result)
    } catch (e) {
      console.error("[ai-assist:blog] Error:", e)
      return NextResponse.json({ error: "Failed to generate post. Please try again." }, { status: 500 })
    }
  }

  // ─── Translation mode: translate existing content to target languages ───
  if (translate) {
    const { sourceSubject, sourceBody, targetLanguages } = translate as {
      sourceSubject: string
      sourceBody: string
      targetLanguages: { code: string; name: string }[]
    }

    if (!sourceSubject || !sourceBody || !targetLanguages?.length) {
      return NextResponse.json({ error: "Missing translation parameters" }, { status: 400 })
    }

    const results: Record<string, { subject: string; body: string }> = {}
    const errors: string[] = []

    // Translate to each language sequentially (respect rate limits)
    for (const lang of targetLanguages) {
      try {
        const result = await callGroq([
          {
            role: "system",
            content: `You are a professional translator for Kalit AI marketing emails. Translate the following email to ${lang.name} (${lang.code}).

RULES:
- Translate ALL text naturally — do NOT use literal/word-by-word translation
- Keep {{name}} and {{email}} template tags EXACTLY as-is (do NOT translate them)
- Keep [button:...|URL] and [link:...|URL] syntax EXACTLY — only translate the label text, keep the URL unchanged
- Keep **bold** markers around the translated text
- Keep the same tone, structure, and line breaks
- Translate "The Kalit Team" sign-off appropriately for the language
- Output ONLY valid JSON with "subject" and "body" fields, no explanation`
          },
          {
            role: "user",
            content: JSON.stringify({ subject: sourceSubject, body: sourceBody }),
          },
        ], apiKey)

        if (result) {
          results[lang.code] = result
        } else {
          errors.push(lang.code)
        }
      } catch {
        errors.push(lang.code)
      }
    }

    return NextResponse.json({ translations: results, errors })
  }

  // ─── Generation mode: create new email or refine existing ───
  if (!prompt?.trim()) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
  }

  const messages: { role: string; content: string }[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ]

  if (currentSubject || currentBody) {
    messages.push({
      role: "assistant",
      content: JSON.stringify({ subject: currentSubject || "", body: currentBody || "" }),
    })
    messages.push({
      role: "user",
      content: `Refine the email above based on this feedback: ${prompt}`,
    })
  } else {
    messages.push({
      role: "user",
      content: prompt,
    })
  }

  try {
    const result = await callGroq(messages, apiKey)

    if (!result) {
      return NextResponse.json({ error: "Failed to generate email" }, { status: 502 })
    }

    return NextResponse.json(result)
  } catch (e) {
    console.error("[ai-assist] Error:", e)
    return NextResponse.json(
      { error: "Failed to generate email. Please try again." },
      { status: 500 }
    )
  }
}
