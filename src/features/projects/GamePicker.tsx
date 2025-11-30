import type { ReactNode } from 'react'

export interface SideProject {
  id: string
  name: string
  tagline: string
  description: string
  status: 'available' | 'coming-soon'
  accent?: string
  footer?: ReactNode
}

interface GamePickerProps {
  projects: SideProject[]
  onPick: (id: string) => void
}

export function GamePicker({ projects, onPick }: GamePickerProps) {
  return (
    <div className="panel game-picker compact">
      <header className="picker-header compact">
        <p className="eyebrow">Side project playground</p>
        <h1 style={{ fontSize: '1.5rem', marginBottom: 4 }}>Select a build to open</h1>
      </header>
      <div className="project-grid compact">
        {projects.map((project) => {
          const disabled = project.status !== 'available'
          const actionLabel = disabled ? 'Coming soon' : 'Launch'
          return (
            <article key={project.id} className={`project-card compact${disabled ? ' disabled' : ''}`} style={{ minHeight: 0, padding: 12 }}>
              <div className="project-card-head" style={{ marginBottom: 4 }}>
                <span className="eyebrow">{project.status === 'available' ? 'Playable' : 'In progress'}</span>
                <h2 style={{ fontSize: '1.1rem', margin: 0 }}>{project.name}</h2>
                <p className="tagline" style={{ fontSize: '0.95rem', margin: 0 }}>{project.tagline}</p>
              </div>
              <p className="project-description" style={{ fontSize: '0.95rem', margin: '4px 0 8px' }}>{project.description}</p>
              {project.footer && <div className="project-footer">{project.footer}</div>}
              <button type="button" onClick={() => onPick(project.id)} disabled={disabled} style={{ padding: '7px 14px', fontSize: '0.95rem' }}>
                {actionLabel}
              </button>
            </article>
          )
        })}
      </div>
    </div>
  )
}
