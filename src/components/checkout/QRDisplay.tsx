import { formatPrice } from "@/lib/format";

interface QRDisplayProps {
  qrUrl: string;
  orderCode: string;
  amount: number;
}

export function QRDisplay({ qrUrl, orderCode, amount }: QRDisplayProps) {
  return (
    <div className="rounded-lg border bg-white p-6 text-center">
      <h3 className="text-lg font-medium text-gray-900">
        Scan to Pay
      </h3>
      <p className="mt-1 text-sm text-gray-500">
        Transfer note: <span className="font-mono font-bold">{orderCode}</span>
      </p>
      <p className="text-sm text-gray-500">
        Amount: <span className="font-bold text-amber-700">{formatPrice(amount)}</span>
      </p>
      <div className="mx-auto mt-4 w-64">
        <img src={qrUrl} alt="Payment QR Code" className="w-full" />
      </div>
      <p className="mt-4 text-sm text-gray-500">
        After payment, your order will be confirmed by the seller.
      </p>
    </div>
  );
}
