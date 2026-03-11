export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

export const SuitSymbols: Record<Suit, string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
};

export const SuitIsRed: Record<Suit, boolean> = {
    hearts: true,
    diamonds: true,
    clubs: false,
    spades: false,
};

export const Rank = {
    Two: 2,
    Three: 3,
    Four: 4,
    Five: 5,
    Six: 6,
    Seven: 7,
    Eight: 8,
    Nine: 9,
    Ten: 10,
    Jack: 11,
    Queen: 12,
    King: 13,
    Ace: 14,
} as const;

export type RankValue = typeof Rank[keyof typeof Rank];

export const RankLabels: Record<number, string> = {
    [Rank.Two]: '2',
    [Rank.Three]: '3',
    [Rank.Four]: '4',
    [Rank.Five]: '5',
    [Rank.Six]: '6',
    [Rank.Seven]: '7',
    [Rank.Eight]: '8',
    [Rank.Nine]: '9',
    [Rank.Ten]: '10',
    [Rank.Jack]: 'J',
    [Rank.Queen]: 'Q',
    [Rank.King]: 'K',
    [Rank.Ace]: 'A',
};

export interface CardModel {
    suit: Suit;
    rank: number;
}

export const GamePhase = {
    PreFlop: 'Pre-Flop',
    Flop: 'Flop',
    Turn: 'Turn',
    River: 'River',
    Showdown: 'Showdown',
} as const;

export type GamePhaseValue = typeof GamePhase[keyof typeof GamePhase];

export interface Player {
    id: number;
    name: string;
    hand: CardModel[];
    chips: number;
    currentBet: number;
    isFolded: boolean;
    hasActed: boolean;
    isSeated: boolean;
    title: string;
    titleIndex: number;
    avatarUrl?: string;
    ownerId?: string;
}

export const TITLES = [
    "Good Player ⭐",
    "Confused Adventurer",
    "Lost NPC",
    "Tutorial Survivor",
    "Poop Player 💩",
    "Certified Disaster",
    "Skill Issue Specialist",
    "Keyboard Smacker",
    "Professional Mistake Maker",
    "Circus Trainee",
    "Grandmaster of Throwing",
    "Legendary Clown 🤡",
    "CEO of Bad Decisions",
    "Enemy Team Sponsor"
];

export const HandRank = {
    HighCard: 0,
    Pair: 1,
    TwoPair: 2,
    ThreeOfAKind: 3,
    Straight: 4,
    Flush: 5,
    FullHouse: 6,
    FourOfAKind: 7,
    StraightFlush: 8,
    RoyalFlush: 9,
} as const;

export type HandRankValue = typeof HandRank[keyof typeof HandRank];

export interface HandResult {
    rank: number;
    tieBreakers: number[];
}
