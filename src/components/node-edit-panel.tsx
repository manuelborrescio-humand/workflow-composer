"use client"

import { useState, useEffect } from "react"
import type { Step } from "@/lib/workflow-types"

interface NodeEditPanelProps {
  isOpen: boolean
  step: Step | null
  isTrigger: boolean
  trigger?: string
  services?: { name: string; status: string }[]
  agents?: { firstName: string; lastName: string; email: string }[]
  onClose: () => void
  onUpdateStep: (stepId: string, updates: Partial<Step>) => void
  onUpdateTrigger: (newTrigger: string) => void
}

function PanelField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-[#606060] uppercase tracking-wider block mb-2">
        {label}
      </label>
      {children}
    </div>
  )
}

// --- Trigger Panel ---
function TriggerPanel({ trigger, services, onUpdateTrigger }: {
  trigger: string
  services?: { name: string; status: string }[]
  onUpdateTrigger: (t: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <PanelField label="Disparador">
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="w-full text-left bg-[#F7F7F7] border border-[#DDD] rounded-xl px-3 py-2.5 text-[13px] text-[#000] flex justify-between items-center hover:border-[#496BE3]/40 transition-colors"
        >
          <span>{trigger}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#606060" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${open ? "rotate-180" : ""}`}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        {open && services && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-[#E8E8E8] shadow-lg z-50 max-h-[240px] overflow-auto py-1">
            {services.map(s => (
              <button
                key={s.name}
                onClick={() => { onUpdateTrigger(s.name); setOpen(false) }}
                className={`w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-[#F7F7F7] transition-colors ${
                  s.name === trigger ? "bg-[#EEF2FF]" : ""
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.status === "ENABLED" ? "bg-[#16A34A]" : "bg-[#D1D5DB]"}`} />
                <span className={`text-[13px] flex-1 ${s.name === trigger ? "font-semibold text-[#496BE3]" : "text-[#000]"}`}>{s.name}</span>
                {s.name === trigger && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#496BE3" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </PanelField>
  )
}

// --- Approval Panel ---
function ApprovalPanel({ step, agents, onUpdate }: {
  step: Step
  agents?: { firstName: string; lastName: string; email: string }[]
  onUpdate: (updates: Partial<Step>) => void
}) {
  const [label, setLabel] = useState(step.label)
  const [showApproverDropdown, setShowApproverDropdown] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => { setLabel(step.label) }, [step.label])

  const roles = ["Jefe directo", "Jefe de segundo nivel", "Aprobador designado"]
  const currentApprovers = step.approvers || []

  const filteredAgents = (agents || []).filter(a =>
    `${a.firstName} ${a.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const addApprover = (name: string) => {
    if (!currentApprovers.includes(name)) {
      onUpdate({ approvers: [...currentApprovers, name] })
    }
    setShowApproverDropdown(false)
    setSearchQuery("")
  }

  const removeApprover = (name: string) => {
    onUpdate({ approvers: currentApprovers.filter(a => a !== name) })
  }

  return (
    <div className="flex flex-col gap-5">
      <PanelField label="Nombre del paso">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => onUpdate({ label })}
          onKeyDown={(e) => { if (e.key === "Enter") onUpdate({ label }) }}
          className="w-full bg-[#F7F7F7] border border-[#DDD] rounded-xl px-3 py-2.5 text-[13px] text-[#000] focus:outline-none focus:ring-2 focus:ring-[#496BE3]/20 focus:border-[#496BE3]"
        />
      </PanelField>

      <PanelField label="Condición">
        <div className="grid grid-cols-2 gap-2">
          {(["Todos deben aprobar", "Al menos uno debe aprobar"] as const).map(cond => (
            <button
              key={cond}
              onClick={() => onUpdate({ condition: cond })}
              className={`border rounded-xl p-3 text-left transition-all ${
                step.condition === cond
                  ? "border-[#496BE3] bg-[#EEF2FF] text-[#496BE3]"
                  : "border-[#DDD] bg-white text-[#606060] hover:border-[#496BE3]/40"
              }`}
            >
              <p className="text-[11px] font-semibold leading-tight">{cond === "Todos deben aprobar" ? "Todos" : "Al menos uno"}</p>
              <p className="text-[9px] mt-1 opacity-70">{cond === "Todos deben aprobar" ? "Se requieren todas" : "Alcanza con una"}</p>
            </button>
          ))}
        </div>
      </PanelField>

      <PanelField label="Aprobadores">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {currentApprovers.map(a => (
            <span key={a} className="bg-[#F3F3F5] rounded-full px-2.5 py-1 text-[11px] text-[#000] flex items-center gap-1.5">
              {a}
              <button onClick={() => removeApprover(a)} className="text-[#606060] hover:text-[#B91C1C]">×</button>
            </span>
          ))}
        </div>
        <div className="relative">
          <button
            onClick={() => setShowApproverDropdown(!showApproverDropdown)}
            className="text-[12px] text-[#496BE3] font-medium hover:underline"
          >
            + Agregar aprobador
          </button>
          {showApproverDropdown && (
            <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-xl border border-[#E8E8E8] shadow-lg z-50 max-h-[240px] overflow-auto">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar..."
                className="w-full px-3 py-2 text-[12px] border-b border-[#F3F3F5] focus:outline-none"
                autoFocus
              />
              <div className="bg-[#F7F7F7] px-3 py-1.5 text-[9px] font-semibold text-[#606060] uppercase tracking-wider">Roles</div>
              {roles.filter(r => !currentApprovers.includes(r)).map(role => (
                <button key={role} onClick={() => addApprover(role)} className="w-full text-left px-3 py-2 text-[12px] text-[#000] hover:bg-[#F7F7F7]">
                  {role}
                </button>
              ))}
              <div className="bg-[#F7F7F7] px-3 py-1.5 text-[9px] font-semibold text-[#606060] uppercase tracking-wider">Agentes</div>
              {filteredAgents.map(a => {
                const name = `${a.firstName} ${a.lastName}`
                return (
                  <button key={a.email} onClick={() => addApprover(name)} className="w-full text-left px-3 py-2 text-[12px] text-[#000] hover:bg-[#F7F7F7]">
                    {name}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </PanelField>
    </div>
  )
}

// --- Update Panel ---
function UpdatePanel({ step, onUpdate }: {
  step: Step
  onUpdate: (updates: Partial<Step>) => void
}) {
  const [label, setLabel] = useState(step.label)
  useEffect(() => { setLabel(step.label) }, [step.label])

  const statuses = [
    { value: "En proceso", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", activeBorder: "border-blue-500" },
    { value: "En espera", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", activeBorder: "border-orange-500" },
    { value: "Cerrada", bg: "bg-green-50", text: "text-green-700", border: "border-green-200", activeBorder: "border-green-500" },
    { value: "Cancelada", bg: "bg-red-50", text: "text-red-700", border: "border-red-200", activeBorder: "border-red-500" },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PanelField label="Nombre del paso">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => onUpdate({ label })}
          onKeyDown={(e) => { if (e.key === "Enter") onUpdate({ label }) }}
          className="w-full bg-[#F7F7F7] border border-[#DDD] rounded-xl px-3 py-2.5 text-[13px] text-[#000] focus:outline-none focus:ring-2 focus:ring-[#496BE3]/20 focus:border-[#496BE3]"
        />
      </PanelField>

      <PanelField label="Estado">
        <div className="grid grid-cols-2 gap-2">
          {statuses.map(s => (
            <button
              key={s.value}
              onClick={() => onUpdate({ status: s.value as Step["status"], label: `Actualizar: ${s.value}` })}
              className={`border rounded-xl py-2.5 text-[12px] font-medium text-center transition-all ${
                step.status === s.value
                  ? `${s.bg} ${s.text} ${s.activeBorder} border-2`
                  : `bg-white text-[#606060] border-[#DDD] hover:${s.bg}`
              }`}
            >
              {s.value}
            </button>
          ))}
        </div>
      </PanelField>
    </div>
  )
}

// --- Branch Panel ---
function BranchPanel({ step, onUpdate }: {
  step: Step
  onUpdate: (updates: Partial<Step>) => void
}) {
  const [label, setLabel] = useState(step.label)
  useEffect(() => { setLabel(step.label) }, [step.label])

  return (
    <div className="flex flex-col gap-5">
      <PanelField label="Nombre">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => onUpdate({ label })}
          onKeyDown={(e) => { if (e.key === "Enter") onUpdate({ label }) }}
          className="w-full bg-[#F7F7F7] border border-[#DDD] rounded-xl px-3 py-2.5 text-[13px] text-[#000] focus:outline-none focus:ring-2 focus:ring-[#496BE3]/20 focus:border-[#496BE3]"
        />
      </PanelField>

      <PanelField label="Condiciones">
        <div className="space-y-2">
          {(step.conditions || []).map((cond, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={cond}
                onChange={(e) => {
                  const newConds = [...(step.conditions || [])]
                  newConds[i] = e.target.value
                  onUpdate({ conditions: newConds })
                }}
                className="flex-1 bg-[#F7F7F7] border border-[#DDD] rounded-lg px-2.5 py-1.5 text-[12px] text-[#000] focus:outline-none focus:ring-2 focus:ring-[#496BE3]/20"
              />
              <button
                onClick={() => {
                  const newConds = (step.conditions || []).filter((_, idx) => idx !== i)
                  onUpdate({ conditions: newConds })
                }}
                className="text-[#606060] hover:text-[#B91C1C] text-sm shrink-0"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => onUpdate({ conditions: [...(step.conditions || []), `Condición ${(step.conditions || []).length + 1}`] })}
          className="text-[12px] text-[#496BE3] font-medium hover:underline mt-2"
        >
          + Agregar condición
        </button>
      </PanelField>
    </div>
  )
}

// --- Node type icons for header ---
function nodeTypeIcon(type: string) {
  const iconProps = { width: 16, height: 16, fill: "none", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
  switch (type) {
    case "trigger":
      return <svg {...iconProps} viewBox="0 0 24 24" stroke="#16A34A"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
    case "approval":
      return <svg {...iconProps} viewBox="0 0 24 24" stroke="#4338CA"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
    case "update":
      return <svg {...iconProps} viewBox="0 0 24 24" stroke="#0D9488"><circle cx="12" cy="12" r="3"/><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/></svg>
    case "branch":
      return <svg {...iconProps} viewBox="0 0 24 24" stroke="#4338CA"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/><path d="M6 3v3"/><path d="M18 15v6"/></svg>
    default:
      return null
  }
}

function nodeTypeLabel(type: string) {
  switch (type) {
    case "trigger": return "Disparador"
    case "approval": return "Aprobación"
    case "update": return "Actualizar solicitud"
    case "branch": return "Ramas"
    default: return "Nodo"
  }
}

// --- Main Panel ---
export function NodeEditPanel({
  isOpen,
  step,
  isTrigger,
  trigger,
  services,
  agents,
  onClose,
  onUpdateStep,
  onUpdateTrigger
}: NodeEditPanelProps) {
  const type = isTrigger ? "trigger" : step?.type || "approval"
  const name = isTrigger ? trigger : step?.label

  return (
    <div
      className={`fixed top-14 right-0 h-[calc(100vh-56px)] w-[320px] bg-white border-l border-[#DDD] shadow-xl z-40 flex flex-col transition-transform duration-250 ease-out ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {/* Header */}
      <div className="px-4 py-4 border-b border-[#DDD] flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            {nodeTypeIcon(type)}
            <span className="text-[10px] font-semibold text-[#606060] uppercase tracking-wider">
              {nodeTypeLabel(type)}
            </span>
          </div>
          <p className="text-[15px] font-bold text-[#000]">{name}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-[#F3F3F5] rounded-lg text-[#606060] hover:text-[#000] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto px-4 py-4">
        {isTrigger && trigger && (
          <TriggerPanel trigger={trigger} services={services} onUpdateTrigger={onUpdateTrigger} />
        )}
        {!isTrigger && step?.type === "approval" && (
          <ApprovalPanel step={step} agents={agents} onUpdate={(updates) => onUpdateStep(step.id, updates)} />
        )}
        {!isTrigger && step?.type === "update" && (
          <UpdatePanel step={step} onUpdate={(updates) => onUpdateStep(step.id, updates)} />
        )}
        {!isTrigger && step?.type === "branch" && (
          <BranchPanel step={step} onUpdate={(updates) => onUpdateStep(step.id, updates)} />
        )}
      </div>
    </div>
  )
}
