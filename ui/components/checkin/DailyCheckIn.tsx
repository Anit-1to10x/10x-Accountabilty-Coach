'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, Circle, Clock, Calendar, TrendingUp } from 'lucide-react'
import { AnimatedButton } from '../ui/AnimatedButton'
import { addProfileId, useProfileId } from '@/lib/useProfileId'

interface Todo {
  id: string
  title: string
  date: string
  time?: string
  challengeId?: string
  completed: boolean
  priority?: 'low' | 'medium' | 'high'
}

interface DailyCheckInProps {
  isOpen: boolean
  onClose: () => void
  agentId?: string
}

export function DailyCheckIn({ isOpen, onClose, agentId }: DailyCheckInProps) {
  const [step, setStep] = useState<'context' | 'tasks' | 'confirmation'>('context')
  const [contextAnswers, setContextAnswers] = useState({
    energy: '',
    focus: '',
    challenges: ''
  })
  const [availableTasks, setAvailableTasks] = useState<Todo[]>([])
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const profileId = useProfileId()

  // Load incomplete tasks based on current time
  useEffect(() => {
    if (step === 'tasks') {
      loadRelevantTasks()
    }
  }, [step])

  const loadRelevantTasks = async () => {
    setLoading(true)
    try {
      const now = new Date()
      const currentHour = now.getHours()
      const today = now.toISOString().split('T')[0]

      // Fetch all incomplete todos for today
      const url = addProfileId('/api/todos', profileId)
      const response = await fetch(url)
      const data = await response.json()

      // Filter tasks for today that are incomplete
      let todayTasks = (data.todos || []).filter((todo: Todo) => {
        const taskDate = todo.date?.split('T')[0]
        return taskDate === today && !todo.completed
      })

      // Intelligent filtering based on time of day
      todayTasks = todayTasks.filter((task: Todo) => {
        if (!task.time) return true // Include tasks without specific time

        const taskHour = parseInt(task.time.split(':')[0])

        // Morning (5-12): Show morning and afternoon tasks
        if (currentHour >= 5 && currentHour < 12) {
          return taskHour >= 5 && taskHour < 17
        }
        // Afternoon (12-17): Show afternoon and evening tasks
        else if (currentHour >= 12 && currentHour < 17) {
          return taskHour >= 12 && taskHour < 21
        }
        // Evening (17-21): Show evening tasks
        else if (currentHour >= 17 && currentHour < 21) {
          return taskHour >= 17 && taskHour < 24
        }
        // Night (21+): Show any remaining tasks
        else {
          return true
        }
      })

      setAvailableTasks(todayTasks)
    } catch (error) {
      console.error('Failed to load tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleContextSubmit = () => {
    if (contextAnswers.energy && contextAnswers.focus) {
      setStep('tasks')
    }
  }

  const toggleTask = (taskId: string) => {
    const newSelected = new Set(selectedTasks)
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId)
    } else {
      newSelected.add(taskId)
    }
    setSelectedTasks(newSelected)
  }

  const handleCheckIn = async () => {
    if (selectedTasks.size === 0) return

    setSubmitting(true)
    try {
      const checkInData = {
        date: new Date().toISOString(),
        agentId: agentId || 'unified',
        context: contextAnswers,
        completedTasks: Array.from(selectedTasks),
        tasksCount: selectedTasks.size
      }

      // Mark tasks as completed
      const updatePromises = Array.from(selectedTasks).map(taskId =>
        fetch(`/api/todos/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: true })
        })
      )

      await Promise.all(updatePromises)

      // Save check-in to file
      await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkInData)
      })

      setStep('confirmation')

      // Auto-close after 2 seconds
      setTimeout(() => {
        onClose()
        resetCheckIn()
      }, 2000)
    } catch (error) {
      console.error('Check-in failed:', error)
      alert('Failed to save check-in. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const resetCheckIn = () => {
    setStep('context')
    setContextAnswers({ energy: '', focus: '', challenges: '' })
    setSelectedTasks(new Set())
    setAvailableTasks([])
  }

  const getTimeOfDay = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Morning'
    if (hour < 17) return 'Afternoon'
    if (hour < 21) return 'Evening'
    return 'Night'
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-oa-bg-primary border border-oa-border rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-oa-border">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-oa-text-primary" />
                  <div>
                    <h2 className="text-xl font-semibold text-oa-text-primary">
                      Daily Check-In
                    </h2>
                    <p className="text-sm text-oa-text-secondary mt-1">
                      {getTimeOfDay()} • {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-oa-bg-secondary rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Step 1: Context Questions */}
                {step === 'context' && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <p className="text-sm text-oa-text-secondary mb-6">
                      Let me understand your current state before we review your tasks.
                    </p>

                    <div className="space-y-5">
                      {/* Energy Level */}
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          How's your energy level right now?
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                          {['Low', 'Medium', 'High'].map((level) => (
                            <button
                              key={level}
                              onClick={() => setContextAnswers({ ...contextAnswers, energy: level })}
                              className={`p-3 rounded-lg border transition-all ${
                                contextAnswers.energy === level
                                  ? 'border-oa-text-primary bg-oa-bg-secondary'
                                  : 'border-oa-border hover:border-oa-text-secondary'
                              }`}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Focus Level */}
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          How focused do you feel?
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                          {['Distracted', 'Okay', 'Laser-focused'].map((level) => (
                            <button
                              key={level}
                              onClick={() => setContextAnswers({ ...contextAnswers, focus: level })}
                              className={`p-3 rounded-lg border transition-all ${
                                contextAnswers.focus === level
                                  ? 'border-oa-text-primary bg-oa-bg-secondary'
                                  : 'border-oa-border hover:border-oa-text-secondary'
                              }`}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Current Challenges (Optional) */}
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Any challenges or blockers? (Optional)
                        </label>
                        <textarea
                          value={contextAnswers.challenges}
                          onChange={(e) => setContextAnswers({ ...contextAnswers, challenges: e.target.value })}
                          placeholder="e.g., Feeling overwhelmed, need to prioritize better..."
                          className="w-full px-3 py-2 bg-oa-bg-primary border border-oa-border rounded-lg focus:outline-none focus:border-oa-text-primary resize-none"
                          rows={3}
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <AnimatedButton
                        onClick={handleContextSubmit}
                        disabled={!contextAnswers.energy || !contextAnswers.focus}
                        variant="primary"
                      >
                        Continue to Tasks
                      </AnimatedButton>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Task Selection */}
                {step === 'tasks' && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <p className="text-sm text-oa-text-secondary mb-4">
                      Based on your {contextAnswers.energy.toLowerCase()} energy and it being {getTimeOfDay().toLowerCase()},
                      here are your relevant tasks:
                    </p>

                    {loading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-oa-text-primary border-t-transparent"></div>
                      </div>
                    ) : availableTasks.length === 0 ? (
                      <div className="text-center py-12">
                        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                        <p className="text-oa-text-secondary">No pending tasks for now!</p>
                        <p className="text-sm text-oa-text-secondary mt-1">You're all caught up.</p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {availableTasks.map((task) => (
                            <motion.button
                              key={task.id}
                              onClick={() => toggleTask(task.id)}
                              whileHover={{ x: 4 }}
                              className={`w-full p-4 rounded-lg border transition-all text-left ${
                                selectedTasks.has(task.id)
                                  ? 'border-oa-text-primary bg-oa-bg-secondary'
                                  : 'border-oa-border hover:border-oa-text-secondary'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                {selectedTasks.has(task.id) ? (
                                  <CheckCircle2 className="w-5 h-5 text-oa-text-primary flex-shrink-0 mt-0.5" />
                                ) : (
                                  <Circle className="w-5 h-5 text-oa-text-secondary flex-shrink-0 mt-0.5" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm">{task.title}</p>
                                  {task.time && (
                                    <div className="flex items-center gap-1 mt-1 text-xs text-oa-text-secondary">
                                      <Clock className="w-3 h-3" />
                                      <span>{task.time}</span>
                                    </div>
                                  )}
                                </div>
                                {task.priority && (
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    task.priority === 'high' ? 'bg-red-500/10 text-red-500' :
                                    task.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-500' :
                                    'bg-gray-500/10 text-gray-500'
                                  }`}>
                                    {task.priority}
                                  </span>
                                )}
                              </div>
                            </motion.button>
                          ))}
                        </div>

                        <div className="mt-6 flex items-center justify-between">
                          <p className="text-sm text-oa-text-secondary">
                            {selectedTasks.size} task{selectedTasks.size !== 1 ? 's' : ''} selected
                          </p>
                          <div className="flex gap-3">
                            <AnimatedButton
                              onClick={() => setStep('context')}
                              variant="secondary"
                            >
                              Back
                            </AnimatedButton>
                            <AnimatedButton
                              onClick={handleCheckIn}
                              disabled={selectedTasks.size === 0 || submitting}
                              variant="primary"
                            >
                              {submitting ? 'Saving...' : 'Complete Check-In'}
                            </AnimatedButton>
                          </div>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}

                {/* Step 3: Confirmation */}
                {step === 'confirmation' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    >
                      <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    </motion.div>
                    <h3 className="text-xl font-semibold mb-2">Check-In Complete!</h3>
                    <p className="text-oa-text-secondary">
                      {selectedTasks.size} task{selectedTasks.size !== 1 ? 's' : ''} marked as completed
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-4 text-sm text-oa-text-secondary">
                      <TrendingUp className="w-4 h-4" />
                      <span>Keep up the great work!</span>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
