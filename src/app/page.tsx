"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { WorkflowTopbar, type EmpresaFullData } from "@/components/workflow-topbar"
import { WorkflowSidebar } from "@/components/workflow-sidebar"
import { WorkflowCanvas } from "@/components/workflow-canvas"
import { NodeEditPanel } from "@/components/node-edit-panel"
import { DEFAULT_WORKFLOW, TEMPLATES, type Workflow, type ChatMessage, type Step } from "@/lib/workflow-types"
import { Toaster, toast } from "sonner"

const CONFIDENCE_HIGH = 85
const CONFIDENCE_LOW = 40

interface EmpresaData {
  nombre: string
  departamentos: string[]
  usuarios: number
  agentes: number
  servicios: number
}

export default function WorkflowComposer() {
  const [workflow, setWorkflow] = useState<Workflow | null>(DEFAULT_WORKFLOW)
  const [workflowName, setWorkflowName] = useState("Solicitud de vacaciones")
  const [isDraft, setIsDraft] = useState(true)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>("vacaciones")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasApiKey] = useState(true)

  const [instanceId, setInstanceId] = useState("")
  const [empresa, setEmpresa] = useState<EmpresaData | undefined>()
  const [empresaFull, setEmpresaFull] = useState<EmpresaFullData | undefined>()
  const [isLoadingInstance, setIsLoadingInstance] = useState(false)

  // Node selection for edit panel
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null) // step id or "__trigger__"
  const selectedStep = selectedStepId === "__trigger__"
    ? null
    : workflow?.steps.find(s => s.id === selectedStepId) || null
  const isPanelOpen = selectedStepId !== null

  // Close panel on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedStepId(null)
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [])

  const handleNodeClick = useCallback((step: Step | null) => {
    if (step === null) {
      // Trigger node clicked
      setSelectedStepId("__trigger__")
    } else {
      setSelectedStepId(step.id)
    }
  }, [])

  const handleUpdateStep = useCallback((stepId: string, updates: Partial<Step>) => {
    setWorkflow(prev => {
      if (!prev) return prev
      return {
        ...prev,
        steps: prev.steps.map(s => s.id === stepId ? { ...s, ...updates } : s)
      }
    })
    setIsDraft(true)
  }, [])

  const handleLoadInstance = useCallback(async () => {
    if (!instanceId) return
    setIsLoadingInstance(true)
    try {
      const res = await fetch(`/api/redash?instanceId=${instanceId}`)
      const data = await res.json()
      if (data.error) {
        const errorMsg: ChatMessage = {
          id: Date.now().toString(),
          role: "assistant",
          content: `Error al cargar la comunidad: ${data.error}`,
          isError: true
        }
        setMessages(prev => [...prev, errorMsg])
        return
      }
      const nombre = data.instanceName || `Comunidad #${instanceId}`
      const users = data.users || []
      const departments = data.departments || []
      const agents = users.filter((u: { isAgent: boolean }) => u.isAgent)

      setEmpresa({
        nombre,
        departamentos: departments.map((d: { name: string }) => d.name),
        usuarios: users.length,
        agentes: agents.length,
        servicios: data.services?.length || 0,
      })
      setEmpresaFull({
        nombre,
        departamentos: departments,
        agentes: agents.map((a: { firstName: string; lastName: string; email: string }) => ({
          firstName: a.firstName, lastName: a.lastName, email: a.email
        })),
        tickets: data.tickets || [],
        servicios: (data.services || []).map((s: { name: string; status: string }) => ({
          name: s.name, status: s.status
        })),
      })
      toast.success(`Datos cargados: ${data.users?.length || 0} usuarios, ${data.departments?.length || 0} departamentos`)
    } catch {
      const errorMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: "Error al conectar con el servidor para cargar datos de la comunidad.",
        isError: true
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsLoadingInstance(false)
    }
  }, [instanceId])

  const handleSelectTemplate = useCallback((templateWorkflow: Workflow) => {
    setWorkflow(templateWorkflow)
    setWorkflowName(templateWorkflow.trigger)
    setIsDraft(true)
    setSelectedStepId(null)
    const template = TEMPLATES.find(t => t.workflow.trigger === templateWorkflow.trigger)
    setSelectedTemplateId(template?.id || null)
    setMessages([])
  }, [])

  // Ref for messages to avoid stale closures in handlers
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  // Generate workflow with a specific service (reusable for all 3 levels)
  const generateWorkflow = useCallback(async (userText: string, serviceName: string) => {
    setIsGenerating(true)
    setSelectedStepId(null)

    const thinkingMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "assistant",
      content: `Generando workflow para "${serviceName}"...`
    }
    setMessages(prev => [...prev, thinkingMsg])

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userText,
          currentWorkflow: workflow,
          instanceId: instanceId || undefined,
          matchedService: serviceName
        })
      })

      const data = await response.json()

      if (data.error) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "assistant" as const,
          content: `Error: ${data.error}`,
          isError: true
        }])
      } else if (data.workflow) {
        setWorkflow(data.workflow)
        setWorkflowName(data.workflow.trigger)
        setSelectedTemplateId(null)
        setIsDraft(true)

        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "assistant" as const,
          content: `Workflow generado: "${data.workflow.trigger}" con ${data.workflow.steps.length} pasos.`
        }])
      }
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant" as const,
        content: "Error al conectar con el servidor.",
        isError: true
      }])
    } finally {
      setIsGenerating(false)
    }
  }, [workflow, instanceId])

  const handleGenerate = useCallback(async (text: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text
    }
    setMessages(prev => [...prev, userMsg])

    if (!instanceId || !empresaFull) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant" as const,
        content: "Primero cargá una comunidad ingresando el instanceId y haciendo click en \"Cargar\".",
        isError: true
      }])
      return
    }

    if (isLoadingInstance) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant" as const,
        content: "Esperá a que terminen de cargarse los datos de la comunidad.",
        isError: true
      }])
      return
    }

    if (empresaFull.servicios.length === 0) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant" as const,
        content: "No hay servicios configurados en esta comunidad. Creá servicios desde el Catálogo de servicios en Humand.",
        isError: true
      }])
      return
    }

    // LLM-based service matching
    setIsGenerating(true)
    try {
      const matchRes = await fetch("/api/match-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userText: text, services: empresaFull.servicios })
      })
      const matchData = await matchRes.json()

      if (matchData.error) {
        // API error → fallback to Level 3 (never dead-end)
        setMessages(prev => [...prev, {
          id: (Date.now() + 2).toString(),
          role: "assistant" as const,
          content: "No pude determinar el servicio automáticamente.\n¿Quizás querés crear un flujo para alguno de estos?",
          type: "service-list" as const,
          services: empresaFull.servicios,
          originalUserText: text,
          resolved: false
        }])
        setIsGenerating(false)
        return
      }

      const { matched_service, confidence } = matchData

      if (matched_service && confidence > CONFIDENCE_HIGH) {
        // LEVEL 1: High confidence → auto-generate
        setIsGenerating(false)
        await generateWorkflow(text, matched_service)
      } else if (matched_service && confidence >= CONFIDENCE_LOW) {
        // LEVEL 2: Partial match → confirm with user
        setMessages(prev => [...prev, {
          id: (Date.now() + 2).toString(),
          role: "assistant" as const,
          content: `Entendí que querés crear un flujo para "${matched_service}".\n¿Es lo que estás buscando?`,
          type: "confirmation" as const,
          matchedService: matched_service,
          originalUserText: text,
          resolved: false
        }])
        setIsGenerating(false)
      } else {
        // LEVEL 3: No match → show service list
        setMessages(prev => [...prev, {
          id: (Date.now() + 2).toString(),
          role: "assistant" as const,
          content: "No encontré ningún servicio que se parezca a lo que describís.\n¿Quizás querés crear un flujo para alguno de estos?",
          type: "service-list" as const,
          services: empresaFull.servicios,
          originalUserText: text,
          resolved: false
        }])
        setIsGenerating(false)
      }
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant" as const,
        content: "Error al conectar con el servidor.",
        isError: true
      }])
      setIsGenerating(false)
    }
  }, [instanceId, empresaFull, isLoadingInstance, generateWorkflow])

  // Interactive message handlers
  const markMessageResolved = useCallback((messageId: string) => {
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, resolved: true } : m
    ))
  }, [])

  const handleConfirmService = useCallback(async (messageId: string) => {
    const msg = messagesRef.current.find(m => m.id === messageId)
    if (!msg?.matchedService || !msg?.originalUserText) return
    markMessageResolved(messageId)
    await generateWorkflow(msg.originalUserText, msg.matchedService)
  }, [markMessageResolved, generateWorkflow])

  const handleRejectMatch = useCallback((messageId: string) => {
    const msg = messagesRef.current.find(m => m.id === messageId)
    if (!msg?.originalUserText || !empresaFull) return
    markMessageResolved(messageId)
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: "assistant" as const,
      content: "Elegí el servicio que más se ajuste a tu solicitud:",
      type: "service-list" as const,
      services: empresaFull.servicios,
      originalUserText: msg.originalUserText,
      resolved: false
    }])
  }, [empresaFull, markMessageResolved])

  const handleSelectService = useCallback(async (serviceName: string, messageId: string) => {
    const msg = messagesRef.current.find(m => m.id === messageId)
    if (!msg?.originalUserText) return
    markMessageResolved(messageId)
    await generateWorkflow(msg.originalUserText, serviceName)
  }, [markMessageResolved, generateWorkflow])

  const handleTriggerChange = useCallback((newTrigger: string) => {
    setWorkflow(prev => prev ? { ...prev, trigger: newTrigger } : prev)
    setWorkflowName(newTrigger)
    setIsDraft(true)
  }, [])

  const handlePublish = useCallback(() => {
    setIsDraft(false)
    toast.success("Workflow publicado correctamente", {
      duration: 3000,
    })
  }, [])

  return (
    <div className="h-screen flex flex-col bg-background">
      <Toaster position="top-center" richColors />
      <WorkflowTopbar
        workflowName={workflowName}
        onNameChange={setWorkflowName}
        isDraft={isDraft}
        onPublish={handlePublish}
        workflow={workflow}
        empresaData={empresaFull}
      />
      <div className="flex flex-1 overflow-hidden">
        <WorkflowSidebar
          onSelectTemplate={handleSelectTemplate}
          onGenerate={handleGenerate}
          selectedTemplateId={selectedTemplateId}
          messages={messages}
          isGenerating={isGenerating}
          hasApiKey={hasApiKey}
          empresa={empresa}
          instanceId={instanceId}
          onInstanceIdChange={setInstanceId}
          onLoadInstance={handleLoadInstance}
          isLoadingInstance={isLoadingInstance}
          onConfirmService={handleConfirmService}
          onRejectMatch={handleRejectMatch}
          onSelectService={handleSelectService}
        />
        <WorkflowCanvas
          workflow={workflow}
          services={empresaFull?.servicios}
          onTriggerChange={handleTriggerChange}
          onNodeClick={handleNodeClick}
          selectedStepId={selectedStepId}
        />
        <NodeEditPanel
          isOpen={isPanelOpen}
          step={selectedStep}
          isTrigger={selectedStepId === "__trigger__"}
          trigger={workflow?.trigger}
          services={empresaFull?.servicios}
          agents={empresaFull?.agentes}
          onClose={() => setSelectedStepId(null)}
          onUpdateStep={handleUpdateStep}
          onUpdateTrigger={handleTriggerChange}
        />
      </div>
    </div>
  )
}
