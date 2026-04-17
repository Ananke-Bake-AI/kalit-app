import { NextRequest, NextResponse } from "next/server"

const SEARCH_API = process.env.SUITE_SEARCH_URL || "https://search.kalit.ai"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  try {
    const res = await fetch(`${SEARCH_API}/api/project/${id}/studio-prompt`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream error ${res.status}` },
        { status: res.status },
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: "Failed to reach search service" },
      { status: 502 },
    )
  }
}
