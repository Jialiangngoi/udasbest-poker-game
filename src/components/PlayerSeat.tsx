import React from 'react';
import type { Player } from '../logic/types';
import Card from './Card';

interface PlayerSeatProps {
    player: Player;
    isCurrent: boolean;
    isPeeking: boolean;
    showCards?: boolean;
    onSitDown?: () => void;
    onRefresh?: () => void;
    onStandUp?: () => void;
    deviceId?: string;
    turnStartTime?: number;
    timeLimitMs?: number;
}

const PlayerSeat: React.FC<PlayerSeatProps> = ({
    player,
    isCurrent,
    isPeeking,
    showCards = false,
    onSitDown,
    onRefresh,
    onStandUp,
    deviceId,
    turnStartTime,
    timeLimitMs
}) => {
    if (!player.isSeated) {
        return (
            <button
                onClick={onSitDown}
                style={{
                    width: 100,
                    height: 100,
                    borderRadius: '50%',
                    border: '2px dashed rgba(255,255,255,0.3)',
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    color: 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    fontSize: 12,
                    fontWeight: 'bold',
                    transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.2)')}
            >
                <span>EMPTY</span>
                <span style={{ fontSize: 18 }}>+</span>
            </button>
        );
    }

    const isBankrupt = player.chips <= 0;
    const circleRef = React.useRef<SVGCircleElement>(null);

    React.useEffect(() => {
        if (!isCurrent || !turnStartTime || !timeLimitMs) return;

        let animationFrameId: number;

        const updateTimer = () => {
            const now = Date.now();
            const elapsed = now - turnStartTime;
            let progress = 1 - (elapsed / timeLimitMs);
            if (progress < 0) progress = 0;

            if (circleRef.current) {
                // Circumference of r=28 is 2 * PI * 28 = 175.93
                const circumference = 175.93;
                circleRef.current.style.strokeDashoffset = `${circumference * (1 - progress)}`;

                // Change color based on time left
                if (progress > 0.5) {
                    circleRef.current.style.stroke = '#2ecc71'; // Green
                } else if (progress > 0.25) {
                    circleRef.current.style.stroke = '#f1c40f'; // Yellow
                } else {
                    circleRef.current.style.stroke = '#e74c3c'; // Red
                    // Optional quick pulse when low
                    if (progress * timeLimitMs % 500 < 250) {
                        circleRef.current.style.stroke = '#c0392b';
                    }
                }
            }

            if (progress > 0) {
                animationFrameId = requestAnimationFrame(updateTimer);
            }
        };

        animationFrameId = requestAnimationFrame(updateTimer);

        return () => cancelAnimationFrame(animationFrameId);
    }, [isCurrent, turnStartTime, timeLimitMs]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            opacity: (player.isFolded && !isCurrent) ? 0.5 : 1,
            transition: 'all 0.3s ease',
            position: 'relative'
        }}>
            <div style={{
                backgroundColor: player.isFolded ? '#34495e' : (isCurrent ? '#27ae60' : '#2c3e50'),
                color: 'white',
                padding: '8px 16px',
                borderRadius: 12,
                fontWeight: 'bold',
                fontSize: 14,
                border: isCurrent ? '2px solid #2ecc71' : '1px solid transparent',
                boxShadow: isCurrent ? '0 0 20px rgba(46, 204, 113, 0.6)' : '0 4px 10px rgba(0,0,0,0.3)',
                textAlign: 'center',
                minWidth: 120,
                zIndex: 2,
                position: 'relative'
            }}>
                {isCurrent && !player.isFolded && (
                    <div style={{
                        position: 'absolute',
                        top: -25,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: '#f1c40f',
                        color: '#000',
                        fontSize: 10,
                        padding: '2px 10px',
                        borderRadius: 4,
                        whiteSpace: 'nowrap',
                        fontWeight: 'black',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
                        animation: 'pulse 1s infinite'
                    }}>
                        YOUR TURN
                    </div>
                )}
                <div style={{ position: 'relative', width: 60, height: 60, marginBottom: 8, margin: '0 auto' }}>
                    {isCurrent && turnStartTime && timeLimitMs && (
                        <svg width="60" height="60" style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
                            <circle cx="30" cy="30" r="28" fill="transparent" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
                            <circle
                                ref={circleRef}
                                cx="30" cy="30" r="28"
                                fill="transparent"
                                stroke="#2ecc71"
                                strokeWidth="4"
                                strokeDasharray="175.93"
                                strokeDashoffset="0"
                                style={{ transition: 'stroke 0.3s' }}
                            />
                        </svg>
                    )}
                    {player.avatarUrl ? (
                        <img
                            src={player.avatarUrl}
                            alt={player.name}
                            style={{
                                width: 50,
                                height: 50,
                                borderRadius: '50%',
                                objectFit: 'cover',
                                position: 'absolute',
                                top: 5,
                                left: 5,
                                boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
                            }}
                        />
                    ) : (
                        <div style={{
                            width: 50, height: 50, borderRadius: '50%', backgroundColor: '#1a1a1a',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 30, position: 'absolute', top: 5, left: 5,
                            boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
                        }}>👤</div>
                    )}
                </div>
                <div style={{ fontSize: 10, color: '#f1c40f', marginBottom: 2 }}>{player.title}</div>
                <div>{player.name}</div>
                <div style={{
                    fontSize: 13,
                    color: '#bdc3c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4
                }}>
                    <span>💩</span>
                    {player.chips.toLocaleString()}
                </div>

                {player.ownerId === deviceId && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onStandUp?.(); }}
                        className="btn-standup"
                        style={{
                            marginTop: 8,
                            backgroundColor: 'rgba(192, 57, 43, 0.2)',
                            color: '#e74c3c',
                            border: '1px solid #e74c3c',
                            borderRadius: 4,
                            padding: '2px 8px',
                            fontSize: 10,
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        STAND UP
                    </button>
                )}
            </div>

            {!isBankrupt && (
                <div style={{ display: 'flex', gap: 4 }}>
                    {player.hand.map((card, i) => (
                        <Card
                            key={i}
                            card={card}
                            isFaceUp={showCards || (isCurrent && isPeeking)}
                            width={45}
                        />
                    ))}
                </div>
            )}

            {isBankrupt && (
                <button
                    onClick={onRefresh}
                    style={{
                        backgroundColor: '#e67e22',
                        color: 'white',
                        border: 'none',
                        padding: '4px 12px',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 'bold',
                        marginTop: 4
                    }}
                >
                    REFRESH 💩
                </button>
            )}

            {player.currentBet > 0 && !player.isFolded && (
                <div style={{
                    color: '#f1c40f',
                    fontSize: 12,
                    fontWeight: 'bold',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    padding: '2px 10px',
                    borderRadius: 20,
                    border: '1px solid #f1c40f',
                    marginTop: 4
                }}>
                    💩 {player.currentBet.toLocaleString()}
                </div>
            )}

            {player.isFolded && !isBankrupt && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%) rotate(-15deg)',
                    color: '#e74c3c',
                    fontSize: 24,
                    fontWeight: 'black',
                    textShadow: '0 0 10px rgba(0,0,0,0.8)',
                    pointerEvents: 'none',
                    zIndex: 10
                }}>
                    FOLDED
                </div>
            )}
        </div>
    );
};

export default PlayerSeat;
