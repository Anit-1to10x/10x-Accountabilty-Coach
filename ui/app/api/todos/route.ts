import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { PATHS, getProfilePaths } from '@/lib/paths'

// Parse todos from active.md
function parseTodosMd(content: string) {
  const todos: any[] = []

  // Match todo items: - [x] or - [ ] followed by text
  const todoMatches = content.matchAll(/- \[([ xX])\]\s*\*\*(.+?)\*\*\n([\s\S]*?)(?=\n- \[|$)/g)

  for (const match of todoMatches) {
    const completed = match[1].toLowerCase() === 'x'
    const title = match[2].trim()
    const details = match[3]

    // Parse details
    const priorityMatch = details.match(/Priority:\s*(\w+)/i)
    const createdMatch = details.match(/Created:\s*(.+)/i)
    const challengeMatch = details.match(/Challenge:\s*(.+)/i)

    todos.push({
      id: `todo-${todos.length + 1}`,
      title,
      text: title,
      status: completed ? 'completed' : 'pending',
      completed,
      priority: priorityMatch?.[1]?.toLowerCase() || 'medium',
      createdAt: createdMatch?.[1]?.trim() || new Date().toISOString(),
      challengeId: challengeMatch?.[1]?.trim() || null,
    })
  }

  return todos
}

export async function GET(request: NextRequest) {
  try {
    // Get active profile ID from header or query param
    const { searchParams } = new URL(request.url)
    const profileId = searchParams.get('profileId') || request.headers.get('X-Profile-Id')

    // Use profile-specific path if profileId provided, otherwise fall back to legacy
    const todosDir = profileId ? getProfilePaths(profileId).todos : PATHS.todos

    // Try MD file first
    const mdFile = path.join(todosDir, 'active.md')
    try {
      const data = await fs.readFile(mdFile, 'utf-8')
      const todos = parseTodosMd(data)
      if (todos.length > 0) {
        return NextResponse.json(todos)
      }
    } catch {}

    // Fall back to JSON
    const jsonFile = path.join(todosDir, 'active.json')
    try {
      const data = await fs.readFile(jsonFile, 'utf-8')
      return NextResponse.json(JSON.parse(data))
    } catch {
      return NextResponse.json([])
    }
  } catch (error) {
    console.error('Failed to load todos:', error)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const todo = await request.json()

    // Get active profile ID from header or query param
    const { searchParams } = new URL(request.url)
    const profileId = searchParams.get('profileId') || request.headers.get('X-Profile-Id')

    // Use profile-specific path if profileId provided, otherwise fall back to legacy
    const todosDir = profileId ? getProfilePaths(profileId).todos : PATHS.todos
    const activeFile = path.join(todosDir, 'active.json')

    await fs.mkdir(todosDir, { recursive: true })

    let todos = []
    try {
      const data = await fs.readFile(activeFile, 'utf-8')
      todos = JSON.parse(data)
    } catch {
      // File doesn't exist
    }

    const newTodo = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      ...todo,
    }

    todos.push(newTodo)
    await fs.writeFile(activeFile, JSON.stringify(todos, null, 2))

    // Log to index.md
    try {
      await fetch(`${request.nextUrl.origin}/api/system/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'file_modified',
          data: {
            filePath: 'todos/active.json',
            original: `${todos.length - 1} todos`,
            changes: `Added todo: ${newTodo.title}`,
            date: new Date().toISOString(),
          },
        }),
      })
    } catch (error) {
      console.error('Failed to update index.md:', error)
    }

    return NextResponse.json(newTodo)
  } catch (error) {
    console.error('Failed to create todo:', error)
    return NextResponse.json({ error: 'Failed to create todo' }, { status: 500 })
  }
}
