import { requireAdmin } from "@/lib/admin"
import { BlogComposer } from "../composer"

export default async function NewBlogPostPage() {
  await requireAdmin()
  return <BlogComposer />
}
