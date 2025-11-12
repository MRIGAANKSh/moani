// components/analytics/status-distribution-chart.tsx
"use client"

import React from "react"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { Report } from "@/lib/types"

interface StatusDistributionChartProps {
  reports: Report[]
}

export function StatusDistributionChart({
  reports = [],
}: StatusDistributionChartProps) {
  const statusCounts = reports.reduce((acc, report) => {
    const raw = report.status || "unknown"
    const key = raw.toLowerCase().replace(/\s+/g, "_")
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const mapping: { key: string; label: string; color: string }[] = [
    { key: "submitted", label: "Submitted", color: "#2563eb" }, // deep blue
    { key: "acknowledged", label: "Acknowledged", color: "#f97316" }, // orange
    { key: "in_progress", label: "In Progress", color: "#22c55e" }, // green
    { key: "resolved", label: "Resolved", color: "#a855f7" }, // purple
    { key: "unknown", label: "Unknown", color: "#9ca3af" }, // gray
  ]

  const data = mapping
    .map((m) => ({
      name: m.label,
      value: statusCounts[m.key] || 0,
      color: m.color,
    }))
    .filter((d) => d.value > 0)

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      const count = data.value || 0
      const pct = reports.length
        ? ((count / reports.length) * 100).toFixed(1)
        : "0.0"
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-2 shadow-md">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm text-gray-600">
            {count} reports ({pct}%)
          </p>
        </div>
      )
    }
    return null
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Status Distribution</CardTitle>
          <CardDescription>No status data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500">
            No reports to display
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status Distribution</CardTitle>
        <CardDescription>
          Current status breakdown of all reports
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={50}
                stroke="#ffffff" // white border for visibility
                strokeWidth={2}
                labelLine={false}
                label={(entry: any) =>
                  `${entry.name} ${
                    entry.value
                      ? ((entry.value / reports.length) * 100).toFixed(0)
                      : 0
                  }%`
                }
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
