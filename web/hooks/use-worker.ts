"use client"

import { useState, useEffect } from "react"
import { collection, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"

export function useWorkers() {
  const [workers, setWorkers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "workers"), (snap) => {
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setWorkers(data)
      setLoading(false)
    })

    return () => unsub()
  }, [])

  return { workers, loading }
}
