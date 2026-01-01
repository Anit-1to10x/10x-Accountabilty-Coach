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

// GET: Get specific punishment
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Check active punishments
    const activeData = await fs.readFile(ACTIVE_FILE, 'utf-8')
    const activePunishments: PunishmentRecord[] = JSON.parse(activeData)
    const activePunishment = activePunishments.find(p => p.punishment.id === id)

    if (activePunishment) {
      return NextResponse.json({ punishment: activePunishment })
    }

    // Check history
    const historyData = await fs.readFile(HISTORY_FILE, 'utf-8')
    const historyPunishments: PunishmentRecord[] = JSON.parse(historyData)
    const historyPunishment = historyPunishments.find(p => p.punishment.id === id)

    if (historyPunishment) {
      return NextResponse.json({ punishment: historyPunishment })
    }

    return NextResponse.json(
      { error: 'Punishment not found' },
      { status: 404 }
    )
  } catch (error: any) {
    console.error('Error fetching punishment:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// PATCH: Update punishment status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { status } = body as { status: 'executed' | 'forgiven' }

    // Read active punishments
    const activeData = await fs.readFile(ACTIVE_FILE, 'utf-8')
    let activePunishments: PunishmentRecord[] = JSON.parse(activeData)

    // Find and update punishment
    const punishmentIndex = activePunishments.findIndex(p => p.punishment.id === id)

    if (punishmentIndex === -1) {
      return NextResponse.json(
        { error: 'Punishment not found' },
        { status: 404 }
      )
    }

    const punishmentRecord = activePunishments[punishmentIndex]
    punishmentRecord.punishment.status = status
    punishmentRecord.punishment.executedAt = new Date().toISOString()

    // Move to history
    const historyData = await fs.readFile(HISTORY_FILE, 'utf-8')
    const historyPunishments: PunishmentRecord[] = JSON.parse(historyData)
    historyPunishments.push(punishmentRecord)

    // Remove from active
    activePunishments = activePunishments.filter(p => p.punishment.id !== id)

    // Save both files
    await fs.writeFile(ACTIVE_FILE, JSON.stringify(activePunishments, null, 2), 'utf-8')
    await fs.writeFile(HISTORY_FILE, JSON.stringify(historyPunishments, null, 2), 'utf-8')

    // Log to index.md
    try {
      await fetch(`${request.nextUrl.origin}/api/system/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'file_modified',
          data: {
            filePath: 'punishments/active.json',
            original: `Punishment ${id} was active`,
            changes: `Punishment ${status}`,
            date: new Date().toISOString(),
          },
        }),
      })
    } catch (error) {
      console.error('Failed to update index.md:', error)
    }

    return NextResponse.json({
      success: true,
      punishment: punishmentRecord,
    })
  } catch (error: any) {
    console.error('Error updating punishment:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// DELETE: Delete punishment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Read active punishments
    const activeData = await fs.readFile(ACTIVE_FILE, 'utf-8')
    let activePunishments: PunishmentRecord[] = JSON.parse(activeData)

    // Filter out the punishment
    const originalLength = activePunishments.length
    activePunishments = activePunishments.filter(p => p.punishment.id !== id)

    if (activePunishments.length === originalLength) {
      return NextResponse.json(
        { error: 'Punishment not found' },
        { status: 404 }
      )
    }

    // Save
    await fs.writeFile(ACTIVE_FILE, JSON.stringify(activePunishments, null, 2), 'utf-8')

    return NextResponse.json({
      success: true,
      message: 'Punishment deleted',
    })
  } catch (error: any) {
    console.error('Error deleting punishment:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
