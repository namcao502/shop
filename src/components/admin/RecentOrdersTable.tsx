import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { formatPrice, formatDate } from "@/lib/format";
import type { Order } from "@/lib/types";

interface RecentOrdersTableProps {
  orders: Order[];
}

export function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  return (
    <div className="rounded-lg border bg-white">
      <div className="border-b px-4 py-3">
        <h3 className="font-medium text-gray-900">Recent Orders</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase text-gray-500">
            <th className="px-4 py-2">Order</th>
            <th className="px-4 py-2">Amount</th>
            <th className="px-4 py-2">Payment</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Date</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b last:border-0">
              <td className="px-4 py-2">
                <Link
                  href={`/admin/orders?highlight=${order.id}`}
                  className="font-mono font-medium text-amber-700 hover:underline"
                >
                  {order.orderCode}
                </Link>
              </td>
              <td className="px-4 py-2">{formatPrice(order.totalAmount)}</td>
              <td className="px-4 py-2">
                <Badge variant={order.paymentStatus}>
                  {order.paymentStatus}
                </Badge>
              </td>
              <td className="px-4 py-2">
                <Badge variant={order.orderStatus}>
                  {order.orderStatus}
                </Badge>
              </td>
              <td className="px-4 py-2 text-gray-500">
                {formatDate(order.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
