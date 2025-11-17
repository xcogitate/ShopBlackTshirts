"use client"

import { useId, useRef, useState } from "react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type BaseProps = {
  label?: string
  description?: string
  className?: string
}

type SingleImageProps = BaseProps & {
  mode?: "single"
  value: string
  onChange: (value: string) => void
}

type MultiImageProps = BaseProps & {
  mode: "multiple"
  value: string[]
  onChange: (value: string[]) => void
}

type ImageUploadFieldProps = SingleImageProps | MultiImageProps

export default function ImageUploadField({
  label,
  description,
  className,
  ...props
}: ImageUploadFieldProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isMultiple = props.mode === "multiple"
  const urls = isMultiple ? props.value : props.value ? [props.value] : []

  const triggerFileDialog = () => inputRef.current?.click()

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files?.length) return
    setError(null)
    setIsUploading(true)
    try {
      const uploadedUrls: string[] = []
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append("file", file)
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })
        const data = (await response.json().catch(() => null)) as { url?: string; error?: string } | null
        if (!response.ok || !data?.url) {
          throw new Error(data?.error ?? "Upload failed.")
        }
        uploadedUrls.push(data.url)
      }
      if (isMultiple) {
        const next = [...props.value]
        next.push(...uploadedUrls)
        props.onChange(next)
      } else {
        props.onChange(uploadedUrls[uploadedUrls.length - 1] ?? "")
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload image.")
    } finally {
      setIsUploading(false)
      if (inputRef.current) {
        inputRef.current.value = ""
      }
    }
  }

  const handleRemove = (index: number) => {
    if (isMultiple) {
      const next = [...props.value]
      next.splice(index, 1)
      props.onChange(next)
    } else {
      props.onChange("")
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      {label && <Label htmlFor={inputId}>{label}</Label>}
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*"
        multiple={isMultiple}
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={triggerFileDialog} disabled={isUploading}>
          {isUploading ? "Uploading..." : "Upload image"}
        </Button>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
      {error && <p className="text-xs font-medium text-red-500">{error}</p>}
      {urls.length > 0 ? (
        <div className={cn("grid gap-3", isMultiple ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1")}>
          {urls.map((url, index) => (
            <div key={url} className="group relative overflow-hidden rounded-xl border border-neutral-800 bg-black/30">
              <img src={url} alt="Uploaded preview" className="h-36 w-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="absolute right-2 top-2 rounded-full bg-black/70 p-1 text-white opacity-0 transition group-hover:opacity-100"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
              <p className="truncate px-3 py-2 text-xs text-gray-400">{url}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-32 w-full items-center justify-center rounded-xl border border-dashed border-neutral-800 text-xs text-gray-500">
          {isUploading ? "Uploading image..." : "No image uploaded yet"}
        </div>
      )}
    </div>
  )
}
