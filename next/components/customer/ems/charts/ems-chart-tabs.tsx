import type { ChartTab } from "@/components/customer/ems/types"

const chartTabs: Array<{ key: ChartTab; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "voltage", label: "Voltage" },
  { key: "current", label: "Current" },
  { key: "energy", label: "Energy" },
  { key: "diagnostic", label: "Diagnostic" },
]

export function EmsChartTabs({
  selectedChartTab,
  onChange,
}: {
  selectedChartTab: ChartTab
  onChange: (tab: ChartTab) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chartTabs.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          className={
            selectedChartTab === item.key
              ? "rounded-full bg-linear-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-semibold tracking-[0.16em] text-white uppercase shadow-[0_18px_30px_-20px_rgba(5,150,105,0.72)]"
              : "rounded-full border border-border bg-white/90 px-4 py-2 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase transition hover:bg-white"
          }
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
