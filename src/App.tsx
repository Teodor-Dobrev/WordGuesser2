import { NameGate } from './features/auth/NameGate'
import { GamePage } from './features/game/GamePage'
import { useLocalStorageState } from './hooks/useLocalStorage'

export default function App() {
  const [playerName, setPlayerName] = useLocalStorageState<string>('wordguesser:player', '')

  if (!playerName) {
    return (
      <div className="app-shell">
        <NameGate onEnter={setPlayerName} />
      </div>
    )
  }

  return (
    <div className="app-shell">
      <GamePage playerName={playerName} onResetPlayer={() => setPlayerName('')} />
    </div>
  )
}
