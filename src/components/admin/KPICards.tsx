interface KPI {
  label: string;
  value: string;
  sub?: string;
}

interface KPICardsProps {
  kpis: KPI[];
}

export function KPICards({ kpis }: KPICardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="rounded-lg border bg-white p-4">
          <p className="text-xs uppercase text-gray-500">{kpi.label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{kpi.value}</p>
          {kpi.sub && (
            <p className="mt-0.5 text-sm text-gray-500">{kpi.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}
