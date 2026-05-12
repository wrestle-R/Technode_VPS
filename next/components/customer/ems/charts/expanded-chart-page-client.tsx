"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { buildTrendRows, phaseColors } from "@/components/customer/ems/helpers"
import {
  buildAmperagePoints,
  buildDashboardPoints,
  buildEnergyPoints,
  buildVoltagePoints,
} from "@/components/customer/ems/charts/dashboard-chart-data"
import type {
  CustomerUnitDetail,
  DashboardChartPanel,
  EnergyAnalytics,
  HourlyCurrentStats,
  HourlyVoltageStats,
  UnitLog,
} from "@/components/customer/ems/types"

const axisTick = { fontSize: 11, fill: "#6b7280" }
const gridStroke = "#d1d5db"
const REFRESH_INTERVAL_MS = 30_000

type UnitApiResponse = { unit?: CustomerUnitDetail }

function mapLogsForMeter(logs: UnitLog[], meterKey: string) {
  return logs
    .map((log) => {
      const meter = log.meters.find((entry) => entry.meterKey === meterKey)
      if (!meter) {
        return null
      }
      return {
        id: log.id,
        deviceTimestamp: log.deviceTimestamp,
        metrics: meter.metrics,
      }
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
}

function trimRows<T>(rows: T[], size: number) {
  return rows.slice(-size)
}

export function ExpandedChartPageClient({
  initialUnit,
  initialPanel,
  initialMeter,
}: {
  initialUnit: CustomerUnitDetail
  initialPanel: DashboardChartPanel
  initialMeter: string | null
}) {
  const [unit, setUnit] = useState(initialUnit)
  const [windowSize] = useState(48)
  const [hourlyCurrent, setHourlyCurrent] = useState<HourlyCurrentStats>({
    points: [],
    computedAt: new Date(0).toISOString(),
  })
  const [hourlyVoltage, setHourlyVoltage] = useState<HourlyVoltageStats>({
    points: [],
    computedAt: new Date(0).toISOString(),
  })
  const [energyAnalytics, setEnergyAnalytics] =
    useState<EnergyAnalytics | null>(null)

  const availableMeters = useMemo(() => {
    const map = new Map<string, { meterKey: string; name: string }>()
    for (const meter of unit.latestMeters) {
      map.set(meter.meterKey, { meterKey: meter.meterKey, name: meter.name })
    }
    for (const log of unit.logs) {
      for (const meter of log.meters) {
        if (!map.has(meter.meterKey)) {
          map.set(meter.meterKey, {
            meterKey: meter.meterKey,
            name: meter.name,
          })
        }
      }
    }
    return Array.from(map.values())
  }, [unit])

  const selectedMeterKey = useMemo(() => {
    if (
      initialMeter &&
      availableMeters.some((meter) => meter.meterKey === initialMeter)
    ) {
      return initialMeter
    }
    return availableMeters[0]?.meterKey ?? ""
  }, [availableMeters, initialMeter])

  const refreshAll = useCallback(async () => {
    if (!selectedMeterKey) {
      return
    }

    const unitPromise = fetch(`/api/customer/ems/${encodeURIComponent(unit.unitId)}`, {
      cache: "no-store",
    })
    const currentPromise = fetch(
      `/api/customer/ems/${encodeURIComponent(unit.unitId)}/current-hourly?meterKey=${encodeURIComponent(selectedMeterKey)}`,
      { cache: "no-store" }
    )
    const voltagePromise = fetch(
      `/api/customer/ems/${encodeURIComponent(unit.unitId)}/voltage-hourly?meterKey=${encodeURIComponent(selectedMeterKey)}`,
      { cache: "no-store" }
    )
    const analyticsPromise = fetch(
      `/api/customer/ems/${encodeURIComponent(unit.unitId)}/energy-analytics?meterKey=${encodeURIComponent(selectedMeterKey)}&dailyRange=7d`,
      { cache: "no-store" }
    )

    const [unitResult, currentResult, voltageResult, analyticsResult] =
      await Promise.allSettled([
        unitPromise,
        currentPromise,
        voltagePromise,
        analyticsPromise,
      ])

    if (unitResult.status === "fulfilled" && unitResult.value.ok) {
      const payload = (await unitResult.value.json()) as UnitApiResponse
      if (payload.unit) {
        setUnit(payload.unit)
      }
    }

    if (currentResult.status === "fulfilled" && currentResult.value.ok) {
      const payload = (await currentResult.value.json()) as {
        hourly?: HourlyCurrentStats
      }
      if (payload.hourly) {
        setHourlyCurrent(payload.hourly)
      }
    }

    if (voltageResult.status === "fulfilled" && voltageResult.value.ok) {
      const payload = (await voltageResult.value.json()) as {
        hourly?: HourlyVoltageStats
      }
      if (payload.hourly) {
        setHourlyVoltage(payload.hourly)
      }
    }

    if (analyticsResult.status === "fulfilled" && analyticsResult.value.ok) {
      const payload = (await analyticsResult.value.json()) as {
        analytics?: EnergyAnalytics
      }
      if (payload.analytics) {
        setEnergyAnalytics(payload.analytics)
      }
    }
  }, [selectedMeterKey, unit.unitId])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refreshAll()
    }, 0)
    return () => {
      window.clearTimeout(timeout)
    }
  }, [refreshAll])

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshAll()
    }, REFRESH_INTERVAL_MS)
    return () => {
      window.clearInterval(interval)
    }
  }, [refreshAll])

  const selectedLogRows = useMemo(
    () => mapLogsForMeter(unit.logs, selectedMeterKey),
    [selectedMeterKey, unit.logs]
  )
  const trendRows = useMemo(
    () => buildTrendRows(selectedLogRows),
    [selectedLogRows]
  )
  const voltagePoints = useMemo(
    () =>
      trimRows(buildVoltagePoints(trendRows, hourlyVoltage.points), windowSize),
    [hourlyVoltage.points, trendRows, windowSize]
  )
  const frequencyPoints = useMemo(
    () => trimRows(buildDashboardPoints(trendRows), windowSize),
    [trendRows, windowSize]
  )
  const amperagePoints = useMemo(
    () =>
      trimRows(
        buildAmperagePoints(trendRows, hourlyCurrent.points),
        windowSize
      ),
    [hourlyCurrent.points, trendRows, windowSize]
  )
  const energyPoints = useMemo(
    () => trimRows(buildEnergyPoints(energyAnalytics, trendRows), windowSize),
    [energyAnalytics, trendRows, windowSize]
  )

  const panel = initialPanel

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="h-[78vh] min-h-[30rem] min-w-0">
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={220}
          >
            {panel === "voltage" ? (
              <LineChart
                data={voltagePoints}
                margin={{ top: 12, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke={gridStroke} strokeOpacity={0.7} />
                <XAxis dataKey="label" tick={axisTick} minTickGap={16} />
                <YAxis
                  tick={axisTick}
                  width={54}
                  tickFormatter={(value) => `${value} V`}
                />
                <Tooltip />
                <ReferenceLine y={235} stroke="#f1c40f" strokeWidth={2} />
                <ReferenceLine y={205} stroke="#f1c40f" strokeWidth={2} />
                <ReferenceLine y={200} stroke="#ef4444" strokeWidth={2} />
                <Line
                  type="monotone"
                  dataKey="voltage"
                  name="Voltage"
                  dot={false}
                  stroke={phaseColors.green}
                  strokeWidth={2}
                />
                <Brush dataKey="label" height={24} travellerWidth={8} />
              </LineChart>
            ) : null}

            {panel === "frequency" ? (
              <LineChart
                data={frequencyPoints}
                margin={{ top: 12, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke={gridStroke} strokeOpacity={0.7} />
                <XAxis dataKey="label" tick={axisTick} minTickGap={16} />
                <YAxis
                  tick={axisTick}
                  width={56}
                  domain={["dataMin - 0.2", "dataMax + 0.2"]}
                  tickFormatter={(value) => `${value} Hz`}
                />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="frequency"
                  name="Frequency"
                  stroke="#16864a"
                  strokeWidth={2}
                  dot={false}
                />
                <Brush dataKey="label" height={24} travellerWidth={8} />
              </LineChart>
            ) : null}

            {panel === "amperage" ? (
              <AreaChart
                data={amperagePoints}
                margin={{ top: 12, right: 20, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="expanded-amperage-fill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.5} />
                    <stop
                      offset="100%"
                      stopColor="#f97316"
                      stopOpacity={0.08}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={gridStroke} strokeOpacity={0.7} />
                <XAxis dataKey="label" tick={axisTick} minTickGap={16} />
                <YAxis
                  tick={axisTick}
                  width={54}
                  tickFormatter={(value) => `${value} A`}
                />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="amperage"
                  name="Amperage"
                  stroke="#f97316"
                  fill="url(#expanded-amperage-fill)"
                  strokeWidth={2}
                />
                <Brush dataKey="label" height={24} travellerWidth={8} />
              </AreaChart>
            ) : null}

            {panel === "energy" ? (
              <BarChart
                data={energyPoints}
                margin={{ top: 12, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke={gridStroke} strokeOpacity={0.7} />
                <XAxis dataKey="label" tick={axisTick} minTickGap={16} />
                <YAxis
                  tick={axisTick}
                  width={56}
                  tickFormatter={(value) => `${value} kWh`}
                />
                <Tooltip />
                <Bar
                  dataKey="consumption"
                  name="Energy"
                  fill="#3498db"
                  radius={[2, 2, 0, 0]}
                />
                <Brush dataKey="label" height={24} travellerWidth={8} />
              </BarChart>
            ) : null}
          </ResponsiveContainer>
      </div>
    </div>
  )
}
