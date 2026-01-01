'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import type { Agent } from '@/types'
import { useNavigationStore } from '@/lib/store'

interface AgentCardProps {
  agent: Agent
  isActive: boolean
  onClick: () => void
}

export function AgentCard({ agent, isActive, onClick }: AgentCardProps) {
  const router = useRouter()
  const { activeType, activeId, setActive } = useNavigationStore()

  const handleClick = () => {
    setActive('agent', agent.id)
    onClick()
    router.push(`/agent/${agent.id}`)
  }

  const isActiveSelection = activeType === 'agent' && activeId === agent.id

  return (
    <motion.button
      onClick={handleClick}
      className={`
        w-full text-left mx-3 px-4 py-2.5 rounded-lg text-sm font-medium
        transition-all duration-200
        ${
          isActiveSelection
            ? 'bg-oa-accent text-white shadow-md'
            : 'text-oa-text-primary hover:bg-oa-bg-secondary'
        }
      `}
      whileHover={{ scale: 1.02, x: 2 }}
      whileTap={{ scale: 0.98 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 17,
      }}
    >
      <div className="flex items-center gap-3">
        <motion.span
          className="text-lg"
          animate={{ rotate: isActiveSelection ? [0, -10, 10, -10, 0] : 0 }}
          transition={{ duration: 0.5 }}
        >
          {agent.icon}
        </motion.span>
        <span>{agent.name}</span>
      </div>
    </motion.button>
  )
}
