import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import Table from './components/Table';
import Sidebar from './components/Sidebar';
import SnakeGame from './components/SnakeGame';
import type { Player, CardModel, GamePhaseValue } from './logic/types';
import './App.css';

// Connect to the backend
const socketUrl = import.meta.env.VITE_SERVER_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && !window.location.hostname.includes('vercel.app')
    ? `http://${window.location.hostname}:3001`
    : window.location.hostname.includes('vercel.app')
      ? 'https://udasbest-poker-game.onrender.com'
      : 'http://localhost:3001');

// Singleton socket instance outside the component to avoid multiple connections
const socket: Socket = io(socketUrl, {
  autoConnect: false,
  transports: ['polling', 'websocket'],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000
});

function App() {
  const [mode, setMode] = useState<'lobby' | 'game'>('lobby');
  const [lobbyStep, setLobbyStep] = useState<'profile' | 'menu'>(() => {
    return localStorage.getItem('poop_poker_name') ? 'menu' : 'profile';
  });
  const [selectedGame, setSelectedGame] = useState<'poker' | 'snake'>('poker');
  const [roomId, setRoomId] = useState<string>('');
  const [socketId, setSocketId] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isRaising, setIsRaising] = useState(false);
  const [raiseAmount, setRaiseAmount] = useState(0);

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
    if (!socket.connected) {
      console.log("App connecting to socket...");
      socket.connect();
    }

    const onConnect = () => {
      console.log('Socket connected!', socket.id);
      setIsConnected(true);
      setSocketId(socket.id || '');
      setConnectionError(null);
    };

    const onDisconnect = () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    };

    const onConnectError = (err: any) => {
      console.error('Connection Error:', err);
      setConnectionError(err.message || 'Unknown connection error');
    };

    const onPokerState = (state: any) => {
      setGameState(state);
      setIsRaising(false); // Reset raise state when it's a new state (e.g. turn changed)
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('poker_state', onPokerState);

    // If already connected when effect runs
    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('poker_state', onPokerState);
    };
  }, []);

  const isFormValid = playerName.trim().length > 0;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          // Downscale to 200x200 for networking efficiency
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setAvatarUrl(dataUrl);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectGame = (gameType: 'poker' | 'snake') => {
    if (!isConnected) {
      alert(`⚠️ Cannot connect to the game server!\n\nStatus: ${connectionError || 'Connecting...'}\n\nPlease check your internet or refresh the page.`);
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
    const currentId = socketId || socket.id;
    console.log(`Sitting down at index ${index}. My ID: ${currentId}, Room: ${roomId}`);

    if (!isConnected || !currentId) {
      alert("Connection lost. Please wait or refresh.");
      return;
    }

    if (gameState.players.some(p => p.ownerId === currentId)) {
      alert("You are already seated at the table!");
      return;
    }

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

  const handleRaiseClick = () => {
    const maxBet = Math.max(...gameState.players.map(p => p.currentBet));
    const minRaise = gameState.lastRaise || 200000;
    setRaiseAmount(maxBet + minRaise);
    setIsRaising(!isRaising);
  };

  const confirmRaise = () => {
    sendPokerAction('raise', { amount: raiseAmount });
    setIsRaising(false);
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
  const isMyTurn = currentPlayer?.ownerId === socketId || currentPlayer?.ownerId === socket.id;
  const iHaveSeat = gameState.players.some(p => p.ownerId === socketId || p.ownerId === socket.id);

  return (
    <div className="app-container">
      <div className="game-header" style={{ position: 'relative' }}>
        <h1>💩 POOP POKER 💩</h1>
        <div style={{ position: 'absolute', right: 20, top: 20, fontSize: 16, color: isConnected ? '#2ecc71' : '#e74c3c', fontWeight: 'bold' }}>
          {isConnected ? '🟢 GLOBAL SERVER ACTIVE' : '🔴 CONNECTING...'}
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
            deviceId={socketId || socket.id || ''}
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
              <button className="btn btn-warning" onClick={handleRaiseClick}>🚀 {isRaising ? 'CANCEL' : 'RAISE'}</button>
            </div>

            {isRaising && (
              <div style={{
                width: '100%',
                maxWidth: 400,
                backgroundColor: 'rgba(0,0,0,0.4)',
                padding: '20px',
                borderRadius: '15px',
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
                animation: 'fadeIn 0.2s ease'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f1c40f', fontWeight: 'bold' }}>
                  <span>RAISE AMOUNT:</span>
                  <span>💩 {raiseAmount.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min={Math.max(...gameState.players.map(p => p.currentBet)) + (gameState.lastRaise || 200000)}
                  max={currentPlayer.chips + currentPlayer.currentBet}
                  step={100000}
                  value={raiseAmount}
                  onChange={(e) => setRaiseAmount(parseInt(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
                <button className="btn btn-primary" onClick={confirmRaise} style={{ width: '100%' }}>
                  CONFIRM RAISE 🚀
                </button>
              </div>
            )}

            {!isMyTurn && <div style={{ fontSize: 12, color: '#f1c40f' }}>Waiting for {currentPlayer?.name}'s turn...</div>}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
