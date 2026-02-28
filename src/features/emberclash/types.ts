export type CardType = 'attack' | 'skill' | 'power'

export type EnemyIntentType = 'attack' | 'block' | 'buff'

export interface CardDefinition {
  id: string
  name: string
  cost: number
  type: CardType
  description: string
  exhaust?: boolean
  damage?: number
  block?: number
  gainStrength?: number
  applyVulnerable?: number
  draw?: number
}

export interface CardInstance extends CardDefinition {
  uid: string
}

export interface RelicDefinition {
  id: string
  name: string
  description: string
  effect: 'firstTurnStrength' | 'startCombatBlock' | 'turnOneEnergy'
  value: number
}

export interface EnemyIntent {
  id: string
  type: EnemyIntentType
  value: number
  label: string
}

export interface EnemyDefinition {
  id: string
  name: string
  maxHp: number
  intents: EnemyIntent[]
}

export interface CombatantState {
  hp: number
  maxHp: number
  block: number
  strength: number
  vulnerable: number
  weak: number
}

export interface CombatState {
  player: CombatantState
  enemy: CombatantState
  energy: number
  maxEnergy: number
  turn: number
  hand: CardInstance[]
  drawPile: CardInstance[]
  discardPile: CardInstance[]
  exhaustPile: CardInstance[]
  currentIntentIndex: number
  logs: string[]
  status: 'in-progress' | 'won' | 'lost'
}

export interface ShopCardOffer {
  kind: 'card'
  offerId: string
  card: CardDefinition
  price: number
}

export interface ShopRelicOffer {
  kind: 'relic'
  offerId: string
  relic: RelicDefinition
  price: number
}

export interface ShopRemoveOffer {
  kind: 'remove'
  offerId: string
  price: number
}

export type ShopOffer = ShopCardOffer | ShopRelicOffer | ShopRemoveOffer

export interface EventChoice {
  id: string
  label: string
  description: string
  effectText: string
}

export type ActRoomType = 'combat' | 'elite' | 'event' | 'shop' | 'rest' | 'boss'

export interface ActRoomDefinition {
  id: string
  floor: number
  type: ActRoomType
  title: string
  description: string
  enemyId?: string
  goldReward?: number
}

export interface RunState {
  node: 'map' | 'shop' | 'event' | 'rest' | 'combat' | 'result'
  floorIndex: number
  clearedRooms: number
  gold: number
  hp: number
  maxHp: number
  deck: CardDefinition[]
  relics: RelicDefinition[]
  combat: CombatState | null
  activeEnemyId: string | null
  result: 'pending' | 'won' | 'lost'
  totalTurns: number
}
