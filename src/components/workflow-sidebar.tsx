"use client"

import { useState } from "react"
import type { Workflow, Template, ChatMessage } from "@/lib/workflow-types"
import { TEMPLATES } from "@/lib/workflow-types"

interface EmpresaData {
  nombre: string
  departamentos: string[]
  usuarios: number
  agentes: number
  servicios: number
}

interface WorkflowSidebarProps {
  onSelectTemplate: (workflow: Workflow) => void
  onGenerate: (text: string) => Promise<void>
  selectedTemplateId: string | null
  messages: ChatMessage[]
  isGenerating: boolean
  hasApiKey: boolean
  empresa?: EmpresaData
  instanceId?: string
  onInstanceIdChange?: (id: string) => void
  onLoadInstance?: () => void
  isLoadingInstance?: boolean
}

export function WorkflowSidebar({
  onSelectTemplate,
  onGenerate,
  selectedTemplateId,
  messages,
  isGenerating,
  hasApiKey,
  empresa,
  instanceId,
  onInstanceIdChange,
  onLoadInstance,
  isLoadingInstance
}: WorkflowSidebarProps) {
  const [inputText, setInputText] = useState("")

  const handleSubmit = async () => {
    if (!inputText.trim() || isGenerating) return
    const text = inputText
    setInputText("")
    await onGenerate(text)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="w-[300px] bg-card border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h1 className="text-[13px] font-bold text-foreground flex items-center gap-1">
          {"⚡"} Workflow Composer
        </h1>
        <p className="text-[11px] text-muted-foreground mt-1">
          Describí el proceso y Claude genera el workflow automáticamente.
        </p>
      </div>

      {/* Templates */}
      <div className="p-4 border-b border-border">
        <p className="text-[10px] uppercase text-muted-foreground font-medium mb-2 tracking-wide">
          TEMPLATES
        </p>
        <div className="flex flex-col gap-2">
          {TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelectTemplate(template.workflow)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                selectedTemplateId === template.id
                  ? "bg-muted border-2 border-primary"
                  : "bg-muted border-2 border-transparent hover:border-border"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{template.emoji}</span>
                <div>
                  <p className="text-[12px] font-medium text-foreground">
                    {template.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {template.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Instance selector + Company snapshot */}
      <div className="p-4 border-b border-border">
        <p className="text-[10px] uppercase text-muted-foreground font-medium mb-2 tracking-wide">
          COMUNIDAD
        </p>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={instanceId || ""}
            onChange={(e) => onInstanceIdChange?.(e.target.value)}
            placeholder="instanceId"
            className="flex-1 px-2 py-1.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-[11px] focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={onLoadInstance}
            disabled={!instanceId || isLoadingInstance}
            className={`px-3 py-1.5 rounded text-[11px] font-medium transition-colors ${
              instanceId && !isLoadingInstance
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            {isLoadingInstance ? "..." : "Cargar"}
          </button>
        </div>
        {empresa ? (
          <div className="bg-muted rounded-lg p-3">
            <p className="text-[12px] font-bold text-foreground">
              {"🏢"} {empresa.nombre}
            </p>
            <div className="mt-2 space-y-1">
              <p className="text-[10px] text-muted-foreground">
                {"📋"} {empresa.servicios} servicios
              </p>
              <p className="text-[10px] text-muted-foreground">
                {"🏢"} {empresa.departamentos.length} departamentos
              </p>
              <p className="text-[10px] text-muted-foreground">
                {"👤"} {empresa.usuarios} usuarios ({empresa.agentes} agentes)
              </p>
            </div>
            <p className="text-[9px] text-primary mt-3">
              Claude conoce estos datos al generar
            </p>
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground italic">
            Ingresa un instanceId para cargar datos reales
          </p>
        )}
      </div>

      {/* Chat history */}
      <div className="flex-1 overflow-auto p-4">
        <p className="text-[10px] uppercase text-muted-foreground font-medium mb-2 tracking-wide">
          HISTORIAL
        </p>
        <div className="space-y-2">
          {messages.length === 0 ? (
            <p className="text-[11px] text-muted-foreground italic">
              Usá un template o describí el flujo...
            </p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-2 rounded-lg text-[11px] ${
                  msg.role === "user"
                    ? "bg-muted text-foreground"
                    : "bg-transparent text-primary"
                }`}
              >
                {msg.content}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-border">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Describí el flujo...\n\nEj: Para home office, aprobación del jefe directo. Si aprueba → En proceso. Si rechaza → Cancelada.`}
          className="w-full h-24 p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-[12px] resize-none placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          disabled={isGenerating}
        />
        <button
          onClick={handleSubmit}
          disabled={!inputText.trim() || isGenerating}
          className={`w-full mt-2 py-2 px-4 rounded-lg text-[13px] font-medium transition-colors ${
            inputText.trim() && !isGenerating
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
        >
          {isGenerating ? "⏳ Generando..." : "⚡ Generar workflow"}
        </button>
        {!hasApiKey && (
          <p className="text-[10px] text-[#F59E0B] text-center mt-2">
            {"💡"} Necesitás la API key para generación real
          </p>
        )}
      </div>
    </div>
  )
}
