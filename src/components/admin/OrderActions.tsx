"use client";

import { Button } from "@/components/ui/Button";
import { useLocale } from "@/lib/i18n/locale-context";
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
  const { t } = useLocale();
  return (
    <div className="flex flex-wrap gap-2">
      {order.paymentStatus === "pending" && (
        <Button size="sm" onClick={() => onUpdatePayment(order.id, "paid")}>
          {t("admin.confirmPayment")}
        </Button>
      )}
      {order.orderStatus === "confirmed" && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onUpdateStatus(order.id, "shipping")}
        >
          {t("admin.markShipping")}
        </Button>
      )}
      {order.orderStatus === "shipping" && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onUpdateStatus(order.id, "delivered")}
        >
          {t("admin.markDelivered")}
        </Button>
      )}
      {order.orderStatus !== "cancelled" &&
        order.orderStatus !== "delivered" && (
          <Button
            size="sm"
            variant="danger"
            onClick={() => onCancel(order.id)}
          >
            {t("admin.cancel")}
          </Button>
        )}
    </div>
  );
}
