import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { PATHS } from '@/lib/paths'

const ACTIVITY_FILE = path.join(PATHS.profile, 'activity-log.json')

interface Activity {
  id: string
  action: string
  description: string
  timestamp: string
  type: 'checkin' | 'todo_complete' | 'streak_update' | 'challenge_start' | 'chat' | 'skill_used'
  metadata?: Record<string, any>
}

async function loadActivityFile(): Promise<Activity[]> {
  try {
    await fs.access(ACTIVITY_FILE)
    const content = await fs.readFile(ACTIVITY_FILE, 'utf-8')
    return JSON.parse(content)
  } catch {
    // No activity file exists yet - return empty array
    // Activities will be created when real actions happen
    return []
  }
}

export async function GET() {
  try {
    const activities = await loadActivityFile()

    // Sort by timestamp descending (most recent first)
    const sortedActivities = activities.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    return NextResponse.json({
      activities: sortedActivities,
      count: sortedActivities.length
    })
  } catch (error) {
    console.error('Error loading activity log:', error)
    return NextResponse.json({ activities: [], count: 0 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, description, type, metadata } = body

    if (!action || !description || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: action, description, type' },
        { status: 400 }
      )
    }

    const activities = await loadActivityFile()

    const newActivity: Activity = {
      id: `activity-${Date.now()}`,
      action,
      description,
      timestamp: new Date().toISOString(),
      type,
      metadata
    }

    activities.unshift(newActivity) // Add to beginning

    // Keep only last 100 activities
    const trimmedActivities = activities.slice(0, 100)

    // Ensure directory exists before writing
    await fs.mkdir(path.dirname(ACTIVITY_FILE), { recursive: true })
    await fs.writeFile(ACTIVITY_FILE, JSON.stringify(trimmedActivities, null, 2))

    return NextResponse.json({
      activity: newActivity,
      success: true
    })
  } catch (error) {
    console.error('Error saving activity:', error)
    return NextResponse.json(
      { error: 'Failed to save activity' },
      { status: 500 }
    )
  }
}
