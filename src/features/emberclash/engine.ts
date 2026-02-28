import type {
  CardDefinition,
  CardInstance,
  CombatState,
  CombatantState,
  EnemyDefinition,
  EnemyIntent,
  RelicDefinition,
} from './types'

const HAND_SIZE = 5
const BASE_ENERGY = 3

let uidCounter = 0

function createCardInstance(card: CardDefinition): CardInstance {
  uidCounter += 1
  return {
    ...card,
    uid: `${card.id}-${uidCounter}`,
  }
}

function shuffle<T>(input: T[]): T[] {
  const copy = [...input]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]]
  }
  return copy
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function reduceOne(value: number) {
  return Math.max(0, value - 1)
}

function computeDamage(base: number, attacker: CombatantState, defender: CombatantState) {
  let value = Math.max(0, base + attacker.strength)
  if (attacker.weak > 0) {
    value = Math.floor(value * 0.75)
  }
  if (defender.vulnerable > 0) {
    value = Math.floor(value * 1.5)
  }
  return Math.max(0, value)
}

function applyIncomingDamage(target: CombatantState, amount: number): CombatantState {
  const absorbed = Math.min(target.block, amount)
  const remaining = amount - absorbed
  return {
    ...target,
    block: target.block - absorbed,
    hp: clamp(target.hp - remaining, 0, target.maxHp),
  }
}

function drawCards(state: CombatState, amount: number): CombatState {
  let next = {
    ...state,
    hand: [...state.hand],
    drawPile: [...state.drawPile],
    discardPile: [...state.discardPile],
  }

  for (let drawIndex = 0; drawIndex < amount; drawIndex += 1) {
    if (next.drawPile.length === 0) {
      if (next.discardPile.length === 0) {
        break
      }
      next = {
        ...next,
        drawPile: shuffle(next.discardPile),
        discardPile: [],
      }
    }
    const [topCard, ...restDrawPile] = next.drawPile
    if (!topCard) break
    next = {
      ...next,
      drawPile: restDrawPile,
      hand: [...next.hand, topCard],
    }
  }

  return next
}

function startPlayerTurn(state: CombatState, relics: RelicDefinition[]): CombatState {
  if (state.status !== 'in-progress') return state
  const turnOneEnergyBonus = state.turn === 1
    ? relics
      .filter((relic) => relic.effect === 'turnOneEnergy')
      .reduce((sum, relic) => sum + relic.value, 0)
    : 0

  const withResources: CombatState = {
    ...state,
    energy: BASE_ENERGY + turnOneEnergyBonus,
    player: {
      ...state.player,
      block: 0,
    },
    logs: [...state.logs, `Turn ${state.turn}: ${BASE_ENERGY + turnOneEnergyBonus} energy.`],
  }

  const cardsToDraw = Math.max(0, HAND_SIZE - withResources.hand.length)
  return drawCards(withResources, cardsToDraw)
}

export function getCurrentEnemyIntent(state: CombatState, enemy: EnemyDefinition): EnemyIntent {
  const intents = enemy.intents
  return intents[state.currentIntentIndex % intents.length]
}

export function createCombatState(params: {
  deck: CardDefinition[]
  relics: RelicDefinition[]
  hp: number
  maxHp: number
  enemy: EnemyDefinition
}): CombatState {
  const { deck, relics, hp, maxHp, enemy } = params
  const startStrengthBonus = relics
    .filter((relic) => relic.effect === 'firstTurnStrength')
    .reduce((sum, relic) => sum + relic.value, 0)
  const startBlockBonus = relics
    .filter((relic) => relic.effect === 'startCombatBlock')
    .reduce((sum, relic) => sum + relic.value, 0)

  const initialState: CombatState = {
    player: {
      hp: clamp(hp, 0, maxHp),
      maxHp,
      block: startBlockBonus,
      strength: startStrengthBonus,
      vulnerable: 0,
      weak: 0,
    },
    enemy: {
      hp: enemy.maxHp,
      maxHp: enemy.maxHp,
      block: 0,
      strength: 0,
      vulnerable: 0,
      weak: 0,
    },
    energy: 0,
    maxEnergy: BASE_ENERGY,
    turn: 1,
    hand: [],
    drawPile: shuffle(deck.map((card) => createCardInstance(card))),
    discardPile: [],
    exhaustPile: [],
    currentIntentIndex: 0,
    logs: [
      `Combat started against ${enemy.name}.`,
      ...(startStrengthBonus > 0 ? [`Relics grant +${startStrengthBonus} strength.`] : []),
      ...(startBlockBonus > 0 ? [`Relics grant +${startBlockBonus} starting block.`] : []),
    ],
    status: 'in-progress',
  }

  return startPlayerTurn(initialState, relics)
}

export function playCard(state: CombatState, cardUid: string): CombatState {
  if (state.status !== 'in-progress') return state
  const handIndex = state.hand.findIndex((card) => card.uid === cardUid)
  if (handIndex < 0) return state
  const card = state.hand[handIndex]
  if (card.cost > state.energy) {
    return {
      ...state,
      logs: [...state.logs, `Not enough energy for ${card.name}.`],
    }
  }

  let next: CombatState = {
    ...state,
    energy: state.energy - card.cost,
    hand: state.hand.filter((entry) => entry.uid !== card.uid),
    logs: [...state.logs],
  }

  if (card.damage && card.damage > 0) {
    const dealt = computeDamage(card.damage, next.player, next.enemy)
    next = {
      ...next,
      enemy: applyIncomingDamage(next.enemy, dealt),
      logs: [...next.logs, `${card.name} deals ${dealt} damage.`],
    }
  } else {
    next = {
      ...next,
      logs: [...next.logs, `${card.name} is played.`],
    }
  }

  if (card.block && card.block > 0) {
    next = {
      ...next,
      player: {
        ...next.player,
        block: next.player.block + card.block,
      },
      logs: [...next.logs, `Gain ${card.block} block.`],
    }
  }

  if (card.gainStrength && card.gainStrength > 0) {
    next = {
      ...next,
      player: {
        ...next.player,
        strength: next.player.strength + card.gainStrength,
      },
      logs: [...next.logs, `Gain ${card.gainStrength} strength.`],
    }
  }

  if (card.applyVulnerable && card.applyVulnerable > 0) {
    next = {
      ...next,
      enemy: {
        ...next.enemy,
        vulnerable: next.enemy.vulnerable + card.applyVulnerable,
      },
      logs: [...next.logs, `Enemy gains ${card.applyVulnerable} vulnerable.`],
    }
  }

  if (card.exhaust) {
    next = {
      ...next,
      exhaustPile: [...next.exhaustPile, card],
    }
  } else {
    next = {
      ...next,
      discardPile: [...next.discardPile, card],
    }
  }

  if (card.draw && card.draw > 0) {
    next = drawCards(next, card.draw)
    next = {
      ...next,
      logs: [...next.logs, `Draw ${card.draw} card.`],
    }
  }

  if (next.enemy.hp <= 0) {
    return {
      ...next,
      enemy: {
        ...next.enemy,
        hp: 0,
      },
      status: 'won',
      logs: [...next.logs, 'Enemy defeated.'],
    }
  }

  return next
}

export function endPlayerTurn(
  state: CombatState,
  enemyDefinition: EnemyDefinition,
  relics: RelicDefinition[],
): CombatState {
  if (state.status !== 'in-progress') return state

  const intent = getCurrentEnemyIntent(state, enemyDefinition)

  let next: CombatState = {
    ...state,
    enemy: {
      ...state.enemy,
      block: 0,
    },
    hand: [],
    discardPile: [...state.discardPile, ...state.hand],
    logs: [...state.logs, `${enemyDefinition.name} uses ${intent.label}.`],
  }

  if (intent.type === 'attack') {
    const damage = computeDamage(intent.value, next.enemy, next.player)
    next = {
      ...next,
      player: applyIncomingDamage(next.player, damage),
      logs: [...next.logs, `${enemyDefinition.name} hits for ${damage}.`],
    }
  }

  if (intent.type === 'block') {
    next = {
      ...next,
      enemy: {
        ...next.enemy,
        block: next.enemy.block + intent.value,
      },
      logs: [...next.logs, `${enemyDefinition.name} gains ${intent.value} block.`],
    }
  }

  if (intent.type === 'buff') {
    next = {
      ...next,
      enemy: {
        ...next.enemy,
        strength: next.enemy.strength + intent.value,
      },
      logs: [...next.logs, `${enemyDefinition.name} gains ${intent.value} strength.`],
    }
  }

  const withStatusDecay: CombatState = {
    ...next,
    player: {
      ...next.player,
      vulnerable: reduceOne(next.player.vulnerable),
      weak: reduceOne(next.player.weak),
    },
    enemy: {
      ...next.enemy,
      vulnerable: reduceOne(next.enemy.vulnerable),
      weak: reduceOne(next.enemy.weak),
    },
  }

  if (withStatusDecay.player.hp <= 0) {
    return {
      ...withStatusDecay,
      player: {
        ...withStatusDecay.player,
        hp: 0,
      },
      status: 'lost',
      logs: [...withStatusDecay.logs, 'You were defeated.'],
    }
  }

  const nextTurnState: CombatState = {
    ...withStatusDecay,
    turn: withStatusDecay.turn + 1,
    currentIntentIndex: withStatusDecay.currentIntentIndex + 1,
  }

  return startPlayerTurn(nextTurnState, relics)
}
