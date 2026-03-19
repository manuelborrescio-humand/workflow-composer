"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import type { Workflow, Step } from "@/lib/workflow-types"
import {
  TriggerNode,
  ApprovalNode,
  UpdateNode,
  BranchNode,
  EndNode,
  Connector,
  ApprovedPill,
  RejectedPill,
  BranchPill
} from "./workflow-nodes"
import { Minus, Plus, Maximize2, Lock } from "lucide-react"

interface WorkflowCanvasProps {
  workflow: Workflow | null
  services?: { name: string; status: string }[]
  onTriggerChange?: (newTrigger: string) => void
}

function buildTree(steps: Step[]): Map<string | null, Step[]> {
  const tree = new Map<string | null, Step[]>()

  steps.forEach(step => {
    const key = step.parent
    if (!tree.has(key)) {
      tree.set(key, [])
    }
    tree.get(key)!.push(step)
  })

  return tree
}

function RenderStep({ step, tree, isLast }: { step: Step; tree: Map<string | null, Step[]>; isLast: boolean }) {
  const children = tree.get(step.id) || []

  // For approval nodes, split by approved/rejected
  const approvedChildren = children.filter(c => c.branch === "approved")
  const rejectedChildren = children.filter(c => c.branch === "rejected")

  // For branch nodes, group by branch condition
  const isBranch = step.type === "branch"
  const branchConditions = isBranch ? step.conditions || [] : []

  const renderNode = () => {
    switch (step.type) {
      case "approval":
        return <ApprovalNode step={step} />
      case "update":
        return <UpdateNode step={step} />
      case "branch":
        return <BranchNode step={step} />
      default:
        return null
    }
  }

  // For approval with two branches
  if (step.type === "approval" && (approvedChildren.length > 0 || rejectedChildren.length > 0)) {
    return (
      <div className="flex flex-col items-center">
        {renderNode()}
        <Connector />
        <div className="flex gap-2 justify-center">
          <ApprovedPill />
          <RejectedPill />
        </div>
        <div className="flex gap-8 mt-0">
          {/* Approved branch */}
          <div className="flex flex-col items-center">
            <Connector />
            {approvedChildren.map((child, i) => (
              <RenderStep
                key={child.id}
                step={child}
                tree={tree}
                isLast={i === approvedChildren.length - 1}
              />
            ))}
            {approvedChildren.length === 0 && <EndNode />}
          </div>
          {/* Rejected branch */}
          <div className="flex flex-col items-center">
            <Connector />
            {rejectedChildren.map((child, i) => (
              <RenderStep
                key={child.id}
                step={child}
                tree={tree}
                isLast={i === rejectedChildren.length - 1}
              />
            ))}
            {rejectedChildren.length === 0 && <EndNode />}
          </div>
        </div>
      </div>
    )
  }

  // For branch nodes
  if (isBranch && branchConditions.length > 0) {
    return (
      <div className="flex flex-col items-center">
        {renderNode()}
        <Connector />
        <div className="flex gap-2 justify-center flex-wrap">
          {branchConditions.map((cond) => (
            <BranchPill key={cond} label={cond} />
          ))}
        </div>
        <div className="flex gap-6 mt-0">
          {branchConditions.map((cond) => {
            const branchChildren = children.filter(c => c.branch === cond)
            return (
              <div key={cond} className="flex flex-col items-center">
                <Connector />
                {branchChildren.map((child, i) => (
                  <RenderStep
                    key={child.id}
                    step={child}
                    tree={tree}
                    isLast={i === branchChildren.length - 1}
                  />
                ))}
                {branchChildren.length === 0 && <EndNode />}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Simple linear flow
  return (
    <div className="flex flex-col items-center">
      {renderNode()}
      {children.length > 0 && (
        <>
          <Connector />
          {children.map((child, i) => (
            <RenderStep
              key={child.id}
              step={child}
              tree={tree}
              isLast={i === children.length - 1}
            />
          ))}
        </>
      )}
      {children.length === 0 && !isLast && (
        <>
          <Connector />
          <EndNode />
        </>
      )}
      {children.length === 0 && isLast && (
        <>
          <Connector />
          <EndNode />
        </>
      )}
    </div>
  )
}

export function WorkflowCanvas({ workflow, services, onTriggerChange }: WorkflowCanvasProps) {
  const [zoom, setZoom] = useState(100)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const [triggerDropdownOpen, setTriggerDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handleZoomIn = () => setZoom(z => Math.min(z + 10, 200))
  const handleZoomOut = () => setZoom(z => Math.max(z - 10, 25))
  const handleReset = () => {
    setZoom(100)
    setPan({ x: 0, y: 0 })
  }

  // Mouse drag to pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only pan on left click, ignore clicks on interactive elements
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest("button")) return

    setIsPanning(true)
    panStart.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y
    }
    e.preventDefault()
  }, [pan])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return
    const dx = e.clientX - panStart.current.x
    const dy = e.clientY - panStart.current.y
    setPan({
      x: panStart.current.panX + dx,
      y: panStart.current.panY + dy
    })
  }, [isPanning])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  // Scroll wheel to zoom (towards cursor)
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const cursorX = e.clientX - rect.left
    const cursorY = e.clientY - rect.top

    const delta = e.deltaY > 0 ? -5 : 5

    setZoom(prevZoom => {
      const newZoom = Math.min(Math.max(prevZoom + delta, 25), 200)
      const scaleFactor = newZoom / prevZoom

      setPan(prevPan => ({
        x: cursorX - scaleFactor * (cursorX - prevPan.x),
        y: cursorY - scaleFactor * (cursorY - prevPan.y)
      }))

      return newZoom
    })
  }, [])

  // Attach wheel event with passive: false to allow preventDefault
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.addEventListener("wheel", handleWheel, { passive: false })
    return () => container.removeEventListener("wheel", handleWheel)
  }, [handleWheel])

  // Close dropdown on outside click or Escape
  useEffect(() => {
    if (!triggerDropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setTriggerDropdownOpen(false)
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTriggerDropdownOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [triggerDropdownOpen])

  // Close dropdown when trigger changes
  useEffect(() => {
    setTriggerDropdownOpen(false)
  }, [workflow?.trigger])

  const canvasBackground = {
    background: "radial-gradient(circle, #DDD 1px, transparent 1px)",
    backgroundSize: "24px 24px",
    backgroundColor: "#F7F7F7"
  }

  if (!workflow) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center"
        style={canvasBackground}
      >
        <div className="text-6xl mb-4">{"🗂️"}</div>
        <p className="text-[15px] text-[#606060]">El workflow aparece acá</p>
        <p className="text-[12px] text-muted-foreground mt-1">
          Elegí un template o describí el flujo
        </p>
      </div>
    )
  }

  const tree = buildTree(workflow.steps)
  const rootSteps = tree.get(null) || []

  return (
    <div
      ref={containerRef}
      className={`flex-1 overflow-hidden relative select-none ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
      style={canvasBackground}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className="flex flex-col items-center py-8"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
          transformOrigin: "0 0",
          minWidth: "max-content",
          minHeight: "max-content"
        }}
      >
        <div className="relative" ref={dropdownRef}>
          <TriggerNode
            trigger={workflow.trigger}
            onClick={services && services.length > 0 ? () => setTriggerDropdownOpen(!triggerDropdownOpen) : undefined}
            isDropdownOpen={triggerDropdownOpen}
          />
          {triggerDropdownOpen && services && onTriggerChange && (
            <div
              className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[280px] bg-white rounded-2xl border border-[#E8E8E8] shadow-lg z-50 max-h-[300px] overflow-auto py-1 animate-in fade-in slide-in-from-top-1 duration-150"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <p className="text-[10px] text-[#606060] font-semibold uppercase tracking-wider px-4 pt-3 pb-2">
                Cambiar disparador
              </p>
              {services.map((service) => (
                <button
                  key={service.name}
                  onClick={() => {
                    onTriggerChange(service.name)
                    setTriggerDropdownOpen(false)
                  }}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-[#F7F7F7] transition-colors ${
                    service.name === workflow.trigger ? "bg-[#EEF2FF]" : ""
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    service.status === "ENABLED" ? "bg-[#16A34A]" : "bg-[#D1D5DB]"
                  }`} />
                  <span className={`text-[13px] flex-1 ${
                    service.name === workflow.trigger ? "font-semibold text-[#496BE3]" : "text-[#000]"
                  }`}>
                    {service.name}
                  </span>
                  {service.name === workflow.trigger && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#496BE3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
              ))}
              {services.length === 0 && (
                <p className="text-[12px] text-[#606060] px-4 py-3 text-center">No hay servicios disponibles</p>
              )}
            </div>
          )}
        </div>
        <Connector />
        {rootSteps.map((step, i) => (
          <RenderStep
            key={step.id}
            step={step}
            tree={tree}
            isLast={i === rootSteps.length - 1}
          />
        ))}
        {rootSteps.length === 0 && <EndNode />}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-card rounded-full px-2 py-1 shadow-md border border-border">
        <button
          onClick={handleZoomOut}
          className="p-1 hover:bg-muted rounded-full transition-colors"
          aria-label="Alejar"
        >
          <Minus size={16} className="text-muted-foreground" />
        </button>
        <button
          onClick={handleReset}
          className="px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          {zoom}%
        </button>
        <button
          onClick={handleZoomIn}
          className="p-1 hover:bg-muted rounded-full transition-colors"
          aria-label="Acercar"
        >
          <Plus size={16} className="text-muted-foreground" />
        </button>
        <div className="w-px h-4 bg-border mx-1" />
        <button
          onClick={handleReset}
          className="p-1 hover:bg-muted rounded-full transition-colors"
          aria-label="Ajustar"
        >
          <Maximize2 size={16} className="text-muted-foreground" />
        </button>
        <button
          className="p-1 hover:bg-muted rounded-full transition-colors"
          aria-label="Bloquear"
        >
          <Lock size={16} className="text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}
