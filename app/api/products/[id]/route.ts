import { NextResponse } from "next/server"

import { getStorefrontProduct } from "@/lib/server/get-storefront-product"

type RouteParams = {
  params: {
    id: string
  }
}

export async function GET(_request: Request, { params }: RouteParams) {
  const product = await getStorefrontProduct(params.id)
  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 })
  }
  return NextResponse.json({ item: product })
}
