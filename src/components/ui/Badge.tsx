interface BadgeProps {
  variant: "pending" | "paid" | "failed" | "confirmed" | "shipping" | "delivered" | "cancelled";
  children: React.ReactNode;
}

const variantStyles: Record<BadgeProps["variant"], string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
  paid: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
  shipping: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
};

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantStyles[variant]}`}
    >
      {children}
    </span>
  );
}
