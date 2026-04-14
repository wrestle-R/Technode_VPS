import { format } from "date-fns"

import { getCustomerSessionFromCookies } from "@/lib/auth"
import {
  countCustomerEmsRawRows,
  streamCustomerRawRows,
} from "@/lib/ems/queries"

const encoder = new TextEncoder()

function csvEscape(value: string) {
  if (value.includes('"') || value.includes(",") || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`
  }
  return value
}

function csvLine(values: string[]) {
  return `${values.map(csvEscape).join(",")}\n`
}

function fixed(value: number | null, digits: number) {
  return value == null ? "" : value.toFixed(digits)
}

function parseTimestamp(value: string) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatTimestampLabel(value: string) {
  const parsed = parseTimestamp(value)
  if (!parsed) {
    return value
  }

  return format(parsed, "yyyy-MM-dd HH:mm:ss")
}

function sanitizeFileSegment(value: string) {
  const sanitized = value.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "")
  return sanitized || "device"
}

function parseDateAtStart(raw: string | null) {
  if (!raw) {
    return undefined
  }

  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) {
    return undefined
  }

  date.setHours(0, 0, 0, 0)
  return date
}

function parseDateAtEnd(raw: string | null) {
  if (!raw) {
    return undefined
  }

  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) {
    return undefined
  }

  date.setHours(23, 59, 59, 999)
  return date
}

function parseWindowDates(raw: string | null) {
  if (!raw) {
    return { startAt: undefined, endAt: undefined }
  }

  const now = new Date()
  if (raw === "24h") {
    return {
      startAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      endAt: now,
    }
  }

  if (raw === "7d") {
    return {
      startAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      endAt: now,
    }
  }

  if (raw === "30d") {
    return {
      startAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      endAt: now,
    }
  }

  return { startAt: undefined, endAt: undefined }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ unitId: string }> }
) {
  const session = await getCustomerSessionFromCookies()
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { unitId } = await params
  const url = new URL(request.url)
  const rtuKey = url.searchParams.get("rtuKey")?.trim()

  if (!rtuKey) {
    return Response.json({ error: "Missing rtuKey" }, { status: 400 })
  }

  const reportRange = url.searchParams.get("reportRange")
  const parsedRange = parseWindowDates(reportRange)
  const startAt = parseDateAtStart(url.searchParams.get("startDate")) ?? parsedRange.startAt
  const endAt = parseDateAtEnd(url.searchParams.get("endDate")) ?? parsedRange.endAt
  const dateRangeLabel =
    url.searchParams.get("dateRangeLabel")?.trim() ||
    (startAt && endAt
      ? `${format(startAt, "dd MMM yyyy")} - ${format(endAt, "dd MMM yyyy")}`
      : "Selected range")
  const generatedAt = new Date()

  const rowCount = await countCustomerEmsRawRows({
    customerId: session.customerId,
    unitId,
    rtuKey,
    startAt,
    endAt,
  })

  if (rowCount == null) {
    return Response.json({ error: "Unit not found." }, { status: 404 })
  }

  const filename = `EMS_Raw_Data_${sanitizeFileSegment(unitId)}_${format(
    generatedAt,
    "yyyy-MM-dd"
  )}.csv`

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(csvLine(["EMS Raw Data Report"])))
      controller.enqueue(encoder.encode(csvLine([`Device: ${unitId}`])))
      controller.enqueue(
        encoder.encode(csvLine([`Customer: ${session.companyName || "Technode"}`]))
      )
      controller.enqueue(encoder.encode(csvLine([`Date Range: ${dateRangeLabel}`])))
      controller.enqueue(
        encoder.encode(csvLine([`Total Records Exported: ${String(rowCount)}`]))
      )
      controller.enqueue(
        encoder.encode(csvLine([`Generated: ${format(generatedAt, "yyyy-MM-dd HH:mm:ss")}`]))
      )
      controller.enqueue(encoder.encode("\n"))
      controller.enqueue(
        encoder.encode(
          csvLine([
            "Timestamp",
            "kWh",
            "kVAh",
            "kVArh",
            "Voltage_RN",
            "Voltage_YN",
            "Voltage_BN",
            "Voltage_RY",
            "Voltage_YB",
            "Voltage_BR",
            "Current_R",
            "Current_Y",
            "Current_B",
            "kW_R",
            "kW_Y",
            "kW_B",
            "PF_R",
            "PF_Y",
            "PF_B",
            "Frequency",
          ])
        )
      )

      try {
        for await (const row of streamCustomerRawRows({
          customerId: session.customerId,
          unitId,
          rtuKey,
          startAt,
          endAt,
        })) {
          controller.enqueue(
            encoder.encode(
              csvLine([
                formatTimestampLabel(row.timestamp),
                fixed(row.kwh, 2),
                fixed(row.kvah, 2),
                fixed(row.kvarh, 2),
                fixed(row.voltageRn, 1),
                fixed(row.voltageYn, 1),
                fixed(row.voltageBn, 1),
                fixed(row.voltageRy, 1),
                fixed(row.voltageYb, 1),
                fixed(row.voltageBr, 1),
                fixed(row.currentR, 2),
                fixed(row.currentY, 2),
                fixed(row.currentB, 2),
                fixed(row.kwR, 2),
                fixed(row.kwY, 2),
                fixed(row.kwB, 2),
                fixed(row.pfR, 3),
                fixed(row.pfY, 3),
                fixed(row.pfB, 3),
                fixed(row.frequency, 2),
              ])
            )
          )
        }

        controller.close()
      } catch (error) {
        controller.error(error)
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
