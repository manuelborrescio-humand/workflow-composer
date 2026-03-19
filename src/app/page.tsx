"use client"

import { useState, useCallback, useEffect } from "react"
import { WorkflowTopbar, type EmpresaFullData } from "@/components/workflow-topbar"
import { WorkflowSidebar } from "@/components/workflow-sidebar"
import { WorkflowCanvas } from "@/components/workflow-canvas"
import { NodeEditPanel } from "@/components/node-edit-panel"
import { DEFAULT_WORKFLOW, TEMPLATES, type Workflow, type ChatMessage, type Step } from "@/lib/workflow-types"
import { matchService } from "@/lib/service-matcher"
import { Toaster, toast } from "sonner"

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

  const handleGenerate = useCallback(async (text: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text
    }
    setMessages(prev => [...prev, userMsg])

    if (!instanceId || !empresaFull) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Primero cargá una comunidad ingresando el instanceId y haciendo click en \"Cargar\".",
        isError: true
      }
      setMessages(prev => [...prev, errorMsg])
      return
    }

    if (isLoadingInstance) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Esperá a que terminen de cargarse los datos de la comunidad.",
        isError: true
      }
      setMessages(prev => [...prev, errorMsg])
      return
    }

    const match = matchService(text, empresaFull.servicios)

    if (!match) {
      const serviceList = empresaFull.servicios.map(s => `• ${s.name}`).join("\n")
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `No encontré un servicio que coincida con tu descripción.\n\nPara crear este flujo, primero creá el servicio desde el Catálogo de servicios en Humand.\n\nServicios disponibles en ${empresaFull.nombre}:\n${serviceList}`,
        isError: true
      }
      setMessages(prev => [...prev, errorMsg])
      return
    }

    setIsGenerating(true)
    setSelectedStepId(null)

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userText: text,
          currentWorkflow: workflow,
          instanceId: instanceId || undefined,
          matchedService: match.serviceName
        })
      })

      const data = await response.json()

      if (data.error) {
        const errorMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Error: ${data.error}`,
          isError: true
        }
        setMessages(prev => [...prev, errorMsg])
      } else if (data.workflow) {
        setWorkflow(data.workflow)
        setWorkflowName(data.workflow.trigger)
        setSelectedTemplateId(null)
        setIsDraft(true)

        const successMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Workflow generado: "${data.workflow.trigger}" con ${data.workflow.steps.length} pasos.`
        }
        setMessages(prev => [...prev, successMsg])
      }
    } catch {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Error al conectar con el servidor.",
        isError: true
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsGenerating(false)
    }
  }, [workflow, instanceId, empresaFull, isLoadingInstance])

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
