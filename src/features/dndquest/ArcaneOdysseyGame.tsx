import { useCallback, useMemo, useState } from 'react'

interface ArcaneOdysseyGameProps {
  playerName: string
  onResetPlayer: () => void
  onSwitchProject?: () => void
}

type RequirementComparison = 'gt' | 'gte'

type RequirementResource = 'hp' | 'mana' | 'xp' | 'gold'

interface NumericRequirement {
  type: RequirementResource
  amount: number
  comparison?: RequirementComparison
}

interface SpellRequirement {
  type: 'spell'
  spellId: keyof typeof SPELLBOOK
}

interface ItemRequirement {
  type: 'item'
  itemId: keyof typeof ITEMS
}

type Requirement = NumericRequirement | SpellRequirement | ItemRequirement

interface Weapon {
  id: string
  name: string
  damage: [number, number]
  description: string
  perk: string
}

interface Spell {
  id: string
  name: string
  cost: number
  description: string
  effect: 'damage' | 'heal' | 'shield'
  value: number
}

interface Item {
  id: string
  name: string
  type: 'potion' | 'ether' | 'trinket'
  description: string
  effect: 'heal' | 'mana' | 'buff'
  value: number
}

interface PlayerState {
  hp: number
  maxHp: number
  mana: number
  maxMana: number
  xp: number
  level: number
  gold: number
  weapon: Weapon
  spells: Spell[]
  inventory: Item[]
  inventorySlots: number
}

interface RiskOutcome {
  id: string
  label: string
  detail?: string
  effects?: Reward[]
  weight: number
}

interface RiskModifier {
  id: string
  description: string
  requirement: Requirement
  targetOutcomeId: string
  weightDelta: number
}

interface ChoiceRisk {
  description?: string
  outcomes: RiskOutcome[]
  modifiers?: RiskModifier[]
}

interface NarrativeChoice {
  id: string
  label: string
  detail?: string
  requirement?: Requirement
  effects?: Reward[]
  risk?: ChoiceRisk
  next: SceneRef
}

interface NarrativeScene {
  id: string
  type: 'story'
  title: string
  body: string[]
  choices: NarrativeChoice[]
}

interface CombatApproach {
  id: string
  label: string
  detail?: string
  requirement?: Requirement
  risk: ChoiceRisk
}

interface CombatScene {
  id: string
  type: 'combat'
  title: string
  body: string[]
  encounter: string
  approaches: CombatApproach[]
  nextOnVictory: SceneRef
}

type Scene = NarrativeScene | CombatScene

interface CombatResolution {
  sceneId: string
  approachId: string
  outcome: RiskOutcome
  breakdown: ChanceBreakdown[]
  modifiers: RiskModifier[]
  rollPercent: number
}

interface SceneRef {
  actId: string
  sceneId: string
}

interface CampaignAct {
  id: string
  title: string
  summary: string
  start: string
  scenes: Record<string, Scene>
  completionReward?: Reward[]
}

interface ChanceBreakdown {
  id: string
  label: string
  percent: number
  detail?: string
}

interface RequirementStatus {
  met: boolean
  label: string
}

interface ChoiceButtonProps {
  label: string
  detail?: string
  requirementStatus?: RequirementStatus | null
  risk?: ChoiceRisk
  disabled?: boolean
  onClick: () => void
}

interface RewardEffectHp { type: 'hp'; amount: number }
interface RewardEffectMana { type: 'mana'; amount: number }
interface RewardEffectXp { type: 'xp'; amount: number }
interface RewardEffectGold { type: 'gold'; amount: number }
interface RewardEffectItem { type: 'item'; itemId: keyof typeof ITEMS }
interface RewardEffectWeapon { type: 'weapon'; weaponId: keyof typeof WEAPONS }
interface RewardEffectSpell { type: 'spell'; spellId: keyof typeof SPELLBOOK }
interface RewardEffectSlots { type: 'slots'; amount: number }

export type Reward =
  | RewardEffectHp
  | RewardEffectMana
  | RewardEffectXp
  | RewardEffectGold
  | RewardEffectItem
  | RewardEffectWeapon
  | RewardEffectSpell
  | RewardEffectSlots

const WEAPONS = {
  emberShard: {
    id: 'emberShard',
    name: 'Ember Shard Saber',
    damage: [6, 10],
    description: 'Light blade that ignites on a clean hit.',
    perk: '+1 damage if enemy is above 50% HP.',
  },
  solsticeBrand: {
    id: 'solsticeBrand',
    name: 'Solstice Brand',
    damage: [9, 14],
    description: 'Balanced longsword storing dawnfire.',
    perk: 'Gain 2 mana on crits.',
  },
  stormledgerPike: {
    id: 'stormledgerPike',
    name: 'Stormledger Pike',
    damage: [11, 16],
    description: 'Runed spear tuned for spellcasters.',
    perk: '+20% spell damage while equipped.',
  },
} satisfies Record<string, Weapon>

const SPELLBOOK = {
  emberSnap: {
    id: 'emberSnap',
    name: 'Ember Snap',
    cost: 0,
    description: 'Crackle for minor fire damage.',
    effect: 'damage',
    value: 6,
  },
  aetherLance: {
    id: 'aetherLance',
    name: 'Aether Lance',
    cost: 4,
    description: 'Pierce a single foe with focused force.',
    effect: 'damage',
    value: 14,
  },
  solarMend: {
    id: 'solarMend',
    name: 'Solar Mend',
    cost: 3,
    description: 'Mend minor wounds with sunlight.',
    effect: 'heal',
    value: 12,
  },
  gravityWell: {
    id: 'gravityWell',
    name: 'Gravity Well',
    cost: 6,
    description: 'Crush enemies for heavy damage and slow.',
    effect: 'damage',
    value: 20,
  },
  mindControl: {
    id: 'mindControl',
    name: 'Mind Control',
    cost: 5,
    description: 'Briefly steer a single mind away from you.',
    effect: 'damage',
    value: 0,
  },
} satisfies Record<string, Spell>

const ITEMS = {
  sunsapPotion: {
    id: 'sunsapPotion',
    name: 'Sunsap Potion',
    type: 'potion',
    description: 'Restores 10 HP.',
    effect: 'heal',
    value: 10,
  },
  opalTea: {
    id: 'opalTea',
    name: 'Opal Focus Tea',
    type: 'ether',
    description: 'Restores 6 mana over a turn.',
    effect: 'mana',
    value: 6,
  },
  wardSigil: {
    id: 'wardSigil',
    name: 'Ward Sigil',
    type: 'trinket',
    description: 'Next incoming hit is reduced by 30%.',
    effect: 'buff',
    value: 30,
  },
} satisfies Record<string, Item>

const sceneRef = (actId: string, sceneId: string): SceneRef => ({ actId, sceneId })

const CAMPAIGN: CampaignAct[] = [
  {
    id: 'act1',
    title: 'Act I · River Market Search',
    summary: 'Find the missing courier hiding near the river market.',
    start: 'riverLanding',
    scenes: {
      riverLanding: {
        id: 'riverLanding',
        type: 'story',
        title: 'River Landing',
        body: [
          'You dock at the river market where the courier vanished.',
          'Fog, crates, and bored workers cover the pier.',
        ],
        choices: [
          {
            id: 'dock-talk',
            label: 'Ask the dock crew for tips',
            detail: 'Free · Risky info grab',
            risk: {
              description: 'Crew mood shifts fast.',
              outcomes: [
                {
                  id: 'crewFriend',
                  label: 'Friendly chat',
                  detail: '+15 XP · +5 gold',
                  effects: [
                    { type: 'xp', amount: 15 },
                    { type: 'gold', amount: 5 },
                  ],
                  weight: 4,
                },
                {
                  id: 'shortTip',
                  label: 'Quick tip only',
                  detail: '+8 XP',
                  effects: [{ type: 'xp', amount: 8 }],
                  weight: 3,
                },
                {
                  id: 'annoyedCrew',
                  label: 'You annoy them',
                  detail: '-5 gold but still learn the route',
                  effects: [{ type: 'gold', amount: -5 }],
                  weight: 2,
                },
              ],
              modifiers: [
                {
                  id: 'xpConfidence',
                  description: '50+ XP keeps your voice steady (+Friendly chat)',
                  requirement: { type: 'xp', amount: 50, comparison: 'gte' },
                  targetOutcomeId: 'crewFriend',
                  weightDelta: 2,
                },
              ],
            },
            next: sceneRef('act1', 'marketAlleys'),
          },
          {
            id: 'gap-jump',
            label: 'Jump the broken pier gap',
            detail: 'Long jump between bobbing boats',
            requirement: { type: 'hp', amount: 5, comparison: 'gt' },
            risk: {
              description: 'Wide leap between bobbing boats.',
              outcomes: [
                {
                  id: 'cleanLanding',
                  label: 'Solid landing',
                  detail: '+12 XP · +1 Opal Tea',
                  effects: [
                    { type: 'xp', amount: 12 },
                    { type: 'item', itemId: 'opalTea' },
                  ],
                  weight: 4,
                },
                {
                  id: 'hardLanding',
                  label: 'Heel slip',
                  detail: '-4 HP · +6 XP',
                  effects: [
                    { type: 'hp', amount: -4 },
                    { type: 'xp', amount: 6 },
                  ],
                  weight: 3,
                },
                {
                  id: 'splash',
                  label: 'Short dunk',
                  detail: '-6 HP · +5 gold (coins in the water)',
                  effects: [
                    { type: 'hp', amount: -6 },
                    { type: 'gold', amount: 5 },
                  ],
                  weight: 2,
                },
              ],
              modifiers: [
                {
                  id: 'wardBalance',
                  description: 'Ward Sigil steadies your feet (+Solid landing)',
                  requirement: { type: 'item', itemId: 'wardSigil' },
                  targetOutcomeId: 'cleanLanding',
                  weightDelta: 1.5,
                },
              ],
            },
            next: sceneRef('act1', 'marketAlleys'),
          },
          {
            id: 'crate-watch',
            label: 'Watch quietly from the crate stacks',
            detail: '+6 XP · +5 mana',
            effects: [
              { type: 'xp', amount: 6 },
              { type: 'mana', amount: 5 },
            ],
            next: sceneRef('act1', 'marketAlleys'),
          },
        ],
      },
      marketAlleys: {
        id: 'marketAlleys',
        type: 'story',
        title: 'Market Alleys',
        body: [
          'Tight alleys wind behind the stalls.',
          'Small clues lead toward a locked freight car.',
        ],
        choices: [
          {
            id: 'shadow-cart',
            label: 'Shadow the covered cart',
            detail: 'Watch the route · Risky',
            risk: {
              description: 'Cart guards toss scraps to distract snoops.',
              outcomes: [
                {
                  id: 'perfectShadow',
                  label: 'Perfect tail',
                  detail: '+18 XP · +10 gold',
                  effects: [
                    { type: 'xp', amount: 18 },
                    { type: 'gold', amount: 10 },
                  ],
                  weight: 4,
                },
                {
                  id: 'shortShadow',
                  label: 'Short window',
                  detail: '+8 XP',
                  effects: [{ type: 'xp', amount: 8 }],
                  weight: 3,
                },
                {
                  id: 'spotted',
                  label: 'They spot you',
                  detail: '-6 HP',
                  effects: [{ type: 'hp', amount: -6 }],
                  weight: 2,
                },
              ],
              modifiers: [
                {
                  id: 'sigilBlend',
                  description: 'Ward Sigil bends light around you (+Perfect tail)',
                  requirement: { type: 'item', itemId: 'wardSigil' },
                  targetOutcomeId: 'perfectShadow',
                  weightDelta: 2,
                },
              ],
            },
            next: sceneRef('act1', 'trainCar'),
          },
          {
            id: 'mind-glimpse',
            label: 'Perform a quick mind glimpse',
            detail: '+Chance to unlock Mind Control',
            risk: {
              description: 'Short ritual with borrowed candles.',
              outcomes: [
                {
                  id: 'clearVision',
                  label: 'Clear vision',
                  detail: '+12 XP · Unlock Mind Control',
                  effects: [
                    { type: 'xp', amount: 12 },
                    { type: 'spell', spellId: 'mindControl' },
                  ],
                  weight: 4,
                },
                {
                  id: 'partialVision',
                  label: 'Blurry symbols',
                  detail: '+6 XP',
                  effects: [{ type: 'xp', amount: 6 }],
                  weight: 3,
                },
                {
                  id: 'backlash',
                  label: 'Backlash sting',
                  detail: '-6 mana',
                  effects: [{ type: 'mana', amount: -6 }],
                  weight: 2,
                },
              ],
              modifiers: [
                {
                  id: 'opalFocus',
                  description: 'Opal Tea keeps you steady (+Clear vision)',
                  requirement: { type: 'item', itemId: 'opalTea' },
                  targetOutcomeId: 'clearVision',
                  weightDelta: 1.5,
                },
              ],
            },
            next: sceneRef('act1', 'trainCar'),
          },
          {
            id: 'buy-ward',
            label: 'Buy a Ward Sigil (15 gold)',
            detail: 'Slip coin to the sigil vendor',
            requirement: { type: 'gold', amount: 15, comparison: 'gte' },
            effects: [
              { type: 'gold', amount: -15 },
              { type: 'item', itemId: 'wardSigil' },
            ],
            next: sceneRef('act1', 'trainCar'),
          },
        ],
      },
      trainCar: {
        id: 'trainCar',
        type: 'story',
        title: 'Locked Freight Car',
        body: [
          'The courier hides inside a freight car guarded by one bored officer.',
        ],
        choices: [
          {
            id: 'lie-guard',
            label: 'Lie about a safety inspection',
            detail: 'Flash a fake inspection badge',
            requirement: { type: 'xp', amount: 50, comparison: 'gte' },
            risk: {
              description: 'Your badge is dusty.',
              outcomes: [
                {
                  id: 'boldLie',
                  label: 'Guard believes you',
                  detail: '+20 XP · +10 gold',
                  effects: [
                    { type: 'xp', amount: 20 },
                    { type: 'gold', amount: 10 },
                  ],
                  weight: 4,
                },
                {
                  id: 'smallDoubt',
                  label: 'Guard hesitates',
                  detail: '+10 XP',
                  effects: [{ type: 'xp', amount: 10 }],
                  weight: 3,
                },
                {
                  id: 'caughtLie',
                  label: 'He calls your bluff',
                  detail: '-8 HP',
                  effects: [{ type: 'hp', amount: -8 }],
                  weight: 2,
                },
              ],
              modifiers: [
                {
                  id: 'goldFlash',
                  description: 'Carrying 60+ gold lets you flash a bribe (+Guard believes you)',
                  requirement: { type: 'gold', amount: 60, comparison: 'gte' },
                  targetOutcomeId: 'boldLie',
                  weightDelta: 1.5,
                },
              ],
            },
            next: sceneRef('act1', 'actOneWrap'),
          },
          {
            id: 'mind-guard',
            label: 'Use Mind Control to lull the guard',
            detail: 'Send a calm pulse through him',
            requirement: { type: 'spell', spellId: 'mindControl' },
            risk: {
              description: 'Push a calm thought into his mind.',
              outcomes: [
                {
                  id: 'deepCalm',
                  label: 'Deep calm',
                  detail: '+15 XP · +1 Sunsap Potion',
                  effects: [
                    { type: 'xp', amount: 15 },
                    { type: 'item', itemId: 'sunsapPotion' },
                  ],
                  weight: 4,
                },
                {
                  id: 'shallowCalm',
                  label: 'Short calm',
                  detail: '+10 XP',
                  effects: [{ type: 'xp', amount: 10 }],
                  weight: 3,
                },
                {
                  id: 'rebound',
                  label: 'Mind rebound',
                  detail: '-5 mana',
                  effects: [{ type: 'mana', amount: -5 }],
                  weight: 2,
                },
              ],
              modifiers: [
                {
                  id: 'aetherBoost',
                  description: 'Holding 25+ mana boosts the calm pulse (+Deep calm)',
                  requirement: { type: 'mana', amount: 25, comparison: 'gte' },
                  targetOutcomeId: 'deepCalm',
                  weightDelta: 1,
                },
              ],
            },
            next: sceneRef('act1', 'actOneWrap'),
          },
          {
            id: 'crate-hide',
            label: 'Hide in a grain crate until night',
            detail: '-5 mana · +8 XP',
            effects: [
              { type: 'mana', amount: -5 },
              { type: 'xp', amount: 8 },
            ],
            next: sceneRef('act1', 'actOneWrap'),
          },
        ],
      },
      actOneWrap: {
        id: 'actOneWrap',
        type: 'story',
        title: 'Courier Found',
        body: [
          'The courier shares maps to a ridge camp where the siphon parts travel next.',
        ],
        choices: [
          {
            id: 'head-inland',
            label: 'Head inland with the courier',
            detail: '+40 XP · +60 gold · Unlock Solar Mend',
            effects: [
              { type: 'xp', amount: 40 },
              { type: 'gold', amount: 60 },
              { type: 'spell', spellId: 'solarMend' },
            ],
            next: sceneRef('act2', 'ridgeCamp'),
          },
        ],
      },
    },
  },
  {
    id: 'act2',
    title: 'Act II · Ridge Run',
    summary: 'Climb the ridge, stop the siphon cart, and end the job.',
    start: 'ridgeCamp',
    scenes: {
      ridgeCamp: {
        id: 'ridgeCamp',
        type: 'story',
        title: 'Ridge Camp',
        body: [
          'Supply tents cling to the windy ridge.',
          'The siphon cart climbs toward a patrol yard.',
        ],
        choices: [
          {
            id: 'rush-pass',
            label: 'Rush past the supply fires',
            detail: 'Quick but risky',
            risk: {
              description: 'Smoke hides you or chokes you.',
              outcomes: [
                {
                  id: 'cleanRush',
                  label: 'Clean rush',
                  detail: '+18 XP',
                  effects: [{ type: 'xp', amount: 18 }],
                  weight: 4,
                },
                {
                  id: 'coughRush',
                  label: 'Coughing dash',
                  detail: '+8 XP · -4 HP',
                  effects: [
                    { type: 'xp', amount: 8 },
                    { type: 'hp', amount: -4 },
                  ],
                  weight: 3,
                },
                {
                  id: 'tripRush',
                  label: 'Trip on rope',
                  detail: '-6 HP',
                  effects: [{ type: 'hp', amount: -6 }],
                  weight: 2,
                },
              ],
              modifiers: [
                {
                  id: 'hpBuffer',
                  description: 'If HP ≥ 45 you muscle through (+Clean rush)',
                  requirement: { type: 'hp', amount: 45, comparison: 'gte' },
                  targetOutcomeId: 'cleanRush',
                  weightDelta: 1,
                },
              ],
            },
            next: sceneRef('act2', 'yardPatrol'),
          },
          {
            id: 'brew-tonic',
            label: 'Brew Sunsap Potion for the climb',
            detail: '+1 Sunsap Potion · +5 XP',
            effects: [
              { type: 'item', itemId: 'sunsapPotion' },
              { type: 'xp', amount: 5 },
            ],
            next: sceneRef('act2', 'yardPatrol'),
          },
          {
            id: 'quiet-scout',
            label: 'Quietly scout the guard tents',
            detail: 'Slower but safer',
            risk: {
              description: 'Tents creak and flap.',
              outcomes: [
                {
                  id: 'mapFind',
                  label: 'Find a patrol map',
                  detail: '+15 XP · +1 Ward Sigil',
                  effects: [
                    { type: 'xp', amount: 15 },
                    { type: 'item', itemId: 'wardSigil' },
                  ],
                  weight: 3,
                },
                {
                  id: 'loosePeg',
                  label: 'Loose tent peg',
                  detail: '+8 XP',
                  effects: [{ type: 'xp', amount: 8 }],
                  weight: 4,
                },
                {
                  id: 'wakeGuard',
                  label: 'Wake a guard',
                  detail: '-5 HP',
                  effects: [{ type: 'hp', amount: -5 }],
                  weight: 2,
                },
              ],
              modifiers: [
                {
                  id: 'xpScout',
                  description: '70+ XP reminds you of past scouts (+Find a patrol map)',
                  requirement: { type: 'xp', amount: 70, comparison: 'gte' },
                  targetOutcomeId: 'mapFind',
                  weightDelta: 1,
                },
              ],
            },
            next: sceneRef('act2', 'yardPatrol'),
          },
        ],
      },
      yardPatrol: {
        id: 'yardPatrol',
        type: 'combat',
        title: 'Yard Patrol',
        body: [
          'A trio of patrol officers blocks the ridge stairs.',
          'Pick a plan of attack.',
        ],
        encounter: 'patrol',
        approaches: [
          {
            id: 'charge',
            label: 'Charge with wide strikes',
            detail: 'Swing wide and bash through',
            requirement: { type: 'hp', amount: 20, comparison: 'gt' },
            risk: {
              description: 'Pure muscle versus shields.',
              outcomes: [
                {
                  id: 'wideWin',
                  label: 'Big sweep',
                  detail: '+25 XP · +20 gold',
                  effects: [
                    { type: 'xp', amount: 25 },
                    { type: 'gold', amount: 20 },
                  ],
                  weight: 4,
                },
                {
                  id: 'tradeBlows',
                  label: 'Trade blows',
                  detail: '+12 XP · -8 HP',
                  effects: [
                    { type: 'xp', amount: 12 },
                    { type: 'hp', amount: -8 },
                  ],
                  weight: 3,
                },
                {
                  id: 'shieldBash',
                  label: 'Shield bash to the chest',
                  detail: '-10 HP',
                  effects: [{ type: 'hp', amount: -10 }],
                  weight: 2,
                },
              ],
              modifiers: [
                {
                  id: 'xpFight',
                  description: '80+ XP gives you better timing (+Big sweep)',
                  requirement: { type: 'xp', amount: 80, comparison: 'gte' },
                  targetOutcomeId: 'wideWin',
                  weightDelta: 1.5,
                },
                {
                  id: 'solarHeal',
                  description: 'Knowing Solar Mend softens setbacks (-Shield bash)',
                  requirement: { type: 'spell', spellId: 'solarMend' },
                  targetOutcomeId: 'shieldBash',
                  weightDelta: -1,
                },
              ],
            },
          },
          {
            id: 'decoySmoke',
            label: 'Set a smoke decoy',
            detail: 'Consumes Ward Sigil if owned',
            requirement: { type: 'item', itemId: 'wardSigil' },
            risk: {
              description: 'Sigil dust blinds the patrol.',
              outcomes: [
                {
                  id: 'cleanSlip',
                  label: 'Clean slipthrough',
                  detail: '+20 XP · +1 Opal Tea',
                  effects: [
                    { type: 'xp', amount: 20 },
                    { type: 'item', itemId: 'opalTea' },
                  ],
                  weight: 4,
                },
                {
                  id: 'halfBlind',
                  label: 'Half blind run',
                  detail: '+10 XP',
                  effects: [{ type: 'xp', amount: 10 }],
                  weight: 3,
                },
                {
                  id: 'windShift',
                  label: 'Wind blows smoke back',
                  detail: '-5 HP',
                  effects: [{ type: 'hp', amount: -5 }],
                  weight: 2,
                },
              ],
              modifiers: [
                {
                  id: 'manaGuide',
                  description: 'Mana ≥ 20 shapes the smoke (+Clean slipthrough)',
                  requirement: { type: 'mana', amount: 20, comparison: 'gte' },
                  targetOutcomeId: 'cleanSlip',
                  weightDelta: 1,
                },
              ],
            },
          },
          {
            id: 'mindPulse',
            label: 'Pulse Mind Control across them',
            detail: 'Sweep their minds in one wave',
            requirement: { type: 'spell', spellId: 'mindControl' },
            risk: {
              description: 'One thought at a time.',
              outcomes: [
                {
                  id: 'allSwayed',
                  label: 'All three sway',
                  detail: '+22 XP · +15 gold',
                  effects: [
                    { type: 'xp', amount: 22 },
                    { type: 'gold', amount: 15 },
                  ],
                  weight: 4,
                },
                {
                  id: 'twoSwayed',
                  label: 'Two sway, one resists',
                  detail: '+14 XP · -4 mana',
                  effects: [
                    { type: 'xp', amount: 14 },
                    { type: 'mana', amount: -4 },
                  ],
                  weight: 3,
                },
                {
                  id: 'pushback',
                  label: 'Mental pushback',
                  detail: '-8 mana',
                  effects: [{ type: 'mana', amount: -8 }],
                  weight: 2,
                },
              ],
              modifiers: [
                {
                  id: 'teaCalm',
                  description: 'Holding Opal Tea calms you (+All three sway)',
                  requirement: { type: 'item', itemId: 'opalTea' },
                  targetOutcomeId: 'allSwayed',
                  weightDelta: 1.5,
                },
              ],
            },
          },
        ],
        nextOnVictory: sceneRef('act2', 'signalBridge'),
      },
      signalBridge: {
        id: 'signalBridge',
        type: 'story',
        title: 'Signal Bridge',
        body: [
          'A narrow bone bridge spans a deep cut.',
          'Signal mirrors flash warnings ahead.',
        ],
        choices: [
          {
            id: 'beam-jump',
            label: 'Jump beam to beam',
            detail: 'Hop beam to beam in the wind',
            requirement: { type: 'hp', amount: 10, comparison: 'gt' },
            risk: {
              description: 'Slippery beams',
              outcomes: [
                {
                  id: 'fastAcross',
                  label: 'Fast across',
                  detail: '+18 XP',
                  effects: [{ type: 'xp', amount: 18 }],
                  weight: 4,
                },
                {
                  id: 'winded',
                  label: 'Winded on landing',
                  detail: '+8 XP · -4 HP',
                  effects: [
                    { type: 'xp', amount: 8 },
                    { type: 'hp', amount: -4 },
                  ],
                  weight: 3,
                },
                {
                  id: 'slip',
                  label: 'Foot slip',
                  detail: '-7 HP',
                  effects: [{ type: 'hp', amount: -7 }],
                  weight: 2,
                },
              ],
              modifiers: [
                {
                  id: 'xpBalance',
                  description: '90+ XP reminds you of drill runs (+Fast across)',
                  requirement: { type: 'xp', amount: 90, comparison: 'gte' },
                  targetOutcomeId: 'fastAcross',
                  weightDelta: 1,
                },
              ],
            },
            next: sceneRef('act2', 'towerGate'),
          },
          {
            id: 'call-guide',
            label: 'Call the courier to guide you',
            detail: 'Costs 10 gold',
            effects: [
              { type: 'gold', amount: -10 },
              { type: 'xp', amount: 5 },
            ],
            next: sceneRef('act2', 'towerGate'),
          },
          {
            id: 'reset-kit',
            label: 'Use Sunsap Potion',
            detail: 'Drink a Sunsap Potion mid-crossing',
            requirement: { type: 'item', itemId: 'sunsapPotion' },
            effects: [{ type: 'hp', amount: 10 }],
            next: sceneRef('act2', 'towerGate'),
          },
        ],
      },
      towerGate: {
        id: 'towerGate',
        type: 'combat',
        title: 'Tower Gate',
        body: [
          'The siphon cart reaches a tower gate with rune cannons.',
          'Pick a final plan.',
        ],
        encounter: 'tower',
        approaches: [
          {
            id: 'stormDash',
            label: 'Storm dash under the cannons',
            detail: 'Sprint straight under the cannons',
            requirement: { type: 'hp', amount: 25, comparison: 'gt' },
            risk: {
              description: 'Cannons spool with noise.',
              outcomes: [
                {
                  id: 'dashClean',
                  label: 'Dash succeeds',
                  detail: '+30 XP · +30 gold',
                  effects: [
                    { type: 'xp', amount: 30 },
                    { type: 'gold', amount: 30 },
                  ],
                  weight: 4,
                },
                {
                  id: 'dashGraze',
                  label: 'Graze from a shot',
                  detail: '+15 XP · -10 HP',
                  effects: [
                    { type: 'xp', amount: 15 },
                    { type: 'hp', amount: -10 },
                  ],
                  weight: 3,
                },
                {
                  id: 'dashFail',
                  label: 'Forced retreat',
                  detail: '-12 HP',
                  effects: [{ type: 'hp', amount: -12 }],
                  weight: 2,
                },
              ],
              modifiers: [
                {
                  id: 'wardGuard',
                  description: 'Ward Sigil diverts a shot (+Dash succeeds)',
                  requirement: { type: 'item', itemId: 'wardSigil' },
                  targetOutcomeId: 'dashClean',
                  weightDelta: 1.5,
                },
              ],
            },
          },
          {
            id: 'mindCommand',
            label: 'Mind Control the cannon crew',
            detail: 'Direct the cannon crew with one thought',
            requirement: { type: 'spell', spellId: 'mindControl' },
            risk: {
              description: 'Two minds, one push.',
              outcomes: [
                {
                  id: 'crewStops',
                  label: 'Crew stands down',
                  detail: '+28 XP · +1 Sunsap Potion',
                  effects: [
                    { type: 'xp', amount: 28 },
                    { type: 'item', itemId: 'sunsapPotion' },
                  ],
                  weight: 4,
                },
                {
                  id: 'oneResists',
                  label: 'One resists',
                  detail: '+15 XP · -6 mana',
                  effects: [
                    { type: 'xp', amount: 15 },
                    { type: 'mana', amount: -6 },
                  ],
                  weight: 3,
                },
                {
                  id: 'feedback',
                  label: 'Feedback shock',
                  detail: '-10 mana',
                  effects: [{ type: 'mana', amount: -10 }],
                  weight: 2,
                },
              ],
              modifiers: [
                {
                  id: 'xpCalm',
                  description: '100+ XP keeps your focus (+Crew stands down)',
                  requirement: { type: 'xp', amount: 100, comparison: 'gte' },
                  targetOutcomeId: 'crewStops',
                  weightDelta: 1.5,
                },
              ],
            },
          },
          {
            id: 'slowPlan',
            label: 'Set charges on the tracks',
            detail: 'Costs 15 gold',
            requirement: { type: 'gold', amount: 15, comparison: 'gte' },
            risk: {
              description: 'Simple charges under heavy stress.',
              outcomes: [
                {
                  id: 'planPerfect',
                  label: 'Perfect plan',
                  detail: '+26 XP',
                  effects: [{ type: 'xp', amount: 26 }],
                  weight: 4,
                },
                {
                  id: 'planSlow',
                  label: 'Slow detour',
                  detail: '+10 XP · -5 HP',
                  effects: [
                    { type: 'xp', amount: 10 },
                    { type: 'hp', amount: -5 },
                  ],
                  weight: 3,
                },
                {
                  id: 'planSpotted',
                  label: 'Spotted while planting',
                  detail: '-8 HP',
                  effects: [{ type: 'hp', amount: -8 }],
                  weight: 2,
                },
              ],
              modifiers: [
                {
                  id: 'goldExpert',
                  description: 'Holding ≥80 gold buys better fuses (+Perfect plan)',
                  requirement: { type: 'gold', amount: 80, comparison: 'gte' },
                  targetOutcomeId: 'planPerfect',
                  weightDelta: 1,
                },
              ],
            },
          },
        ],
        nextOnVictory: sceneRef('act2', 'actTwoWrap'),
      },
      actTwoWrap: {
        id: 'actTwoWrap',
        type: 'story',
        title: 'Cart Secured',
        body: [
          'The siphon parts are safe and the ridge quiets down.',
        ],
        choices: [
          {
            id: 'claim-bounty',
            label: 'Claim the ridge bounty',
            detail: '+120 XP · +150 gold · Stormledger Pike',
            effects: [
              { type: 'xp', amount: 120 },
              { type: 'gold', amount: 150 },
              { type: 'weapon', weaponId: 'stormledgerPike' },
            ],
            next: sceneRef('act1', 'riverLanding'),
          },
          {
            id: 'restart',
            label: 'Stand down and restart the job',
            detail: 'Reset to Act I',
            next: sceneRef('act1', 'riverLanding'),
          },
        ],
      },
    },
  },
]

const DEFAULT_SCENE_REF: SceneRef = {
  actId: CAMPAIGN[0].id,
  sceneId: CAMPAIGN[0].start,
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const createInitialPlayer = (): PlayerState => ({
  hp: 60,
  maxHp: 60,
  mana: 22,
  maxMana: 22,
  xp: 0,
  level: 1,
  gold: 40,
  weapon: WEAPONS.emberShard,
  spells: [SPELLBOOK.emberSnap, SPELLBOOK.aetherLance],
  inventory: [],
  inventorySlots: 3,
})

const applyReward = (player: PlayerState, reward: Reward): PlayerState => {
  switch (reward.type) {
    case 'hp': {
      const hp = clamp(player.hp + reward.amount, 0, player.maxHp)
      return { ...player, hp }
    }
    case 'mana': {
      const mana = clamp(player.mana + reward.amount, 0, player.maxMana)
      return { ...player, mana }
    }
    case 'xp': {
      const xp = Math.max(0, player.xp + reward.amount)
      const level = Math.max(1, Math.floor(xp / 100) + 1)
      return { ...player, xp, level }
    }
    case 'gold': {
      const gold = Math.max(0, player.gold + reward.amount)
      return { ...player, gold }
    }
    case 'item': {
      if (player.inventory.length >= player.inventorySlots) {
        return { ...player, gold: player.gold + 5 }
      }
      return { ...player, inventory: [...player.inventory, ITEMS[reward.itemId]] }
    }
    case 'spell': {
      if (player.spells.some((spell) => spell.id === reward.spellId)) {
        return player
      }
      return { ...player, spells: [...player.spells, SPELLBOOK[reward.spellId]] }
    }
    case 'weapon': {
      return player
    }
    case 'slots': {
      const inventorySlots = clamp(player.inventorySlots + reward.amount, 3, 8)
      return { ...player, inventorySlots }
    }
    default:
      return player
  }
}

const resolveScene = (ref: SceneRef) => {
  const act = CAMPAIGN.find((entry) => entry.id === ref.actId) ?? CAMPAIGN[0]
  const scene = act.scenes[ref.sceneId] ?? act.scenes[act.start]
  return { act, scene }
}

const describeRequirement = (requirement: Requirement): string => {
  if (requirement.type === 'spell') {
    return `Needs ${SPELLBOOK[requirement.spellId].name}`
  }
  if (requirement.type === 'item') {
    return `Needs ${ITEMS[requirement.itemId].name}`
  }
  const comparison = requirement.comparison === 'gt' ? '>' : '≥'
  const label = requirement.type.toUpperCase()
  return `Needs ${comparison} ${requirement.amount} ${label}`
}

const meetsRequirement = (player: PlayerState, requirement: Requirement): boolean => {
  switch (requirement.type) {
    case 'spell':
      return player.spells.some((spell) => spell.id === requirement.spellId)
    case 'item':
      return player.inventory.some((item) => item.id === requirement.itemId)
    case 'hp':
      return requirement.comparison === 'gt'
        ? player.hp > requirement.amount
        : player.hp >= requirement.amount
    case 'mana':
      return requirement.comparison === 'gt'
        ? player.mana > requirement.amount
        : player.mana >= requirement.amount
    case 'xp':
      return requirement.comparison === 'gt'
        ? player.xp > requirement.amount
        : player.xp >= requirement.amount
    case 'gold':
      return requirement.comparison === 'gt'
        ? player.gold > requirement.amount
        : player.gold >= requirement.amount
    default:
      return false
  }
}

const getRequirementStatus = (player: PlayerState, requirement?: Requirement): RequirementStatus | null => {
  if (!requirement) return null
  return {
    met: meetsRequirement(player, requirement),
    label: describeRequirement(requirement),
  }
}

const getWeightedOutcomes = (risk: ChoiceRisk, player: PlayerState) => {
  const activeModifiers: RiskModifier[] = []
  const entries = risk.outcomes.map((outcome) => {
    let weight = outcome.weight
    risk.modifiers?.forEach((modifier) => {
      if (modifier.targetOutcomeId === outcome.id && meetsRequirement(player, modifier.requirement)) {
        weight += modifier.weightDelta
        if (!activeModifiers.some((mod) => mod.id === modifier.id)) {
          activeModifiers.push(modifier)
        }
      }
    })
    return { outcome, weight: Math.max(weight, 0.05) }
  })
  return { entries, activeModifiers }
}

const getRiskPreview = (risk: ChoiceRisk, player: PlayerState) => {
  const { entries, activeModifiers } = getWeightedOutcomes(risk, player)
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0)
  const breakdown: ChanceBreakdown[] = entries.map((entry) => ({
    id: entry.outcome.id,
    label: entry.outcome.label,
    detail: entry.outcome.detail,
    percent: total > 0 ? Math.round((entry.weight / total) * 100) : 0,
  }))
  return { breakdown, activeModifiers }
}

const rollRiskOutcome = (risk: ChoiceRisk, player: PlayerState) => {
  const { entries, activeModifiers } = getWeightedOutcomes(risk, player)
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0)
  let roll = Math.random() * total
  let selected = entries[0]?.outcome ?? risk.outcomes[0]
  for (const entry of entries) {
    if (roll <= entry.weight) {
      selected = entry.outcome
      break
    }
    roll -= entry.weight
  }
  const breakdown: ChanceBreakdown[] = entries.map((entry) => ({
    id: entry.outcome.id,
    label: entry.outcome.label,
    detail: entry.outcome.detail,
    percent: total > 0 ? Math.round((entry.weight / total) * 100) : 0,
  }))
  const rollPercent = total > 0 ? (total - roll) / total : 0
  return { outcome: selected, breakdown, modifiers: activeModifiers, rollPercent }
}

export function ArcaneOdysseyGame({ playerName, onResetPlayer, onSwitchProject }: ArcaneOdysseyGameProps) {
  const [player, setPlayer] = useState<PlayerState>(() => createInitialPlayer())
  const [currentRef, setCurrentRef] = useState<SceneRef>(DEFAULT_SCENE_REF)
  const [toast, setToast] = useState('')
  const [gameOver, setGameOver] = useState<string | null>(null)
  const [pendingWeapon, setPendingWeapon] = useState<Weapon | null>(null)
  const [combatOutcome, setCombatOutcome] = useState<CombatResolution | null>(null)

  const { act: currentAct, scene: currentScene } = useMemo(() => resolveScene(currentRef), [currentRef])

  const travelTo = useCallback((target: SceneRef) => {
    setCurrentRef(target)
    setCombatOutcome(null)
  }, [])

  const resetRun = useCallback(() => {
    setPlayer(createInitialPlayer())
    setCurrentRef(DEFAULT_SCENE_REF)
    setToast('')
    setGameOver(null)
    setPendingWeapon(null)
    setCombatOutcome(null)
  }, [])

  const grantRewards = useCallback(
    (rewards: Reward[] = [], message?: string) => {
      if (rewards.length) {
        setPlayer((prev) => {
          let updated = { ...prev }
          rewards.forEach((reward) => {
            if (reward.type === 'weapon') {
              setPendingWeapon(WEAPONS[reward.weaponId])
            } else {
              updated = applyReward(updated, reward)
            }
          })
          if (updated.hp <= 0) {
            setGameOver('You collapse before finishing the mission.')
            updated = { ...updated, hp: 0 }
          }
          return updated
        })
      }
      const toastMessage = message ?? (rewards.length ? 'Rewards updated' : undefined)
      if (toastMessage) {
        setToast(toastMessage)
        window.setTimeout(() => setToast(''), 2500)
      }
    },
    [],
  )

  const resolveChoice = useCallback(
    (choice: NarrativeChoice) => {
      if (gameOver) return
      const requirementStatus = getRequirementStatus(player, choice.requirement)
      if (requirementStatus && !requirementStatus.met) {
        return
      }
      const bundledRewards: Reward[] = []
      if (choice.effects?.length) {
        bundledRewards.push(...choice.effects)
      }
      let message: string | undefined
      if (choice.risk) {
        const result = rollRiskOutcome(choice.risk, player)
        if (result.outcome.effects?.length) {
          bundledRewards.push(...result.outcome.effects)
        }
        message = result.outcome.detail ?? 'Outcome resolved.'
      }
      grantRewards(bundledRewards, message)
      travelTo(choice.next)
    },
    [gameOver, grantRewards, player, travelTo],
  )

  const resolveCombatApproach = useCallback(
    (approach: CombatApproach) => {
      if (gameOver || currentScene?.type !== 'combat') return
      const requirementStatus = getRequirementStatus(player, approach.requirement)
      if (requirementStatus && !requirementStatus.met) {
        return
      }
      const result = rollRiskOutcome(approach.risk, player)
      if (result.outcome.effects?.length) {
        grantRewards(result.outcome.effects, result.outcome.detail ?? 'Combat resolved.')
      } else {
        grantRewards([], result.outcome.detail ?? 'Combat resolved.')
      }
      setCombatOutcome({
        sceneId: currentScene.id,
        approachId: approach.id,
        outcome: result.outcome,
        breakdown: result.breakdown,
        modifiers: result.modifiers,
        rollPercent: result.rollPercent,
      })
    },
    [currentScene, gameOver, grantRewards, player],
  )

  const handleWeaponDecision = useCallback(
    (equip: boolean) => {
      if (!pendingWeapon) return
      if (equip) {
        setPlayer((prev) => ({ ...prev, weapon: pendingWeapon }))
        setToast(`${pendingWeapon.name} equipped.`)
      } else {
        setPlayer((prev) => ({ ...prev, gold: prev.gold + 30 }))
        setToast('Weapon sold for 30 gold.')
      }
      window.setTimeout(() => setToast(''), 2500)
      setPendingWeapon(null)
    },
    [pendingWeapon],
  )

  const continueAfterCombat = useCallback(() => {
    if (gameOver) return
    if (currentScene?.type !== 'combat' || !combatOutcome || combatOutcome.sceneId !== currentScene.id) return
    if (!currentScene.nextOnVictory) return
    travelTo(currentScene.nextOnVictory)
  }, [combatOutcome, currentScene, gameOver, travelTo])

  const actTimeline = useMemo(() => {
    return CAMPAIGN.map((act) => ({
      id: act.id,
      title: act.title,
      active: act.id === currentRef.actId,
    }))
  }, [currentRef.actId])

  const renderRiskInfo = (risk: ChoiceRisk) => {
    const { breakdown, activeModifiers } = getRiskPreview(risk, player)
    return (
      <div className="chance-note">
        {risk.description && <span>{risk.description}</span>}
        <div>
          {breakdown.map((entry) => (
            <div key={entry.id}>
              {entry.label}: {entry.percent}%
            </div>
          ))}
        </div>
        {activeModifiers.length > 0 && (
          <div className="modifier-note">
            Boosts: {activeModifiers.map((mod) => mod.description).join(' · ')}
          </div>
        )}
      </div>
    )
  }

  const ChoiceButton = ({ label, detail, requirementStatus, risk, disabled, onClick }: ChoiceButtonProps) => (
    <button type="button" className="choice-card" onClick={onClick} disabled={disabled}>
      <strong>{label}</strong>
      {detail && <span>{detail}</span>}
      {requirementStatus && <span>{requirementStatus.label}</span>}
      {risk && renderRiskInfo(risk)}
    </button>
  )

  return (
    <div className="panel arcane-panel">
      <header className="arcane-hero">
        <div>
          <p className="eyebrow">Arcane Odyssey</p>
          <h1>🔥 Two-act simple adventure</h1>
          <p>
            Guide {playerName} through a clear two-act mission. Each choice shows the requirements, odds, and how items or XP can tilt the results.
          </p>
        </div>
        <div className="arcane-meta">
          <span className="status-chip">HP {player.hp}/{player.maxHp}</span>
          <span className="status-chip">Mana {player.mana}/{player.maxMana}</span>
          <span className="status-chip">XP {player.xp}</span>
          <span className="status-chip">Gold {player.gold}</span>
        </div>
      </header>

      <section className="arcane-stats">
        <div>
          <h3>Weapon</h3>
          <p>{player.weapon.name}</p>
          <small>{player.weapon.description}</small>
        </div>
        <div>
          <h3>Spells</h3>
          <ul>
            {player.spells.map((spell) => (
              <li key={spell.id}>
                {spell.name} (cost {spell.cost})
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>
            Inventory ({player.inventory.length}/{player.inventorySlots})
          </h3>
          <ul>
            {player.inventory.map((item, index) => (
              <li key={`${item.id}-${index}`}>{item.name}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="arcane-acts">
        {actTimeline.map((act) => (
          <div key={act.id} className={`act-pill${act.active ? ' active' : ''}`}>
            {act.title}
          </div>
        ))}
      </section>

      {gameOver && (
        <div className="arcane-toast danger">
          {gameOver}
          <button type="button" onClick={resetRun}>
            Restart run
          </button>
        </div>
      )}

      {toast && !gameOver && <div className="arcane-toast success">{toast}</div>}

      <section className="arcane-scene">
        <header>
          <p className="eyebrow">{currentAct.title}</p>
          <h2>{currentScene.title}</h2>
        </header>
        {currentScene.body?.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}

        {currentScene.type === 'story' && (
          <div className="choice-grid">
            {currentScene.choices.map((choice) => {
              const requirementStatus = getRequirementStatus(player, choice.requirement)
              const disabled = !!gameOver || (requirementStatus && !requirementStatus.met)
              return (
                <ChoiceButton
                  key={choice.id}
                  label={choice.label}
                  detail={choice.detail}
                  requirementStatus={requirementStatus}
                  risk={choice.risk}
                  disabled={disabled}
                  onClick={() => resolveChoice(choice)}
                />
              )
            })}
          </div>
        )}

        {currentScene.type === 'combat' && (
          <div>
            <div className="choice-grid">
              {currentScene.approaches.map((approach) => {
                const requirementStatus = getRequirementStatus(player, approach.requirement)
                const disabled =
                  !!gameOver || !!combatOutcome || (requirementStatus && !requirementStatus.met)
                return (
                  <ChoiceButton
                    key={approach.id}
                    label={approach.label}
                    detail={approach.detail}
                    requirementStatus={requirementStatus}
                    risk={approach.risk}
                    disabled={disabled}
                    onClick={() => resolveCombatApproach(approach)}
                  />
                )
              })}
            </div>
            {combatOutcome && combatOutcome.sceneId === currentScene.id && (
              <div className="combat-outcome-card success">
                <div>
                  <h3>{currentScene.title} result</h3>
                  <p>{combatOutcome.outcome.label}</p>
                  <p>{combatOutcome.outcome.detail ?? 'Plan resolved.'}</p>
                  <p>
                    Roll {Math.round(combatOutcome.rollPercent * 100)}% · Chart:
                    {combatOutcome.breakdown.map((entry) => (
                      <span key={entry.id}> {entry.label} {entry.percent}%</span>
                    ))}
                  </p>
                  {combatOutcome.modifiers.length > 0 && (
                    <p>
                      Boosts used: {combatOutcome.modifiers.map((mod) => mod.description).join(' · ')}
                    </p>
                  )}
                </div>
                {!gameOver && (
                  <button type="button" className="action primary" onClick={continueAfterCombat}>
                    Continue
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      <footer className="arcane-footer">
        <button type="button" className="action" onClick={resetRun}>
          Reset run
        </button>
        <button type="button" className="action" onClick={onResetPlayer}>
          Change name
        </button>
        {onSwitchProject && (
          <button type="button" className="action" onClick={onSwitchProject}>
            Switch project
          </button>
        )}
      </footer>

      {pendingWeapon && (
        <div className="weapon-offer">
          <div>
            <h3>New weapon found: {pendingWeapon.name}</h3>
            <p>{pendingWeapon.description}</p>
            <div className="offer-actions">
              <button type="button" className="action primary" onClick={() => handleWeaponDecision(true)}>
                Equip
              </button>
              <button type="button" className="action" onClick={() => handleWeaponDecision(false)}>
                Keep current (+30g)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
