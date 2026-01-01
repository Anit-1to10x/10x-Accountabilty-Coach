import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import type { Punishment } from '@/types/streak'
import { DATA_DIR } from '@/lib/paths'

const PUNISHMENTS_DIR = path.join(DATA_DIR, 'punishments')
const ACTIVE_FILE = path.join(PUNISHMENTS_DIR, 'active.json')
const HISTORY_FILE = path.join(PUNISHMENTS_DIR, 'history.json')

interface PunishmentRecord {
  punishment: Punishment
  challengeId: string
  challengeName: string
}

async function ensurePunishmentsDir() {
  await fs.mkdir(PUNISHMENTS_DIR, { recursive: true })

  // Initialize files if they don't exist
  try {
    await fs.access(ACTIVE_FILE)
  } catch {
    await fs.writeFile(ACTIVE_FILE, JSON.stringify([], null, 2), 'utf-8')
  }

  try {
    await fs.access(HISTORY_FILE)
  } catch {
    await fs.writeFile(HISTORY_FILE, JSON.stringify([], null, 2), 'utf-8')
  }
}

// GET: List all active punishments
export async function GET(request: NextRequest) {
  try {
    await ensurePunishmentsDir()

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') // 'active' or 'history'
    const challengeId = searchParams.get('challengeId')

    let filePath = type === 'history' ? HISTORY_FILE : ACTIVE_FILE
    const data = await fs.readFile(filePath, 'utf-8')
    let punishments: PunishmentRecord[] = JSON.parse(data)

    // Filter by challengeId if provided
    if (challengeId) {
      punishments = punishments.filter(p => p.challengeId === challengeId)
    }

    return NextResponse.json({ punishments })
  } catch (error: any) {
    console.error('Failed to fetch punishments:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// POST: Create a new punishment
export async function POST(request: NextRequest) {
  try {
    await ensurePunishmentsDir()
    const body = await request.json()
    const { punishment, challengeId, challengeName } = body as {
      punishment: Punishment
      challengeId: string
      challengeName: string
    }

    // Read current active punishments
    const data = await fs.readFile(ACTIVE_FILE, 'utf-8')
    const activePunishments: PunishmentRecord[] = JSON.parse(data)

    // Add new punishment
    const newRecord: PunishmentRecord = {
      punishment: {
        ...punishment,
        id: punishment.id || `pun-${Date.now()}`,
        status: punishment.status || 'active',
      },
      challengeId,
      challengeName,
    }

    activePunishments.push(newRecord)

    // Save
    await fs.writeFile(ACTIVE_FILE, JSON.stringify(activePunishments, null, 2), 'utf-8')

    // Log to index.md
    try {
      await fetch(`${request.nextUrl.origin}/api/system/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'file_created',
          data: {
            filePath: 'punishments/active.json',
            purpose: 'Active punishments registry',
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
          },
        }),
      })
    } catch (error) {
      console.error('Failed to update index.md:', error)
    }

    return NextResponse.json({
      success: true,
      punishment: newRecord,
    })
  } catch (error: any) {
    console.error('Failed to create punishment:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
