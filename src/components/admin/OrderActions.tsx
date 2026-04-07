"use client";

import { Button } from "@/components/ui/Button";
import type { Order, OrderStatus, PaymentStatus } from "@/lib/types";

interface OrderActionsProps {
  order: Order;
  onUpdatePayment: (orderId: string, status: PaymentStatus) => Promise<void>;
  onUpdateStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  onCancel: (orderId: string) => Promise<void>;
}

export function OrderActions({
  order,
  onUpdatePayment,
  onUpdateStatus,
  onCancel,
}: OrderActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {order.paymentStatus === "pending" && (
        <Button size="sm" onClick={() => onUpdatePayment(order.id, "paid")}>
          Confirm Payment
        </Button>
      )}
      {order.orderStatus === "confirmed" && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onUpdateStatus(order.id, "shipping")}
        >
          Mark Shipping
        </Button>
      )}
      {order.orderStatus === "shipping" && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onUpdateStatus(order.id, "delivered")}
        >
          Mark Delivered
        </Button>
      )}
      {order.orderStatus !== "cancelled" &&
        order.orderStatus !== "delivered" && (
          <Button
            size="sm"
            variant="danger"
            onClick={() => onCancel(order.id)}
          >
            Cancel
          </Button>
        )}
    </div>
  );
}
