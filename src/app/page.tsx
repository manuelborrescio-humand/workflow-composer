"use client"

import { useState, useCallback } from "react"
import { WorkflowTopbar, type EmpresaFullData } from "@/components/workflow-topbar"
import { WorkflowSidebar } from "@/components/workflow-sidebar"
import { WorkflowCanvas } from "@/components/workflow-canvas"
import { DEFAULT_WORKFLOW, TEMPLATES, type Workflow, type ChatMessage } from "@/lib/workflow-types"
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

  // --- Feature 3: Errors as chat bubbles ---
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
    const template = TEMPLATES.find(t => t.workflow.trigger === templateWorkflow.trigger)
    setSelectedTemplateId(template?.id || null)
    setMessages([])
  }, [])

  // --- Feature 1: Service validation before generating ---
  const handleGenerate = useCallback(async (text: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text
    }
    setMessages(prev => [...prev, userMsg])

    // Validation: instanceId loaded?
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

    // Validation: loading in progress?
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

    // Validation: match service
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

    // Matched → proceed with generation
    setIsGenerating(true)

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

  // --- Feature 2: Trigger change from dropdown ---
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
        />
      </div>
    </div>
  )
}
