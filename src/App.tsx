import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import Table from './components/Table';
import Sidebar from './components/Sidebar';
import SnakeGame from './components/SnakeGame';
import type { Player, CardModel, GamePhaseValue } from './logic/types';
import './App.css';

// Connect to the backend
// If env var is not set, dynamically use the current hostname (useful for testing on phones over local WiFi)
const socketUrl = import.meta.env.VITE_SERVER_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && !window.location.hostname.includes('vercel.app')
    ? `http://${window.location.hostname}:3001`
    : 'http://localhost:3001');
const socket: Socket = io(socketUrl, { autoConnect: false });

function App() {
  const [mode, setMode] = useState<'lobby' | 'game'>('lobby');
  const [lobbyStep, setLobbyStep] = useState<'profile' | 'menu'>(() => {
    return localStorage.getItem('poop_poker_name') ? 'menu' : 'profile';
  });
  const [selectedGame, setSelectedGame] = useState<'poker' | 'snake'>('poker');
  const [roomId, setRoomId] = useState<string>('');

  // Player Profile
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('poop_poker_name') || '');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(() => localStorage.getItem('poop_poker_avatar') || undefined);

  // Game State received from Server
  const [gameState, setGameState] = useState<{
    players: Player[];
    communityCards: CardModel[];
    pot: number;
    currentPlayerIndex: number;
    phase: GamePhaseValue;
    message: string;
    lastRaise: number;
    turnStartTime: number;
    timeLimitMs: number;
  }>({
    players: [],
    communityCards: [],
    pot: 0,
    currentPlayerIndex: 0,
    phase: 'Pre-Flop',
    message: 'Waiting for server state...',
    lastRaise: 0,
    turnStartTime: 0,
    timeLimitMs: 15000
  });

  // Local UI State
  const [isPeeking, setIsPeeking] = useState(false);

  useEffect(() => {
    socket.connect();

    socket.on('poker_state', (state) => {
      setGameState(state);
    });

    return () => {
      socket.off('poker_state');
    };
  }, []);

  const isFormValid = playerName.trim().length > 0;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAvatarUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSelectGame = (gameType: 'poker' | 'snake') => {
    if (!socket.connected) {
      alert("⚠️ Cannot connect to the game server!\n\nIf you are on the Vercel URL, your browser might be blocking the connection to the local server (Mixed Content). Please return to your local frontend (http://localhost:5173) to test it, or wait until the backend is fully deployed online.");
      return;
    }

    const globalRoomId = gameType === 'poker' ? 'GLOBAL_POKER' : 'GLOBAL_SNAKE';

    // Attempt to join the global room. The server will create it if it doesn't exist.
    socket.emit('join_global_room', { gameType, roomId: globalRoomId }, (response: any) => {
      if (response && response.success) {
        setRoomId(globalRoomId);
        setSelectedGame(gameType);
        setMode('game');
      } else {
        alert("Server error joining the game.");
      }
    });
  };

  // --- Poker Actions ---
  const sendPokerAction = (action: string, payload?: any) => {
    socket.emit('poker_action', { roomId, action, payload });
  };

  const handleSitClick = (index: number) => {
    if (gameState.players.some(p => p.ownerId === socket.id)) return;
    sendPokerAction('sit_down', { index, name: playerName.trim(), avatarUrl });
  };

  const handleStandUp = (index: number) => {
    sendPokerAction('stand_up', { index });
  };

  const handleRefresh = (index: number) => {
    sendPokerAction('refresh_player', { index });
  };

  const handleNewHand = () => sendPokerAction('start_hand');
  const handleCall = () => sendPokerAction('call');
  const handleFold = () => sendPokerAction('fold');
  const handlePeek = () => setIsPeeking(!isPeeking);

  const handleRaise = () => {
    const maxBet = Math.max(...gameState.players.map(p => p.currentBet));
    const amount = maxBet + 200000; // Hardcoded min bet for now
    sendPokerAction('raise', { amount });
  };

  if (mode === 'lobby') {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ backgroundColor: '#1a1a1a', padding: '40px', borderRadius: '24px', border: '2px solid #2c1810', textAlign: 'center', maxWidth: 480, width: '95%', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
          <h1 style={{ color: '#f1c40f', marginBottom: 30, letterSpacing: 4 }}>💩 MULTIPLAYER POOP POOL 💩</h1>

          {lobbyStep === 'profile' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <div style={{ marginBottom: 35, backgroundColor: 'rgba(255,255,255,0.03)', padding: '30px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="lobby-section-title" style={{ textAlign: 'center', marginBottom: 25, fontSize: 14 }}>SET UP YOUR PROFILE</span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 25 }}>
                  <div className="avatar-preview" style={{ width: 120, height: 120, fontSize: 60, margin: 0, border: '3px solid #f1c40f', boxShadow: '0 0 20px rgba(241, 196, 15, 0.2)' }}>
                    {avatarUrl ? <img src={avatarUrl} alt="Avatar" /> : '👤'}
                  </div>
                  <div style={{ width: '100%' }}>
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="Enter Your Name"
                      style={{ marginBottom: 15, textAlign: 'center', fontSize: 20, padding: 15 }}
                      autoFocus
                    />
                    <label className="btn btn-secondary btn-small" style={{ display: 'inline-block', padding: '10px 20px' }}>
                      📸 CHOOSE PHOTO
                      <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                    </label>
                  </div>
                </div>
              </div>
              <button
                className="btn btn-primary btn-large"
                style={{ width: '100%', opacity: isFormValid ? 1 : 0.5 }}
                onClick={() => {
                  if (isFormValid) {
                    localStorage.setItem('poop_poker_name', playerName.trim());
                    if (avatarUrl) localStorage.setItem('poop_poker_avatar', avatarUrl);
                    else localStorage.removeItem('poop_poker_avatar');
                    setLobbyStep('menu');
                  }
                }}
                disabled={!isFormValid}
              >
                PROCEED ✅
              </button>
            </div>
          )}

          {lobbyStep === 'menu' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <div style={{ marginBottom: 25, display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.05)', padding: '10px 20px', borderRadius: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="avatar-preview" style={{ width: 35, height: 35, fontSize: 18, margin: 0 }}>
                    {avatarUrl ? <img src={avatarUrl} alt="Avatar" /> : '👤'}
                  </div>
                  <span style={{ fontWeight: 'bold', color: '#f1c40f' }}>{playerName}</span>
                </div>
                <button className="btn btn-secondary btn-small" onClick={() => setLobbyStep('profile')}>EDIT</button>
              </div>

              <div style={{ marginBottom: 30, textAlign: 'left' }}>
                <span className="lobby-section-title">CHOOSE A SERVER</span>
                <div className="game-selection">
                  <div
                    className={`game-card ${selectedGame === 'poker' ? 'active' : ''}`}
                    onClick={() => handleSelectGame('poker')}
                  >
                    <span className="game-card-title">Texas Hold'em</span>
                    <span className="game-card-desc">Join the global multiplayer poker table</span>
                  </div>
                  <div
                    className={`game-card ${selectedGame === 'snake' ? 'active' : ''}`}
                    onClick={() => handleSelectGame('snake')}
                  >
                    <span className="game-card-title">Poop Snake</span>
                    <span className="game-card-desc">Play slither.io style snake online!</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: 40, opacity: 0.5, textAlign: 'center', borderTop: '1px solid #222', paddingTop: 20 }}>
            <p style={{ fontSize: 10, color: '#777', marginBottom: 10, letterSpacing: '2px' }}>OFFICIAL PARTNERS</p>
            <img src="/src/assets/partners.png" alt="Partners" style={{ width: 140, filter: 'grayscale(100%) brightness(1.2)' }} />
          </div>
        </div>
      </div>
    );
  }

  // --- GAME MODE ---
  if (selectedGame === 'snake') {
    return (
      <SnakeGame
        player1Name={playerName.trim() || 'Player 1'}
        socket={socket}
        roomId={roomId}
        onExit={() => { setMode('lobby'); setLobbyStep('menu'); socket.emit('leave_room', { roomId }); }}
      />
    );
  }

  const hasSeatedPlayers = gameState.players.some(p => p.isSeated);
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.ownerId === socket.id;
  const iHaveSeat = gameState.players.some(p => p.ownerId === socket.id);

  return (
    <div className="app-container">
      <div className="game-header" style={{ position: 'relative' }}>
        <h1>💩 POOP POKER 💩</h1>
        <div style={{ position: 'absolute', right: 20, top: 20, fontSize: 16, color: '#2ecc71', fontWeight: 'bold' }}>
          🟢 GLOBAL SERVER ACTIVE
        </div>
        <div className="status-message">{gameState.message}</div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div className="table-container">
          <Table
            players={gameState.players}
            communityCards={gameState.communityCards}
            pot={gameState.pot}
            currentPlayerIndex={gameState.currentPlayerIndex}
            isPeeking={isPeeking}
            phase={gameState.phase}
            turnStartTime={gameState.turnStartTime}
            timeLimitMs={gameState.timeLimitMs}
            onSitDown={handleSitClick}
            onRefresh={handleRefresh}
            onStandUp={handleStandUp}
            deviceId={socket.id || ''}
          />
        </div>
        <Sidebar players={gameState.players} currentPlayerIndex={gameState.currentPlayerIndex} />
      </div>

      <div className="controls-container">
        {!hasSeatedPlayers ? (
          <div className="onboarding-tip">Click any seat to JOIN as {playerName}!</div>
        ) : !iHaveSeat ? (
          <div className="onboarding-tip">Waiting to join a seat...</div>
        ) : gameState.players.filter(p => p.isSeated).length < 2 ? (
          <div className="onboarding-tip">Waiting for 1 more player to join...</div>
        ) : gameState.phase === 'Showdown' ? (
          <button className="btn btn-primary btn-large" onClick={handleNewHand}>
            NEXT HAND 🔄
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', opacity: isMyTurn ? 1 : 0.5, pointerEvents: isMyTurn ? 'auto' : 'none' }}>
            <div className="action-buttons">
              <button className="btn btn-secondary" onClick={handlePeek}>
                {isPeeking ? '🙈 HIDE' : '👁️ PEEK'}
              </button>
              <button className="btn btn-danger" onClick={handleFold}>💨 FOLD</button>
              <button className="btn btn-success" onClick={handleCall}>
                {Math.max(...gameState.players.map(p => p.currentBet)) - (currentPlayer?.currentBet || 0) === 0 ? '✅ CHECK' : '💰 CALL'}
              </button>
              <button className="btn btn-warning" onClick={handleRaise}>🚀 RAISE</button>
            </div>
            {!isMyTurn && <div style={{ fontSize: 12, color: '#f1c40f' }}>Waiting for {currentPlayer?.name}'s turn...</div>}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
