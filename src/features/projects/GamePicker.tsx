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
    <div className="panel game-picker">
      <header className="picker-header">
        <p className="eyebrow">Side project playground</p>
        <h1>Select a build to open</h1>
        <p>Choose what to hack on tonight. Word Guesser is ready; the rest are warming up.</p>
      </header>
      <div className="project-grid">
        {projects.map((project) => {
          const disabled = project.status !== 'available'
          const actionLabel = disabled ? 'Coming soon' : 'Launch'
          return (
            <article key={project.id} className={`project-card${disabled ? ' disabled' : ''}`}>
              <div className="project-card-head">
                <span className="eyebrow">{project.status === 'available' ? 'Playable' : 'In progress'}</span>
                <h2>{project.name}</h2>
                <p className="tagline">{project.tagline}</p>
              </div>
              <p className="project-description">{project.description}</p>
              {project.footer && <div className="project-footer">{project.footer}</div>}
              <button type="button" onClick={() => onPick(project.id)} disabled={disabled}>
                {actionLabel}
              </button>
            </article>
          )
        })}
      </div>
    </div>
  )
}
