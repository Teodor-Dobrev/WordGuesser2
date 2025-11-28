import { NameGate } from './features/auth/NameGate'
import { GamePage } from './features/game/GamePage'
import { GamePicker, type SideProject } from './features/projects/GamePicker'
import { useLocalStorageState } from './hooks/useLocalStorage'

const PROJECTS: SideProject[] = [
  {
    id: 'wordguesser',
    name: 'Word Guesser',
    tagline: 'Race the grid, rack up points',
    description: 'Build words on a randomized grid, chase leaderboards, and grow your lexicon with bundled dictionaries.',
    status: 'available',
  },
  {
    id: 'cipherfall',
    name: 'Cipherfall',
    tagline: 'Decrypt the neon rain',
    description: 'A narrative puzzle prototype that decodes messages from an overclocked bulletin board. Coming soon.',
    status: 'coming-soon',
  },
  {
    id: 'botworks',
    name: 'Bot Works',
    tagline: 'Automate tiny factories',
    description: 'Chain conveyor belts, bots, and timers to ship widgets faster than the stopwatch. Stay tuned.',
    status: 'coming-soon',
  },
]

export default function App() {
  const [activeProject, setActiveProject] = useLocalStorageState<string>('sideprojects:selected', '')
  const [playerName, setPlayerName] = useLocalStorageState<string>('wordguesser:player', '')

  const selectedProject = PROJECTS.find((project) => project.id === activeProject)

  const returnToPicker = () => {
    setActiveProject('')
  }

  const renderPicker = () => (
    <div className="app-shell">
      <GamePicker projects={PROJECTS} onPick={setActiveProject} />
    </div>
  )

  if (!selectedProject) {
    return renderPicker()
  }

  if (selectedProject.id === 'wordguesser') {
    if (!playerName) {
      return (
        <div className="app-shell">
          <NameGate
            onEnter={setPlayerName}
            title="Word Guesser"
            description="Enter your name to join the leaderboard."
            onBack={returnToPicker}
          />
        </div>
      )
    }

    return (
      <div className="app-shell">
        <GamePage
          playerName={playerName}
          onResetPlayer={() => setPlayerName('')}
          onSwitchProject={returnToPicker}
        />
      </div>
    )
  }

  return renderPicker()
}
