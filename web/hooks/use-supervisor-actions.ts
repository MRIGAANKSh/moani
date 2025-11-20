"use client"

import { doc, getDoc, updateDoc, arrayUnion, serverTimestamp, collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "./use-auth"

export function useSupervisorActions() {
  const { user } = useAuth()

  const ensureSupervisor = () => {
    if (!user || user.role !== "supervisor") {
      throw new Error("Unauthorized: Only supervisors can perform this action")
    }
  }

  // -----------------------------------------------------------
  // FETCH ALL WORKERS
  // -----------------------------------------------------------
  const getAllWorkers = async () => {
    ensureSupervisor()

    const workersRef = collection(db, "users")
    const snapshot = await getDocs(workersRef)

    const workers = snapshot.docs
      .map((doc) => ({ email: doc.id, ...doc.data() }))
      .filter((u: any) => u.role === "worker")

    return workers
  }

  // -----------------------------------------------------------
  // UPDATE STATUS
  // -----------------------------------------------------------
  const updateReportStatus = async (reportId: string, status: string, note?: string) => {
    ensureSupervisor()

    const reportRef = doc(db, "reports", reportId)

    const statusEntry = {
      kind: "status",
      status,
      note: note || "",
      changedBy: user.email,
      changedAt: serverTimestamp(),
    }

    await updateDoc(reportRef, {
      status,
      updatedAt: serverTimestamp(),
      statusHistory: arrayUnion(statusEntry),
    })
  }

  // -----------------------------------------------------------
  // ADD NOTE
  // -----------------------------------------------------------
  const addReportNote = async (reportId: string, note: string) => {
    ensureSupervisor()

    const reportRef = doc(db, "reports", reportId)

    const noteEntry = {
      kind: "note",
      note,
      changedBy: user.email,
      changedAt: serverTimestamp(),
    }

    await updateDoc(reportRef, {
      updatedAt: serverTimestamp(),
      statusHistory: arrayUnion(noteEntry),
    })
  }

  // -----------------------------------------------------------
  // ASSIGN REPORT TO WORKER
  // -----------------------------------------------------------
  const assignReportToWorker = async (reportId: string, workerEmail: string) => {
    ensureSupervisor()

    const workerRef = doc(db, "users", workerEmail)
    const workerSnap = await getDoc(workerRef)

    if (!workerSnap.exists()) {
      throw new Error("Worker not found")
    }

    const workerData = workerSnap.data()

    if (workerData.role !== "worker") {
      throw new Error("This user is not a worker")
    }

    const reportRef = doc(db, "reports", reportId)

    const assignmentEntry = {
      kind: "assignment",
      assignedToWorker: workerEmail,
      workerName: workerData.name,
      changedBy: user.email,
      changedAt: serverTimestamp(),
    }

    await updateDoc(reportRef, {
      assignedToWorker: workerEmail,
      assignedWorkerName: workerData.name,
      updatedAt: serverTimestamp(),
      statusHistory: arrayUnion(assignmentEntry),
    })
  }

  return {
    updateReportStatus,
    addReportNote,
    assignReportToWorker,
    getAllWorkers,
  }
}
