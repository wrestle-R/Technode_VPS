import type { ChartTab } from "@/components/customer/ems/types"

const chartTabs: Array<{ key: ChartTab; label: string }> = [
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
              ? "rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-xs font-semibold tracking-[0.16em] text-white uppercase"
              : "rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase"
          }
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
