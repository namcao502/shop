import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { formatPrice, formatDate } from "@/lib/format";
import type { Order } from "@/lib/types";

interface OrderCardProps {
  order: Order;
}

export function OrderCard({ order }: OrderCardProps) {
  return (
    <Link
      href={`/orders/${order.id}`}
      className="block rounded-lg border p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm font-bold text-gray-900">
          {order.orderCode}
        </span>
        <span className="text-sm text-gray-500">
          {formatDate(order.createdAt)}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex gap-2">
          <Badge variant={order.paymentStatus}>{order.paymentStatus}</Badge>
          <Badge variant={order.orderStatus}>{order.orderStatus}</Badge>
        </div>
        <span className="font-medium text-amber-700">
          {formatPrice(order.totalAmount)}
        </span>
      </div>
      <p className="mt-2 text-sm text-gray-500">
        {order.items.length} item{order.items.length > 1 ? "s" : ""}
      </p>
    </Link>
  );
}
