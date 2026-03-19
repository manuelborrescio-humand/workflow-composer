export interface ServiceMatch {
  serviceName: string
  score: number
}

const STOP_WORDS = new Set([
  "de", "la", "el", "un", "una", "los", "las", "que", "por", "para",
  "con", "en", "al", "del", "se", "lo", "es", "su", "y", "a", "o",
  "quiero", "necesito", "crear", "flujo", "workflow", "proceso",
  "cuando", "alguien", "empleado", "solicita", "pide", "hace",
  "me", "mi", "nos", "le", "si", "no", "como", "mas", "pero"
])

function normalize(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function tokenize(str: string): string[] {
  return normalize(str)
    .split(/[\s,.\-_/()]+/)
    .filter(t => t.length > 1 && !STOP_WORDS.has(t))
}

function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a)
  const setB = new Set(b)
  const intersection = new Set([...setA].filter(x => setB.has(x)))
  const union = new Set([...setA, ...setB])
  if (union.size === 0) return 0
  return intersection.size / union.size
}

export function matchService(
  userText: string,
  services: { name: string; status: string }[]
): ServiceMatch | null {
  if (!services || services.length === 0) return null

  const normalizedInput = normalize(userText)
  let bestMatch: ServiceMatch | null = null

  for (const service of services) {
    const normalizedName = normalize(service.name)

    // Exact containment (either direction)
    if (normalizedInput.includes(normalizedName) || normalizedName.includes(normalizedInput)) {
      const score = 1.0
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { serviceName: service.name, score }
      }
      continue
    }

    // Token overlap (Jaccard similarity)
    const inputTokens = tokenize(userText)
    const serviceTokens = tokenize(service.name)
    const score = jaccardSimilarity(inputTokens, serviceTokens)

    if (score >= 0.3 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { serviceName: service.name, score }
    }
  }

  return bestMatch
}
