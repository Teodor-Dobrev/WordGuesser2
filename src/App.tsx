import { NameGate } from './features/auth/NameGate'
import { GamePage } from './features/game/GamePage'
import { GamePicker, type SideProject } from './features/projects/GamePicker'
import { WormGame } from './features/worm/WormGame'
import { MemoryGame } from './features/memory/MemoryGame'
import { PathFinderGame } from './features/pathfinder/PathFinderGame'
import { HangmanGame } from './features/hangman/HangmanGame'
import { TypeRacerGame } from './features/typeracer/TypeRacerGame'
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
    id: 'hangman',
    name: 'HangMan',
    tagline: 'Classic gallows suspense',
    description: 'Guess the hidden word from our dictionaries before the figure is complete. Streaks are tracked per language.',
    status: 'available',
  },
  {
    id: 'typeracer',
    name: 'Type Racer',
    tagline: 'One prompt. All speed.',
    description: 'Sprint through a randomized prompt from the dictionaries and lock in your best WPM with perfect accuracy.',
    status: 'available',
  },
  {
    id: 'pathfinder',
    name: 'Path Finder',
    tagline: 'Drag the only safe route',
    description: 'Sketch a route from entrance to exit on a randomized maze. Bigger grids unlock on higher difficulties.',
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
  const [hangmanPlayerName, setHangmanPlayerName] = useLocalStorageState<string>('hangman:player', '')
  const [pathPlayerName, setPathPlayerName] = useLocalStorageState<string>('pathfinder:player', '')
  const [typeracerPlayerName, setTyperacerPlayerName] = useLocalStorageState<string>('typeracer:player', '')

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

  if (selectedProject.id === 'pathfinder') {
    if (!pathPlayerName) {
      return (
        <div className="app-shell">
          <NameGate
            onEnter={setPathPlayerName}
            title="Path Finder"
            description="Pick a codename to log your best escape times."
            onBack={returnToPicker}
          />
        </div>
      )
    }

    return (
      <div className="app-shell">
        <PathFinderGame
          playerName={pathPlayerName}
          onResetPlayer={() => setPathPlayerName('')}
          onSwitchProject={returnToPicker}
        />
      </div>
    )
  }

  if (selectedProject.id === 'hangman') {
    if (!hangmanPlayerName) {
      return (
        <div className="app-shell">
          <NameGate
            onEnter={setHangmanPlayerName}
            title="HangMan"
            description="Enter your alias to log your best streak."
            onBack={returnToPicker}
          />
        </div>
      )
    }

    return (
      <div className="app-shell">
        <HangmanGame
          playerName={hangmanPlayerName}
          onResetPlayer={() => setHangmanPlayerName('')}
          onSwitchProject={returnToPicker}
        />
      </div>
    )
  }

  if (selectedProject.id === 'typeracer') {
    if (!typeracerPlayerName) {
      return (
        <div className="app-shell">
          <NameGate
            onEnter={setTyperacerPlayerName}
            title="Type Racer"
            description="Pick a codename so we can track your best WPM per language."
            onBack={returnToPicker}
          />
        </div>
      )
    }

    return (
      <div className="app-shell">
        <TypeRacerGame
          playerName={typeracerPlayerName}
          onResetPlayer={() => setTyperacerPlayerName('')}
          onSwitchProject={returnToPicker}
        />
      </div>
    )
  }

  return renderPicker()
}
