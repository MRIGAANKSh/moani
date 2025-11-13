"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import {
  doc,
  getDoc,
  collection,
  getDocs
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { StatusBadge } from "./status-badge"
import { IssueTypeBadge } from "./issue-type-badge"
import { MapPin, ExternalLink, Copy, X } from "lucide-react"
import type { Report, StatusHistoryEntry, Supervisor } from "@/lib/types"
import { useReportActions } from "@/hooks/use-report-actions"

function toDateSafe(ts: any): Date | null {
  if (!ts && ts !== 0) return null
  if (typeof ts.toDate === "function") return ts.toDate()
  if (typeof ts.toMillis === "function") return new Date(ts.toMillis())
  if (ts instanceof Date) return ts
  if (typeof ts === "number") return new Date(ts)
  return null
}

function MediaPlayer({ src }: { src: string }) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  if (!src) return null

  const ext = (src.split("?")[0].split(".").pop() || "").toLowerCase()
  let playbackUrl = src
  if (ext === "3gp" && src.includes("/upload/"))
    playbackUrl = src.replace("/upload/", "/upload/f_mp3/")
  const audioExts = ["mp3", "wav", "ogg", "aac", "m4a"]
  const isAudio = audioExts.includes(ext) || playbackUrl.includes("f_mp3")

  const copyToClipboard = async () => navigator.clipboard.writeText(playbackUrl)
  const openInNewTab = () => window.open(playbackUrl, "_blank", "noopener,noreferrer")

  return (
    <div className="rounded-md border p-3 bg-muted/20">
      {isAudio ? (
        <audio controls preload="metadata" className="w-full" onError={() => setErrorMsg("Playback failed. Try 'Open in new tab'.")}>
          <source src={playbackUrl} type="audio/mpeg" />
          Your browser does not support the audio element.
        </audio>
      ) : (
        <video controls preload="metadata" className="w-full rounded-md" onError={() => setErrorMsg("Playback failed. Try 'Open in new tab'.")}>
          <source src={playbackUrl} />
        </video>
      )}

      <div className="flex gap-2 mt-3">
        <Button variant="outline" size="sm" onClick={copyToClipboard}>
          <Copy className="h-4 w-4 mr-1" /> Copy URL
        </Button>
        <Button variant="outline" size="sm" onClick={openInNewTab}>
          <ExternalLink className="h-4 w-4 mr-1" /> Open
        </Button>
      </div>
      {errorMsg && <p className="text-red-500 text-sm mt-2">{errorMsg}</p>}
    </div>
  )
}

export function ReportDetailModal({
  report,
  open,
  onOpenChange,
}: {
  report: Report | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [classification, setClassification] = useState("")
  const [classificationNote, setClassificationNote] = useState("")
  const [assignedDept, setAssignedDept] = useState("")
  const [assignedTo, setAssignedTo] = useState("")
  const [status, setStatus] = useState("")
  const [note, setNote] = useState("")
  const [reporterName, setReporterName] = useState<string | null>(null)
  const [reporterLoading, setReporterLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const [supervisors, setSupervisors] = useState<Supervisor[]>([])
  const [loadingSupervisors, setLoadingSupervisors] = useState(false)

  const { updateReportStatus, updateReportAssignment, updateReportClassification } =
    useReportActions()

  useEffect(() => {
    if (!open) return
    setClassification("")
    setClassificationNote("")
    setAssignedDept("")
    setAssignedTo("")
    setStatus("")
    setNote("")
  }, [open, report?.id])

  // ✅ Fetch reporter details
  useEffect(() => {
    let mounted = true
    async function fetchReporter() {
      if (!report?.uid) return
      setReporterLoading(true)
      const userDoc = await getDoc(doc(db, "users", report.uid))
      if (!mounted) return
      if (userDoc.exists()) {
        const data = userDoc.data()
        setReporterName(
          (data as any).name ||
          (data as any).displayName ||
          (data as any).fullName ||
          null
        )
      }
      setReporterLoading(false)
    }
    fetchReporter()
    return () => {
      mounted = false
    }
  }, [report?.uid])

  // ✅ Fetch supervisors for assignment
  useEffect(() => {
    if (!open) return
    async function fetchSupervisors() {
      setLoadingSupervisors(true)
      const snapshot = await getDocs(collection(db, "supervisors"))
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Supervisor[]
      setSupervisors(list)
      setLoadingSupervisors(false)
    }
    fetchSupervisors()
  }, [open])

  if (!open || !report) return null

  const createdAt = toDateSafe(report.createdAt)
  const formattedDate = createdAt ? format(createdAt, "MMM dd, yyyy HH:mm") : "Unknown"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-3 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Report Details</h2>
            <StatusBadge status={report.status} />
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{formattedDate}</span>
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden divide-x">
          {/* Left Section */}
          <div className="w-[60%] overflow-y-auto p-6 space-y-6">
            <section>
              <h3 className="text-base font-semibold mb-2">Report Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <IssueTypeBadge issueType={report.issueType} />
                  {report.classification && (
                    <Badge variant="secondary">{report.classification}</Badge>
                  )}
                </div>
                <div>
                  <Label>Issue</Label>
                  <p>{report.issueLabel}</p>
                </div>
                {report.customIssue && (
                  <p className="text-muted-foreground text-sm">
                    Custom: {report.customIssue}
                  </p>
                )}
                <div>
                  <Label>Description</Label>
                  <p className="whitespace-pre-wrap">{report.description}</p>
                </div>
                <div>
                  <Label>Reporter</Label>
                  <p>{reporterLoading ? "Loading..." : reporterName ?? report.uid}</p>
                </div>
              </div>
            </section>

            {(report.imageUrl || report.audioUrl) && (
              <section>
                <h3 className="text-base font-semibold mb-2">Media</h3>
                <div className="space-y-3">
                  {report.imageUrl && (
                    <div className="rounded-md border overflow-hidden">
                      <img
                        src={report.imageUrl}
                        alt="Report"
                        className="w-full object-contain max-h-96"
                      />
                      <div className="flex gap-2 p-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(report.imageUrl!, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" /> Open
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigator.clipboard.writeText(report.imageUrl!)}
                        >
                          <Copy className="h-4 w-4 mr-1" /> Copy URL
                        </Button>
                      </div>
                    </div>
                  )}
                  {report.audioUrl && <MediaPlayer src={report.audioUrl} />}
                </div>
              </section>
            )}

            {report.location && (
              <section>
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Location
                </h3>
                <div className="mt-2 text-sm space-y-1">
                  <p>Lat: {(report.location as any).latitude}</p>
                  <p>Lng: {(report.location as any).longitude}</p>
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        window.open(
                          `https://www.google.com/maps?q=${(report.location as any).latitude},${(report.location as any).longitude}`,
                          "_blank"
                        )
                      }
                    >
                      Open in Maps
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        navigator.clipboard.writeText(
                          `${(report.location as any).latitude},${(report.location as any).longitude}`
                        )
                      }
                    >
                      Copy Coords
                    </Button>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Right Section */}
          <div className="w-[40%] overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-slate-900/30">
            {/* ✅ Update Assignment Section */}
            <section>
              <h3 className="font-semibold mb-2">Assign to Supervisor</h3>

              <Select value={assignedDept} onValueChange={setAssignedDept}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="water">Water</SelectItem>
                  <SelectItem value="roads">Roads</SelectItem>
                  <SelectItem value="electricity">Electricity</SelectItem>
                  <SelectItem value="sanitation">Sanitation</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={assignedTo}
                onValueChange={setAssignedTo}
                disabled={loadingSupervisors}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue
                    placeholder={
                      loadingSupervisors
                        ? "Loading supervisors..."
                        : "Select Supervisor"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {supervisors.length ? (
                    supervisors.map((s) => (
                      <SelectItem key={s.email} value={s.email}>
                        {s.name} ({s.dept})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No supervisors found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>

              <Button
                className="mt-3 w-full"
                disabled={!assignedDept || !assignedTo || isUpdating}
                onClick={async () => {
                  try {
                    setIsUpdating(true)
                    await updateReportAssignment(report.id, assignedDept, assignedTo)
                    setIsUpdating(false)
                    alert("✅ Report assigned successfully!")
                  } catch (error) {
                    console.error("Error assigning report:", error)
                    setIsUpdating(false)
                    alert("❌ Failed to assign report.")
                  }
                }}
              >
                Assign Report
              </Button>
            </section>

            <Separator />

            {/* Rest sections unchanged */}
            <section>
              <h3 className="font-semibold mb-2">Status History</h3>
              <div className="max-h-56 overflow-y-auto space-y-3">
                {report.statusHistory?.length ? (
                  report.statusHistory.map((entry, i) => (
                    <div key={i} className="p-3 rounded-md bg-slate-100 dark:bg-slate-800/40">
                      <div className="flex justify-between">
                        <span className="font-medium">
                          {entry.kind === "status" ? "Status" : "Classification"} →{" "}
                          <Badge variant="outline">{entry.status || entry.classification}</Badge>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(toDateSafe(entry.changedAt) || new Date(), "MMM dd HH:mm")}
                        </span>
                      </div>
                      {entry.note && (
                        <p className="text-xs text-muted-foreground mt-1">{entry.note}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        by {entry.changedBy}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No history yet.</p>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
