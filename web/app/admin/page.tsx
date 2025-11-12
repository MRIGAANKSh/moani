"use client";

import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/layout/admin-layout";
import { KPICard } from "@/components/dashboard/kpi-card";
import { ReportsChart } from "@/components/dashboard/reports-chart";
import { QuickFilters } from "@/components/dashboard/quick-filters";
import { useReports, useReportStats } from "@/hooks/use-reports";
import { useAuth } from "@/hooks/use-auth";
import { FileText, AlertCircle, Calendar, Clock } from "lucide-react";

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { reports, loading: reportsLoading } = useReports();
  const stats = useReportStats(reports);
  const router = useRouter();

  // Redirect if not admin
  if (!authLoading && (!user || user.role !== "admin")) {
    router.push("/");
    return null;
  }

  if (authLoading || reportsLoading) {
    return (
      <AdminLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
        </div>
      </AdminLayout>
    );
  }

  const handleFilterClick = (filter: string) => {
    // Navigate to reports page with filter
    router.push(`/admin/reports?filter=${filter}`);
  };

  return (
    <AdminLayout>
      {/* admin-root wrapper — enforces readable colors inside */}
      <div className="admin-root">
        {/* Inline global override to immediately take effect (high specificity + !important) */}
        <style
  dangerouslySetInnerHTML={{
    __html: `
      /* admin-root overrides - high priority to fix invisible/light text */
      .admin-root, .admin-root * { color: #0f172a !important; }
      .admin-root, .admin-root body { background-color: #f8fafc !important; }

      /* Inputs & placeholders */
      .admin-root input, .admin-root textarea, .admin-root select {
        color: #0f172a !important;
        background-color: #fff !important;
        border-color: #e6e9ee !important;
      }
      .admin-root ::placeholder {
        color: #94a3b8 !important;
        opacity: 1 !important;
      }

      /* Text & cards */
      .admin-root .text-foreground,
      .admin-root .muted-foreground,
      .admin-root .placeholder-muted {
        color: #0f172a !important;
      }
      .admin-root .card,
      .admin-root .bg-card,
      .admin-root .card * {
        background-color: #fff !important;
      }

      /* Tables */
      .admin-root table,
      .admin-root th,
      .admin-root td {
        color: #0f172a !important;
      }

      /* SVG/Icons — scoped so charts keep gradients */
      .admin-root :not(.recharts-wrapper):not(.recharts-surface) > svg,
      .admin-root :not(.recharts-wrapper):not(.recharts-surface) > svg * {
        stroke: #0f172a !important;
        fill: #0f172a !important;
      }

      /* Chart texts (labels, ticks, legends) */
      .admin-root .recharts-text,
      .admin-root .chartjs-render-monitor,
      .admin-root .legend,
      .admin-root .tick {
        fill: #0f172a !important;
        color: #0f172a !important;
      }

      /* Buttons */
      .admin-root button,
      .admin-root .btn {
        color: #0f172a !important;
      }

      /* Badges */
      .admin-root .badge,
      .admin-root .status-badge {
        color: #fff !important;
      }
    `,
  }}
/>


        <div className="min-h-screen bg-slate-50 text-slate-900">
          <div className="p-6 max-w-[1200px] mx-auto space-y-6">
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <KPICard
                title="Total Reports"
                value={stats.total}
                description="All time reports"
                icon={FileText}
              />
              <KPICard
                title="Open Reports"
                value={stats.open}
                description="Pending resolution"
                icon={AlertCircle}
              />
              <KPICard
                title="Last 7 Days"
                value={stats.last7Days}
                description="Recent submissions"
                icon={Calendar}
              />
              <KPICard
                title="Avg Resolution"
                value={`${stats.avgResolutionTime}h`}
                description="Average time to resolve"
                icon={Clock}
              />
            </div>

            {/* Charts and Filters */}
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <ReportsChart reports={reports} />
              </div>
              <div>
                <QuickFilters stats={stats} onFilterClick={handleFilterClick} />
              </div>
            </div>

            {/* Recent Activity */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">📊 Reports Overview (Last 90 Days)</h2>
              <div className="w-full bg-white p-4 rounded-2xl shadow-sm">
                <ReportsChart reports={reports} days={90} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
