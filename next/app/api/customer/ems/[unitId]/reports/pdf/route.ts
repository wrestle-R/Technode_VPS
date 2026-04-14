import { format } from "date-fns"
import { jsPDF } from "jspdf"

import {
  buildAnalyticalReportModel,
  buildConsumptionReportModel,
  buildRawReportModel,
  consumptionRangeLabel,
  reportDateRangeLabel,
  reportFileName,
  reportTypeTitle,
  selectReportRows,
} from "@/components/customer/ems/reports/report-export"
import type {
  ConsumptionRange,
  ReportRange,
  ReportType,
  TrendPoint,
} from "@/components/customer/ems/types"
import { getCustomerSessionFromCookies } from "@/lib/auth"
import { streamCustomerRawRows } from "@/lib/ems/queries"

export const runtime = "nodejs"

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

function parseReportType(raw: string | null): ReportType {
  if (raw === "analytical" || raw === "consumption") {
    return raw
  }
  return "raw"
}

function parseReportRange(raw: string | null): ReportRange {
  if (raw === "24h" || raw === "7d" || raw === "30d" || raw === "custom") {
    return raw
  }
  return "24h"
}

function parseConsumptionRange(raw: string | null): ConsumptionRange {
  if (raw === "daily" || raw === "weekly" || raw === "monthly") {
    return raw
  }
  return "daily"
}

function parseUnitPrice(raw: string | null) {
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function fixed(value: number | null, digits: number) {
  return value == null ? "-" : value.toFixed(digits)
}

async function collectTrendRows({
  customerId,
  unitId,
  rtuKey,
  startAt,
  endAt,
}: {
  customerId: number
  unitId: string
  rtuKey: string
  startAt?: Date
  endAt?: Date
}) {
  const rows: TrendPoint[] = []

  for await (const row of streamCustomerRawRows({
    customerId,
    unitId,
    rtuKey,
    startAt,
    endAt,
  })) {
    rows.push({
      timestamp: row.timestamp,
      label: format(new Date(row.timestamp), "HH:mm"),
      Kwh: row.kwh,
      KvAh: row.kvah,
      KvArh: row.kvarh,
      VRN: row.voltageRn,
      VYN: row.voltageYn,
      VBN: row.voltageBn,
      VRY: row.voltageRy,
      VYB: row.voltageYb,
      VBR: row.voltageBr,
      IR: row.currentR,
      IY: row.currentY,
      IB: row.currentB,
      ["KW-R"]: row.kwR,
      ["KW-Y"]: row.kwY,
      ["KW-B"]: row.kwB,
      ["PF-R"]: row.pfR,
      ["PF-Y"]: row.pfY,
      ["PF-B"]: row.pfB,
      Freq: row.frequency,
    })
  }

  return rows
}

function drawWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const lines = doc.splitTextToSize(text, maxWidth)
  doc.text(lines, x, y)
  return y + lines.length * lineHeight
}

function addFooter(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const pageCount = doc.getNumberOfPages()

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    doc.setFontSize(9)
    doc.setTextColor(107, 114, 128)
    doc.text("Technode EMS", 12, pageHeight - 8)
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - 30, pageHeight - 8)
  }
}

function drawSummaryTable(
  doc: jsPDF,
  entries: Array<[string, string]>,
  startY: number
) {
  const margin = 12
  const pageHeight = doc.internal.pageSize.getHeight()
  const leftWidth = 78
  const rowHeight = 8
  let y = startY

  doc.setFontSize(13)
  doc.setTextColor(17, 24, 39)
  doc.text("Summary Metrics", margin, y)
  y += 6

  for (const [label, value] of entries) {
    if (y + rowHeight > pageHeight - 16) {
      doc.addPage()
      y = 12
    }

    doc.setFillColor(243, 244, 246)
    doc.rect(margin, y - 5, leftWidth, rowHeight, "F")
    doc.rect(margin + leftWidth, y - 5, 80, rowHeight)
    doc.rect(margin, y - 5, leftWidth, rowHeight)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(17, 24, 39)
    doc.text(label, margin + 2, y)

    doc.setFont("helvetica", "normal")
    doc.text(value, margin + leftWidth + 2, y)
    y += rowHeight
  }

  return y + 4
}

function drawTable({
  doc,
  title,
  headers,
  rows,
  widths,
  startY,
  fontSize = 8,
}: {
  doc: jsPDF
  title: string
  headers: string[]
  rows: string[][]
  widths: number[]
  startY: number
  fontSize?: number
}) {
  const margin = 12
  const pageHeight = doc.internal.pageSize.getHeight()
  const rowPadding = 2.4
  let y = startY

  const drawHeader = () => {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(13)
    doc.setTextColor(17, 24, 39)
    doc.text(title, margin, y)
    y += 4

    doc.setFont("helvetica", "bold")
    doc.setFontSize(fontSize)

    let x = margin
    const headerHeight = 8
    for (let index = 0; index < headers.length; index += 1) {
      const width = widths[index] ?? 20
      doc.setFillColor(243, 244, 246)
      doc.rect(x, y, width, headerHeight, "F")
      doc.rect(x, y, width, headerHeight)
      doc.text(headers[index] ?? "", x + 1.5, y + 5)
      x += width
    }
    y += headerHeight
  }

  drawHeader()

  for (const row of rows) {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(fontSize)

    const cellLines = row.map((value, index) =>
      doc.splitTextToSize(value || "-", Math.max((widths[index] ?? 20) - 3, 4))
    )
    const lineCount = Math.max(...cellLines.map((lines) => lines.length), 1)
    const rowHeight = Math.max(6, lineCount * (fontSize * 0.5) + rowPadding * 2)

    if (y + rowHeight > pageHeight - 16) {
      doc.addPage()
      y = 12
      drawHeader()
    }

    let x = margin
    for (let index = 0; index < row.length; index += 1) {
      const width = widths[index] ?? 20
      doc.rect(x, y, width, rowHeight)
      doc.text(cellLines[index] ?? ["-"], x + 1.5, y + 4)
      x += width
    }
    y += rowHeight
  }

  return y + 4
}

function buildPdfBuffer({
  reportType,
  unitId,
  companyName,
  dateRangeLabel,
  generatedAt,
  rawReport,
  analyticalReport,
  consumptionReport,
  unitPrice,
}: {
  reportType: ReportType
  unitId: string
  companyName: string
  dateRangeLabel: string
  generatedAt: Date
  rawReport: ReturnType<typeof buildRawReportModel>
  analyticalReport: ReturnType<typeof buildAnalyticalReportModel>
  consumptionReport: ReturnType<typeof buildConsumptionReportModel>
  unitPrice: number
}) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true,
  })

  const margin = 12
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 16

  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.setTextColor(17, 24, 39)
  doc.text(reportTypeTitle(reportType), margin, y)

  y += 8
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(75, 85, 99)
  y = drawWrappedText(
    doc,
    `Device: ${unitId} | Customer: ${companyName || "Technode"} | Date Range: ${dateRangeLabel} | Generated: ${format(generatedAt, "yyyy-MM-dd HH:mm:ss")}`,
    margin,
    y,
    pageWidth - margin * 2,
    4.5
  )
  y += 3

  if (reportType === "raw") {
    y = drawSummaryTable(
      doc,
      [
        ["Total records in range", String(rawReport.rows.length)],
        ["Date range", dateRangeLabel],
        ["Unit ID", unitId],
        ["Avg Energy", `${fixed(rawReport.avgEnergy, 2)} kWh`],
        ["Max Energy", `${fixed(rawReport.maxEnergy, 2)} kWh`],
        ["Avg Voltage", `${fixed(rawReport.avgVoltage, 1)} V`],
        ["Avg Current", `${fixed(rawReport.avgCurrent, 2)} A`],
      ],
      y
    )

    drawTable({
      doc,
      title: "Detailed Rows (Latest 50)",
      headers: [
        "Timestamp",
        "kWh",
        "kVAh",
        "kVArh",
        "V_RN",
        "V_YN",
        "V_BN",
        "V_RY",
        "V_YB",
        "V_BR",
        "I_R",
        "I_Y",
        "I_B",
        "kW_R",
        "kW_Y",
        "kW_B",
        "PF_R",
        "PF_Y",
        "PF_B",
        "Freq",
      ],
      widths: [26, 12, 12, 12, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 12],
      rows: rawReport.previewRows.map((row) => [
        format(new Date(row.timestamp), "yyyy-MM-dd HH:mm:ss"),
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
      ]),
      startY: y,
      fontSize: 6.5,
    })
  } else if (reportType === "analytical") {
    y = drawSummaryTable(
      doc,
      [
        ["Analysis periods", String(analyticalReport.summary.periodCount)],
        ["Total energy", `${fixed(analyticalReport.summary.totalEnergyKwh, 2)} kWh`],
        ["Average max load", `${fixed(analyticalReport.summary.averageMaxLoadKw, 2)} kW`],
        ["Average PF", fixed(analyticalReport.summary.averagePf, 3)],
        ["Peak current", `${fixed(analyticalReport.summary.peakCurrentOverallA, 2)} A`],
        ["Max voltage", `${fixed(analyticalReport.summary.maxVoltageOverallV, 1)} V`],
      ],
      y
    )

    drawTable({
      doc,
      title: "Period Analysis",
      headers: [
        "Period",
        "Energy (kWh)",
        "Max Load (kW)",
        "Avg PF",
        "Peak Current (A)",
        "Max Voltage (V)",
      ],
      widths: [62, 34, 34, 28, 38, 38],
      rows: analyticalReport.rows.map((row) => [
        row.periodLabel,
        fixed(row.energyKwh, 2),
        fixed(row.maxLoadKw, 2),
        fixed(row.avgPf, 3),
        fixed(row.peakCurrentA, 2),
        fixed(row.maxVoltageV, 1),
      ]),
      startY: y,
      fontSize: 9,
    })
  } else {
    y = drawSummaryTable(
      doc,
      [
        ["Time Period", consumptionReport.summary.timePeriodLabel],
        ["Total Energy Consumed", `${fixed(consumptionReport.summary.totalEnergyKwh, 2)} kWh`],
        ["Total Amount Spent", `INR ${fixed(consumptionReport.summary.totalCostInr, 2)}`],
        ["Unit Price", `INR ${fixed(unitPrice, 2)}/kWh`],
        ["Avg per period", `${fixed(consumptionReport.summary.averageEnergyPerPeriod, 2)} kWh`],
        ["Number of periods", String(consumptionReport.summary.periodCount)],
      ],
      y
    )

    drawTable({
      doc,
      title: "Consumption Breakdown",
      headers: ["Period", "Energy (kWh)", "Cost (INR)", "Percent"],
      widths: [88, 50, 50, 40],
      rows: [
        ...consumptionReport.rows.map((row) => [
          row.periodLabel,
          fixed(row.energyKwh, 2),
          fixed(row.costInr, 2),
          `${fixed(row.percentage, 2)}%`,
        ]),
        [
          "Total",
          fixed(consumptionReport.summary.totalEnergyKwh, 2),
          fixed(consumptionReport.summary.totalCostInr, 2),
          "100.00%",
        ],
      ],
      startY: y,
      fontSize: 9,
    })
  }

  addFooter(doc)
  return Buffer.from(doc.output("arraybuffer"))
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

  const reportType = parseReportType(url.searchParams.get("reportType"))
  const reportRange = parseReportRange(url.searchParams.get("reportRange"))
  const consumptionRange = parseConsumptionRange(
    url.searchParams.get("consumptionRange")
  )
  const unitPrice = parseUnitPrice(url.searchParams.get("unitPrice"))
  const generatedAt = new Date()

  const parsedRange =
    reportType === "consumption"
      ? parseWindowDates(
          consumptionRange === "daily"
            ? "24h"
            : consumptionRange === "weekly"
              ? "7d"
              : "30d"
        )
      : parseWindowDates(reportRange)

  const startAt =
    reportType === "consumption"
      ? parsedRange.startAt
      : parseDateAtStart(url.searchParams.get("startDate")) ?? parsedRange.startAt
  const endAt =
    reportType === "consumption"
      ? parsedRange.endAt
      : parseDateAtEnd(url.searchParams.get("endDate")) ?? parsedRange.endAt

  const trendRows = await collectTrendRows({
    customerId: session.customerId,
    unitId,
    rtuKey,
    startAt,
    endAt,
  })

  const filteredRows = selectReportRows({
    trendRows,
    reportType,
    reportRange,
    customStartDate: parseDateAtStart(url.searchParams.get("startDate")),
    customEndDate: parseDateAtEnd(url.searchParams.get("endDate")),
    consumptionRange,
  })

  if (filteredRows.length === 0) {
    return Response.json({ error: "No data available for export." }, { status: 404 })
  }

  const rawReport = buildRawReportModel(filteredRows)
  const analyticalReport = buildAnalyticalReportModel(filteredRows)
  const consumptionReport = buildConsumptionReportModel({
    rows: filteredRows,
    mode: consumptionRange,
    unitPrice,
  })
  const dateRangeLabel =
    url.searchParams.get("dateRangeLabel")?.trim() ||
    (reportType === "consumption"
      ? consumptionRangeLabel(consumptionRange)
      : reportDateRangeLabel(filteredRows))
  const filename = reportFileName({
    reportType,
    unitId,
    extension: "pdf",
    generatedAt,
  })

  const pdf = buildPdfBuffer({
    reportType,
    unitId,
    companyName: session.companyName || "Technode",
    dateRangeLabel,
    generatedAt,
    rawReport,
    analyticalReport,
    consumptionReport,
    unitPrice,
  })

  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
