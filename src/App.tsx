import { NameGate } from './features/auth/NameGate'
import { GamePage } from './features/game/GamePage'
import { GamePicker, type SideProject } from './features/projects/GamePicker'
import { WormGame } from './features/worm/WormGame'
import { MemoryGame } from './features/memory/MemoryGame'
import { PathFinderGame } from './features/pathfinder/PathFinderGame'
import { HangmanGame } from './features/hangman/HangmanGame'
import { TypeRacerGame } from './features/typeracer/TypeRacerGame'
import { ColorMatcherGame } from './features/colormatcher/ColorMatcherGame'
import { MinesweeperGame } from './features/minesweeper/MinesweeperGame'
import { ArcaneOdysseyGame } from './features/dndquest/ArcaneOdysseyGame'
import { EmberClashGame } from './features/emberclash/EmberClashGame'
import { useLocalStorageState } from './hooks/useLocalStorage'

const PROJECTS: SideProject[] = [
  {
    id: 'wordguesser',
    name: '🧩 Word Guesser',
    tagline: 'Race the grid, rack up points',
    description: 'Build words on a randomized grid, chase leaderboards, and grow your lexicon with bundled dictionaries.',
    status: 'available',
  },
  {
    id: 'wormgame',
    name: '🐍 Worm',
    tagline: 'A soothing snake remake',
    description: 'Guide the neon worm to tasty apples, avoid yourself, and chase a personal high score with instant restarts.',
    status: 'available',
  },
  {
    id: 'memorymatch',
    name: '🧠 Match the Emoji',
    tagline: 'Flip panels, beat the clock',
    description: 'A classic memory challenge with emoji tiles, five difficulty levels, and best-time tracking per player.',
    status: 'available',
  },
  {
    id: 'hangman',
    name: '🪢 HangMan',
    tagline: 'Classic gallows suspense',
    description: 'Guess the hidden word from our dictionaries before the figure is complete. Streaks are tracked per language.',
    status: 'available',
  },
  {
    id: 'typeracer',
    name: '⌨️ Type Racer',
    tagline: 'One prompt. All speed.',
    description: 'Sprint through a randomized prompt from the dictionaries and lock in your best WPM with perfect accuracy.',
    status: 'available',
  },
  {
    id: 'colormatcher',
    name: '🎨 Color Matcher',
    tagline: 'Spot the odd tile.',
    description: 'A reflex-heavy hue test with shrinking color gaps each round. Keep the streak alive before the clock runs out.',
    status: 'available',
  },
  {
    id: 'pathfinder',
    name: '🧭 Path Finder',
    tagline: 'Drag the only safe route',
    description: 'Sketch a route from entrance to exit on a randomized maze. Bigger grids unlock on higher difficulties.',
    status: 'available',
  },
  {
    id: 'minesweeper',
    name: '💣 Minesweeper Classic',
    tagline: 'Avoid the boom',
    description: 'Three iconic board sizes, right-click flags, and best clear times tracked per difficulty.',
    status: 'available',
  },
  {
    id: 'arcaneodyssey',
    name: '🪄 Arcane Odyssey',
    tagline: 'Narrative duels + loot',
    description: 'Two full acts of DnD-inspired choices, mana management, and turn-based combat versus scripted foes.',
    status: 'available',
  },
  {
    id: 'emberclash',
    name: 'Ember Clash',
    tagline: 'Full Act 1 card run',
    description: 'A 10-floor run with events, shops, rest stops, elite pressure, and a final boss fight.',
    status: 'available',
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
  const [colorMatcherPlayerName, setColorMatcherPlayerName] = useLocalStorageState<string>('colormatcher:player', '')
  const [minesweeperPlayerName, setMinesweeperPlayerName] = useLocalStorageState<string>('minesweeper:player', '')
  const [arcanePlayerName, setArcanePlayerName] = useLocalStorageState<string>('arcaneodyssey:player', '')
  const [emberClashPlayerName, setEmberClashPlayerName] = useLocalStorageState<string>('emberclash:player', '')

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

  if (selectedProject.id === 'colormatcher') {
    if (!colorMatcherPlayerName) {
      return (
        <div className="app-shell">
          <NameGate
            onEnter={setColorMatcherPlayerName}
            title="Color Matcher"
            description="Enter your alias to save the longest streak per difficulty."
            onBack={returnToPicker}
          />
        </div>
      )
    }

    return (
      <div className="app-shell">
        <ColorMatcherGame
          playerName={colorMatcherPlayerName}
          onResetPlayer={() => setColorMatcherPlayerName('')}
          onSwitchProject={returnToPicker}
        />
      </div>
    )
  }

  if (selectedProject.id === 'minesweeper') {
    if (!minesweeperPlayerName) {
      return (
        <div className="app-shell">
          <NameGate
            onEnter={setMinesweeperPlayerName}
            title="Minesweeper Classic"
            description="Pick a codename to save your best clear times."
            onBack={returnToPicker}
          />
        </div>
      )
    }

    return (
      <div className="app-shell">
        <MinesweeperGame
          playerName={minesweeperPlayerName}
          onResetPlayer={() => setMinesweeperPlayerName('')}
          onSwitchProject={returnToPicker}
        />
      </div>
    )
  }

  if (selectedProject.id === 'arcaneodyssey') {
    if (!arcanePlayerName) {
      return (
        <div className="app-shell">
          <NameGate
            onEnter={setArcanePlayerName}
            title="Arcane Odyssey"
            description="Choose an alias for your spellblade run."
            onBack={returnToPicker}
          />
        </div>
      )
    }

    return (
      <div className="app-shell">
        <ArcaneOdysseyGame
          playerName={arcanePlayerName}
          onResetPlayer={() => setArcanePlayerName('')}
          onSwitchProject={returnToPicker}
        />
      </div>
    )
  }

  if (selectedProject.id === 'emberclash') {
    if (!emberClashPlayerName) {
      return (
        <div className="app-shell">
          <NameGate
            onEnter={setEmberClashPlayerName}
            title="Ember Clash"
            description="Choose an alias for your full Act 1 forge run."
            onBack={returnToPicker}
          />
        </div>
      )
    }

    return (
      <div className="app-shell">
        <EmberClashGame
          playerName={emberClashPlayerName}
          onResetPlayer={() => setEmberClashPlayerName('')}
          onSwitchProject={returnToPicker}
        />
      </div>
    )
  }

  return renderPicker()
}
