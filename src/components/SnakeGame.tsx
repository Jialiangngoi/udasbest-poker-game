import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

interface Point { x: number; y: number; }
interface Snake {
    id: string;
    name: string;
    color: string;
    segments: Point[];
    score: number;
    isDead: boolean;
}
interface Food {
    position: Point;
    value: number;
    color: string;
}
interface SnakeServerState {
    snakes: Snake[];
    food: Food[];
    gridSize: number;
    isGameOver: boolean;
}

interface SnakeGameProps {
    player1Name: string;
    socket: Socket;
    roomId: string;
    onExit: () => void;
}

const SnakeGame: React.FC<SnakeGameProps> = ({ player1Name, socket, roomId, onExit }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [engineState, setEngineState] = useState<SnakeServerState | null>(null);
    const cellSize = 20;

    useEffect(() => {
        socket.emit('snake_action', {
            roomId,
            action: 'add_player',
            payload: { name: player1Name }
        });

        socket.on('snake_state', (state: SnakeServerState) => {
            setEngineState(state);
        });

        return () => {
            socket.off('snake_state');
        };
    }, [socket, roomId, player1Name]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        let direction: Point | null = null;

        // Both WASD and Arrows will send direction for this client's snake
        if (['ArrowUp', 'w', 'W'].includes(e.key)) direction = { x: 0, y: -1 };
        if (['ArrowDown', 's', 'S'].includes(e.key)) direction = { x: 0, y: 1 };
        if (['ArrowLeft', 'a', 'A'].includes(e.key)) direction = { x: -1, y: 0 };
        if (['ArrowRight', 'd', 'D'].includes(e.key)) direction = { x: 1, y: 0 };

        if (direction) {
            if (e.key.startsWith('Arrow')) e.preventDefault();
            socket.emit('snake_action', {
                roomId,
                action: 'change_direction',
                payload: { direction }
            });
        }
    }, [socket, roomId]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !engineState) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Food
        engineState.food.forEach(f => {
            ctx.fillStyle = f.color;
            ctx.beginPath();
            ctx.arc(
                f.position.x * cellSize + cellSize / 2,
                f.position.y * cellSize + cellSize / 2,
                cellSize / 2.5, 0, Math.PI * 2
            );
            ctx.fill();
        });

        // Draw Snakes
        engineState.snakes.forEach(snake => {
            if (snake.isDead) return;

            snake.segments.forEach((segment, index) => {
                ctx.fillStyle = index === 0 ? '#fff' : snake.color;
                ctx.fillRect(segment.x * cellSize + 1, segment.y * cellSize + 1, cellSize - 2, cellSize - 2);
            });

            if (snake.segments.length > 0) {
                ctx.fillStyle = 'white';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(snake.name, snake.segments[0].x * cellSize + cellSize / 2, snake.segments[0].y * cellSize - 5);
            }
        });
    }, [engineState]);

    if (!engineState) {
        return <div style={{ color: 'white', textAlign: 'center', marginTop: 100 }}>Connecting to game...</div>;
    }

    const mySnake = engineState.snakes.find(s => s.id === socket.id);
    const otherSnakes = engineState.snakes.filter(s => s.id !== socket.id);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '40px auto', backgroundColor: '#1a1a1a', padding: 20, borderRadius: 16 }}>
            <h2 style={{ color: '#f1c40f', marginBottom: 10 }}>🐍 MULTIPLAYER POOP SNAKE 🐍</h2>

            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 600, marginBottom: 15, padding: '0 20px', marginTop: 10 }}>
                <div style={{ color: mySnake?.color || '#fff', textAlign: 'left' }}>
                    <strong>{mySnake ? mySnake.name : player1Name} (You)</strong><br />
                    Score: {mySnake?.score || 0} <br />
                    <span style={{ fontSize: 12, opacity: 0.8 }}>
                        {mySnake?.isDead ? '🔥 DEAD - Press Any Key to Respawn' : 'Controls: WASD or Arrows'}
                    </span>
                </div>

                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {otherSnakes.length === 0 ? (
                        <div style={{ color: '#7f8c8d' }}>Waiting for players...</div>
                    ) : (
                        otherSnakes.map(s => (
                            <div key={s.id} style={{ color: s.color }}>
                                <strong>{s.name}</strong> - Score: {s.score} {s.isDead ? ' (DEAD)' : ''}
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div style={{ position: 'relative' }}>
                <canvas
                    ref={canvasRef}
                    width={engineState.gridSize * cellSize}
                    height={engineState.gridSize * cellSize}
                    style={{ border: '4px solid #333', borderRadius: 8, backgroundColor: '#000', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                />
                {(engineState.isGameOver || (mySnake?.isDead && otherSnakes.length === 0)) && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <h3 style={{ fontSize: 32, marginBottom: 20, color: '#e74c3c' }}>GAME OVER</h3>
                        <div style={{ display: 'flex', gap: 15 }}>
                            <button className="btn btn-primary" onClick={() => socket.emit('snake_action', { roomId, action: 'reset', payload: { name: player1Name } })}>PLAY AGAIN</button>
                            <button className="btn btn-secondary" onClick={onExit}>EXIT TO LOBBY</button>
                        </div>
                    </div>
                )}
            </div>
            <button className="btn btn-secondary btn-small" onClick={onExit} style={{ marginTop: 20 }}>Back to Lobby</button>
        </div>
    );
};

export default SnakeGame;
