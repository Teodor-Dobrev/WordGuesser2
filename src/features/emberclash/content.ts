import type {
  ActRoomDefinition,
  CardDefinition,
  EnemyDefinition,
  EventChoice,
  RelicDefinition,
  ShopOffer,
} from './types'

const CARD_LIBRARY: Record<string, CardDefinition> = {
  emberStrike: {
    id: 'emberStrike',
    name: 'Ember Strike',
    cost: 1,
    type: 'attack',
    description: 'Deal 6 damage.',
    damage: 6,
  },
  ironGuard: {
    id: 'ironGuard',
    name: 'Iron Guard',
    cost: 1,
    type: 'skill',
    description: 'Gain 6 block.',
    block: 6,
  },
  warCry: {
    id: 'warCry',
    name: 'War Cry',
    cost: 1,
    type: 'skill',
    description: 'Gain 2 strength.',
    gainStrength: 2,
  },
  bashDown: {
    id: 'bashDown',
    name: 'Bash Down',
    cost: 2,
    type: 'attack',
    description: 'Deal 8 damage. Apply 2 vulnerable.',
    damage: 8,
    applyVulnerable: 2,
  },
  platedStance: {
    id: 'platedStance',
    name: 'Plated Stance',
    cost: 2,
    type: 'skill',
    description: 'Gain 12 block.',
    block: 12,
  },
  recklessCleave: {
    id: 'recklessCleave',
    name: 'Reckless Cleave',
    cost: 1,
    type: 'attack',
    description: 'Deal 11 damage.',
    damage: 11,
  },
  secondWind: {
    id: 'secondWind',
    name: 'Second Wind',
    cost: 0,
    type: 'skill',
    description: 'Gain 4 block. Draw 1 card.',
    block: 4,
    draw: 1,
  },
  furnaceBlow: {
    id: 'furnaceBlow',
    name: 'Furnace Blow',
    cost: 2,
    type: 'attack',
    description: 'Deal 15 damage. Exhaust.',
    damage: 15,
    exhaust: true,
  },
  moltenVolley: {
    id: 'moltenVolley',
    name: 'Molten Volley',
    cost: 1,
    type: 'attack',
    description: 'Deal 7 damage. Draw 1 card.',
    damage: 7,
    draw: 1,
  },
  temperedMail: {
    id: 'temperedMail',
    name: 'Tempered Mail',
    cost: 1,
    type: 'skill',
    description: 'Gain 8 block.',
    block: 8,
  },
  rageSpark: {
    id: 'rageSpark',
    name: 'Rage Spark',
    cost: 0,
    type: 'skill',
    description: 'Gain 1 strength. Draw 1 card.',
    gainStrength: 1,
    draw: 1,
  },
  guardBreak: {
    id: 'guardBreak',
    name: 'Guard Break',
    cost: 2,
    type: 'attack',
    description: 'Deal 12 damage. Apply 1 vulnerable.',
    damage: 12,
    applyVulnerable: 1,
  },
  infernoBurst: {
    id: 'infernoBurst',
    name: 'Inferno Burst',
    cost: 2,
    type: 'attack',
    description: 'Deal 17 damage. Exhaust.',
    damage: 17,
    exhaust: true,
  },
} as const

const ENEMY_LIBRARY: Record<string, EnemyDefinition> = {
  cinderHound: {
    id: 'cinderHound',
    name: 'Cinder Hound',
    maxHp: 38,
    intents: [
      { id: 'fang', type: 'attack', value: 6, label: 'Fang Snap (6)' },
      { id: 'snarl', type: 'buff', value: 1, label: 'Snarl (+1 Strength)' },
      { id: 'maul', type: 'attack', value: 9, label: 'Maul (9)' },
      { id: 'hide', type: 'block', value: 7, label: 'Hide Guard (+7 Block)' },
    ],
  },
  slagRaider: {
    id: 'slagRaider',
    name: 'Slag Raider',
    maxHp: 46,
    intents: [
      { id: 'hook', type: 'attack', value: 8, label: 'Hook Swing (8)' },
      { id: 'brace', type: 'block', value: 9, label: 'Scrap Brace (+9 Block)' },
      { id: 'cleaver', type: 'attack', value: 10, label: 'Cleaver Toss (10)' },
      { id: 'rage', type: 'buff', value: 1, label: 'Rage Coil (+1 Strength)' },
    ],
  },
  emberAcolyte: {
    id: 'emberAcolyte',
    name: 'Ember Acolyte',
    maxHp: 52,
    intents: [
      { id: 'chant', type: 'buff', value: 2, label: 'Flame Chant (+2 Strength)' },
      { id: 'singe', type: 'attack', value: 10, label: 'Singe Wave (10)' },
      { id: 'ward', type: 'block', value: 10, label: 'Coal Ward (+10 Block)' },
      { id: 'flare', type: 'attack', value: 13, label: 'Flare Lance (13)' },
    ],
  },
  furnaceChampion: {
    id: 'furnaceChampion',
    name: 'Furnace Champion',
    maxHp: 74,
    intents: [
      { id: 'crush', type: 'attack', value: 12, label: 'Crushing Swing (12)' },
      { id: 'plate', type: 'block', value: 13, label: 'Titan Plate (+13 Block)' },
      { id: 'roar', type: 'buff', value: 2, label: 'Iron Roar (+2 Strength)' },
      { id: 'slam', type: 'attack', value: 16, label: 'Kiln Slam (16)' },
    ],
  },
  ashSentinel: {
    id: 'ashSentinel',
    name: 'Ash Sentinel',
    maxHp: 96,
    intents: [
      { id: 'jaggedSlam', type: 'attack', value: 11, label: 'Jagged Slam (11)' },
      { id: 'plateUp', type: 'block', value: 12, label: 'Fortify (+12 Block)' },
      { id: 'embersurge', type: 'buff', value: 2, label: 'Ember Surge (+2 Strength)' },
      { id: 'moltenCrash', type: 'attack', value: 17, label: 'Molten Crash (17)' },
      { id: 'obsidianStrike', type: 'attack', value: 20, label: 'Obsidian Strike (20)' },
    ],
  },
}

const EVENT_POOL: EventChoice[] = [
  {
    id: 'meditate',
    label: 'Steady Breath',
    description: 'Take a careful pause by the coals.',
    effectText: 'Heal 12 HP.',
  },
  {
    id: 'bloodDeal',
    label: 'Blood Deal',
    description: 'Cut your palm for raw forging power.',
    effectText: 'Lose 8 HP. Add Furnace Blow to deck.',
  },
  {
    id: 'scrapCache',
    label: 'Scrap Cache',
    description: 'Take spare steel from a wrecked cart.',
    effectText: 'Gain 35 gold.',
  },
  {
    id: 'smolderingRelic',
    label: 'Smoldering Relic',
    description: 'A relic hums with unstable heat.',
    effectText: 'Gain a random relic.',
  },
  {
    id: 'streetBrawl',
    label: 'Street Brawl',
    description: 'Fight a pit brawler for coin.',
    effectText: 'Lose 6 HP. Gain 55 gold.',
  },
  {
    id: 'oldSmith',
    label: 'Old Smith',
    description: 'A blacksmith offers a prototype blade.',
    effectText: 'Add Molten Volley to your deck.',
  },
  {
    id: 'overheat',
    label: 'Overheat Trial',
    description: 'Endure the heat without armor.',
    effectText: 'Lose 5 max HP. Gain 1 strength relic.',
  },
  {
    id: 'sealedChest',
    label: 'Sealed Chest',
    description: 'A lockbox hidden beneath slag.',
    effectText: 'Gain 80 gold.',
  },
]

export const STARTER_DECK: CardDefinition[] = [
  CARD_LIBRARY.emberStrike,
  CARD_LIBRARY.emberStrike,
  CARD_LIBRARY.emberStrike,
  CARD_LIBRARY.emberStrike,
  CARD_LIBRARY.emberStrike,
  CARD_LIBRARY.ironGuard,
  CARD_LIBRARY.ironGuard,
  CARD_LIBRARY.ironGuard,
  CARD_LIBRARY.ironGuard,
  CARD_LIBRARY.warCry,
]

const EARLY_SHOP_CARD_POOL: CardDefinition[] = [
  CARD_LIBRARY.bashDown,
  CARD_LIBRARY.platedStance,
  CARD_LIBRARY.recklessCleave,
  CARD_LIBRARY.secondWind,
  CARD_LIBRARY.moltenVolley,
  CARD_LIBRARY.temperedMail,
]

const LATE_SHOP_CARD_POOL: CardDefinition[] = [
  CARD_LIBRARY.guardBreak,
  CARD_LIBRARY.infernoBurst,
  CARD_LIBRARY.furnaceBlow,
  CARD_LIBRARY.rageSpark,
  CARD_LIBRARY.platedStance,
  CARD_LIBRARY.recklessCleave,
]

export const RELIC_POOL: RelicDefinition[] = [
  {
    id: 'forgeHeart',
    name: 'Forge Heart',
    description: 'Gain 1 strength at the start of combat.',
    effect: 'firstTurnStrength',
    value: 1,
  },
  {
    id: 'brassBulwark',
    name: 'Brass Bulwark',
    description: 'Start each combat with 8 block.',
    effect: 'startCombatBlock',
    value: 8,
  },
  {
    id: 'overchargedCore',
    name: 'Overcharged Core',
    description: 'Gain 1 extra energy on turn 1.',
    effect: 'turnOneEnergy',
    value: 1,
  },
  {
    id: 'amberAnvil',
    name: 'Amber Anvil',
    description: 'Gain 1 strength at the start of combat.',
    effect: 'firstTurnStrength',
    value: 1,
  },
  {
    id: 'coalWard',
    name: 'Coal Ward',
    description: 'Start each combat with 6 block.',
    effect: 'startCombatBlock',
    value: 6,
  },
]

export const STARTING_RELIC: RelicDefinition = {
  id: 'coalTotem',
  name: 'Coal Totem',
  description: 'Gain 1 strength at the start of combat.',
  effect: 'firstTurnStrength',
  value: 1,
}

export const ACT_ONE_ROOMS: ActRoomDefinition[] = [
  {
    id: 'a1-f1',
    floor: 1,
    type: 'combat',
    title: 'Charred Kennel',
    description: 'A starving beast stalks the ash fields.',
    enemyId: 'cinderHound',
    goldReward: 24,
  },
  {
    id: 'a1-f2',
    floor: 2,
    type: 'event',
    title: 'Blackroad Incident',
    description: 'A random forge-side encounter.',
  },
  {
    id: 'a1-f3',
    floor: 3,
    type: 'combat',
    title: 'Scrap Ramp',
    description: 'A raider blocks the path with molten scrap.',
    enemyId: 'slagRaider',
    goldReward: 30,
  },
  {
    id: 'a1-f4',
    floor: 4,
    type: 'shop',
    title: 'Basilica Market',
    description: 'Spend gold before the mid-act spike.',
  },
  {
    id: 'a1-f5',
    floor: 5,
    type: 'combat',
    title: 'Pyre Chapel',
    description: 'Acolytes channel heat into lethal spells.',
    enemyId: 'emberAcolyte',
    goldReward: 36,
  },
  {
    id: 'a1-f6',
    floor: 6,
    type: 'rest',
    title: 'Camp at the Sootline',
    description: 'Recover or refine before elite combat.',
  },
  {
    id: 'a1-f7',
    floor: 7,
    type: 'elite',
    title: 'Champion Gauntlet',
    description: 'The Furnace Champion guards the upper causeway.',
    enemyId: 'furnaceChampion',
    goldReward: 58,
  },
  {
    id: 'a1-f8',
    floor: 8,
    type: 'event',
    title: 'Cracked Reliquary',
    description: 'One final gamble before the boss gate.',
  },
  {
    id: 'a1-f9',
    floor: 9,
    type: 'shop',
    title: 'Last Ember Vendor',
    description: 'Final chance to tune your deck.',
  },
  {
    id: 'a1-f10',
    floor: 10,
    type: 'boss',
    title: 'Molten Throne',
    description: 'Face the Ash Sentinel and claim Act 1.',
    enemyId: 'ashSentinel',
    goldReward: 120,
  },
]

export const ACT_ONE_TITLE = 'Act 1: Sootline Descent'

export function getCardById(cardId: string): CardDefinition | null {
  return CARD_LIBRARY[cardId] ?? null
}

export function getEnemyById(enemyId: string): EnemyDefinition | null {
  return ENEMY_LIBRARY[enemyId] ?? null
}

function pickUniqueRandom<T>(pool: T[], count: number): T[] {
  const copy = [...pool]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]]
  }
  return copy.slice(0, Math.min(count, copy.length))
}

export function buildEventChoices(count = 3): EventChoice[] {
  return pickUniqueRandom(EVENT_POOL, count)
}

export function buildShopOffers(tier: 'early' | 'late' = 'early'): ShopOffer[] {
  const cardPool = tier === 'late' ? LATE_SHOP_CARD_POOL : EARLY_SHOP_CARD_POOL
  const cards = pickUniqueRandom(cardPool, 3).map((card) => ({
    kind: 'card' as const,
    offerId: `card-${card.id}`,
    card,
    price: card.cost === 2 ? 72 : 58,
  }))
  const relics = pickUniqueRandom(RELIC_POOL, 2).map((relic) => ({
    kind: 'relic' as const,
    offerId: `relic-${relic.id}`,
    relic,
    price: 118,
  }))
  const removeOffer: ShopOffer = {
    kind: 'remove',
    offerId: 'remove-card',
    price: 80,
  }
  return [...cards, ...relics, removeOffer]
}
