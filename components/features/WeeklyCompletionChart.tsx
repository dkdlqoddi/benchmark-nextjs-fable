import type { WeeklyRate } from "@/lib/completion";
import { shortDateLabel } from "@/lib/date";

/** Formats a 0..1 rate as a whole percent string. */
function percent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

/** Plain-language summary of one week, used as the bar's accessible name. */
function weekSummary(week: WeeklyRate): string {
  return `${shortDateLabel(week.weekStart)} to ${shortDateLabel(week.weekEnd)}: ${percent(
    week.rate,
  )}, ${week.checkIns} of ${week.possible} check-ins`;
}

/**
 * Bar chart of weekly completion rates (last N weeks), rendered entirely on
 * the server: plain HTML/CSS bars (no charting library, no client JS). Marks
 * use the validated chart tokens from globals.css; each week's column is a
 * keyboard-focusable hit area with a CSS-only tooltip (hover and focus), and
 * an sr-only table mirrors the data for assistive technology.
 */
export function WeeklyCompletionChart({ data }: { data: WeeklyRate[] }) {
  // Data-driven layout: one equal column per week (the count comes from data).
  const columns = { gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` };

  return (
    <div>
      <div className="flex gap-3">
        {/* y axis: recessive labels aligned to the 0/50/100% gridlines */}
        <div
          aria-hidden
          className="relative h-64 w-8 shrink-0 text-xs"
          style={{ color: "var(--chart-muted-text)" }}
        >
          <span className="absolute top-0 right-0 -translate-y-1/2 leading-none">100%</span>
          <span className="absolute top-1/2 right-0 -translate-y-1/2 leading-none">50%</span>
          <span className="absolute bottom-0 right-0 translate-y-1/2 leading-none">0%</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative h-64">
            {/* gridlines at 0 / 50 / 100% */}
            <div aria-hidden>
              <div
                className="absolute inset-x-0 top-0 h-px"
                style={{ backgroundColor: "var(--chart-grid)" }}
              />
              <div
                className="absolute inset-x-0 top-1/2 h-px"
                style={{ backgroundColor: "var(--chart-grid)" }}
              />
              <div
                className="absolute inset-x-0 bottom-0 h-px"
                style={{ backgroundColor: "var(--chart-grid)" }}
              />
            </div>
            <div className="absolute inset-0 grid" style={columns}>
              {data.map((week) => (
                <div
                  key={week.weekStart}
                  role="img"
                  aria-label={weekSummary(week)}
                  tabIndex={0}
                  className="group relative flex h-full flex-col justify-end rounded focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:outline-none"
                >
                  {/* the mark: ≤24px wide, 4px rounded data-end, square baseline */}
                  <div
                    aria-hidden
                    className="mx-auto w-full max-w-6 rounded-t transition-[filter] group-hover:brightness-110 group-focus-visible:brightness-110"
                    style={{
                      height: `${week.rate * 100}%`,
                      backgroundColor: "var(--chart-accent)",
                    }}
                  />
                  {/* CSS-only tooltip: value leads, label and counts follow */}
                  <div
                    aria-hidden
                    className="pointer-events-none invisible absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs whitespace-nowrap shadow-sm group-hover:visible group-focus-visible:visible dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <p className="font-medium">{percent(week.rate)}</p>
                    <p className="mt-0.5 text-zinc-500 dark:text-zinc-400">
                      {shortDateLabel(week.weekStart)} – {shortDateLabel(week.weekEnd)} ·{" "}
                      {week.checkIns}/{week.possible} check-ins
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* x labels: week-start dates in muted ink */}
          <div
            aria-hidden
            className="mt-2 grid text-center text-xs"
            style={{ ...columns, color: "var(--chart-muted-text)" }}
          >
            {data.map((week) => (
              <span key={week.weekStart} className="truncate">
                {shortDateLabel(week.weekStart)}
              </span>
            ))}
          </div>
        </div>
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
