import { randomUUID } from "crypto"
import { NextResponse } from "next/server"

import { adminStorage, storageBucketName } from "@/lib/server/firebase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    if (!buffer.length) {
      return NextResponse.json({ error: "Uploaded file is empty." }, { status: 400 })
    }

    const bucket =
      storageBucketName && storageBucketName.trim().length
        ? adminStorage.bucket(storageBucketName)
        : adminStorage.bucket()
    const normalizedName = file.name?.replace(/\s+/g, "-").toLowerCase() || "upload"
    const extension = normalizedName.includes(".") ? normalizedName.split(".").pop() : "bin"
    const objectPath = `products/${new Date().getFullYear()}/${randomUUID()}.${extension}`
    const storageFile = bucket.file(objectPath)

    await storageFile.save(buffer, {
      contentType: file.type || "application/octet-stream",
      resumable: false,
      metadata: {
        cacheControl: "public,max-age=31536000",
      },
    })

    await storageFile.makePublic()

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${objectPath}`

    return NextResponse.json({ url: publicUrl })
  } catch (error) {
    console.error("[/api/upload] error", error)
    return NextResponse.json({ error: "Unable to upload file." }, { status: 500 })
  }
}
