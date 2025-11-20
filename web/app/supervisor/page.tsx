"use client"

import { useRouter } from "next/navigation"
import { SupervisorLayout } from "@/components/layout/supervisor-layout"
import { KPICard } from "@/components/dashboard/kpi-card"
import { useSupervisorReports, useSupervisorStats } from "@/hooks/use-supervisor-reports"
import { useAuth } from "@/hooks/use-auth"
import { FileText, AlertCircle, Clock, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function SupervisorDashboard() {
  const { user, loading: authLoading } = useAuth()
  const { reports, loading: reportsLoading } = useSupervisorReports()
  const router = useRouter()

  // Redirect non-supervisors
  if (!authLoading && (!user || user.role !== "supervisor")) {
    router.push("/")
    return null
  }

  // Filter using EMAIL (important)
  const assignedReports = reports.filter((r) => r.assignedTo === user?.email)

  const stats = useSupervisorStats(assignedReports)

  if (authLoading || reportsLoading) {
    return (
      <SupervisorLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </SupervisorLayout>
    )
  }

  return (
    <SupervisorLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {user?.name || "Supervisor"}
          </h1>
          <p className="text-muted-foreground">
            Here’s an overview of reports <strong>assigned to you</strong>
            {user?.dept ? ` (Department: ${user.dept})` : ""}.
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard title="Total Assigned" value={stats.total} description="All reports assigned to you" icon={FileText} />
          <KPICard title="Open Reports" value={stats.open} description="Pending resolution" icon={AlertCircle} />
          <KPICard title="Overdue" value={stats.overdue} description="Over 48 hours old" icon={AlertTriangle} />
          <KPICard title="New Today" value={stats.today} description="Submitted today" icon={Clock} />
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks for managing your assigned reports</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push("/supervisor/reports?filter=pending")}
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                View Pending Reports ({stats.open})
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push("/supervisor/reports?filter=overdue")}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                View Overdue Reports ({stats.overdue})
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push("/supervisor/reports")}
              >
                <FileText className="h-4 w-4 mr-2" />
                View All My Reports ({stats.total})
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status Summary</CardTitle>
              <CardDescription>Current status distribution of your assigned reports</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Acknowledged</span>
                <span className="font-medium">{stats.acknowledged}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">In Progress</span>
                <span className="font-medium">{stats.inProgress}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Resolved</span>
                <span className="font-medium">{stats.total - stats.open}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SupervisorLayout>
  )
}
