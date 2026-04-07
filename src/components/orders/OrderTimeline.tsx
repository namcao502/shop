import type { OrderStatus } from "@/lib/types";

interface OrderTimelineProps {
  currentStatus: OrderStatus;
}

const steps: { status: OrderStatus; label: string }[] = [
  { status: "pending", label: "Order Placed" },
  { status: "confirmed", label: "Confirmed" },
  { status: "shipping", label: "Shipping" },
  { status: "delivered", label: "Delivered" },
];

export function OrderTimeline({ currentStatus }: OrderTimelineProps) {
  if (currentStatus === "cancelled") {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-center">
        <p className="font-medium text-red-700">Order Cancelled</p>
      </div>
    );
  }

  const currentIndex = steps.findIndex((s) => s.status === currentStatus);

  return (
    <div className="flex items-center justify-between">
      {steps.map((step, i) => {
        const isActive = i <= currentIndex;
        return (
          <div key={step.status} className="flex flex-1 items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  isActive
                    ? "bg-amber-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {i + 1}
              </div>
              <p
                className={`mt-1 text-xs ${
                  isActive ? "font-medium text-gray-900" : "text-gray-400"
                }`}
              >
                {step.label}
              </p>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`mx-2 h-0.5 flex-1 ${
                  i < currentIndex ? "bg-amber-600" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
