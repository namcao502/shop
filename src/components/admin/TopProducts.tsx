interface TopProduct {
  name: string;
  sold: number;
}

interface TopProductsProps {
  products: TopProduct[];
}

export function TopProducts({ products }: TopProductsProps) {
  const maxSold = Math.max(...products.map((p) => p.sold), 1);

  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="mb-3 font-medium text-gray-900">Top Selling</h3>
      <div className="space-y-3">
        {products.map((p) => (
          <div key={p.name} className="flex items-center justify-between">
            <span className="text-sm text-gray-700">{p.name}</span>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-amber-500"
                  style={{ width: `${(p.sold / maxSold) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">{p.sold}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
