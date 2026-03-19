"use client"

import { useState, useRef, useEffect } from "react"
import type { Workflow, ChatMessage } from "@/lib/workflow-types"
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
  onConfirmService?: (messageId: string) => void
  onRejectMatch?: (messageId: string) => void
  onSelectService?: (serviceName: string, messageId: string) => void
}

function SmallSpinner() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  )
}

function LightningIconSmall() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  )
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
  isLoadingInstance,
  onConfirmService,
  onRejectMatch,
  onSelectService
}: WorkflowSidebarProps) {
  const [inputText, setInputText] = useState("")
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [activeActionMessageId, setActiveActionMessageId] = useState<string | null>(null)
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Reset active action when generation finishes
  useEffect(() => {
    if (!isGenerating) {
      setActiveActionMessageId(null)
      setActiveAction(null)
    }
  }, [isGenerating])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px"
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

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

  const renderMessage = (msg: ChatMessage) => {
    // Confirmation message (Level 2)
    if (msg.type === "confirmation" && msg.role === "assistant") {
      const isActive = activeActionMessageId === msg.id
      const buttonsDisabled = msg.resolved || isGenerating

      return (
        <div key={msg.id}>
          <p className="text-[10px] font-medium mb-1 text-[#496BE3]">Asistente</p>
          <div className="px-3 py-2.5 rounded-xl text-[12px] leading-relaxed bg-white border border-[#E8E8E8] shadow-sm">
            <p className="text-[#000] whitespace-pre-wrap">{msg.content}</p>
            <div className="flex gap-2 mt-3">
              <button
                disabled={buttonsDisabled}
                onClick={() => {
                  setActiveActionMessageId(msg.id)
                  setActiveAction("confirm")
                  onConfirmService?.(msg.id)
                }}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-medium transition-all duration-150 ${
                  buttonsDisabled
                    ? "bg-[#7C3AED]/40 text-white cursor-not-allowed"
                    : "bg-[#7C3AED] text-white hover:bg-[#6D28D9]"
                }`}
              >
                {isActive && activeAction === "confirm" && isGenerating ? <SmallSpinner /> : null}
                Sí, crear flujo
              </button>
              <button
                disabled={buttonsDisabled}
                onClick={() => {
                  setActiveActionMessageId(msg.id)
                  setActiveAction("reject")
                  onRejectMatch?.(msg.id)
                }}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-medium transition-all duration-150 ${
                  buttonsDisabled
                    ? "border border-[#E8E8E8] bg-[#F7F7F7] text-[#B0B0C0] cursor-not-allowed"
                    : "border border-[#E8E8E8] bg-white text-[#606060] hover:bg-[#F7F7F7]"
                }`}
              >
                No, elegir otro
              </button>
            </div>
          </div>
        </div>
      )
    }

    // Service list message (Level 3)
    if (msg.type === "service-list" && msg.role === "assistant") {
      const isActive = activeActionMessageId === msg.id
      const cardsDisabled = msg.resolved || isGenerating

      return (
        <div key={msg.id}>
          <p className="text-[10px] font-medium mb-1 text-[#496BE3]">Asistente</p>
          <div className="px-3 py-2.5 rounded-xl text-[12px] leading-relaxed bg-white border border-[#E8E8E8] shadow-sm">
            <p className="text-[#000] whitespace-pre-wrap">{msg.content}</p>
            <div className="flex flex-col gap-1.5 mt-3 max-h-[200px] overflow-auto">
              {msg.services?.map(service => (
                <button
                  key={service.name}
                  disabled={cardsDisabled}
                  onClick={() => {
                    setActiveActionMessageId(msg.id)
                    setActiveAction(service.name)
                    onSelectService?.(service.name, msg.id)
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-150 ${
                    cardsDisabled
                      ? "bg-[#F7F7F7] border border-[#E8E8E8] cursor-not-allowed opacity-60"
                      : "bg-white border border-[#E8E8E8] hover:bg-[#F7F7F7] hover:border-[#C8C8D0] cursor-pointer"
                  }`}
                >
                  <div className="w-[28px] h-[28px] rounded-lg bg-[#E8F5E9] flex items-center justify-center shrink-0">
                    {isActive && activeAction === service.name && isGenerating
                      ? <SmallSpinner />
                      : <LightningIconSmall />
                    }
                  </div>
                  <span className="text-[12px] font-medium text-[#000] flex-1">{service.name}</span>
                  <span className="text-[10px] rounded-full px-2 py-0.5 bg-[#E8F5E9] text-[#16A34A] shrink-0">
                    Activo
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )
    }

    // Default text message (same as before)
    return (
      <div key={msg.id}>
        <p className={`text-[10px] font-medium mb-1 ${
          msg.role === "user" ? "text-[#606060]" : msg.isError ? "text-[#B91C1C]" : "text-[#496BE3]"
        }`}>
          {msg.role === "user" ? "Tú" : "Asistente"}
        </p>
        <div
          className={`px-3 py-2.5 rounded-xl text-[12px] leading-relaxed whitespace-pre-wrap ${
            msg.role === "user"
              ? "bg-[#F3F3F5] text-[#000]"
              : msg.isError
                ? "bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]"
                : "bg-[#EEF2FF] text-[#496BE3] border border-[#496BE3]/10"
          }`}
        >
          {msg.content}
        </div>
      </div>
    )
  }

  return (
    <div className="w-[320px] bg-white border-r border-[#DDD] flex flex-col h-full shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#DDD]">
        <p className="text-[15px] font-bold text-[#000]">Workflow Composer</p>
        <p className="text-[11px] text-[#606060] mt-0.5">Diseñá flujos con IA</p>
      </div>

      {/* Instance selector */}
      <div className="px-5 py-3 border-b border-[#DDD]">
        <p className="text-[11px] uppercase text-[#606060] font-semibold mb-2 tracking-wider">
          Comunidad
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={instanceId || ""}
            onChange={(e) => onInstanceIdChange?.(e.target.value)}
            placeholder="instanceId"
            className="flex-1 px-3 py-2 bg-[#F7F7F7] border border-[#DDD] rounded-lg text-[12px] text-[#000] placeholder:text-[#606060] focus:outline-none focus:ring-2 focus:ring-[#496BE3]/20 focus:border-[#496BE3] transition-all"
          />
          <button
            onClick={onLoadInstance}
            disabled={!instanceId || isLoadingInstance}
            className={`px-4 py-2 rounded-lg text-[12px] font-semibold transition-all duration-150 ${
              instanceId && !isLoadingInstance
                ? "bg-[#496BE3] text-white hover:bg-[#3D5CC7] shadow-sm"
                : "bg-[#F3F3F5] text-[#606060] cursor-not-allowed"
            }`}
          >
            {isLoadingInstance ? "..." : "Cargar"}
          </button>
        </div>
        {empresa && (
          <p className="text-[11px] text-[#606060] mt-2">
            ✓ <span className="font-medium text-[#000]">{empresa.nombre}</span>
          </p>
        )}
      </div>

      {/* Templates (collapsible) */}
      <div className="border-b border-[#DDD]">
        <button
          onClick={() => setTemplatesOpen(!templatesOpen)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-[#F7F7F7] transition-colors"
        >
          <p className="text-[11px] uppercase text-[#606060] font-semibold tracking-wider">
            Templates
          </p>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#606060"
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
                    ? "bg-[#EEF2FF] border border-[#496BE3]/30 shadow-sm"
                    : "bg-white border border-transparent hover:bg-[#F7F7F7] hover:border-[#DDD]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{template.emoji}</span>
                  <div>
                    <p className={`text-[12.5px] font-medium ${
                      selectedTemplateId === template.id ? "text-[#496BE3]" : "text-[#000]"
                    }`}>
                      {template.title}
                    </p>
                    <p className="text-[10.5px] text-[#606060]">
                      {template.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-auto px-4 py-4 flex flex-col">
        {messages.length === 0 && (
          <button
            onClick={() => {
              if (textareaRef.current) {
                textareaRef.current.focus()
                const example = "Cuando un empleado solicita vacaciones, que lo apruebe su jefe directo."
                setInputText(example)
                textareaRef.current.style.height = "auto"
                textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px"
              }
            }}
            className="w-full text-left px-4 py-3.5 rounded-xl border border-dashed border-[#DDD] hover:border-[#496BE3]/40 hover:bg-[#EEF2FF]/30 transition-all duration-150 group"
          >
            <p className="text-[11px] font-semibold text-[#606060] uppercase tracking-wider mb-1.5 group-hover:text-[#496BE3]">Ejemplo</p>
            <p className="text-[12.5px] text-[#606060] leading-relaxed group-hover:text-[#496BE3]">
              Cuando un empleado solicita vacaciones, que lo apruebe su jefe directo.
            </p>
          </button>
        )}
        <div className="space-y-3 mt-auto">
          {messages.map((msg) => renderMessage(msg))}
          <div ref={messagesEndRef} />
        </div>
      </div>


      {/* Input area */}
      <div className="px-4 py-3 border-t border-[#DDD] bg-white">
        <div className={`flex items-end gap-2 bg-[#F7F7F7] border rounded-xl px-3 py-2 transition-all ${
          isGenerating ? "border-[#DDD]" : "border-[#DDD] focus-within:ring-2 focus-within:ring-[#496BE3]/20 focus-within:border-[#496BE3]"
        }`}>
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Describe el flujo de trabajo..."
            rows={1}
            className="flex-1 bg-transparent text-[12.5px] text-[#000] resize-none placeholder:text-[#606060] focus:outline-none leading-relaxed"
            style={{ minHeight: "22px", maxHeight: "120px" }}
            disabled={isGenerating}
          />
          <button
            onClick={handleSubmit}
            disabled={!inputText.trim() || isGenerating}
            className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 ${
              inputText.trim() && !isGenerating
                ? "bg-[#496BE3] text-white hover:bg-[#3D5CC7]"
                : "bg-[#DDD] text-[#606060] cursor-not-allowed"
            }`}
          >
            {isGenerating ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
