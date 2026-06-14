"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Sales-over-time area chart for the admin dashboard.
 * `data` totals are expressed in dollars (not cents).
 */
export function SalesChart({ data }: { data: { date: string; total: number }[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(142 50% 40%)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="hsl(142 50% 40%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            minTickGap={16}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(v: number) => `$${v}`}
          />
          <Tooltip
            formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
            labelClassName="text-xs"
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="hsl(142 50% 40%)"
            strokeWidth={2}
            fill="url(#salesGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
