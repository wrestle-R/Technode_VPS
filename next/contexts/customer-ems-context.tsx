"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { toast } from "sonner"

import type {
  CustomerUnitDetail,
  CustomerUnitSummary,
} from "@/components/customer/ems/types"

type RefreshOptions = {
  silent?: boolean
}

type CustomerEmsContextType = {
  units: CustomerUnitSummary[]
  activeUnit: CustomerUnitDetail | null
  isUnitsLoading: boolean
  isUnitsRefreshing: boolean
  isActiveUnitRefreshing: boolean
  setActiveUnit: (unit: CustomerUnitDetail) => void
  refreshUnits: (options?: RefreshOptions) => Promise<CustomerUnitSummary[] | null>
  refreshActiveUnit: (
    unitId: string,
    options?: RefreshOptions
  ) => Promise<CustomerUnitDetail | null>
  refreshCurrentUnit: (
    unitId: string,
    options?: RefreshOptions
  ) => Promise<CustomerUnitDetail | null>
}

const CustomerEmsContext = createContext<CustomerEmsContextType | undefined>(
  undefined
)

function toTimestamp(value: string | null | undefined) {
  if (!value) {
    return Number.NEGATIVE_INFINITY
  }

  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY
}

function latestLogTimestamp(unit: CustomerUnitDetail | null | undefined) {
  return toTimestamp(unit?.logs[0]?.deviceTimestamp ?? unit?.lastSeenAt ?? null)
}

function summarizeUnit(unit: CustomerUnitDetail): CustomerUnitSummary {
  return {
    id: unit.id,
    unitId: unit.unitId,
    status: unit.status,
    locationLabel: unit.locationLabel,
    latitude: unit.latitude,
    longitude: unit.longitude,
    deviceType: unit.deviceType,
    lastSeenAt: unit.lastSeenAt,
    slaveCount: unit.latestRtus.length,
  }
}

function mergeUnitSummary(
  current: CustomerUnitSummary | undefined,
  next: CustomerUnitSummary
) {
  if (!current) {
    return next
  }

  return toTimestamp(next.lastSeenAt) >= toTimestamp(current.lastSeenAt)
    ? next
    : current
}

function mergeUnitDetail(
  current: CustomerUnitDetail | null,
  next: CustomerUnitDetail
) {
  if (!current || current.unitId !== next.unitId) {
    return next
  }

  return latestLogTimestamp(next) >= latestLogTimestamp(current) ? next : current
}

export function CustomerEmsProvider({
  children,
  initialUnits,
}: {
  children: ReactNode
  initialUnits: CustomerUnitSummary[]
}) {
  const [units, setUnits] = useState(initialUnits)
  const [activeUnit, setActiveUnitState] = useState<CustomerUnitDetail | null>(
    null
  )
  const [isUnitsLoading, setIsUnitsLoading] = useState(false)
  const [isUnitsRefreshing, setIsUnitsRefreshing] = useState(false)
  const [isActiveUnitRefreshing, setIsActiveUnitRefreshing] = useState(false)
  const [hasUnitsRefreshError, setHasUnitsRefreshError] = useState(false)
  const [hasActiveUnitRefreshError, setHasActiveUnitRefreshError] = useState(false)

  const syncSummaryFromDetail = useCallback((detail: CustomerUnitDetail) => {
    const nextSummary = summarizeUnit(detail)
    setUnits((current) => {
      const existingIndex = current.findIndex((unit) => unit.unitId === detail.unitId)
      if (existingIndex === -1) {
        return [nextSummary, ...current]
      }

      const nextUnits = current.slice()
      nextUnits[existingIndex] = mergeUnitSummary(current[existingIndex], nextSummary)
      return nextUnits
    })
  }, [])

  const setActiveUnit = useCallback(
    (unit: CustomerUnitDetail) => {
      setActiveUnitState((current) => mergeUnitDetail(current, unit))
      syncSummaryFromDetail(unit)
    },
    [syncSummaryFromDetail]
  )

  const refreshUnits = useCallback(
    async ({ silent = false }: RefreshOptions = {}) => {
      setIsUnitsRefreshing(true)

      try {
        const response = await fetch("/api/customer/ems", { cache: "no-store" })
        if (!response.ok) {
          if (!silent && !hasUnitsRefreshError) {
            setHasUnitsRefreshError(true)
            toast.error("Unable to refresh devices right now")
          }
          return null
        }

        const data = (await response.json()) as {
          units?: CustomerUnitSummary[]
        }
        const nextUnits = data.units ?? []

        setUnits((current) => {
          const byUnitId = new Map(current.map((unit) => [unit.unitId, unit]))
          for (const unit of nextUnits) {
            byUnitId.set(unit.unitId, mergeUnitSummary(byUnitId.get(unit.unitId), unit))
          }
          return nextUnits.map((unit) => byUnitId.get(unit.unitId) ?? unit)
        })

        if (!silent && hasUnitsRefreshError) {
          setHasUnitsRefreshError(false)
          toast.success("Device list reconnected")
        }

        return nextUnits
      } catch {
        if (!silent && !hasUnitsRefreshError) {
          setHasUnitsRefreshError(true)
          toast.error("Unable to refresh devices right now")
        }
        return null
      } finally {
        setIsUnitsLoading(false)
        setIsUnitsRefreshing(false)
      }
    },
    [hasUnitsRefreshError]
  )

  const refreshActiveUnit = useCallback(
    async (unitId: string, { silent = false }: RefreshOptions = {}) => {
      setIsActiveUnitRefreshing(true)

      try {
        const response = await fetch(
          `/api/customer/ems/${encodeURIComponent(unitId)}`,
          {
            cache: "no-store",
          }
        )

        if (!response.ok) {
          if (!silent && !hasActiveUnitRefreshError) {
            setHasActiveUnitRefreshError(true)
            toast.error("Unable to refresh unit data")
          }
          return null
        }

        const data = (await response.json()) as { unit?: CustomerUnitDetail }
        if (!data.unit) {
          return null
        }

        setActiveUnitState((current) => mergeUnitDetail(current, data.unit!))
        syncSummaryFromDetail(data.unit)

        if (!silent && hasActiveUnitRefreshError) {
          setHasActiveUnitRefreshError(false)
          toast.success("Unit data reconnected")
        }

        return data.unit
      } catch {
        if (!silent && !hasActiveUnitRefreshError) {
          setHasActiveUnitRefreshError(true)
          toast.error("Unable to refresh unit data")
        }
        return null
      } finally {
        setIsActiveUnitRefreshing(false)
      }
    },
    [hasActiveUnitRefreshError, syncSummaryFromDetail]
  )

  const refreshCurrentUnit = useCallback(
    async (unitId: string, options?: RefreshOptions) => {
      const [, detail] = await Promise.all([
        refreshUnits(options),
        refreshActiveUnit(unitId, options),
      ])

      return detail
    },
    [refreshActiveUnit, refreshUnits]
  )

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshUnits({ silent: false })
    }, 20_000)

    return () => {
      window.clearInterval(interval)
    }
  }, [refreshUnits])

  const value = useMemo(
    () => ({
      units,
      activeUnit,
      isUnitsLoading,
      isUnitsRefreshing,
      isActiveUnitRefreshing,
      setActiveUnit,
      refreshUnits,
      refreshActiveUnit,
      refreshCurrentUnit,
    }),
    [
      activeUnit,
      isActiveUnitRefreshing,
      isUnitsLoading,
      isUnitsRefreshing,
      refreshActiveUnit,
      refreshCurrentUnit,
      refreshUnits,
      setActiveUnit,
      units,
    ]
  )

  return (
    <CustomerEmsContext.Provider value={value}>
      {children}
    </CustomerEmsContext.Provider>
  )
}

export function useCustomerEms() {
  const context = useContext(CustomerEmsContext)
  if (!context) {
    throw new Error("useCustomerEms must be used within CustomerEmsProvider")
  }
  
  return context
}

export function useOptionalCustomerEms() {
  return useContext(CustomerEmsContext)
}
