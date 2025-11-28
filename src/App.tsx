import { NameGate } from './features/auth/NameGate'
import { GamePage } from './features/game/GamePage'
import { GamePicker, type SideProject } from './features/projects/GamePicker'
import { WormGame } from './features/worm/WormGame'
import { MemoryGame } from './features/memory/MemoryGame'
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
    id: 'wormgame',
    name: 'Worm',
    tagline: 'A soothing snake remake',
    description: 'Guide the neon worm to tasty apples, avoid yourself, and chase a personal high score with instant restarts.',
    status: 'available',
  },
  {
    id: 'memorymatch',
    name: 'Match the Emoji',
    tagline: 'Flip panels, beat the clock',
    description: 'A classic memory challenge with emoji tiles, five difficulty levels, and best-time tracking per player.',
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
  const [wormPlayerName, setWormPlayerName] = useLocalStorageState<string>('wormgame:player', '')
  const [memoryPlayerName, setMemoryPlayerName] = useLocalStorageState<string>('memorymatch:player', '')

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

  if (selectedProject.id === 'wormgame') {
    if (!wormPlayerName) {
      return (
        <div className="app-shell">
          <NameGate
            onEnter={setWormPlayerName}
            title="Worm"
            description="Enter your player name to track your personal high score."
            onBack={returnToPicker}
          />
        </div>
      )
    }

    return (
      <div className="app-shell">
        <WormGame
          playerName={wormPlayerName}
          onResetPlayer={() => setWormPlayerName('')}
          onSwitchProject={returnToPicker}
        />
      </div>
    )
  }

  if (selectedProject.id === 'memorymatch') {
    if (!memoryPlayerName) {
      return (
        <div className="app-shell">
          <NameGate
            onEnter={setMemoryPlayerName}
            title="Match the Emoji"
            description="Pick a display name to keep track of your best times."
            onBack={returnToPicker}
          />
        </div>
      )
    }

    return (
      <div className="app-shell">
        <MemoryGame
          playerName={memoryPlayerName}
          onResetPlayer={() => setMemoryPlayerName('')}
          onSwitchProject={returnToPicker}
        />
      </div>
    )
  }

  return renderPicker()
}
