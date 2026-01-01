'use client'

import { motion } from 'framer-motion'
import { useMemo } from 'react'

interface LoadingStep {
  id: string
  label: string
  status: 'pending' | 'loading' | 'complete' | 'error'
}

interface LoadingScreenProps {
  steps: LoadingStep[]
}

export default function LoadingScreen({ steps }: LoadingScreenProps) {
  const currentStep = useMemo(() => {
    const loadingIndex = steps.findIndex((s) => s.status === 'loading')
    const completeCount = steps.filter((s) => s.status === 'complete').length
    return loadingIndex !== -1 ? loadingIndex : completeCount
  }, [steps])

  return (
    <div className="min-h-screen flex items-center justify-center bg-oa-bg-primary">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md w-full px-6"
      >
        {/* Logo/Title */}
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-4xl font-bold text-oa-text-primary mb-2"
        >
          OpenAnalyst
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-sm text-oa-text-secondary mb-12"
        >
          Your AI-Powered Accountability Coach
        </motion.p>

        {/* Spinner */}
        <div className="w-16 h-16 mx-auto mb-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-full h-full border-4 border-oa-accent border-t-transparent rounded-full"
          />
        </div>

        {/* Loading Steps */}
        <div className="space-y-3">
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 + 0.6 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                {step.status === 'complete' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-5 h-5 rounded-full bg-oa-accent flex items-center justify-center"
                  >
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </motion.div>
                )}
                {step.status === 'loading' && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-oa-accent border-t-transparent rounded-full"
                  />
                )}
                {step.status === 'pending' && (
                  <div className="w-5 h-5 rounded-full border-2 border-oa-border" />
                )}
                {step.status === 'error' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center"
                  >
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </motion.div>
                )}
                <span
                  className={`text-sm ${
                    step.status === 'complete'
                      ? 'text-oa-text-secondary line-through'
                      : step.status === 'loading'
                      ? 'text-oa-text-primary font-medium'
                      : step.status === 'error'
                      ? 'text-red-500'
                      : 'text-oa-text-secondary'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Progress indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-8"
        >
          <div className="w-full bg-oa-bg-secondary rounded-full h-1.5">
            <motion.div
              className="bg-oa-accent h-1.5 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
