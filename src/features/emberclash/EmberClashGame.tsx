import { useEffect, useMemo, useRef, useState } from 'react'
import { getPlayerHighScore, recordPlayerHighScore } from '../leaderboard/storage'
import {
  ACT_ONE_ROOMS,
  ACT_ONE_TITLE,
  RELIC_POOL,
  STARTER_DECK,
  STARTING_RELIC,
  buildEventChoices,
  buildShopOffers,
  getCardById,
  getEnemyById,
} from './content'
import { createCombatState, endPlayerTurn, getCurrentEnemyIntent, playCard } from './engine'
import type {
  ActRoomType,
  CardDefinition,
  CardType,
  EventChoice,
  RelicDefinition,
  RunState,
  ShopOffer,
} from './types'

const EMBER_CLASH_GAME_ID = 'emberclash'
const DEFAULT_SCOPE = 'normal'
const STARTING_HP = 92
const STARTING_GOLD = 140

interface EmberClashGameProps {
  playerName: string
  onResetPlayer: () => void
  onSwitchProject?: () => void
}

function createInitialRun(): RunState {
  return {
    node: 'map',
    floorIndex: 0,
    clearedRooms: 0,
    gold: STARTING_GOLD,
    hp: STARTING_HP,
    maxHp: STARTING_HP,
    deck: [...STARTER_DECK],
    relics: [STARTING_RELIC],
    combat: null,
    activeEnemyId: null,
    result: 'pending',
    totalTurns: 0,
  }
}

function clampPercent(current: number, max: number) {
  if (max <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((current / max) * 100)))
}

function computeRunScore(run: RunState) {
  const victoryBonus = run.result === 'won' ? 450 : 0
  return Math.max(
    0,
    victoryBonus + run.clearedRooms * 48 + Math.max(0, run.hp) * 3 + run.gold - run.totalTurns * 4,
  )
}

function removePreferredCard(deck: CardDefinition[]): CardDefinition[] {
  if (deck.length <= 1) return deck
  const targetIndex = deck.findIndex((card) => card.id === 'emberStrike')
  return deck.filter((_, index) => index !== (targetIndex >= 0 ? targetIndex : 0))
}

function pickRandom<T>(entries: T[]): T | null {
  if (entries.length === 0) return null
  return entries[Math.floor(Math.random() * entries.length)] ?? null
}

function drawRelicNotOwned(currentRelics: RelicDefinition[]): RelicDefinition | null {
  const owned = new Set(currentRelics.map((relic) => relic.id))
  return pickRandom(RELIC_POOL.filter((relic) => !owned.has(relic.id)))
}

function roomTypeLabel(type: ActRoomType) {
  if (type === 'combat') return 'Battle'
  if (type === 'elite') return 'Elite'
  if (type === 'event') return 'Event'
  if (type === 'shop') return 'Shop'
  if (type === 'rest') return 'Rest'
  return 'Boss'
}

function roomIcon(type: ActRoomType) {
  if (type === 'combat') return 'B'
  if (type === 'elite') return 'E'
  if (type === 'event') return '?'
  if (type === 'shop') return '$'
  if (type === 'rest') return '+'
  return 'X'
}

function sceneLabel(node: RunState['node']) {
  if (node === 'map') return 'Act Map'
  if (node === 'shop') return 'Market'
  if (node === 'event') return 'Encounter'
  if (node === 'rest') return 'Camp'
  if (node === 'combat') return 'Combat'
  return 'Run Verdict'
}

function cardTypeTone(type: CardType) {
  if (type === 'attack') return 'attack'
  if (type === 'skill') return 'skill'
  return 'power'
}

function cardGlyph(card: CardDefinition) {
  const map: Record<string, string> = {
    warCry: 'WAR',
    ironGuard: 'BLK',
    bashDown: 'BASH',
    platedStance: 'PLATE',
    recklessCleave: 'CLEAVE',
    secondWind: 'WIND',
    furnaceBlow: 'BLOW',
    infernoBurst: 'BURST',
    guardBreak: 'BREAK',
    moltenVolley: 'VOLLEY',
    temperedMail: 'MAIL',
    rageSpark: 'SPARK',
  }
  return map[card.id] ?? 'STRIKE'
}

function offerTitle(offer: ShopOffer) {
  if (offer.kind === 'remove') return 'Smelter Service'
  if (offer.kind === 'relic') return offer.relic.name
  return offer.card.name
}

function offerDescription(offer: ShopOffer) {
  if (offer.kind === 'remove') return 'Purge one basic strike from your deck.'
  if (offer.kind === 'relic') return offer.relic.description
  return offer.card.description
}

function resolveRoomCompletion(prev: RunState, patch: Partial<RunState>): RunState {
  const merged = { ...prev, ...patch }
  if (merged.hp <= 0) return { ...merged, hp: 0, node: 'result', result: 'lost', combat: null, activeEnemyId: null }
  const nextFloorIndex = prev.floorIndex + 1
  const clearedRooms = prev.clearedRooms + 1
  if (nextFloorIndex >= ACT_ONE_ROOMS.length) {
    return {
      ...merged,
      floorIndex: nextFloorIndex,
      clearedRooms,
      node: 'result',
      result: 'won',
      combat: null,
      activeEnemyId: null,
    }
  }
  return {
    ...merged,
    floorIndex: nextFloorIndex,
    clearedRooms,
    node: 'map',
    combat: null,
    activeEnemyId: null,
    result: 'pending',
  }
}

function applyEventOutcome(choice: EventChoice, run: RunState) {
  let hp = run.hp
  let maxHp = run.maxHp
  let gold = run.gold
  let deck = [...run.deck]
  let relics = [...run.relics]
  let text = choice.effectText

  if (choice.id === 'meditate') hp = Math.min(run.maxHp, run.hp + 12)
  if (choice.id === 'bloodDeal') {
    hp = Math.max(1, run.hp - 8)
    const card = getCardById('furnaceBlow')
    if (card) deck = [...deck, card]
  }
  if (choice.id === 'scrapCache') gold += 35
  if (choice.id === 'smolderingRelic') {
    const relic = drawRelicNotOwned(relics)
    if (relic) {
      relics = [...relics, relic]
      text = `Gained relic: ${relic.name}.`
    }
  }
  if (choice.id === 'streetBrawl') {
    hp = Math.max(1, hp - 6)
    gold += 55
  }
  if (choice.id === 'oldSmith') {
    const card = getCardById('moltenVolley')
    if (card) deck = [...deck, card]
  }
  if (choice.id === 'overheat') {
    maxHp = Math.max(40, run.maxHp - 5)
    hp = Math.min(maxHp, Math.max(1, hp - 3))
    const relic = drawRelicNotOwned(relics)
    if (relic) {
      relics = [...relics, relic]
      text = `Max HP -5. Gained relic: ${relic.name}.`
    }
  }
  if (choice.id === 'sealedChest') gold += 80
  return { hp, maxHp, gold, deck, relics, text }
}

export function EmberClashGame({ playerName, onResetPlayer, onSwitchProject }: EmberClashGameProps) {
  const [run, setRun] = useState<RunState>(() => createInitialRun())
  const [shopOffers, setShopOffers] = useState<ShopOffer[]>([])
  const [eventChoices, setEventChoices] = useState<EventChoice[]>([])
  const [eventOutcome, setEventOutcome] = useState('')
  const [toast, setToast] = useState('')
  const [finalScore, setFinalScore] = useState(0)
  const [scoreCommitted, setScoreCommitted] = useState(false)
  const [bestScore, setBestScore] = useState(() =>
    getPlayerHighScore(EMBER_CLASH_GAME_ID, playerName, DEFAULT_SCOPE),
  )
  const [enemyHitFlash, setEnemyHitFlash] = useState(false)
  const [playerHitFlash, setPlayerHitFlash] = useState(false)

  const prevEnemyHp = useRef<number | null>(null)
  const prevPlayerHp = useRef<number | null>(null)

  const activeRoom = run.floorIndex < ACT_ONE_ROOMS.length ? ACT_ONE_ROOMS[run.floorIndex] : null
  const activeEnemy = useMemo(() => (run.activeEnemyId ? getEnemyById(run.activeEnemyId) : null), [run.activeEnemyId])
  const combatState = run.node === 'combat' ? run.combat : null

  useEffect(() => setBestScore(getPlayerHighScore(EMBER_CLASH_GAME_ID, playerName, DEFAULT_SCOPE)), [playerName])
  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(''), 2400)
    return () => window.clearTimeout(timeout)
  }, [toast])
  useEffect(() => {
    if (run.node !== 'result' || scoreCommitted) return
    const score = computeRunScore(run)
    setFinalScore(score)
    if (run.result === 'won') {
      setBestScore(recordPlayerHighScore(EMBER_CLASH_GAME_ID, playerName, score, { scope: DEFAULT_SCOPE }))
    }
    setScoreCommitted(true)
  }, [playerName, run, scoreCommitted])

  useEffect(() => {
    if (!combatState) {
      prevEnemyHp.current = null
      prevPlayerHp.current = null
      return
    }
    const enemyBefore = prevEnemyHp.current
    const playerBefore = prevPlayerHp.current
    let enemyTimer = 0
    let playerTimer = 0
    if (enemyBefore !== null && combatState.enemy.hp < enemyBefore) {
      setEnemyHitFlash(true)
      enemyTimer = window.setTimeout(() => setEnemyHitFlash(false), 280)
    }
    if (playerBefore !== null && combatState.player.hp < playerBefore) {
      setPlayerHitFlash(true)
      playerTimer = window.setTimeout(() => setPlayerHitFlash(false), 280)
    }
    prevEnemyHp.current = combatState.enemy.hp
    prevPlayerHp.current = combatState.player.hp
    return () => {
      if (enemyTimer) window.clearTimeout(enemyTimer)
      if (playerTimer) window.clearTimeout(playerTimer)
    }
  }, [combatState])

  const currentIntent = useMemo(() => {
    if (!combatState || combatState.status !== 'in-progress' || !activeEnemy) return null
    return getCurrentEnemyIntent(combatState, activeEnemy)
  }, [combatState, activeEnemy])

  const visibleCombatLogs = useMemo(() => (combatState ? combatState.logs.slice(-8).reverse() : []), [combatState])
  const deckSummary = useMemo(() => {
    const byCard = new Map<string, { name: string; count: number }>()
    run.deck.forEach((card) => byCard.set(card.id, { name: card.name, count: (byCard.get(card.id)?.count ?? 0) + 1 }))
    return Array.from(byCard.values()).sort((left, right) => right.count - left.count)
  }, [run.deck])

  const resetRun = () => {
    setRun(createInitialRun())
    setShopOffers([])
    setEventChoices([])
    setEventOutcome('')
    setToast('')
    setFinalScore(0)
    setScoreCommitted(false)
    setEnemyHitFlash(false)
    setPlayerHitFlash(false)
    prevEnemyHp.current = null
    prevPlayerHp.current = null
  }

  const enterCurrentRoom = () => {
    if (run.node !== 'map' || !activeRoom) return
    if (activeRoom.type === 'shop') {
      setShopOffers(buildShopOffers(activeRoom.floor >= 8 ? 'late' : 'early'))
      setRun((prev) => ({ ...prev, node: 'shop' }))
      setToast(`Entered ${activeRoom.title}.`)
      return
    }
    if (activeRoom.type === 'event') {
      setEventChoices(buildEventChoices(3))
      setEventOutcome('')
      setRun((prev) => ({ ...prev, node: 'event' }))
      setToast(`Encounter started: ${activeRoom.title}.`)
      return
    }
    if (activeRoom.type === 'rest') {
      setRun((prev) => ({ ...prev, node: 'rest' }))
      setToast('Campfire reached.')
      return
    }
    if (!activeRoom.enemyId) {
      setToast('This room has no enemy configured.')
      return
    }
    const enemy = getEnemyById(activeRoom.enemyId)
    if (!enemy) {
      setToast('Enemy data is missing.')
      return
    }
    setRun((prev) => ({
      ...prev,
      node: 'combat',
      activeEnemyId: enemy.id,
      combat: createCombatState({
        deck: prev.deck,
        relics: prev.relics,
        hp: prev.hp,
        maxHp: prev.maxHp,
        enemy,
      }),
    }))
    setToast(`${enemy.name} enters the arena.`)
  }

  const buyOffer = (offer: ShopOffer) => {
    setRun((prev) => {
      if (prev.node !== 'shop') return prev
      if (prev.gold < offer.price) {
        setToast('Not enough gold.')
        return prev
      }
      if (offer.kind === 'card') {
        setShopOffers((currentOffers) => currentOffers.filter((entry) => entry.offerId !== offer.offerId))
        setToast(`Acquired ${offer.card.name}.`)
        return { ...prev, gold: prev.gold - offer.price, deck: [...prev.deck, offer.card] }
      }
      if (offer.kind === 'relic') {
        if (prev.relics.some((relic) => relic.id === offer.relic.id)) {
          setToast('Relic already owned.')
          return prev
        }
        setShopOffers((currentOffers) => currentOffers.filter((entry) => entry.offerId !== offer.offerId))
        setToast(`Relic secured: ${offer.relic.name}.`)
        return { ...prev, gold: prev.gold - offer.price, relics: [...prev.relics, offer.relic] }
      }
      const nextDeck = removePreferredCard(prev.deck)
      if (nextDeck.length === prev.deck.length) {
        setToast('No card can be removed.')
        return prev
      }
      setShopOffers((currentOffers) => currentOffers.filter((entry) => entry.offerId !== offer.offerId))
      setToast('A basic strike was smelted.')
      return { ...prev, gold: prev.gold - offer.price, deck: nextDeck }
    })
  }

  const leaveShop = () => {
    setRun((prev) => (prev.node === 'shop' ? resolveRoomCompletion(prev, {}) : prev))
    setToast('Market phase completed.')
  }

  const resolveEvent = (choice: EventChoice) => {
    setEventOutcome(choice.effectText)
    setRun((prev) => {
      if (prev.node !== 'event') return prev
      const outcome = applyEventOutcome(choice, prev)
      setToast(outcome.text)
      return resolveRoomCompletion(prev, {
        hp: outcome.hp,
        maxHp: outcome.maxHp,
        gold: outcome.gold,
        deck: outcome.deck,
        relics: outcome.relics,
      })
    })
  }

  const takeRest = (option: 'heal' | 'temper') => {
    setRun((prev) => {
      if (prev.node !== 'rest') return prev
      if (option === 'heal') {
        setToast('You recover by the campfire.')
        return resolveRoomCompletion(prev, { hp: Math.min(prev.maxHp, prev.hp + 24) })
      }
      const rewardId = pickRandom(['guardBreak', 'temperedMail', 'rageSpark'])
      const rewardCard = rewardId ? getCardById(rewardId) : null
      if (!rewardCard) return resolveRoomCompletion(prev, {})
      setToast(`Deck tempered with ${rewardCard.name}.`)
      return resolveRoomCompletion(prev, { deck: [...prev.deck, rewardCard] })
    })
  }

  const playCombatCard = (cardUid: string) => {
    setRun((prev) => {
      if (prev.node !== 'combat' || !prev.combat || prev.combat.status !== 'in-progress') return prev
      const nextCombat = playCard(prev.combat, cardUid)
      return { ...prev, hp: nextCombat.player.hp, combat: nextCombat }
    })
  }

  const endTurn = () => {
    setRun((prev) => {
      if (prev.node !== 'combat' || !prev.combat || prev.combat.status !== 'in-progress') return prev
      const room = ACT_ONE_ROOMS[prev.floorIndex]
      if (!room?.enemyId) return prev
      const enemy = getEnemyById(room.enemyId)
      if (!enemy) return prev
      const nextCombat = endPlayerTurn(prev.combat, enemy, prev.relics)
      return { ...prev, hp: nextCombat.player.hp, combat: nextCombat }
    })
  }

  const finishCombat = () => {
    setRun((prev) => {
      if (prev.node !== 'combat' || !prev.combat || prev.combat.status === 'in-progress') return prev
      const room = ACT_ONE_ROOMS[prev.floorIndex]
      const updatedTurns = prev.totalTurns + prev.combat.turn
      if (prev.combat.status === 'lost') {
        setToast('You were defeated.')
        return {
          ...prev,
          node: 'result',
          result: 'lost',
          hp: 0,
          totalTurns: updatedTurns,
          combat: null,
          activeEnemyId: null,
        }
      }
      let nextGold = prev.gold + (room?.goldReward ?? 0)
      let nextRelics = [...prev.relics]
      let nextDeck = [...prev.deck]
      if (room?.type === 'elite') {
        const eliteRelic = drawRelicNotOwned(nextRelics)
        if (eliteRelic) nextRelics = [...nextRelics, eliteRelic]
        setToast(eliteRelic ? `Elite cleared. Gained ${eliteRelic.name}.` : 'Elite cleared.')
      } else if (room?.type === 'boss') {
        const bossCardId = pickRandom(['infernoBurst', 'guardBreak', 'platedStance'])
        const bossCard = bossCardId ? getCardById(bossCardId) : null
        if (bossCard) nextDeck = [...nextDeck, bossCard]
        const bossRelic = drawRelicNotOwned(nextRelics)
        if (bossRelic) nextRelics = [...nextRelics, bossRelic]
        setToast('Boss defeated. Act rewards granted.')
      } else {
        setToast('Combat room cleared.')
      }
      return resolveRoomCompletion(prev, {
        hp: prev.combat.player.hp,
        gold: nextGold,
        relics: nextRelics,
        deck: nextDeck,
        totalTurns: updatedTurns,
      })
    })
  }

  return (
    <div className="panel ec-shell">
      <div className="ec-ambient ec-ambient-one" />
      <div className="ec-ambient ec-ambient-two" />

      <header className="ec-header">
        <div>
          <p className="ec-kicker">Emberclash Arena</p>
          <h1>{ACT_ONE_TITLE}</h1>
          <p className="ec-subtitle">A full 10-floor Act 1 with combat, elite pressure, events, markets, and a boss gate.</p>
        </div>
        <div className="ec-header-meta">
          <span className="ec-chip">Pilot: {playerName}</span>
          <span className="ec-chip">Scene: {sceneLabel(run.node)}</span>
          <span className="ec-chip">
            Floor: {Math.min(run.floorIndex + 1, ACT_ONE_ROOMS.length)}/{ACT_ONE_ROOMS.length}
          </span>
          <span className="ec-chip">Best: {bestScore}</span>
        </div>
      </header>

      <ol className="ec-track" aria-label="Act 1 progression">
        {ACT_ONE_ROOMS.map((room, index) => {
          const isCurrent = run.floorIndex === index && run.node !== 'result'
          const isDone = index < run.floorIndex || run.result === 'won'
          return (
            <li key={room.id} className={`ec-track-node ${isCurrent ? 'is-current' : ''} ${isDone ? 'is-done' : ''} type-${room.type}`}>
              <span className="ec-track-index">{roomIcon(room.type)}</span>
              <span>F{room.floor}</span>
              <span>{roomTypeLabel(room.type)}</span>
            </li>
          )
        })}
      </ol>

      <section className="ec-hud">
        <article className="ec-hud-card">
          <span>Health</span>
          <strong>{run.hp}/{run.maxHp}</strong>
          <div className="ec-bar">
            <span style={{ width: `${clampPercent(run.hp, run.maxHp)}%` }} />
          </div>
        </article>
        <article className="ec-hud-card">
          <span>Gold</span>
          <strong>{run.gold}</strong>
          <p>Markets are on floors 4 and 9.</p>
        </article>
        <article className="ec-hud-card">
          <span>Deck</span>
          <strong>{run.deck.length} cards</strong>
          <p>Trim strikes and scale before elite and boss rooms.</p>
        </article>
        <article className="ec-hud-card">
          <span>Cleared</span>
          <strong>{run.clearedRooms}</strong>
          <p>{ACT_ONE_ROOMS.length - run.clearedRooms} rooms remaining.</p>
        </article>
      </section>

      {toast && <p className="ec-toast">{toast}</p>}

      {run.node === 'map' && activeRoom && (
        <section className="ec-scene">
          <div className="ec-scene-head">
            <h2>Act Route</h2>
            <p>Preview the next room, then commit.</p>
          </div>
          <div className="ec-map-layout">
            <article className={`ec-next-room type-${activeRoom.type}`}>
              <span className="ec-room-badge">{roomTypeLabel(activeRoom.type)}</span>
              <h3>Floor {activeRoom.floor}: {activeRoom.title}</h3>
              <p>{activeRoom.description}</p>
              {activeRoom.goldReward && <p className="ec-room-reward">Reward: +{activeRoom.goldReward} gold</p>}
              <button type="button" className="ec-btn ec-btn-affirm" onClick={enterCurrentRoom}>
                Enter Room
              </button>
            </article>

            <aside className="ec-side-card">
              <h3>Upcoming</h3>
              <ul>
                {ACT_ONE_ROOMS.slice(run.floorIndex, run.floorIndex + 4).map((room) => (
                  <li key={room.id}>
                    <span>F{room.floor} {roomTypeLabel(room.type)}</span>
                    <strong>{room.title}</strong>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </section>
      )}

      {run.node === 'shop' && (
        <section className="ec-scene">
          <div className="ec-scene-head">
            <h2>{activeRoom?.title ?? 'Market'}</h2>
            <p>{activeRoom?.description ?? 'Spend gold and optimize your deck.'}</p>
          </div>
          <div className="ec-shop-layout">
            <div className="ec-offer-grid">
              {shopOffers.map((offer) => {
                const ownedRelic = offer.kind === 'relic' && run.relics.some((relic) => relic.id === offer.relic.id)
                const canBuy = run.gold >= offer.price && !ownedRelic
                return (
                  <article key={offer.offerId} className={`ec-offer-card ${offer.kind === 'card' ? `tone-${cardTypeTone(offer.card.type)}` : ''}`}>
                    <div className="ec-offer-topline">
                      <span className="ec-offer-badge">{offer.kind === 'remove' ? 'Service' : offer.kind}</span>
                      <span className="ec-offer-price">{offer.price}g</span>
                    </div>
                    <h3>{offerTitle(offer)}</h3>
                    <p>{offerDescription(offer)}</p>
                    {offer.kind === 'card' && (
                      <div className="ec-offer-metrics">
                        <span>{offer.card.type.toUpperCase()}</span>
                        <span>Cost {offer.card.cost}</span>
                        <span>{cardGlyph(offer.card)}</span>
                      </div>
                    )}
                    <button type="button" className="ec-btn ec-btn-primary" disabled={!canBuy} onClick={() => buyOffer(offer)}>
                      {canBuy ? 'Acquire' : 'Unavailable'}
                    </button>
                  </article>
                )
              })}
            </div>
            <aside className="ec-side-card">
              <h3>Deck Intel</h3>
              <ul>
                {deckSummary.slice(0, 8).map((entry) => (
                  <li key={entry.name}>
                    <span>{entry.name}</span>
                    <strong>x{entry.count}</strong>
                  </li>
                ))}
              </ul>
              <button type="button" className="ec-btn ec-btn-affirm" onClick={leaveShop}>
                Leave Market
              </button>
            </aside>
          </div>
        </section>
      )}

      {run.node === 'event' && (
        <section className="ec-scene">
          <div className="ec-scene-head">
            <h2>{activeRoom?.title ?? 'Forge Encounter'}</h2>
            <p>{activeRoom?.description ?? 'Pick one path. Effects resolve immediately.'}</p>
          </div>
          <div className="ec-choice-grid">
            {eventChoices.map((choice, index) => (
              <button key={`${choice.id}-${index}`} type="button" className="ec-choice-card" onClick={() => resolveEvent(choice)}>
                <span className="ec-choice-rune">R{index + 1}</span>
                <strong>{choice.label}</strong>
                <span>{choice.description}</span>
                <em>{choice.effectText}</em>
              </button>
            ))}
          </div>
          {eventOutcome && <p className="ec-note">Last event result: {eventOutcome}</p>}
        </section>
      )}

      {run.node === 'rest' && (
        <section className="ec-scene">
          <div className="ec-scene-head">
            <h2>{activeRoom?.title ?? 'Campfire'}</h2>
            <p>{activeRoom?.description ?? 'Choose one camp action.'}</p>
          </div>
          <div className="ec-choice-grid">
            <button type="button" className="ec-choice-card" onClick={() => takeRest('heal')}>
              <span className="ec-choice-rune">REST</span>
              <strong>Recover</strong>
              <span>Stitch wounds and reset focus.</span>
              <em>Heal 24 HP.</em>
            </button>
            <button type="button" className="ec-choice-card" onClick={() => takeRest('temper')}>
              <span className="ec-choice-rune">FORGE</span>
              <strong>Temper Deck</strong>
              <span>Add one upgraded combat card.</span>
              <em>Gain 1 random forge card.</em>
            </button>
          </div>
        </section>
      )}

      {run.node === 'combat' && combatState && activeEnemy && (
        <section className="ec-scene">
          <div className="ec-scene-head">
            <h2>Floor {activeRoom?.floor}: {activeRoom?.title}</h2>
            <p>{activeRoom?.description}</p>
          </div>

          <div className="ec-arena">
            <article className="ec-combatant enemy">
              <div className={`ec-model ec-model-enemy ${enemyHitFlash ? 'hit' : ''} ${combatState.status === 'won' ? 'down' : ''}`}>
                <span className="ec-model-core" />
                <span className="ec-model-eye left" />
                <span className="ec-model-eye right" />
                <span className="ec-model-horn left" />
                <span className="ec-model-horn right" />
              </div>
              <h3>{activeEnemy.name}</h3>
              <div className="ec-statline">
                <span>HP {combatState.enemy.hp}/{combatState.enemy.maxHp}</span>
                <div className="ec-bar enemy">
                  <span style={{ width: `${clampPercent(combatState.enemy.hp, combatState.enemy.maxHp)}%` }} />
                </div>
              </div>
              <p>Block: {combatState.enemy.block}</p>
              <p>Strength: {combatState.enemy.strength}</p>
              <p>Vulnerable: {combatState.enemy.vulnerable}</p>
            </article>

            <article className="ec-combatant player">
              <div className={`ec-model ec-model-player ${playerHitFlash ? 'hit' : ''} ${combatState.status === 'lost' ? 'down' : ''}`}>
                <span className="ec-model-core" />
                <span className="ec-model-crest" />
                <span className="ec-model-blade" />
              </div>
              <h3>Forge Knight</h3>
              <div className="ec-statline">
                <span>HP {combatState.player.hp}/{combatState.player.maxHp}</span>
                <div className="ec-bar">
                  <span style={{ width: `${clampPercent(combatState.player.hp, combatState.player.maxHp)}%` }} />
                </div>
              </div>
              <p>Block: {combatState.player.block}</p>
              <p>Strength: {combatState.player.strength}</p>
              <p>Vulnerable: {combatState.player.vulnerable}</p>
            </article>
          </div>

          <div className={`ec-intent-card tone-${currentIntent?.type ?? 'buff'}`}>
            <span>Enemy Intent</span>
            <strong>{currentIntent ? currentIntent.label : 'No intent'}</strong>
          </div>

          <div className="ec-combat-toolbar">
            <span className="ec-chip">Turn {combatState.turn}</span>
            <span className="ec-chip">Energy {combatState.energy}</span>
            <span className="ec-chip">Draw {combatState.drawPile.length}</span>
            <span className="ec-chip">Discard {combatState.discardPile.length}</span>
            <span className="ec-chip">Exhaust {combatState.exhaustPile.length}</span>
            <button type="button" className="ec-btn ec-btn-primary" onClick={endTurn} disabled={combatState.status !== 'in-progress'}>
              End Turn
            </button>
            {combatState.status !== 'in-progress' && (
              <button type="button" className="ec-btn ec-btn-affirm" onClick={finishCombat}>
                Claim Reward
              </button>
            )}
          </div>

          <div className="ec-hand" role="list" aria-label="Playable hand">
            {combatState.hand.map((card) => {
              const isPlayable = combatState.status === 'in-progress' && card.cost <= combatState.energy
              return (
                <button
                  key={card.uid}
                  type="button"
                  role="listitem"
                  className={`ec-card tone-${cardTypeTone(card.type)} ${isPlayable ? 'playable' : 'locked'}`}
                  onClick={() => playCombatCard(card.uid)}
                  disabled={!isPlayable}
                >
                  <span className="ec-card-cost">{card.cost}</span>
                  <span className="ec-card-sigil">{cardGlyph(card)}</span>
                  <strong>{card.name}</strong>
                  <span>{card.description}</span>
                </button>
              )
            })}
          </div>

          <div className="ec-log">
            {visibleCombatLogs.map((line, index) => (
              <div key={`${line}-${index}`}>{line}</div>
            ))}
          </div>

          {combatState.status === 'won' && <p className="ec-note success">Victory. Room complete.</p>}
          {combatState.status === 'lost' && <p className="ec-note danger">Defeat. Your run ends here.</p>}
        </section>
      )}

      {run.node === 'result' && (
        <section className="ec-scene">
          <div className={`ec-result-banner ${run.result === 'won' ? 'win' : 'loss'}`}>
            <h2>{run.result === 'won' ? 'Act 1 Cleared' : 'Run Failed'}</h2>
            <p>
              {run.result === 'won'
                ? 'You completed the Sootline Descent and claimed the forge throne.'
                : 'The run ended before clearing Act 1.'}
            </p>
          </div>
          <div className="ec-result-grid">
            <article><span>Rooms Cleared</span><strong>{run.clearedRooms}</strong></article>
            <article><span>Total Turns</span><strong>{run.totalTurns}</strong></article>
            <article><span>Final HP</span><strong>{run.hp}/{run.maxHp}</strong></article>
            <article><span>Gold Left</span><strong>{run.gold}</strong></article>
            <article><span>Run Score</span><strong>{finalScore}</strong></article>
            <article><span>Best Score</span><strong>{bestScore}</strong></article>
          </div>
          <button type="button" className="ec-btn ec-btn-affirm" onClick={resetRun}>
            Start New Run
          </button>
        </section>
      )}

      <section className="ec-relic-vault">
        <h3>Relic Cache</h3>
        <div className="ec-relic-grid">
          {run.relics.map((relic) => (
            <article key={relic.id}>
              <strong>{relic.name}</strong>
              <p>{relic.description}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="ec-footer">
        <button type="button" className="ec-btn ec-btn-muted" onClick={resetRun}>Reset Run</button>
        <button type="button" className="ec-btn ec-btn-muted" onClick={onResetPlayer}>Change Name</button>
        {onSwitchProject && (
          <button type="button" className="ec-btn ec-btn-muted" onClick={onSwitchProject}>
            Switch Project
          </button>
        )}
      </footer>
    </div>
  )
}
