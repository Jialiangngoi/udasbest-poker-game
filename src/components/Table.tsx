import React from 'react';
import type { CardModel, GamePhaseValue as GamePhaseType, Player } from '../logic/types';
import Card from './Card';
import PlayerSeat from './PlayerSeat';
import { GamePhase } from '../logic/types';

interface TableProps {
    players: Player[];
    communityCards: CardModel[];
    pot: number;
    currentPlayerIndex: number;
    isPeeking: boolean;
    phase: GamePhaseType;
    onSitDown: (index: number) => void;
    onRefresh: (index: number) => void;
    onStandUp: (index: number) => void;
    deviceId: string;
    turnStartTime?: number;
    timeLimitMs?: number;
}

const Table: React.FC<TableProps> = ({
    players,
    communityCards,
    pot,
    currentPlayerIndex,
    isPeeking,
    phase,
    onSitDown,
    onRefresh,
    onStandUp,
    deviceId,
    turnStartTime,
    timeLimitMs
}) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [scale, setScale] = React.useState(1);

    React.useEffect(() => {
        const updateScale = () => {
            if (containerRef.current) {
                const { width, height } = containerRef.current.getBoundingClientRect();
                // Base dimensions for the table design
                const baseWidth = 1000;
                const baseHeight = 700;
                const scaleW = width / baseWidth;
                const scaleH = height / baseHeight;
                // Leave some margin
                const newScale = Math.min(scaleW, scaleH) * 0.95;
                setScale(Math.max(0.3, Math.min(1.2, newScale)));
            }
        };

        const observer = new ResizeObserver(updateScale);
        if (containerRef.current) observer.observe(containerRef.current);
        window.addEventListener('resize', updateScale);
        updateScale();

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateScale);
        };
    }, []);

    // Using polar coordinates for a better oval feel
    const getPlayerStyle = (index: number) => {
        const angle = (index * (360 / 9) + 90) * (Math.PI / 180);
        const rx = 42; // horizontal radius %
        const ry = 38; // vertical radius %
        const x = 50 + rx * Math.cos(angle);
        const y = 50 + ry * Math.sin(angle);
        return {
            position: 'absolute' as const,
            left: `${x}%`,
            top: `${y}%`,
            transform: 'translate(-50%, -50%)',
        };
    };

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <div style={{
                width: '1000px',
                height: '700px',
                position: 'relative',
                background: 'radial-gradient(circle, #1e4d2b 0%, #112e1a 100%)',
                borderRadius: '200px',
                border: '15px solid #2c1810',
                boxShadow: 'inset 0 0 80px rgba(0,0,0,0.8), 0 20px 50px rgba(0,0,0,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: `scale(${scale})`,
                transition: 'transform 0.2s ease-out',
                flexShrink: 0
            }}>
                {/* Table Inner Felt Border */}
                <div style={{
                    position: 'absolute',
                    inset: 20,
                    border: '2px solid rgba(255,255,255,0.1)',
                    borderRadius: '180px',
                    pointerEvents: 'none'
                }} />

                {/* Community Cards & Pot */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30, zIndex: 1 }}>
                    <div style={{
                        color: '#f1c40f',
                        fontSize: 32,
                        fontWeight: 'bold',
                        textShadow: '0 4px 8px rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10
                    }}>
                        <span>💩 POT:</span>
                        <span>{pot.toLocaleString()}</span>
                    </div>

                    <div style={{ display: 'flex', gap: 12 }}>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Card
                                key={i}
                                card={communityCards[i]}
                                isFaceUp={!!communityCards[i]}
                                width={85}
                            />
                        ))}
                    </div>
                </div>

                {/* Player Seats */}
                {players.map((player, index) => (
                    <div key={player.id} style={getPlayerStyle(index)}>
                        <PlayerSeat
                            player={player}
                            isCurrent={currentPlayerIndex === index && player.isSeated && phase !== GamePhase.Showdown}
                            isPeeking={isPeeking}
                            showCards={phase === GamePhase.Showdown}
                            onSitDown={() => onSitDown(index)}
                            onRefresh={() => onRefresh(index)}
                            onStandUp={() => onStandUp(index)}
                            deviceId={deviceId}
                            turnStartTime={turnStartTime}
                            timeLimitMs={timeLimitMs}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Table;
