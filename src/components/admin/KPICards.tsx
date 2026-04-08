type KPIAccent = "primary" | "warning" | "neutral";

interface KPI {
  label: string;
  value: string;
  sub?: string;
  accent?: KPIAccent;
}

interface KPICardsProps {
  kpis: KPI[];
}

const accentBorder: Record<KPIAccent, string> = {
  primary: "border-t-2 border-amber-500",
  warning: "border-t-2 border-amber-300",
  neutral: "border-t-2 border-stone-200",
};

const valueColour: Record<KPIAccent, string> = {
  primary: "text-stone-900",
  warning: "text-amber-600",
  neutral: "text-stone-900",
};

export function KPICards({ kpis }: KPICardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {kpis.map((kpi) => {
        const accent: KPIAccent = kpi.accent ?? "neutral";
        return (
          <div
            key={kpi.label}
            className={`rounded-xl bg-white p-4 shadow-sm ${accentBorder[accent]}`}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
              {kpi.label}
            </p>
            <p className={`mt-1 text-2xl font-extrabold tracking-tight ${valueColour[accent]}`}>
              {kpi.value}
            </p>
            {kpi.sub && (
              <p className="mt-0.5 text-xs text-stone-400">{kpi.sub}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
