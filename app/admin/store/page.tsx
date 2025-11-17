"use client"

import ProductDraftForm from "@/components/ui/ProductDraftForm"
import ProductPreviewList from "@/components/ui/ProductPreviewList"
import CountdownSettingsCard from "@/components/ui/CountdownSettingsCard"

export default function AdminStorePage() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Store Management</h1>
      <p className="text-sm text-muted-foreground">
        Draft, organize, and preview storefront products in one workspace.
      </p>

      <CountdownSettingsCard />

      <div className="rounded-lg border border-gray-800 bg-black/40 p-6">
        <h3 className="mb-4 text-lg font-semibold">Create Product Draft</h3>
        <div className="max-w-3xl">
          <ProductDraftForm />
        </div>
      </div>

      <div className="rounded-lg border border-gray-800 bg-black/40 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Product Preview</h3>
          <p className="text-xs text-muted-foreground">
            Review uploaded products, toggle Sold Out, or delete items.
          </p>
        </div>
        <div className="max-h-[600px] overflow-y-auto pr-2">
          <ProductPreviewList />
        </div>
      </div>
    </div>
  )
}
