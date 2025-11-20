"use client"

import { useState, useEffect, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { SupervisorLayout } from "@/components/layout/supervisor-layout"
import { SupervisorFilters, type SupervisorFilters as FiltersType } from "@/components/supervisor/supervisor-filters"
import { ReportsTable } from "@/components/reports/reports-table"
import { SupervisorReportDetail } from "@/components/supervisor/supervisor-report-detail"
import { useSupervisorReports } from "@/hooks/use-supervisor-reports"
import { useAuth } from "@/hooks/use-auth"
import type { Report } from "@/lib/types"

const initialFilters: FiltersType = {
  status: "",
  dateRange: "",
}

export default function SupervisorReportsPage() {
  // ---------------------
  // Hooks MUST always run
  // ---------------------
  const { user } = useAuth()
  const { reports, loading } = useSupervisorReports()
  const searchParams = useSearchParams()

  const [filters, setFilters] = useState(initialFilters)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // ------------------------------------------
  // Always run memo (even if user = null)
  // ------------------------------------------
  const assignedReports = useMemo(() => {
    if (!user?.email) return []
    return reports.filter((report) => report.assignedTo === user.email)
  }, [reports, user?.email])

  const filteredReports = useMemo(() => {
    return assignedReports.filter((report) => {
      const createdAt =
        report.createdAt?.toDate?.() ??
        new Date(report.createdAt ?? new Date())

      // Status filter
      if (filters.status && filters.status !== "all") {
        if (report.status !== filters.status) return false
      }

      // Date range filter
      if (filters.dateRange && filters.dateRange !== "all") {
        const now = new Date()

        switch (filters.dateRange) {
          case "today": {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            if (createdAt < start) return false
            break
          }
          case "week": {
            const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            if (createdAt < start) return false
            break
          }
          case "month": {
            const start = new Date(now.getFullYear(), now.getMonth(), 1)
            if (createdAt < start) return false
            break
          }
        }
      }

      return true
    })
  }, [assignedReports, filters])

  // URL sync
  useEffect(() => {
    const f = searchParams.get("filter")

    if (f === "pending" || f === "overdue") {
      setFilters((prev) => ({ ...prev, status: "submitted" }))
    }
  }, [searchParams])

  // -------------------------------
  // SAFE return AFTER all hooks ran
  // -------------------------------
  if (!user) {
    return (
      <SupervisorLayout>
        <p>Loading...</p>
      </SupervisorLayout>
    )
  }

  return (
    <SupervisorLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Reports</h1>
          <p className="text-muted-foreground">
            Showing {filteredReports.length} of {assignedReports.length} assigned reports
          </p>
        </div>

        <SupervisorFilters
          filters={filters}
          onFiltersChange={setFilters}
          onClearFilters={() => setFilters(initialFilters)}
        />

        <ReportsTable
          reports={filteredReports}
          onViewReport={(r) => {
            setSelectedReport(r)
            setIsModalOpen(true)
          }}
          loading={loading}
        />

        <SupervisorReportDetail
          report={selectedReport}
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
        />
      </div>
    </SupervisorLayout>
  )
}
