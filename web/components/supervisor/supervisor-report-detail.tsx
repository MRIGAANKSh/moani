"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { StatusBadge } from "@/components/reports/status-badge"
import { IssueTypeBadge } from "@/components/reports/issue-type-badge"
import { MapPin, ExternalLink, Copy } from "lucide-react"
import type { Report } from "@/lib/types"
import { useSupervisorActions } from "@/hooks/use-supervisor-actions"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface SupervisorReportDetailProps {
  report: Report | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SupervisorReportDetail({ report, open, onOpenChange }: SupervisorReportDetailProps) {
  const [status, setStatus] = useState("")
  const [note, setNote] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  // 🔥 NEW: workers list + selected worker
  const [workers, setWorkers] = useState<{ email: string; name: string }[]>([])
  const [selectedWorker, setSelectedWorker] = useState("")

  const { updateReportStatus, addReportNote, assignReportToWorker } = useSupervisorActions()

  useEffect(() => {
    const fetchWorkers = async () => {
      const snapshot = await getDocs(collection(db, "users"))
      const workerList: any = []
      snapshot.forEach((doc) => {
        if (doc.data().role === "worker") {
          workerList.push({
            email: doc.id,
            name: doc.data().name,
          })
        }
      })
      setWorkers(workerList)
    }

    fetchWorkers()
  }, [])

  if (!report) return null

  const handleStatusUpdate = async () => {
    if (!status) return

    setIsUpdating(true)
    try {
      await updateReportStatus(report.id, status as any, note)
      setStatus("")
      setNote("")
    } catch (error) {
      console.error("Failed to update status:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAddNote = async () => {
    if (!note.trim()) return

    setIsUpdating(true)
    try {
      await addReportNote(report.id, note)
      setNote("")
    } catch (error) {
      console.error("Failed to add note:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  // 🔥 NEW: Assign worker from dropdown
  const handleAssignWorker = async () => {
    if (!selectedWorker) return

    setIsUpdating(true)
    try {
      await assignReportToWorker(report.id, selectedWorker)
      setSelectedWorker("")
    } catch (err) {
      console.error("Failed to assign worker:", err)
    } finally {
      setIsUpdating(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Report Details
            <StatusBadge status={report.status} />
          </DialogTitle>
          <DialogDescription>
            Submitted on {format(report.createdAt.toDate(), "MMMM dd, yyyy 'at' HH:mm")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* LEFT PANEL */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Report Information</h3>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <IssueTypeBadge issueType={report.issueType} />
                  {report.classification && <Badge variant="secondary">{report.classification}</Badge>}
                </div>

                <div>
                  <p className="text-sm font-medium">Issue</p>
                  <p className="text-sm mt-1">{report.issueLabel}</p>
                  {report.customIssue && (
                    <p className="text-sm text-muted-foreground mt-1">Custom: {report.customIssue}</p>
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium">Description</p>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{report.description}</p>
                </div>

                <div>
                  <p className="text-sm font-medium">Assignment</p>
                  <div className="flex items-center gap-2 mt-1">
                    {report.assignedDept && <Badge variant="outline">{report.assignedDept}</Badge>}
                    {report.assignedWorkerName && (
                      <Badge variant="secondary">Worker: {report.assignedWorkerName}</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {(report.imageUrl || report.audioUrl) && (
              <div>
                <h3 className="font-semibold mb-2">Media</h3>
                <div className="space-y-2">
                  {report.imageUrl && (
                    <>
                      <img
                        src={report.imageUrl}
                        alt="Report"
                        className="w-full max-w-sm rounded-lg border"
                      />
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => window.open(report.imageUrl!, "_blank")}>
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Open Image
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(report.imageUrl!)}>
                          <Copy className="h-4 w-4 mr-1" />
                          Copy URL
                        </Button>
                      </div>
                    </>
                  )}

                  {report.audioUrl && (
                    <>
                      <audio controls className="w-full">
                        <source src={report.audioUrl} type="audio/mpeg" />
                      </audio>
                      <Button variant="outline" size="sm" onClick={() => copyToClipboard(report.audioUrl!)}>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy Audio URL
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}

            {report.location && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </h3>
                <p className="text-sm">
                  Lat: {report.location.latitude}, Lng: {report.location.longitude}
                </p>
              </div>
            )}
          </div>

          {/* RIGHT PANEL */}
          <div className="space-y-4">
            {/* STATUS UPDATE */}
            <div className="space-y-3">
              <h3 className="font-semibold">Update Status</h3>

              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>

              <Textarea
                placeholder="Add a note about the status change"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />

              <Button onClick={handleStatusUpdate} disabled={!status || isUpdating} className="w-full">
                Update Status
              </Button>
            </div>

            <Separator />

            {/* ADD NOTE */}
            <div className="space-y-3">
              <h3 className="font-semibold">Add Progress Note</h3>

              <Textarea
                placeholder="Add a note about progress..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />

              <Button
                onClick={handleAddNote}
                disabled={!note.trim() || isUpdating}
                variant="outline"
                className="w-full bg-transparent"
              >
                Add Note
              </Button>
            </div>

            <Separator />

            {/* ASSIGN WORKER */}
            <div className="space-y-3">
              <h3 className="font-semibold">Assign to Worker</h3>

              <Select onValueChange={setSelectedWorker} value={selectedWorker}>
                <SelectTrigger>
                  <SelectValue placeholder="Select worker" />
                </SelectTrigger>
                <SelectContent>
                  {workers.length === 0 && (
                    <SelectItem value="none" disabled>No workers found</SelectItem>
                  )}

                  {workers.map((w) => (
                    <SelectItem key={w.email} value={w.email}>
                      {w.name} ({w.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                onClick={handleAssignWorker}
                disabled={!selectedWorker || isUpdating}
                className="w-full"
              >
                Assign Worker
              </Button>
            </div>
          </div>
        </div>

        {/* HISTORY LOG */}
        {report.statusHistory.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold mb-3">Activity History</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {report.statusHistory.map((entry, index) => (
                <div key={index} className="text-sm p-2 bg-muted rounded">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {entry.kind === "status"
                        ? "Status changed to"
                        : entry.kind === "assignment"
                        ? "Assigned to worker"
                        : entry.kind === "classification"
                        ? "Classification updated"
                        : "Note added"}{" "}
                      {(entry.status || entry.assignedToWorker || entry.classification) && (
                        <Badge variant="outline" className="ml-1">
                          {entry.status || entry.assignedToWorker || entry.classification}
                        </Badge>
                      )}
                    </span>

                    <span className="text-muted-foreground">
                      {format(entry.changedAt.toDate(), "MMM dd, HH:mm")}
                    </span>
                  </div>

                  {entry.note && <p className="text-muted-foreground mt-1">{entry.note}</p>}
                  <p className="text-muted-foreground text-xs">by {entry.changedBy}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
