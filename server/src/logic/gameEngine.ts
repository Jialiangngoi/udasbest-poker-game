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
    timeLimitMs: number = 15000;
    private bank: Map<string, number> = new Map();
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

    sitDown(index: number, name: string, avatarUrl?: string, ownerId?: string) {
        if (this.players[index].isSeated) return;

        // Enforce one seat per ownerId if provided
        if (ownerId && this.players.some(p => p.ownerId === ownerId)) {
            console.log("Device already has a seat.");
            return;
        }

        this.players[index].isSeated = true;
        this.players[index].name = name;

        // Recover from bank or give initial chips
        if (ownerId && this.bank.has(ownerId)) {
            this.players[index].chips = this.bank.get(ownerId)!;
            this.message = `Welcome back, ${name}! Your chips have been restored.`;
        } else {
            this.players[index].chips = 10000000; // 10M
            if (ownerId) this.bank.set(ownerId, 10000000);
        }

        this.players[index].title = TITLES[0];
        this.players[index].titleIndex = 0;
        this.players[index].avatarUrl = avatarUrl;
        this.players[index].ownerId = ownerId;

        const seated = this.players.filter(p => p.isSeated);
        if (seated.length >= 2) {
            // Only start if we aren't already in a hand
            if (this.communityCards.length === 0 && this.players.every(p => p.hand.length === 0)) {
                this.startNewHand();
            } else {
                this.message = `${name} joined! They'll play in the next hand.`;
            }
        } else {
            this.message = `Waiting for another player to join...`;
        }
    }

    standUp(index: number, ownerId: string) {
        const player = this.players[index];
        if (!player.isSeated || player.ownerId !== ownerId) return;

        // Save chips to bank before clearing
        if (player.ownerId) {
            this.bank.set(player.ownerId, player.chips);
        }

        // Clear player data
        player.isSeated = false;
        player.name = "";
        player.chips = 0;
        player.hand = [];
        player.isFolded = true;
        player.ownerId = undefined;
        player.avatarUrl = undefined;

        // Check if game can continue
        const seated = this.players.filter(p => p.isSeated);
        if (seated.length < 2) {
            this.message = "Waiting for more players...";
        }
    }

    refreshPlayer(index: number) {
        const p = this.players[index];
        if (!p.isSeated || p.chips > 0) return;

        p.titleIndex = Math.min(p.titleIndex + 1, TITLES.length - 1);
        p.title = TITLES[p.titleIndex];
        p.chips = 10000000;
        if (p.ownerId) this.bank.set(p.ownerId, p.chips);
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
        const seatedCount = this.players.filter(p => p.isSeated && p.chips > 0).length;
        if (seatedCount < 2) {
            this.message = 'Waiting for at least 2 players to join...';
            // Clear cards if any
            this.communityCards = [];
            this.players.forEach(p => p.hand = []);
            return;
        }

        this.deck.reset();
        this.deck.shuffle();
        this.communityCards = [];
        this.pot = 0;
        this.phase = GamePhase.PreFlop;
        this.lastRaise = this.minBet;
        this.isPeeking = false;

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
        this.message = `New hand started. ${this.players[this.currentPlayerIndex].name}'s turn.`;
    }

    private collectBlinds() {
        const activeIndices = this.players
            .map((p, i) => ({ seated: p.isSeated && p.chips > 0, index: i }))
            .filter(x => x.seated)
            .map(x => x.index);

        if (activeIndices.length < 2) return;

        const sbIdx = activeIndices[0];
        const bbIdx = activeIndices[1];
        const sb = this.minBet / 2;
        const bb = this.minBet;

        this.players[sbIdx].chips -= sb;
        this.players[sbIdx].currentBet = sb;
        this.players[bbIdx].chips -= bb;
        this.players[bbIdx].currentBet = bb;

        this.pot = sb + bb;

        let nextIdx = (activeIndices.length > 2) ? activeIndices[2] : activeIndices[0];
        this.currentPlayerIndex = nextIdx;
        this.resetTimer();
    }

    call() {
        const p = this.players[this.currentPlayerIndex];
        const maxBet = Math.max(...this.players.map(pl => pl.currentBet));
        let callAmount = maxBet - p.currentBet;

        if (callAmount > p.chips) callAmount = p.chips;

        p.chips -= callAmount;
        p.currentBet += callAmount;
        this.pot += callAmount;
        p.hasActed = true;

        this.nextTurn();
    }

    raise(amount: number) {
        const p = this.players[this.currentPlayerIndex];
        let raiseAmount = amount - p.currentBet;

        if (raiseAmount > p.chips) raiseAmount = p.chips;

        p.chips -= raiseAmount;
        p.currentBet += raiseAmount;
        this.pot += raiseAmount;
        this.lastRaise = amount;

        for (const pl of this.players) {
            if (pl.isSeated && pl.id !== p.id && !pl.isFolded) pl.hasActed = false;
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
            !p.isSeated || p.isFolded || (p.hasActed && p.currentBet === maxBet) || (p.chips === 0 && p.hasActed)
        );

        if (roundOver) {
            this.nextPhase();
        } else {
            let next = (this.currentPlayerIndex + 1) % this.players.length;
            while (!this.players[next].isSeated || this.players[next].isFolded || (this.players[next].chips === 0 && this.players[next].hasActed)) {
                next = (next + 1) % this.players.length;
            }
            this.currentPlayerIndex = next;
            this.resetTimer();
            this.message = `Pass device to ${this.players[this.currentPlayerIndex].name}`;
        }
    }

    private isHandLocked(): boolean {
        const activeInHand = this.players.filter(p => p.isSeated && !p.isFolded);
        const canStillBet = activeInHand.filter(p => p.chips > 0);

        // If 0 or 1 player can still bet, and everyone is matched up or all-in, it's locked
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

        // If locked, automatically trigger next phase
        if (this.isHandLocked()) {
            this.message = `All-in! Fast-forwarding to showdown...`;
            this.nextPhase();
            return;
        }

        let next = 0;
        // Find first player to act who isn't all-in
        const activePlayers = this.players.filter(p => p.isSeated && !p.isFolded);
        const bettors = activePlayers.filter(p => p.chips > 0);

        if (bettors.length === 0 && activePlayers.length >= 2) {
            // Everyone is all-in, just go to showdown
            this.showdown();
            return;
        }

        while (!this.players[next].isSeated || this.players[next].isFolded || (this.players[next].chips === 0 && activePlayers.length > 0)) {
            next = (next + 1) % this.players.length;
            // Safety break
            if (next === 0 && (!this.players[0].isSeated || this.players[0].isFolded || this.players[0].chips === 0)) {
                break;
            }
        }
        this.currentPlayerIndex = next;
        this.resetTimer();
        this.message = `${this.phase} phase. ${this.players[this.currentPlayerIndex].name}'s turn.`;
    }

    private showdown() {
        this.phase = GamePhase.Showdown;
        const active = this.players.filter(p => !p.isFolded && p.isSeated);
        if (active.length === 0) {
            this.message = "No winners - everyone is gone!";
            return;
        }

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
                // Update bank for winner
                if (w.player.ownerId) this.bank.set(w.player.ownerId, w.player.chips);
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
        // Update bank for winner
        if (winner.ownerId) this.bank.set(winner.ownerId, winner.chips);
        this.pot = 0;
        this.phase = GamePhase.Showdown;
    }

    getCurrentHandResult(playerIndex: number): HandResult | null {
        const p = this.players[playerIndex];
        if (!p.isSeated || p.isFolded || p.hand.length === 0) return null;
        return HandEvaluator.evaluate([...p.hand, ...this.communityCards]);
    }

    exportPlayers(): Partial<Player>[] {
        return this.players.map(p => ({
            name: p.name,
            chips: p.chips,
            isSeated: p.isSeated,
            title: p.title,
            titleIndex: p.titleIndex,
            avatarUrl: p.avatarUrl
        }));
    }

    importPlayers(savedData: Partial<Player>[]) {
        savedData.forEach((data, i) => {
            if (i < this.players.length) {
                this.players[i] = { ...this.players[i], ...data };
            }
        });

        const seated = this.players.filter(p => p.isSeated);
        if (seated.length >= 2 && this.phase === GamePhase.PreFlop && this.players.every(p => p.hand.length === 0)) {
            this.startNewHand();
        }
    }

    getHandRankLabel(rank: number): string {
        const labels = ['High Card', 'Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush', 'Royal Flush'];
        return labels[rank] || 'Unknown';
    }

    getBankBalance(ownerId: string): number {
        return this.bank.get(ownerId) || 0;
    }
}
