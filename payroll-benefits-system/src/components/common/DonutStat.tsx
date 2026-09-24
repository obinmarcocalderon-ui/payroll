import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
  valueLabel?: string;
}

interface DonutStatProps {
  data: DonutSlice[];
  centerValue: string;
  centerLabel: string;
}

export function DonutStat({ data, centerValue, centerLabel }: DonutStatProps) {
  const hasData = data.some((d) => d.value > 0);

  return (
    <div className="flex items-center gap-6">
      <div className="relative h-40 w-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={hasData ? data : [{ label: 'empty', value: 1, color: '#e7eaf3' }]}
              dataKey="value"
              nameKey="label"
              innerRadius={52}
              outerRadius={72}
              paddingAngle={hasData ? 2 : 0}
              stroke="none"
            >
              {(hasData ? data : [{ label: 'empty', value: 1, color: '#e7eaf3' }]).map((slice, i) => (
                <Cell key={i} fill={slice.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-xl font-bold text-ink-900">{centerValue}</p>
          <p className="text-[11px] text-ink-500">{centerLabel}</p>
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-2.5">
        {data.map((slice) => (
          <li key={slice.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
              <span className="truncate text-ink-500">{slice.label}</span>
            </span>
            <span className="shrink-0 font-semibold text-ink-900">{slice.valueLabel ?? slice.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
