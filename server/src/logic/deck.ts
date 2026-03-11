import type { CardModel, Suit } from './types.js';
import { Rank } from './types.js';

export class Deck {
    private cards: CardModel[] = [];

    constructor() {
        this.reset();
    }

    reset() {
        this.cards = [];
        const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
        const ranks = [
            Rank.Two, Rank.Three, Rank.Four, Rank.Five, Rank.Six,
            Rank.Seven, Rank.Eight, Rank.Nine, Rank.Ten,
            Rank.Jack, Rank.Queen, Rank.King, Rank.Ace
        ];

        for (const suit of suits) {
            for (const rank of ranks) {
                this.cards.push({ suit, rank });
            }
        }
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    deal(): CardModel {
        const card = this.cards.pop();
        if (!card) throw new Error('No cards left in deck');
        return card;
    }

    get remaining() {
        return this.cards.length;
    }
}
