import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { PATHS } from '@/lib/paths'

const TODOS_FILE = path.join(PATHS.todos, 'active.json')

interface Todo {
  id: string
  title: string
  completed: boolean
  challengeId?: string
  date?: string
  priority?: 'low' | 'medium' | 'high'
  createdAt: string
}

// GET: Read specific todo
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const content = await fs.readFile(TODOS_FILE, 'utf-8')
    const todos: Todo[] = JSON.parse(content)
    const todo = todos.find((t) => t.id === params.id)

    if (!todo) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ todo })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load todo' },
      { status: 500 }
    )
  }
}

// PATCH: Update todo (toggle completion, update fields)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { completed, title, date, priority } = body

    // Read existing todos
    let todos: Todo[] = []
    try {
      const content = await fs.readFile(TODOS_FILE, 'utf-8')
      todos = JSON.parse(content)
    } catch {
      return NextResponse.json(
        { error: 'Todos file not found' },
        { status: 404 }
      )
    }

    // Find and update todo
    const todoIndex = todos.findIndex((t) => t.id === params.id)
    if (todoIndex === -1) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      )
    }

    // IMMUTABILITY PROTECTION: Prevent unchecking completed todos
    if (completed !== undefined && completed === false && todos[todoIndex].completed === true) {
      return NextResponse.json(
        {
          error: 'Cannot uncheck completed todo. Once checked in, it stays checked.',
          immutable: true
        },
        { status: 403 }
      )
    }

    // Update fields
    if (completed !== undefined) todos[todoIndex].completed = completed
    if (title !== undefined) todos[todoIndex].title = title
    if (date !== undefined) todos[todoIndex].date = date
    if (priority !== undefined) todos[todoIndex].priority = priority

    // Save updated todos
    await fs.writeFile(TODOS_FILE, JSON.stringify(todos, null, 2))

    // Update index.md
    try {
      await fetch(`${request.nextUrl.origin}/api/system/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'todo_updated',
          data: {
            todoId: params.id,
            completed: todos[todoIndex].completed,
            date: new Date().toISOString(),
          },
        }),
      })
    } catch (error) {
      console.error('Failed to update index.md:', error)
    }

    return NextResponse.json({
      success: true,
      todo: todos[todoIndex],
    })
  } catch (error: any) {
    console.error('Failed to update todo:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// DELETE: Remove todo
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Read existing todos
    let todos: Todo[] = []
    try {
      const content = await fs.readFile(TODOS_FILE, 'utf-8')
      todos = JSON.parse(content)
    } catch {
      return NextResponse.json(
        { error: 'Todos file not found' },
        { status: 404 }
      )
    }

    // Find todo
    const todoIndex = todos.findIndex((t) => t.id === params.id)
    if (todoIndex === -1) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      )
    }

    // Remove todo
    const deletedTodo = todos.splice(todoIndex, 1)[0]

    // Save updated todos
    await fs.writeFile(TODOS_FILE, JSON.stringify(todos, null, 2))

    // Update index.md
    try {
      await fetch(`${request.nextUrl.origin}/api/system/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'todo_deleted',
          data: {
            todoId: params.id,
            title: deletedTodo.title,
            date: new Date().toISOString(),
          },
        }),
      })
    } catch (error) {
      console.error('Failed to update index.md:', error)
    }

    return NextResponse.json({
      success: true,
      deletedTodo,
    })
  } catch (error: any) {
    console.error('Failed to delete todo:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
