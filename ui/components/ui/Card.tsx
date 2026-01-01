// Minimal card component with border (no shadows)

import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-oa-bg-primary border border-oa-border p-6 ${className}`}>
      {children}
    </div>
  )
}
