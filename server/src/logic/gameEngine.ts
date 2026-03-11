import type { CardModel, Player, HandResult, GamePhaseValue as GamePhaseType } from './types.js';
import { Deck } from './deck.js';
import { HandEvaluator } from './handEvaluator.js';
import { GamePhase, TITLES } from './types.js';

export class GameEngine {
    players: Player[];
    communityCards: CardModel[] = [];
    pot: number = 0;
    currentPlayerIndex: number = 0;
    phase: GamePhaseType = GamePhase.PreFlop;
    lastRaise: number = 200000;
    minBet: number = 200000;
    message: string = 'Welcome to Poop Poker! Select a seat to join.';
    isPeeking: boolean = false;
    turnStartTime: number = 0;
    timeLimitMs: number = 25000;
    dealerIndex: number = -1;
    public bank: Map<string, number> = new Map();
    private deck: Deck;

    constructor() {
        this.deck = new Deck();
        this.players = Array.from({ length: 9 }, (_, i) => ({
            id: i,
            name: '',
            hand: [],
            chips: 0,
            currentBet: 0,
            isFolded: false,
            hasActed: false,
            isSeated: false,
            title: TITLES[0],
            titleIndex: 0
        }));
    }

    private syncBank(player: Player) {
        if (player.ownerId) {
            this.bank.set(player.ownerId, player.chips);
        }
    }

    sitDown(index: number, name: string, avatarUrl?: string, ownerId?: string) {
        if (this.players[index].isSeated) return;

        if (ownerId && this.players.some(p => p.ownerId === ownerId)) {
            this.message = "You are already seated elsewhere!";
            return;
        }

        this.players[index].isSeated = true;
        this.players[index].name = name;

        if (ownerId && this.bank.has(ownerId)) {
            this.players[index].chips = this.bank.get(ownerId)!;
        } else {
            this.players[index].chips = 10000000;
            if (ownerId) this.bank.set(ownerId, 10000000);
        }

        this.players[index].title = TITLES[0];
        this.players[index].titleIndex = 0;
        this.players[index].avatarUrl = avatarUrl;
        this.players[index].ownerId = ownerId;

        const seatedCount = this.players.filter(p => p.isSeated && p.chips > 0).length;
        if (seatedCount >= 2) {
            if (this.phase === GamePhase.Showdown || (this.communityCards.length === 0 && this.players.every(p => p.hand.length === 0))) {
                this.startNewHand();
            } else {
                this.message = `${name} joined the table. They will join next hand.`;
            }
        } else {
            this.message = `Waiting for another player to join...`;
        }
    }

    standUp(index: number, ownerId: string) {
        const player = this.players[index];
        if (!player.isSeated || player.ownerId !== ownerId) return;

        this.syncBank(player);

        player.isSeated = false;
        player.name = "";
        player.chips = 0;
        player.hand = [];
        player.isFolded = true;
        player.ownerId = undefined;
        player.avatarUrl = undefined;

        const active = this.players.filter(p => p.isSeated && !p.isFolded);
        if (active.length < 2) {
            this.message = "Not enough players to continue.";
            this.phase = GamePhase.PreFlop;
            this.communityCards = [];
            this.players.forEach(p => p.hand = []);
            this.turnStartTime = 0;
        }
    }

    refreshPlayer(index: number) {
        const p = this.players[index];
        if (!p.isSeated || p.chips > 0) return;

        p.chips = 10000000;
        this.syncBank(p);
        p.isFolded = false;

        const seated = this.players.filter(pt => pt.isSeated && pt.chips > 0);
        if (seated.length >= 2 && this.players.every(pt => pt.hand.length === 0)) {
            this.startNewHand();
        }
    }

    resetTimer() {
        this.turnStartTime = Date.now();
    }

    startNewHand() {
        const seatedActive = this.players.filter(p => p.isSeated && p.chips > 0);
        if (seatedActive.length < 2) {
            this.message = 'Need at least 2 players with chips to start!';
            this.phase = GamePhase.PreFlop;
            this.communityCards = [];
            this.turnStartTime = 0;
            return;
        }

        this.deck.reset();
        this.deck.shuffle();
        this.communityCards = [];
        this.pot = 0;
        this.phase = GamePhase.PreFlop;
        this.lastRaise = this.minBet;
        this.isPeeking = false;

        const seatedIndices = this.players.map((p, i) => p.isSeated && p.chips > 0 ? i : -1).filter(i => i !== -1);
        if (this.dealerIndex === -1) {
            this.dealerIndex = seatedIndices[0];
        } else {
            let nextDealerIdx = seatedIndices.findIndex(i => i > this.dealerIndex);
            if (nextDealerIdx === -1) nextDealerIdx = 0;
            this.dealerIndex = seatedIndices[nextDealerIdx];
        }

        for (const p of this.players) {
            if (p.isSeated && p.chips > 0) {
                p.hand = [this.deck.deal(), this.deck.deal()];
                p.currentBet = 0;
                p.isFolded = false;
                p.hasActed = false;
            } else {
                p.isFolded = true;
                p.hand = [];
            }
        }

        this.collectBlinds();
    }

    private collectBlinds() {
        const seatedIndices = this.players.map((p, i) => p.isSeated && p.chips > 0 ? i : -1).filter(i => i !== -1);
        if (seatedIndices.length < 2) return;

        const sbIdx = seatedIndices.length === 2
            ? this.dealerIndex
            : seatedIndices[(seatedIndices.indexOf(this.dealerIndex) + 1) % seatedIndices.length];

        const bbIdx = seatedIndices[(seatedIndices.indexOf(sbIdx) + 1) % seatedIndices.length];

        const sbAmount = Math.min(this.players[sbIdx].chips, this.minBet / 2);
        const bbAmount = Math.min(this.players[bbIdx].chips, this.minBet);

        this.players[sbIdx].chips -= sbAmount;
        this.players[sbIdx].currentBet = sbAmount;
        this.syncBank(this.players[sbIdx]);

        this.players[bbIdx].chips -= bbAmount;
        this.players[bbIdx].currentBet = bbAmount;
        this.syncBank(this.players[bbIdx]);

        this.pot = sbAmount + bbAmount;

        let firstActorIdx = seatedIndices[(seatedIndices.indexOf(bbIdx) + 1) % seatedIndices.length];
        this.currentPlayerIndex = firstActorIdx;
        this.resetTimer();
        this.message = `Blinds collected. ${this.players[this.currentPlayerIndex].name}'s turn.`;
    }

    call() {
        const p = this.players[this.currentPlayerIndex];
        const maxBet = Math.max(...this.players.map(pl => pl.currentBet));
        const toCall = maxBet - p.currentBet;
        const callAmount = Math.min(toCall, p.chips);

        p.chips -= callAmount;
        p.currentBet += callAmount;
        this.pot += callAmount;
        this.syncBank(p);
        p.hasActed = true;

        this.nextTurn();
    }

    raise(amount: number) {
        const p = this.players[this.currentPlayerIndex];
        const toRaise = amount - p.currentBet;
        const raiseAmount = Math.min(toRaise, p.chips);

        p.chips -= raiseAmount;
        p.currentBet += raiseAmount;
        this.pot += raiseAmount;
        this.lastRaise = amount;
        this.syncBank(p);

        for (const pl of this.players) {
            if (pl.isSeated && pl.id !== p.id && !pl.isFolded && pl.chips > 0) pl.hasActed = false;
        }
        p.hasActed = true;

        this.nextTurn();
    }

    fold() {
        const p = this.players[this.currentPlayerIndex];
        p.isFolded = true;
        p.hasActed = true;

        const active = this.players.filter(pl => !pl.isFolded && pl.isSeated);
        if (active.length === 1) {
            this.endHand(active[0]);
            return;
        }

        this.nextTurn();
    }

    private nextTurn() {
        this.isPeeking = false;

        if (this.isHandLocked()) {
            this.nextPhase();
            return;
        }

        const maxBet = Math.max(...this.players.map(p => p.currentBet));
        const roundOver = this.players.every(p =>
            !p.isSeated || p.isFolded || (p.hasActed && p.currentBet === maxBet) || (p.chips === 0)
        );

        if (roundOver) {
            this.nextPhase();
        } else {
            let next = (this.currentPlayerIndex + 1) % this.players.length;
            while (!this.players[next].isSeated || this.players[next].isFolded || this.players[next].chips === 0) {
                next = (next + 1) % this.players.length;
            }
            this.currentPlayerIndex = next;
            this.resetTimer();
            this.message = `Turn: ${this.players[this.currentPlayerIndex].name}`;
        }
    }

    private isHandLocked(): boolean {
        const activeInHand = this.players.filter(p => p.isSeated && !p.isFolded);
        const canStillBet = activeInHand.filter(p => p.chips > 0);
        if (canStillBet.length <= 1) {
            const maxBet = Math.max(...this.players.map(p => p.currentBet));
            return activeInHand.every(p => p.currentBet === maxBet || p.chips === 0);
        }
        return false;
    }

    private nextPhase() {
        for (const p of this.players) {
            p.hasActed = false;
            p.currentBet = 0;
        }

        switch (this.phase) {
            case GamePhase.PreFlop:
                this.phase = GamePhase.Flop;
                this.communityCards.push(this.deck.deal(), this.deck.deal(), this.deck.deal());
                break;
            case GamePhase.Flop:
                this.phase = GamePhase.Turn;
                this.communityCards.push(this.deck.deal());
                break;
            case GamePhase.Turn:
                this.phase = GamePhase.River;
                this.communityCards.push(this.deck.deal());
                break;
            case GamePhase.River:
                this.showdown();
                return;
            case GamePhase.Showdown:
                this.startNewHand();
                return;
        }

        if (this.isHandLocked()) {
            this.message = `All-in! Fast-forwarding...`;
            this.nextPhase();
            return;
        }

        let next = (this.dealerIndex + 1) % this.players.length;
        while (!this.players[next].isSeated || this.players[next].isFolded || this.players[next].chips === 0) {
            next = (next + 1) % this.players.length;
        }
        this.currentPlayerIndex = next;
        this.resetTimer();
        this.message = `${this.phase} phase. ${this.players[this.currentPlayerIndex].name}'s turn.`;
    }

    private showdown() {
        this.phase = GamePhase.Showdown;
        this.turnStartTime = 0;
        const active = this.players.filter(p => !p.isFolded && p.isSeated);
        if (active.length === 0) return;

        const results = active.map(p => ({
            player: p,
            result: HandEvaluator.evaluate([...p.hand, ...this.communityCards])
        }));

        results.sort((a, b) => this.compareHandResults(b.result, a.result));
        const best = results[0].result;
        const winners = results.filter(r => this.compareHandResults(r.result, best) === 0);

        if (winners.length === 1) {
            const w = winners[0].player;
            this.message = `${w.name} wins with ${this.getHandRankLabel(best.rank)}!`;
            this.endHand(w);
        } else {
            const names = winners.map(w => w.player.name).join(', ');
            this.message = `Tie between: ${names}`;
            const share = Math.floor(this.pot / winners.length);
            for (const w of winners) {
                w.player.chips += share;
                this.syncBank(w.player);
            }
            this.pot = 0;
        }
    }

    private compareHandResults(a: HandResult, b: HandResult): number {
        if (a.rank !== b.rank) return a.rank - b.rank;
        for (let i = 0; i < a.tieBreakers.length; i++) {
            if (a.tieBreakers[i] !== b.tieBreakers[i]) return a.tieBreakers[i] - b.tieBreakers[i];
        }
        return 0;
    }

    private endHand(winner: Player) {
        winner.chips += this.pot;
        this.syncBank(winner);
        this.pot = 0;
        this.phase = GamePhase.Showdown;
        this.turnStartTime = 0;
    }

    exportBank(): Record<string, number> {
        const out: Record<string, number> = {};
        this.bank.forEach((val, key) => out[key] = val);
        return out;
    }

    getHandRankLabel(rank: number): string {
        const labels = ['High Card', 'Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush', 'Royal Flush'];
        return labels[rank] || 'Unknown';
    }
}
