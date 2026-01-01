import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { DATA_DIR, PATHS } from '@/lib/paths'

// Parse agents from agents.md
function parseAgentsMd(content: string) {
  const agents: any[] = []

  // Split by agent sections (## AgentName)
  const sections = content.split(/\n## /).slice(1) // Skip header

  for (const section of sections) {
    if (section.startsWith('Overview') || section.startsWith('Available')) continue

    const lines = section.split('\n')
    const name = lines[0].trim()
    if (!name || name === 'Overview') continue

    const agent: any = { name }

    // Parse key-value pairs
    for (const line of lines) {
      const match = line.match(/^-\s*\*\*(.+?):\*\*\s*(.+)$/i)
      if (match) {
        const key = match[1].toLowerCase().replace(/\s+/g, '_')
        agent[key] = match[2].trim()
      }
    }

    // Parse capabilities list
    const capsSection = section.match(/### Capabilities\n([\s\S]*?)(?=\n###|$)/i)
    if (capsSection) {
      agent.capabilities = []
      const capMatches = capsSection[1].matchAll(/^-\s+(.+)$/gm)
      for (const m of capMatches) {
        agent.capabilities.push(m[1].trim())
      }
    }

    // Parse skills list
    const skillsSection = section.match(/### Skills\n([\s\S]*?)(?=\n###|$)/i)
    if (skillsSection) {
      agent.skills = []
      const skillMatches = skillsSection[1].matchAll(/^-\s+(.+)$/gm)
      for (const m of skillMatches) {
        agent.skills.push(m[1].trim())
      }
    }

    if (agent.id) {
      agents.push(agent)
    }
  }

  return agents
}

export async function GET() {
  try {
    // Try agents.md first, then fall back to agents.json
    const agentsMdFile = path.join(DATA_DIR, 'agents.md')
    const agentsJsonFile = PATHS.agents

    try {
      // Try MD file first
      await fs.access(agentsMdFile)
      const data = await fs.readFile(agentsMdFile, 'utf-8')
      const agents = parseAgentsMd(data)
      if (agents.length > 0) {
        return NextResponse.json(agents)
      }
    } catch {}

    // Fall back to reading from agent folders
    const agentsDir = path.join(DATA_DIR, 'agents')
    try {
      const dirs = await fs.readdir(agentsDir, { withFileTypes: true })
      const agents = []

      for (const dir of dirs) {
        if (!dir.isDirectory()) continue

        const agentMdPath = path.join(agentsDir, dir.name, 'agent.md')
        try {
          const content = await fs.readFile(agentMdPath, 'utf-8')

          // Parse agent.md
          const nameMatch = content.match(/^#\s+(.+)$/m)
          const idMatch = content.match(/ID:\*\*\s*(.+)/i)
          const descMatch = content.match(/Description:\*\*\s*(.+)/i) || content.match(/## Description\n+([^\n#]+)/i)

          const agent: any = {
            id: idMatch?.[1]?.trim() || dir.name,
            name: nameMatch?.[1]?.trim() || dir.name,
            description: descMatch?.[1]?.trim() || '',
          }

          // Parse capabilities
          const capsSection = content.match(/## Capabilities\n([\s\S]*?)(?=\n##|$)/i)
          if (capsSection) {
            agent.capabilities = []
            const capMatches = capsSection[1].matchAll(/^-\s+(.+)$/gm)
            for (const m of capMatches) {
              if (!m[1].includes('None')) agent.capabilities.push(m[1].trim())
            }
          }

          // Parse skills
          const skillsSection = content.match(/## Skills\n([\s\S]*?)(?=\n##|$)/i) ||
                               content.match(/## Assigned Skills\n([\s\S]*?)(?=\n##|$)/i)
          if (skillsSection) {
            agent.skills = []
            const skillMatches = skillsSection[1].matchAll(/^-\s+(.+)$/gm)
            for (const m of skillMatches) {
              if (!m[1].includes('None') && !m[1].includes('No skills')) {
                agent.skills.push(m[1].trim())
              }
            }
          }

          agents.push(agent)
        } catch {}
      }

      if (agents.length > 0) {
        return NextResponse.json(agents)
      }
    } catch {}

    // Final fallback to JSON
    try {
      await fs.access(agentsJsonFile)
      const data = await fs.readFile(agentsJsonFile, 'utf-8')
      const agents = JSON.parse(data)
      return NextResponse.json(agents)
    } catch {
      return NextResponse.json([])
    }
  } catch (error) {
    console.error('Failed to load agents:', error)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const newAgent = await request.json()
    const agentsFile = PATHS.agents

    // Ensure base directory exists
    await fs.mkdir(DATA_DIR, { recursive: true })

    // Create agent-specific folder structure
    const agentDir = path.join(DATA_DIR, 'agents', newAgent.id)
    await fs.mkdir(agentDir, { recursive: true })

    // Create subdirectories
    const subdirs = ['workspace', 'prompts', 'config']
    for (const subdir of subdirs) {
      await fs.mkdir(path.join(agentDir, subdir), { recursive: true })
    }

    // Create agent metadata file
    const agentMetadata = {
      id: newAgent.id,
      name: newAgent.name,
      icon: newAgent.icon,
      description: newAgent.description,
      skills: newAgent.skills,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await fs.writeFile(
      path.join(agentDir, 'agent.json'),
      JSON.stringify(agentMetadata, null, 2)
    )

    // Create agent.md instruction file (main file Claude Code reads)
    const agentMd = `# ${newAgent.name}

## Description
${newAgent.description || 'No description provided'}

## Personality
- Tone: ${newAgent.personality?.tone || 'encouraging'}
- Style: ${newAgent.personality?.style || 'supportive'}

## Assigned Skills
${newAgent.skills && newAgent.skills.length > 0 ? newAgent.skills.map((s: string) => `- ${s}`).join('\n') : '- No skills assigned yet'}

## Custom Instructions
${newAgent.customInstructions || 'Follow the assigned skills and provide helpful responses.'}

## Focus Areas
${newAgent.focusAreas && newAgent.focusAreas.length > 0 ? newAgent.focusAreas.map((f: string) => `- ${f}`).join('\n') : '- General assistance'}

## Restrictions
${newAgent.restrictions && newAgent.restrictions.length > 0 ? newAgent.restrictions.map((r: string) => `- ${r}`).join('\n') : '- None specified'}

## Quick Actions
${newAgent.quickActions ? newAgent.quickActions.map((a: any) => `- ${a.label}`).join('\n') : '- No quick actions'}

## Capabilities
${newAgent.capabilities ? Object.entries(newAgent.capabilities).map(([k, v]) => `- ${k}: ${v}`).join('\n') : '- Default capabilities'}

---
Created: ${new Date().toISOString().split('T')[0]}
Last Modified: ${new Date().toISOString().split('T')[0]}
`
    await fs.writeFile(path.join(agentDir, 'agent.md'), agentMd)

    // Load existing agents from agents.json
    let agents = []
    try {
      const data = await fs.readFile(agentsFile, 'utf-8')
      agents = JSON.parse(data)
    } catch {
      // File doesn't exist, will create it
    }

    // Add new agent
    agents.push(newAgent)

    // Save to agents.json
    await fs.writeFile(agentsFile, JSON.stringify(agents, null, 2))

    return NextResponse.json({ success: true, agent: newAgent })
  } catch (error) {
    console.error('Failed to create agent:', error)
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    )
  }
}
