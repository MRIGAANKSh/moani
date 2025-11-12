import { Badge } from "@/components/ui/badge"

interface IssueTypeBadgeProps {
  issueType?: unknown
  department?: unknown
  className?: string
}

/**
 * Very defensive badge component:
 * - accepts strings, numbers, objects
 * - extracts common keys (type, name, label, value)
 * - trims, lowercases, normalizes Unicode
 * - matches using `includes()` against many aliases
 * - logs incoming raw value to console for debugging
 */
export function IssueTypeBadge({ issueType, department, className }: IssueTypeBadgeProps) {
  const toStringValue = (val: unknown): string => {
    if (val == null) return ""
    if (typeof val === "string") return val.trim().toLowerCase().normalize("NFKD")
    if (typeof val === "number") return String(val)
    if (typeof val === "object") {
      try {
        // try common object keys
        // @ts-ignore
        if (val.type) return String(val.type).trim().toLowerCase().normalize("NFKD")
        // @ts-ignore
        if (val.name) return String(val.name).trim().toLowerCase().normalize("NFKD")
        // @ts-ignore
        if (val.label) return String(val.label).trim().toLowerCase().normalize("NFKD")
        // @ts-ignore
        if (val.value) return String(val.value).trim().toLowerCase().normalize("NFKD")
        // fallback to JSON if small
        const json = JSON.stringify(val)
        if (json && json.length < 200) return json.trim().toLowerCase().normalize("NFKD")
      } catch {
        return ""
      }
    }
    return ""
  }

  const rawStr = (toStringValue(issueType) || toStringValue(department)).trim()

  // DEBUG: uncomment to inspect the exact incoming values in your browser console
  // console.info("IssueTypeBadge raw:", { issueType, department, rawStr })

  const chooseKey = (s: string) => {
    if (!s) return "other"

    // normalize some punctuation/extra words
    const cleaned = s.replace(/[_\-]/g, " ").replace(/\s+/g, " ").trim()

    // Many synonyms / aliases:
    if (cleaned.includes("water") || cleaned.includes("drain") || cleaned.includes("drainage")) return "water"

    if (
      cleaned.includes("road") ||
      cleaned.includes("roads") ||
      cleaned.includes("pothole") ||
      cleaned.includes("road damage") ||
      cleaned.includes("potholes")
    )
      return "road"

    if (cleaned.includes("elect") || cleaned.includes("electrical") || cleaned.includes("electricity") ||
        cleaned.includes("streetlight") || cleaned.includes("light") || cleaned.includes("street light"))
      return "electricity"

    if (
      cleaned.includes("sanit") ||
      cleaned.includes("garbage") ||
      cleaned.includes("trash") ||
      cleaned.includes("waste") ||
      cleaned.includes("sani")
    )
      return "sanitation"

    if (
      cleaned.includes("park") ||
      cleaned.includes("parks") ||
      cleaned.includes("tree") ||
      cleaned.includes("vegetation") ||
      cleaned.includes("garden")
    )
      return "parks"

    // More domain-specific fallbacks
    if (cleaned.includes("water/sew") || cleaned.includes("sewer")) return "water"
    if (cleaned.includes("clean") && cleaned.includes("city")) return "sanitation"

    return "other"
  }

  const key = chooseKey(rawStr)

  const map: Record<string, { label: string; cls: string }> = {
    water: { label: "Water", cls: "bg-blue-50 text-blue-700 border-blue-200" },
    road: { label: "Road", cls: "bg-gray-50 text-gray-700 border-gray-200" },
    parks: { label: "Parks", cls: "bg-purple-50 text-purple-700 border-purple-200" },
    electricity: { label: "Electricity", cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
    sanitation: { label: "Sanitation", cls: "bg-green-50 text-green-700 border-green-200" },
    other: { label: "Other", cls: "bg-purple-50 text-purple-700 border-purple-200" },
  }

  const chosen = map[key] || map.other

  return (
    <Badge variant="outline" className={`${chosen.cls} ${className ?? ""}`}>
      {chosen.label}
    </Badge>
  )
}
