"use client"

import type { Step } from "@/lib/workflow-types"

interface NodeProps {
  step?: Step
  trigger?: string
  onClick?: () => void
  isSelected?: boolean
}

// SVG Icons matching Humand's design
function LightningIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  )
}

function ApprovalIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4338CA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  )
}

function UpdateIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function BranchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4338CA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="18" r="3"/>
      <circle cx="6" cy="6" r="3"/>
      <path d="M6 21V9a9 9 0 0 0 9 9"/>
      <path d="M6 3v3"/>
      <path d="M18 15v6"/>
    </svg>
  )
}

function nodeClass(isSelected?: boolean, hasClick?: boolean) {
  return `flex items-center gap-3 bg-white rounded-2xl border shadow-sm w-[240px] px-4 py-3 transition-all ${
    hasClick ? "cursor-pointer hover:border-[#496BE3]/40 hover:shadow-md" : ""
  } ${isSelected ? "border-[#496BE3] ring-2 ring-[#496BE3]/20" : "border-[#E8E8E8]"}`
}

function handleNodeClick(e: React.MouseEvent, onClick?: () => void) {
  if (onClick) {
    e.stopPropagation()
    onClick()
  }
}

export function TriggerNode({ trigger, onClick, isSelected }: { trigger: string; onClick?: () => void; isSelected?: boolean }) {
  return (
    <div className={nodeClass(isSelected, !!onClick)} onClick={(e) => handleNodeClick(e, onClick)}>
      <div className="w-[36px] h-[36px] rounded-xl bg-[#E8F5E9] flex items-center justify-center shrink-0">
        <LightningIcon />
      </div>
      <span className="text-[14px] font-semibold text-[#000] leading-tight flex-1">{trigger}</span>
    </div>
  )
}

export function ApprovalNode({ step, onClick, isSelected }: NodeProps) {
  if (!step) return null
  return (
    <div className={nodeClass(isSelected, !!onClick)} onClick={(e) => handleNodeClick(e, onClick)}>
      <div className="w-[36px] h-[36px] rounded-xl bg-[#EEF2FF] flex items-center justify-center shrink-0">
        <ApprovalIcon />
      </div>
      <span className="text-[14px] font-semibold text-[#000] leading-tight">{step.label}</span>
    </div>
  )
}

export function UpdateNode({ step, onClick, isSelected }: NodeProps) {
  if (!step) return null
  return (
    <div className={nodeClass(isSelected, !!onClick)} onClick={(e) => handleNodeClick(e, onClick)}>
      <div className="w-[36px] h-[36px] rounded-xl bg-[#E0F2F1] flex items-center justify-center shrink-0">
        <UpdateIcon />
      </div>
      <span className="text-[14px] font-semibold text-[#000] leading-tight">{step.label}</span>
    </div>
  )
}

export function BranchNode({ step, onClick, isSelected }: NodeProps) {
  if (!step) return null
  return (
    <div className={nodeClass(isSelected, !!onClick)} onClick={(e) => handleNodeClick(e, onClick)}>
      <div className="w-[36px] h-[36px] rounded-xl bg-[#EEF2FF] flex items-center justify-center shrink-0">
        <BranchIcon />
      </div>
      <span className="text-[14px] font-semibold text-[#000] leading-tight">{step.label}</span>
    </div>
  )
}

export function EndNode() {
  return (
    <div className="bg-[#F5F5F7] rounded-full px-5 py-1.5 border border-[#E8E8E8]">
      <span className="text-[12px] font-medium text-[#B0B0C0]">Fin de flujo</span>
    </div>
  )
}

export function Connector({ height = 24 }: { height?: number }) {
  return (
    <div
      className="w-[1.5px] bg-[#C8C8D0] mx-auto"
      style={{ height: `${height}px` }}
    />
  )
}

export function BranchConnectorTop({ position, gap }: { position: 'first' | 'middle' | 'last' | 'only'; gap: number }) {
  if (position === 'only') return <Connector />
  const halfGap = gap / 2

  return (
    <div className="relative flex justify-center w-full" style={{ height: '24px' }}>
      {position !== 'first' && (
        <div
          className="absolute top-0"
          style={{
            right: '50%',
            width: `calc(50% + ${halfGap}px)`,
            height: '1.5px',
            backgroundColor: '#C8C8D0',
          }}
        />
      )}
      {position !== 'last' && (
        <div
          className="absolute top-0"
          style={{
            left: '50%',
            width: `calc(50% + ${halfGap}px)`,
            height: '1.5px',
            backgroundColor: '#C8C8D0',
          }}
        />
      )}
      <div
        style={{
          width: '1.5px',
          height: '24px',
          backgroundColor: '#C8C8D0',
        }}
      />
    </div>
  )
}

export function ApprovedPill() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-4 py-1 text-[12px] font-bold text-[#16A34A] bg-[#E8F5E9] border border-[#A5D6A7]">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      Aprobado
    </span>
  )
}

export function RejectedPill() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-4 py-1 text-[12px] font-bold text-[#B71C1C] bg-[#FFEBEE] border border-[#EF9A9A]">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      Rechazado
    </span>
  )
}

export function BranchPill({ label }: { label: string }) {
  return (
    <span className="inline-block rounded-full px-4 py-1 text-[12px] font-medium text-[#606060] bg-white border border-[#DDD]">
      {label}
    </span>
  )
}
