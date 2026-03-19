import { NextResponse } from "next/server"
import type { Workflow } from "@/lib/workflow-types"
import { fetchInstanceContext, type InstanceContext } from "@/lib/redash"

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

function buildEmpresaContext(context?: InstanceContext) {
  if (!context) {
    return `Nombre: Demo
Departamentos: RRHH, IT, Finanzas, Ventas, Marketing, Operaciones
Roles de aprobación: Jefe directo, Jefe de segundo nivel, Aprobador designado`
  }

  const departments = context.departments.map(d => `${d.name} (${d.usersCount} usuarios)`).join(", ")
  const agents = context.users.filter(u => u.isAgent).map(u => `${u.firstName} ${u.lastName}`).join(", ")
  const ticketPatterns = context.tickets.map(t => `"${t.subject}" (${t.status})`).join(", ")
  const services = context.services.map(s => s.name).join(", ")

  return `Departamentos: ${departments || "No configurados"}
Agentes: ${agents || "No hay agentes"}
Servicios disponibles: ${services || "No configurados"}
Tickets frecuentes: ${ticketPatterns || "Sin tickets"}
Roles de aprobación: Jefe directo, Jefe de segundo nivel, Aprobador designado`
}

export async function POST(request: Request) {
  try {
    const { userText, currentWorkflow, instanceId, matchedService, conversationHistory } = await request.json() as {
      userText: string
      currentWorkflow?: Workflow
      instanceId?: string
      matchedService?: string
      conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>
    }

    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "API key de Anthropic no configurada" },
        { status: 500 }
      )
    }

    // Fetch real data from Redash if instanceId provided
    let instanceContext: InstanceContext | undefined
    if (instanceId) {
      try {
        instanceContext = await fetchInstanceContext(Number(instanceId))
      } catch (e) {
        console.error("Redash fetch failed, using defaults:", e)
      }
    }

    const empresaContext = buildEmpresaContext(instanceContext)

    const systemPrompt = `Sos un asistente que genera workflows de automatización para una plataforma de RRHH llamada Humand.

MODO DE RESPUESTA:
Antes de generar un workflow, evaluá si tenés suficiente información del usuario. Si el prompt es vago o le faltan detalles clave para armar un buen workflow, hacé 2-4 preguntas clarificadoras. Si ya tenés suficiente contexto (el usuario describió quién aprueba, qué pasa en cada caso, etc.), generá el workflow directamente.

- Si necesitás más información: Respondé con texto plano en español. Hacé preguntas específicas y concisas sobre lo que falta, por ejemplo:
  * Quién debe aprobar (qué rol o nivel jerárquico)
  * Cuántos niveles de aprobación se necesitan
  * Qué sucede cuando se rechaza la solicitud
  * Si se necesitan ramas condicionales (por departamento, monto, etc.)
  * Qué departamentos están involucrados
  Empezá tu respuesta EXACTAMENTE con "PREGUNTAS:" seguido de tus preguntas numeradas.

- Si tenés suficiente información: Respondé SOLO con JSON puro que coincida exactamente con el tipo Workflow. Empezá tu respuesta directamente con "{".

DATOS DE LA EMPRESA:
${empresaContext}

TIPOS DE DATOS:
\`\`\`typescript
type StepType = "approval" | "update" | "branch"

interface Step {
  id: string
  type: StepType
  label: string
  parent: string | null
  branch: string | null
  // approval
  approvers?: string[]
  condition?: "Todos deben aprobar" | "Al menos uno debe aprobar"
  // update
  status?: "En proceso" | "En espera" | "Cerrada" | "Cancelada"
  // branch
  conditions?: string[]
}

interface Workflow {
  trigger: string
  steps: Step[]
}
\`\`\`

REGLAS PARA GENERAR WORKFLOWS:
1. Solo devolvé JSON puro que coincida exactamente con el tipo Workflow (cuando generás, NO cuando preguntás)
2. NO incluyas markdown, explicaciones ni texto adicional en el JSON
3. Los IDs de steps deben ser únicos (s1, s2, s3, etc.)
4. Los approvers deben ser roles válidos (Jefe directo, Jefe de segundo nivel, Aprobador designado) o nombres de usuarios reales de la empresa
5. Los status válidos son: "En proceso", "En espera", "Cerrada", "Cancelada"
6. branch puede ser "approved", "rejected" o una condición del branch node
7. Para approval nodes, siempre incluí los dos outcomes: approved (Cerrada) y rejected (Cancelada)
8. Usá departamentos y datos reales de la empresa cuando sea relevante
${matchedService ? `9. El servicio trigger DEBE ser exactamente: "${matchedService}". Usá este nombre como el campo "trigger" del workflow.` : ""}
${currentWorkflow ? `${matchedService ? "10" : "9"}. IMPORTANTE: Modificá el workflow existente sin eliminar pasos existentes, solo agregá o modificá según lo pedido.` : ""}

${currentWorkflow ? `WORKFLOW ACTUAL:\n${JSON.stringify(currentWorkflow, null, 2)}` : ""}`

    // Build messages array from conversation history + current user text
    const apiMessages: Array<{ role: "user" | "assistant"; content: string }> = []
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        apiMessages.push({ role: msg.role, content: msg.content })
      }
    }
    apiMessages.push({ role: "user", content: userText })

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        messages: apiMessages,
        system: systemPrompt
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error("Anthropic API error:", response.status, errorData)
      return NextResponse.json(
        { error: `Error API (${response.status}): ${errorData}` },
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

    const trimmed = content.trim()

    // Check if Claude responded with clarifying questions instead of a workflow
    if (trimmed.startsWith("PREGUNTAS:") || (!trimmed.startsWith("{") && !trimmed.startsWith("[") && !trimmed.startsWith("```"))) {
      const questionsText = trimmed.startsWith("PREGUNTAS:")
        ? trimmed.slice("PREGUNTAS:".length).trim()
        : trimmed
      return NextResponse.json({ questions: questionsText })
    }

    // Otherwise, try to parse as workflow JSON
    try {
      let cleanContent = trimmed
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.slice(7)
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.slice(3)
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.slice(0, -3)
      }
      cleanContent = cleanContent.trim()

      const workflow: Workflow = JSON.parse(cleanContent)

      if (!workflow.trigger || !Array.isArray(workflow.steps)) {
        throw new Error("Estructura de workflow inválida")
      }

      return NextResponse.json({ workflow })
    } catch {
      console.error("Failed to parse workflow JSON:", content)
      return NextResponse.json(
        { error: "Error al parsear la respuesta del modelo" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Generate workflow error:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
