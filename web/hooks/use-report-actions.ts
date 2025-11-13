"use client"

import { doc, updateDoc, arrayUnion, serverTimestamp, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "./use-auth"

export function useReportActions() {
  const { user } = useAuth()

  // ✅ Update report status (Approved, Pending, etc.)
  const updateReportStatus = async (reportId: string, status: string, note?: string) => {
    if (!user) throw new Error("User not authenticated")

    const reportRef = doc(db, "reports", reportId)

    // ❌ FIX: cannot use serverTimestamp() inside arrayUnion
    const statusEntry = {
      kind: "status",
      status,
      changedBy: user.uid,
      changedAt: Timestamp.now(), // ✅ use client timestamp instead
      note: note || "",
    }

    await updateDoc(reportRef, {
      status,
      updatedAt: serverTimestamp(), // ✅ allowed here
      statusHistory: arrayUnion(statusEntry),
    })
  }

  // ✅ Update report assignment (Admin assigns report to supervisor)
  const updateReportAssignment = async (reportId: string, assignedDept?: string, assignedTo?: string) => {
    if (!user) throw new Error("User not authenticated")

    const reportRef = doc(db, "reports", reportId)

    const updateData: any = {
      updatedAt: serverTimestamp(),
    }

    if (assignedDept !== undefined) updateData.assignedDept = assignedDept
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo

    // ✅ use client timestamp instead of serverTimestamp() inside arrayUnion
    const assignmentEntry = {
      kind: "assignment",
      changedBy: user.uid,
      changedAt: Timestamp.now(),
      note: `Assigned to ${assignedTo || "unknown"} (${assignedDept || "no dept"})`,
    }

    await updateDoc(reportRef, {
      ...updateData,
      statusHistory: arrayUnion(assignmentEntry),
    })
  }

  // ✅ Update classification (marking the type or severity)
  const updateReportClassification = async (reportId: string, classification: string, note?: string) => {
    if (!user) throw new Error("User not authenticated")

    const reportRef = doc(db, "reports", reportId)

    const classificationEntry = {
      kind: "classification",
      classification,
      changedBy: user.uid,
      changedAt: Timestamp.now(), // ✅ replaced serverTimestamp()
      note: note || "",
    }

    await updateDoc(reportRef, {
      classification,
      classificationNote: note || "",
      updatedAt: serverTimestamp(),
      statusHistory: arrayUnion(classificationEntry),
    })
  }

  return {
    updateReportStatus,
    updateReportAssignment,
    updateReportClassification,
  }
}
