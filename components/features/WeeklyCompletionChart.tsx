"use client";
// Client component: Recharts renders through DOM measurement and drives the
// hover tooltip layer, neither of which a Server Component can do.

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { WeeklyRate } from "@/lib/completion";
import { shortDateLabel } from "@/lib/date";

type ChartDatum = WeeklyRate & { label: string };

type RateTooltipPayload = {
  active?: boolean;
  payload?: Array<{ payload: ChartDatum }>;
};

/** Formats a 0..1 rate as a whole percent string. */
function percent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

/** Hover tooltip: week range, completion percent, and the raw counts behind it. */
function RateTooltip(props: unknown) {
  const { active, payload } = props as RateTooltipPayload;
  const datum = payload?.[0]?.payload;
  if (!active || !datum) {
    return null;
  }
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <p className="font-medium">
        {shortDateLabel(datum.weekStart)} – {shortDateLabel(datum.weekEnd)}
      </p>
      <p className="mt-0.5 text-zinc-500 dark:text-zinc-400">
        {percent(datum.rate)} · {datum.checkIns}/{datum.possible} check-ins
      </p>
    </div>
  );
}

/**
 * Bar chart of weekly completion rates (last N weeks). Colors come from the
 * chart tokens in globals.css; an sr-only table mirrors the data for assistive
 * technology.
 */
export function WeeklyCompletionChart({ data }: { data: WeeklyRate[] }) {
  const chartData: ChartDatum[] = data.map((week) => ({
    ...week,
    label: shortDateLabel(week.weekStart),
  }));

  return (
    <div>
      <div className="h-64" aria-label={`Weekly completion rate, last ${data.length} weeks`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            barCategoryGap="25%"
          >
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="label"
              interval={0}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--chart-muted-text)", fontSize: 12 }}
              dy={4}
            />
            <YAxis
              domain={[0, 1]}
              ticks={[0, 0.5, 1]}
              tickFormatter={percent}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--chart-muted-text)", fontSize: 12 }}
              width={40}
            />
            <Tooltip
              cursor={{ fill: "var(--chart-grid)", fillOpacity: 0.4 }}
              content={RateTooltip}
            />
            <Bar dataKey="rate" fill="var(--chart-accent)" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Weekly completion rate, last {data.length} weeks</caption>
        <thead>
          <tr>
            <th scope="col">Week</th>
            <th scope="col">Completion</th>
            <th scope="col">Check-ins</th>
          </tr>
        </thead>
        <tbody>
          {data.map((week) => (
            <tr
              key={week.weekStart}
              data-week={week.weekStart}
              data-rate={Math.round(week.rate * 100)}
              data-checkins={week.checkIns}
              data-possible={week.possible}
            >
              <td>
                {shortDateLabel(week.weekStart)} – {shortDateLabel(week.weekEnd)}
              </td>
              <td>{percent(week.rate)}</td>
              <td>
                {week.checkIns} of {week.possible}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
