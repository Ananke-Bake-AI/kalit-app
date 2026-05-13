import { requireAdmin } from "@/lib/admin"
import { getBlogPost } from "@/server/actions/admin"
import { notFound } from "next/navigation"
import { BlogComposer } from "../composer"

export default async function EditBlogPostPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin()
  const { id } = await params
  const post = await getBlogPost(id)
  if (!post) notFound()
  return <BlogComposer initial={post} />
}
