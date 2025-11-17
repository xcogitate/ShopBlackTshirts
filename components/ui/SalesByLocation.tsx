"use client"

type SalesByLocationProps = {
  data: Array<{ label: string; value: number; details?: string }>
  valueFormatter?: (value: number) => string
  emptyLabel?: string
  onSelect?: (item: { label: string; value: number; details?: string }) => void
  selectedLabel?: string | null
}

const defaultFormatter = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)

export default function SalesByLocation({
  data,
  valueFormatter = defaultFormatter,
  emptyLabel = "No data available",
  onSelect,
  selectedLabel,
}: SalesByLocationProps) {
  if (!data.length) {
    return <p className="text-sm text-gray-500">{emptyLabel}</p>
  }

  const maxValue = Math.max(...data.map((item) => item.value), 1)

  return (
    <div className="space-y-4">
      {data.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => onSelect?.(item)}
          className={`w-full space-y-1 rounded-lg border border-transparent px-2 py-1 text-left transition hover:border-[#F5A623]/40 ${
            selectedLabel === item.label ? "border-[#F5A623]/60 bg-black/40" : ""
          }`}
        >
          <div className="flex items-center justify-between text-sm">
            <p className="font-medium text-white">{item.label}</p>
            <p className="text-gray-400">{valueFormatter(item.value)}</p>
          </div>
          <div className="h-2 rounded-full bg-neutral-900">
            <div
              className="h-full rounded-full bg-[#F5A623]"
              style={{ width: `${Math.min(100, Math.round((item.value / maxValue) * 100))}%` }}
            />
          </div>
        </button>
      ))}
    </div>
  )
}
