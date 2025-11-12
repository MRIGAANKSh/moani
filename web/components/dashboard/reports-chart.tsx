"use client"

import React, { useMemo } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { Report } from "@/lib/types"
import { format, subDays, eachDayOfInterval } from "date-fns"

interface Props {
  reports: Report[] | undefined
  days?: number
}

function toMillisSafe(ts: any): number | null {
  if (ts == null) return null
  if (typeof ts.toMillis === "function") {
    try {
      return ts.toMillis()
    } catch {}
  }
  if (typeof ts.toDate === "function") {
    try {
      return ts.toDate().getTime()
    } catch {}
  }
  if (ts instanceof Date) return ts.getTime()
  if (typeof ts === "number") return ts
  return null
}

export function ReportsChart({ reports = [], days = 30 }: Props) {
  const chartData = useMemo(() => {
    const now = new Date()
    const startDate = subDays(now, days - 1)
    const dateRange = eachDayOfInterval({ start: startDate, end: now })

    const map = dateRange.map((date) => ({
      dateKey: format(date, "MMM dd"),
      count: 0,
    }))

    reports.forEach((r) => {
      const ms = toMillisSafe(r.createdAt)
      if (ms == null) return
      const d = new Date(ms)
      if (d >= startDate && d <= now) {
        const key = format(d, "MMM dd")
        const idx = map.findIndex((m) => m.dateKey === key)
        if (idx >= 0) map[idx].count += 1
      }
    })

    return map.map((m) => ({ date: m.dateKey, count: Number(m.count) }))
  }, [reports, days])

  const hasAny = chartData.some((d) => d.count > 0)

  if (!hasAny) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reports Trend</CardTitle>
          <CardDescription>
            Daily report submissions over the last {days} days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            No reports in the selected range.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reports Trend</CardTitle>
        <CardDescription>
          Daily report submissions over the last {days} days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />

              <Area
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#colorCount)"
                fillOpacity={1}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
