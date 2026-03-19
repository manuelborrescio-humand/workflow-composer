import { NextResponse } from "next/server"

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

export async function POST(request: Request) {
  try {
    const { userText, services } = await request.json() as {
      userText: string
      services: { name: string; status: string }[]
    }

    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "API key de Anthropic no configurada" },
        { status: 500 }
      )
    }

    if (!userText || !services || services.length === 0) {
      return NextResponse.json(
        { error: "Faltan parámetros requeridos" },
        { status: 400 }
      )
    }

    const serviceList = services
      .map(s => `- ${s.name} (${s.status === "ENABLED" ? "Activo" : "Inactivo"})`)
      .join("\n")

    const systemPrompt = `Sos un clasificador de servicios para una plataforma de RRHH llamada Humand.
Dado un texto del usuario y una lista de servicios disponibles, determiná cuál servicio coincide mejor con la intención del usuario.

SERVICIOS DISPONIBLES:
${serviceList}

REGLAS:
1. Devolvé SOLO JSON puro: { "matched_service": string | null, "confidence": number, "reasoning": string }
2. "confidence" es un número de 0 a 100
3. Si ningún servicio coincide, devolvé matched_service: null y confidence: 0
4. Considerá sinónimos, variaciones del lenguaje natural y conceptos relacionados
5. Ejemplos: "pedir días libres" = "Solicitud de vacaciones", "quiero trabajar desde casa" = "Solicitud de home office"
6. Conceptos diferentes NO son match: "renuncia" ≠ "liquidación de sueldos", "pizza" ≠ cualquier servicio
7. Preferí servicios activos sobre inactivos
8. El campo "matched_service" debe ser el nombre EXACTO del servicio de la lista (respetando mayúsculas)
9. NO inventes servicios que no estén en la lista
10. Respondé siempre en el idioma del usuario`

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 256,
        messages: [{ role: "user", content: userText }],
        system: systemPrompt
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error("Anthropic API error (match-service):", response.status, errorData)
      return NextResponse.json(
        { error: `Error API (${response.status})` },
        { status: 500 }
      )
    }

    const data = await response.json()
    const content = data.content[0]?.text

    if (!content) {
      return NextResponse.json(
        { error: "Respuesta vacía de la API" },
        { status: 500 }
      )
    }

    try {
      let cleanContent = content.trim()
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.slice(7)
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.slice(3)
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.slice(0, -3)
      }
      cleanContent = cleanContent.trim()

      const result = JSON.parse(cleanContent)

      // Validate the matched_service exists in the service list
      if (result.matched_service) {
        const exists = services.some(s => s.name === result.matched_service)
        if (!exists) {
          result.matched_service = null
          result.confidence = 0
          result.reasoning = "El servicio sugerido no existe en la lista"
        }
      }

      return NextResponse.json({
        matched_service: result.matched_service || null,
        confidence: typeof result.confidence === "number" ? result.confidence : 0,
        reasoning: result.reasoning || ""
      })
    } catch {
      console.error("Failed to parse match-service JSON:", content)
      return NextResponse.json(
        { error: "Error al parsear la respuesta del modelo" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Match-service error:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
