import { NextResponse } from "next/server"
import { adminDb } from "@/lib/server/firebase-admin"
import { products as fallbackProducts } from "@/lib/products"
import { normalizeProductDoc } from "@/lib/server/normalize-product"

export async function GET() {
  try {
    const snapshot = await adminDb.collection("products").where("published", "==", true).get()
    if (snapshot.empty) {
      return NextResponse.json({ items: fallbackProducts })
    }
    const items = snapshot.docs.map(normalizeProductDoc)
    return NextResponse.json({ items })
  } catch (error) {
    console.error("[/api/products] error", error)
    return NextResponse.json({ items: fallbackProducts, error: "Unable to load live products." }, { status: 200 })
  }
}
