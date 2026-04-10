import { requireAdmin } from "@/lib/admin"
import { NextRequest, NextResponse } from "next/server"

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
const GROQ_MODEL = "llama-3.3-70b-versatile"

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

  const { prompt, currentSubject, currentBody } = await req.json()

  if (!prompt?.trim()) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
  }

  const messages: { role: string; content: string }[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ]

  // If there's existing content, include it for refinement
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
      return NextResponse.json(
        { error: "AI service error. Please try again." },
        { status: 502 }
      )
    }

    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content?.trim()

    if (!raw) {
      return NextResponse.json({ error: "Empty AI response" }, { status: 502 })
    }

    // Parse JSON — strip markdown fences if the model wraps them
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    const parsed = JSON.parse(cleaned)

    if (!parsed.subject || !parsed.body) {
      return NextResponse.json({ error: "Invalid AI response format" }, { status: 502 })
    }

    return NextResponse.json({ subject: parsed.subject, body: parsed.body })
  } catch (e) {
    console.error("[ai-assist] Error:", e)
    return NextResponse.json(
      { error: "Failed to generate email. Please try again." },
      { status: 500 }
    )
  }
}
