import type { AdminTrendPoint, AdminRevenuePoint } from "../../types/site";
import "./AdminDashboard.css";

type Series = {
  label: string;
  color: string;
  data: AdminTrendPoint[] | AdminRevenuePoint[];
  valueKey: "count" | "revenueCents";
};

function maxValue(series: Series[]) {
  let max = 1;
  for (const s of series) {
    for (const point of s.data) {
      const v = s.valueKey === "count" ? (point as AdminTrendPoint).count : (point as AdminRevenuePoint).revenueCents;
      if (v > max) max = v;
    }
  }
  return max;
}

function formatValue(value: number, key: "count" | "revenueCents") {
  if (key === "revenueCents") return `$${(value / 100).toFixed(0)}`;
  return String(value);
}

export function AdminTrendCharts({ series, height = 140 }: { series: Series[]; height?: number }) {
  const max = maxValue(series);
  const labels = series[0]?.data.map((p) => p.date.slice(5)) ?? [];

  return (
    <div className="admin-trend-charts">
      <div className="admin-trend-legend">
        {series.map((s) => (
          <span key={s.label} className="admin-trend-legend-item">
            <span className="admin-trend-swatch" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <div className="admin-trend-chart" style={{ height }}>
        {labels.map((label, i) => (
          <div key={`${series[0]?.data[i]?.date ?? label}-${i}`} className="admin-trend-column" title={series[0]?.data[i]?.date}>
            <div className="admin-trend-bars">
              {series.map((s) => {
                const point = s.data[i];
                const raw =
                  s.valueKey === "count"
                    ? (point as AdminTrendPoint | undefined)?.count ?? 0
                    : (point as AdminRevenuePoint | undefined)?.revenueCents ?? 0;
                const pct = Math.max(4, Math.round((raw / max) * 100));
                return (
                  <div
                    key={s.label}
                    className="admin-trend-bar"
                    style={{ height: `${pct}%`, background: s.color }}
                    title={`${s.label}: ${formatValue(raw, s.valueKey)}`}
                  />
                );
              })}
            </div>
            <span className="admin-trend-label">{i % 5 === 0 || i === labels.length - 1 ? label : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function formatMoney(cents: number) {
  if (cents === 0) return "$0";
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
