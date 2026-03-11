import type { CardModel, HandResult } from './types.js';
import { Rank, HandRank } from './types.js';

export class HandEvaluator {
    static evaluate(cards: CardModel[]): HandResult {
        if (cards.length < 5) return { rank: HandRank.HighCard, tieBreakers: [0] };

        const allCombinations = this.getCombinations(cards, 5);
        let bestResult: HandResult = { rank: HandRank.HighCard, tieBreakers: [0] };

        for (const combo of allCombinations) {
            const current = this.evaluateFiveCards(combo);
            if (this.compareResults(current, bestResult) > 0) {
                bestResult = current;
            }
        }

        return bestResult;
    }

    private static compareResults(a: HandResult, b: HandResult): number {
        if (a.rank !== b.rank) return a.rank - b.rank;
        for (let i = 0; i < a.tieBreakers.length; i++) {
            if (a.tieBreakers[i] !== b.tieBreakers[i]) {
                return a.tieBreakers[i] - b.tieBreakers[i];
            }
        }
        return 0;
    }

    private static getCombinations(list: CardModel[], n: number): CardModel[][] {
        const result: CardModel[][] = [];
        const helper = (current: CardModel[], start: number) => {
            if (current.length === n) {
                result.push([...current]);
                return;
            }
            for (let i = start; i < list.length; i++) {
                current.push(list[i]);
                helper(current, i + 1);
                current.pop();
            }
        };
        helper([], 0);
        return result;
    }

    private static evaluateFiveCards(cards: CardModel[]): HandResult {
        const sorted = [...cards].sort((a, b) => b.rank - a.rank);
        const isFlush = sorted.every(c => c.suit === sorted[0].suit);

        let isStraight = true;
        for (let i = 0; i < 4; i++) {
            if (sorted[i].rank !== sorted[i + 1].rank + 1) {
                isStraight = false;
                break;
            }
        }

        // Ace-low straight
        if (!isStraight &&
            sorted[0].rank === Rank.Ace &&
            sorted[1].rank === Rank.Five &&
            sorted[2].rank === Rank.Four &&
            sorted[3].rank === Rank.Three &&
            sorted[4].rank === Rank.Two) {
            return {
                rank: isFlush ? HandRank.StraightFlush : HandRank.Straight,
                tieBreakers: [5, 4, 3, 2, 1]
            };
        }

        if (isStraight && isFlush) {
            if (sorted[0].rank === Rank.Ace) return { rank: HandRank.RoyalFlush, tieBreakers: [] };
            return { rank: HandRank.StraightFlush, tieBreakers: [sorted[0].rank] };
        }

        const counts: Record<number, number> = {};
        for (const c of sorted) {
            counts[c.rank] = (counts[c.rank] || 0) + 1;
        }

        const sortedCounts = Object.entries(counts)
            .map(([rank, count]) => ({ rank: parseInt(rank), count }))
            .sort((a, b) => {
                if (a.count !== b.count) return b.count - a.count;
                return b.rank - a.rank;
            });

        if (sortedCounts[0].count === 4) {
            return { rank: HandRank.FourOfAKind, tieBreakers: [sortedCounts[0].rank, sortedCounts[1].rank] };
        }

        if (sortedCounts[0].count === 3 && sortedCounts[1].count === 2) {
            return { rank: HandRank.FullHouse, tieBreakers: [sortedCounts[0].rank, sortedCounts[1].rank] };
        }

        if (isFlush) return { rank: HandRank.Flush, tieBreakers: sorted.map(c => c.rank) };
        if (isStraight) return { rank: HandRank.Straight, tieBreakers: [sorted[0].rank] };

        if (sortedCounts[0].count === 3) {
            return { rank: HandRank.ThreeOfAKind, tieBreakers: [sortedCounts[0].rank, sortedCounts[1].rank, sortedCounts[2].rank] };
        }

        if (sortedCounts[0].count === 2 && sortedCounts[1].count === 2) {
            return { rank: HandRank.TwoPair, tieBreakers: [sortedCounts[0].rank, sortedCounts[1].rank, sortedCounts[2].rank] };
        }

        if (sortedCounts[0].count === 2) {
            return { rank: HandRank.Pair, tieBreakers: sortedCounts.map(e => e.rank) };
        }

        return { rank: HandRank.HighCard, tieBreakers: sorted.map(c => c.rank) };
    }
}
