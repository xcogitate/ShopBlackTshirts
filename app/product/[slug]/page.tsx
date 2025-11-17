import { redirect } from "next/navigation"

type ProductPageProps = {
  params: {
    slug: string
  }
}

export default function ProductPageRedirect({ params }: ProductPageProps) {
  const slug = params?.slug
  const target = slug ? `/p/${encodeURIComponent(slug)}` : "/product"
  redirect(target)
}
