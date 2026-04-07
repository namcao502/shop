"use client";

import type { PaymentMethod } from "@/lib/types";

interface PaymentSelectorProps {
  selected: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
}

export function PaymentSelector({
  selected,
  onSelect,
}: PaymentSelectorProps) {
  const options: { value: PaymentMethod; label: string; desc: string }[] = [
    {
      value: "vietqr",
      label: "Bank Transfer (VietQR)",
      desc: "Scan QR code with your banking app to pay",
    },
    {
      value: "momo",
      label: "MoMo",
      desc: "Redirect to MoMo to complete payment",
    },
  ];

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-medium text-gray-900">Payment Method</h2>
      {options.map((opt) => (
        <label
          key={opt.value}
          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
            selected === opt.value
              ? "border-amber-600 bg-amber-50"
              : "border-gray-200 hover:bg-gray-50"
          }`}
        >
          <input
            type="radio"
            name="paymentMethod"
            value={opt.value}
            checked={selected === opt.value}
            onChange={() => onSelect(opt.value)}
            className="mt-0.5 accent-amber-600"
          />
          <div>
            <p className="font-medium text-gray-900">{opt.label}</p>
            <p className="text-sm text-gray-500">{opt.desc}</p>
          </div>
        </label>
      ))}
    </div>
  );
}
