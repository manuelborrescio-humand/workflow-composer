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
  const [templatesOpen, setTemplatesOpen] = useState(false)

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
    <div className="w-[320px] bg-white border-r border-[#E5E7EB] flex flex-col h-full shadow-sm">
      {/* Templates (collapsible) */}
      <div className="border-b border-[#E5E7EB]">
        <button
          onClick={() => setTemplatesOpen(!templatesOpen)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-[#F8F9FA] transition-colors"
        >
          <p className="text-[11px] uppercase text-[#9CA3AF] font-semibold tracking-wider">
            Templates
          </p>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9CA3AF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-200 ${templatesOpen ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        {templatesOpen && (
          <div className="px-5 pb-4 flex flex-col gap-1.5">
            {TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => onSelectTemplate(template.workflow)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-150 ${
                  selectedTemplateId === template.id
                    ? "bg-[#EEF0FB] border border-[#496BE3]/30 shadow-sm"
                    : "bg-white border border-transparent hover:bg-[#F8F9FA] hover:border-[#E5E7EB]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{template.emoji}</span>
                  <div>
                    <p className={`text-[12.5px] font-medium ${
                      selectedTemplateId === template.id ? "text-[#496BE3]" : "text-[#1A1A2E]"
                    }`}>
                      {template.title}
                    </p>
                    <p className="text-[10.5px] text-[#9CA3AF]">
                      {template.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Instance selector + Company snapshot */}
      <div className="px-5 py-3 border-b border-[#E5E7EB]">
        <p className="text-[11px] uppercase text-[#9CA3AF] font-semibold mb-2 tracking-wider">
          Comunidad
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={instanceId || ""}
            onChange={(e) => onInstanceIdChange?.(e.target.value)}
            placeholder="instanceId"
            className="flex-1 px-3 py-2 bg-[#F8F9FA] border border-[#E5E7EB] rounded-lg text-[12px] text-[#1A1A2E] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#496BE3]/20 focus:border-[#496BE3] transition-all"
          />
          <button
            onClick={onLoadInstance}
            disabled={!instanceId || isLoadingInstance}
            className={`px-4 py-2 rounded-lg text-[12px] font-semibold transition-all duration-150 ${
              instanceId && !isLoadingInstance
                ? "bg-[#496BE3] text-white hover:bg-[#3D5CC7] shadow-sm"
                : "bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed"
            }`}
          >
            {isLoadingInstance ? "..." : "Cargar"}
          </button>
        </div>
        {empresa && (
          <div className="bg-gradient-to-br from-[#F8F9FA] to-[#EEF0FB] rounded-xl p-3.5 border border-[#E5E7EB] mt-2.5">
            <p className="text-[13px] font-semibold text-[#1A1A2E]">
              {empresa.nombre}
            </p>
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 text-[11px] text-[#6B7280]">
                <span className="w-4 text-center text-[#496BE3]">S</span>
                <span>{empresa.servicios} servicios</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#6B7280]">
                <span className="w-4 text-center text-[#496BE3]">D</span>
                <span>{empresa.departamentos.length} departamentos</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#6B7280]">
                <span className="w-4 text-center text-[#496BE3]">U</span>
                <span>{empresa.usuarios} usuarios ({empresa.agentes} agentes)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-auto px-5 py-4">
        <div className="space-y-2.5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`px-3 py-2.5 rounded-xl text-[12px] leading-relaxed ${
                msg.role === "user"
                  ? "bg-[#F3F4F6] text-[#1A1A2E]"
                  : "bg-[#EEF0FB] text-[#496BE3] border border-[#496BE3]/10"
              }`}
            >
              {msg.content}
            </div>
          ))}
        </div>
      </div>

      {/* Input area */}
      <div className="px-5 py-4 border-t border-[#E5E7EB] bg-white">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={"Describe el flujo de trabajo...\n\nEj: Cuando un empleado solicita vacaciones, que lo apruebe su jefe directo."}
          className="w-full h-[120px] px-3 py-2.5 bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl text-[12.5px] text-[#1A1A2E] resize-none placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#496BE3]/20 focus:border-[#496BE3] transition-all leading-relaxed"
          disabled={isGenerating}
        />
        <button
          onClick={handleSubmit}
          disabled={!inputText.trim() || isGenerating}
          className={`w-full mt-2.5 py-2.5 px-4 rounded-xl text-[13px] font-semibold transition-all duration-150 ${
            inputText.trim() && !isGenerating
              ? "bg-[#496BE3] text-white hover:bg-[#3D5CC7] shadow-md shadow-[#496BE3]/20"
              : "bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed"
          }`}
        >
          {isGenerating ? "Generando..." : "Generar workflow"}
        </button>
      </div>
    </div>
  )
}
