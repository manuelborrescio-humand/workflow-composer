"use client"

import { useState, useCallback } from "react"
import { WorkflowTopbar } from "@/components/workflow-topbar"
import { WorkflowSidebar } from "@/components/workflow-sidebar"
import { WorkflowCanvas } from "@/components/workflow-canvas"
import { DEFAULT_WORKFLOW, TEMPLATES, type Workflow, type ChatMessage } from "@/lib/workflow-types"
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
  const [isLoadingInstance, setIsLoadingInstance] = useState(false)

  const handleLoadInstance = useCallback(async () => {
    if (!instanceId) return
    setIsLoadingInstance(true)
    try {
      const res = await fetch(`/api/redash?instanceId=${instanceId}`)
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
        return
      }
      setEmpresa({
        nombre: `Comunidad #${instanceId}`,
        departamentos: data.departments?.map((d: { name: string }) => d.name) || [],
        usuarios: data.users?.length || 0,
        agentes: data.users?.filter((u: { isAgent: boolean }) => u.isAgent).length || 0,
        servicios: data.services?.length || 0,
      })
      toast.success(`Datos cargados: ${data.users?.length || 0} usuarios, ${data.departments?.length || 0} departamentos`)
    } catch {
      toast.error("Error al cargar datos de la comunidad")
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

  const handleGenerate = useCallback(async (text: string) => {
    // Add user message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text
    }
    setMessages(prev => [...prev, userMsg])
    setIsGenerating(true)

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userText: text,
          currentWorkflow: workflow,
          instanceId: instanceId || undefined
        })
      })

      const data = await response.json()

      if (data.error) {
        const errorMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Error: ${data.error}`
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
        content: "Error al conectar con el servidor."
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsGenerating(false)
    }
  }, [workflow, instanceId])

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
        <WorkflowCanvas workflow={workflow} />
      </div>
    </div>
  )
}
