
const PORT = process.env.PORT || 3001;

// Simple in-memory storage for rooms
interface Room {
    id: string;
    gameType: 'poker' | 'snake';
    pokerEngine?: GameEngine;
    snakeEngine?: SnakeEngine;
    players: Set<string>; // socket IDs
    hostId: string;
}

const rooms = new Map<string, Room>();

const generateRoomId = () => Math.random().toString(36).substring(2, 6).toUpperCase();

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('create_room', (data, callback) => {
        const { gameType } = data;
        const roomId = generateRoomId();

        const newRoom: Room = {
            id: roomId,
            gameType: gameType,
            players: new Set(),
            hostId: socket.id
        };

        if (gameType === 'poker') {
            newRoom.pokerEngine = new GameEngine();
        } else {
            newRoom.snakeEngine = new SnakeEngine();
        }

        rooms.set(roomId, newRoom);
        callback({ success: true, roomId });
    });

    socket.on('join_global_room', (data, callback) => {
        const { gameType, roomId } = data;
        console.log(`User ${socket.id} joining global room: ${roomId} for ${gameType}`);
        let room = rooms.get(roomId);

        // Auto-create global rooms if they are empty or don't exist yet
        if (!room) {
            room = {
                id: roomId,
                gameType: gameType,
                players: new Set(),
                hostId: socket.id
            };
            if (gameType === 'poker') room.pokerEngine = new GameEngine();
            else room.snakeEngine = new SnakeEngine();

            rooms.set(roomId, room);
        }

        socket.join(roomId);
        room.players.add(socket.id);

        callback({ success: true, gameType: room.gameType });
        broadcastRoomState(roomId);
    });

    socket.on('join_room', (data, callback) => {
        const { roomId } = data;
        const room = rooms.get(roomId);

        if (!room) {
            callback({ success: false, message: 'Room not found' });
            return;
        }

        socket.join(roomId);
        room.players.add(socket.id);

        callback({ success: true, gameType: room.gameType });

        // Broadcast state to the room
        broadcastRoomState(roomId);
    });

    socket.on('poker_action', (data) => {
        const { roomId, action, payload } = data;
        console.log(`Poker Action: ${action} from ${socket.id} in room ${roomId}`);
        const room = rooms.get(roomId);
        if (!room || room.gameType !== 'poker' || !room.pokerEngine) {
            console.log(`Room ${roomId} not found or not poker! Rooms available:`, Array.from(rooms.keys()));
            return;
        }

        const engine = room.pokerEngine;

        switch (action) {
            case 'sit_down':
                engine.sitDown(payload.index, payload.name, payload.avatarUrl, socket.id);
                break;
            case 'stand_up':
                engine.standUp(payload.index, socket.id);
                break;
            case 'refresh_player':
                engine.refreshPlayer(payload.index);
                break;
            case 'start_hand':
                engine.startNewHand();
                break;
            case 'call':
                engine.call();
                break;
            case 'raise':
                engine.raise(payload.amount);
                break;
            case 'fold':
                engine.fold();
                break;
            case 'peek':
                // Peeking shouldn't be broadcasted, it's local UI state usually, 
                // but if they want to peek, we can send a private event if needed.
                // For now, let's ignore peek on server and keep it local.
                break;
        }

        broadcastRoomState(roomId);
    });

    socket.on('snake_action', (data) => {
        const { roomId, action, payload } = data;
        const room = rooms.get(roomId);
        if (!room || room.gameType !== 'snake' || !room.snakeEngine) return;

        const engine = room.snakeEngine;

        if (action === 'add_player') {
            engine.addPlayer(socket.id, payload.name);
        } else if (action === 'change_direction') {
            engine.changeDirection(socket.id, payload.direction);
        } else if (action === 'reset') {
            engine.reset();
            engine.addPlayer(socket.id, payload.name || 'Host');
        }

        // Snake engine ticks are handled via a server loop, but we can broadcast immediate state
        // For snake, we should probably run the loop ON THE SERVER and broadcast it.
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);

        // Remove from rooms
        for (const [roomId, room] of rooms.entries()) {
            if (room.players.has(socket.id)) {
                room.players.delete(socket.id);

                if (room.gameType === 'poker' && room.pokerEngine) {
                    // Could auto-stand them up or mark disconnected
                    const seatIndex = room.pokerEngine.players.findIndex(p => p.ownerId === socket.id);
                    if (seatIndex !== -1) {
                        room.pokerEngine.standUp(seatIndex, socket.id);
                    }
                } else if (room.gameType === 'snake' && room.snakeEngine) {
                    // Mark snake dead or remove
                    const s = room.snakeEngine.snakes.find(s => s.id === socket.id);
                    if (s) s.isDead = true;
                }

                if (room.players.size === 0) {
                    rooms.delete(roomId); // Clean up empty rooms
                } else {
                    broadcastRoomState(roomId);
                }
            }
        }
    });
});

// Server-side loop for Snake games
setInterval(() => {
    for (const [roomId, room] of rooms.entries()) {
        if (room.gameType === 'snake' && room.snakeEngine) {
            room.snakeEngine.update();
            io.to(roomId).emit('snake_state', room.snakeEngine);
        }
    }
}, 120);

// Server-side loop for Poker timer auto-folding
setInterval(() => {
    for (const [roomId, room] of rooms.entries()) {
        if (room.gameType === 'poker' && room.pokerEngine) {
            const engine = room.pokerEngine;
            if (engine.phase === 'Showdown' || engine.turnStartTime === 0) continue;

            const activeSeated = engine.players.filter(p => !p.isFolded && p.isSeated && p.chips > 0).length;
            if (activeSeated < 2) continue;

            const elapsed = Date.now() - engine.turnStartTime;
            if (elapsed >= engine.timeLimitMs) {
                engine.fold();
                broadcastRoomState(roomId);
            }
        }
    }
}, 500);

function broadcastRoomState(roomId: string) {
    const room = rooms.get(roomId);
    if (!room) return;

    if (room.gameType === 'poker' && room.pokerEngine) {
        io.to(roomId).emit('poker_state', {
            players: room.pokerEngine.players,
            communityCards: room.pokerEngine.communityCards,
            pot: room.pokerEngine.pot,
            currentPlayerIndex: room.pokerEngine.currentPlayerIndex,
            phase: room.pokerEngine.phase,
            message: room.pokerEngine.message,
            lastRaise: room.pokerEngine.lastRaise,
            turnStartTime: room.pokerEngine.turnStartTime,
            timeLimitMs: room.pokerEngine.timeLimitMs
        });
    }
}

app.get('/', (req, res) => {
    res.send('Poop Poker Backend is Running!');
});

server.listen(PORT as number, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
