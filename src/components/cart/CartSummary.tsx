import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

interface CartSummaryProps {
  subtotal: number;
  itemCount: number;
}

export function CartSummary({ subtotal, itemCount }: CartSummaryProps) {
  return (
    <div className="rounded-lg border bg-gray-50 p-6">
      <h2 className="text-lg font-medium text-gray-900">Order Summary</h2>
      <div className="mt-4 flex justify-between text-sm">
        <span className="text-gray-600">Subtotal ({itemCount} items)</span>
        <span className="font-medium">{formatPrice(subtotal)}</span>
      </div>
      <div className="mt-4 border-t pt-4">
        <div className="flex justify-between text-base font-medium">
          <span>Total</span>
          <span className="text-amber-700">{formatPrice(subtotal)}</span>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Shipping calculated after checkout
        </p>
      </div>
      <Link href="/checkout">
        <Button className="mt-4 w-full" size="lg" disabled={itemCount === 0}>
          Proceed to Checkout
        </Button>
      </Link>
    </div>
  );
}
