"use client"

type TopProduct = {
  name: string
  quantity: number
  revenue: number
}

type TopProductsTableProps = {
  products: TopProduct[]
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)

export default function TopProductsTable({ products }: TopProductsTableProps) {
  if (!products.length) {
    return <p className="text-sm text-gray-500">No product sales recorded yet.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-900 text-xs uppercase tracking-wider text-gray-400">
            <th className="py-2 pr-4">Product</th>
            <th className="py-2 pr-4">Units sold</th>
            <th className="py-2 pr-4">Revenue</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.name} className="border-b border-neutral-900 last:border-none">
              <td className="py-3 pr-4 font-semibold text-white">{product.name}</td>
              <td className="py-3 pr-4 text-gray-300">{product.quantity}</td>
              <td className="py-3 pr-4 text-gray-300">{formatCurrency(product.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
