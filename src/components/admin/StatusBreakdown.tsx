import type { OrderStatus } from "@/lib/types";

interface StatusBreakdownProps {
  counts: Record<OrderStatus, number>;
}

const labels: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  shipping: "Shipping",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const colors: Record<OrderStatus, string> = {
  pending: "text-yellow-600",
  confirmed: "text-blue-600",
  shipping: "text-purple-600",
  delivered: "text-green-600",
  cancelled: "text-gray-500",
};

export function StatusBreakdown({ counts }: StatusBreakdownProps) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="mb-3 font-medium text-gray-900">Order Status</h3>
      <div className="flex flex-wrap gap-3">
        {(Object.keys(labels) as OrderStatus[]).map((status) => (
          <div
            key={status}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <span className="text-gray-500">{labels[status]} </span>
            <span className={`font-bold ${colors[status]}`}>
              {counts[status] ?? 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
