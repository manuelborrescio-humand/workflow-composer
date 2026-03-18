"use client"

import { useState } from "react"
import { ArrowLeft, ChevronDown, FileJson, X } from "lucide-react"
import type { Workflow } from "@/lib/workflow-types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"

export interface EmpresaFullData {
  nombre: string
  departamentos: { name: string; usersCount: number }[]
  agentes: { firstName: string; lastName: string; email: string }[]
  tickets: { subject: string; status: string; count: number }[]
  servicios: { name: string; status: string }[]
}

interface WorkflowTopbarProps {
  workflowName: string
  onNameChange: (name: string) => void
  isDraft: boolean
  onPublish: () => void
  workflow: Workflow | null
  empresaData?: EmpresaFullData
}

export function WorkflowTopbar({
  workflowName,
  onNameChange,
  isDraft,
  onPublish,
  workflow,
  empresaData
}: WorkflowTopbarProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(workflowName)
  const [showDataModal, setShowDataModal] = useState(false)

  const handleSave = () => {
    onNameChange(editValue)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave()
    } else if (e.key === "Escape") {
      setEditValue(workflowName)
      setIsEditing(false)
    }
  }

  const handleExport = () => {
    if (!workflow) return
    const dataStr = JSON.stringify(workflow, null, 2)
    const blob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "workflow.hwl.json"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <header className="h-14 bg-white border-b border-[#E5E7EB] flex items-center px-5 gap-4 shadow-sm">
      {/* Back button */}
      <button
        className="p-1.5 hover:bg-[#F3F4F6] rounded-lg transition-colors"
        aria-label="Volver"
      >
        <ArrowLeft size={18} className="text-[#6B7280]" />
      </button>

      {/* Workflow name */}
      <div className="flex items-center gap-2.5">
        {isEditing ? (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="text-[14px] font-semibold text-[#1A1A2E] bg-[#F8F9FA] px-3 py-1.5 rounded-lg border border-[#496BE3] focus:outline-none focus:ring-2 focus:ring-[#496BE3]/20"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="text-[14px] font-semibold text-[#1A1A2E] hover:bg-[#F8F9FA] px-3 py-1.5 rounded-lg transition-colors"
          >
            {workflowName}
          </button>
        )}

        {/* Status badge */}
        {isDraft ? (
          <span className="px-2.5 py-1 text-[10px] font-semibold rounded-full bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]">
            Borrador
          </span>
        ) : (
          <span className="px-2.5 py-1 text-[10px] font-semibold rounded-full bg-[#D1FAE5] text-[#059669] border border-[#A7F3D0]">
            Activo
          </span>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side buttons */}
      <div className="flex items-center gap-1.5">
        {/* View company data */}
        <Dialog open={showDataModal} onOpenChange={setShowDataModal}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-1.5 px-3 py-2 text-[12px] text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#1A1A2E] rounded-lg transition-all font-medium">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9h18M3 15h18M12 3v18"/></svg>
              Ver datos
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {"🏢"} {empresaData?.nombre || "Sin comunidad cargada"}
              </DialogTitle>
            </DialogHeader>
            {empresaData ? (
              <div className="grid grid-cols-4 gap-4 mt-4">
                <div>
                  <h3 className="text-[12px] font-bold text-foreground mb-2">
                    Servicios ({empresaData.servicios.length})
                  </h3>
                  <div className="space-y-1 max-h-60 overflow-auto">
                    {empresaData.servicios.map((s) => (
                      <div key={s.name} className="flex justify-between text-[11px] gap-2">
                        <span className="text-muted-foreground">{s.name}</span>
                        <span className={`text-[9px] font-medium shrink-0 px-1.5 py-0.5 rounded-full ${
                          s.status === "ENABLED" ? "bg-[#F0FDF4] text-[#16A34A]" : "bg-muted text-muted-foreground"
                        }`}>
                          {s.status === "ENABLED" ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                    ))}
                    {empresaData.servicios.length === 0 && (
                      <p className="text-[11px] text-muted-foreground italic">Sin servicios</p>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-[12px] font-bold text-foreground mb-2">
                    Departamentos ({empresaData.departamentos.length})
                  </h3>
                  <div className="space-y-1 max-h-60 overflow-auto">
                    {empresaData.departamentos.map((d) => (
                      <div key={d.name} className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">{d.name}</span>
                        <span className="text-foreground font-medium">{d.usersCount}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-[12px] font-bold text-foreground mb-2">
                    Agentes ({empresaData.agentes.length})
                  </h3>
                  <div className="space-y-1 max-h-60 overflow-auto">
                    {empresaData.agentes.map((a) => (
                      <p key={a.email} className="text-[11px] text-muted-foreground">
                        {a.firstName} {a.lastName}
                      </p>
                    ))}
                    {empresaData.agentes.length === 0 && (
                      <p className="text-[11px] text-muted-foreground italic">Sin agentes</p>
                    )}
                  </div>
                  <h4 className="text-[11px] font-medium text-foreground mt-4 mb-1">Roles disponibles:</h4>
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground">Jefe directo</p>
                    <p className="text-[11px] text-muted-foreground">Jefe de segundo nivel</p>
                    <p className="text-[11px] text-muted-foreground">Aprobador designado</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-[12px] font-bold text-foreground mb-2">
                    Tickets frecuentes
                  </h3>
                  <div className="space-y-1 max-h-60 overflow-auto">
                    {empresaData.tickets.map((t, i) => (
                      <div key={i} className="flex justify-between text-[11px] gap-2">
                        <span className="text-muted-foreground truncate">{t.subject}</span>
                        <span className="text-foreground font-medium shrink-0">{t.count}</span>
                      </div>
                    ))}
                    {empresaData.tickets.length === 0 && (
                      <p className="text-[11px] text-muted-foreground italic">Sin tickets</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground mt-4 text-center py-8">
                Ingresá un instanceId en el panel izquierdo y hacé click en &quot;Cargar&quot; para ver los datos de la comunidad.
              </p>
            )}
          </DialogContent>
        </Dialog>

        {/* Export JSON */}
        <button
          onClick={handleExport}
          disabled={!workflow}
          className="flex items-center gap-1.5 px-3 py-2 text-[12px] text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#1A1A2E] rounded-lg transition-all font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FileJson size={14} />
          JSON
        </button>

        <div className="w-px h-5 bg-[#E5E7EB]" />

        {/* Publicar */}
        <button
          onClick={onPublish}
          disabled={!workflow}
          className="px-5 py-2 text-[12px] font-semibold text-white bg-[#496BE3] rounded-lg hover:bg-[#3D5CC7] transition-all shadow-sm shadow-[#496BE3]/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          Publicar
        </button>
      </div>
    </header>
  )
}
