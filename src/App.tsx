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

// Singleton socket instance
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
  const [persistentDeviceId] = useState<string>(() => {
    let id = localStorage.getItem('poop_poker_device_id');
    if (!id) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('poop_poker_device_id', id);
    }
    console.log("Local Device ID:", id);
    return id;
  });
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isRaising, setIsRaising] = useState(false);
  const [raiseAmount, setRaiseAmount] = useState(0);

  // Player Profile
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('poop_poker_name') || '');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(() => localStorage.getItem('poop_poker_avatar') || undefined);
  const [bankBalance, setBankBalance] = useState<number>(0);

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
      socket.connect();
    }

    const onConnect = () => {
      setIsConnected(true);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onConnectError = (err: any) => {
      console.error('Socket connect error:', err);
    };

    const onPokerState = (state: any) => {
      setGameState(state);
      setIsRaising(false);

      // Update bank balance from current player if seated
      const seatedPlayer = state.players.find((p: Player) => p.ownerId === persistentDeviceId);
      if (seatedPlayer) {
        setBankBalance(seatedPlayer.chips);
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('poker_state', onPokerState);

    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('poker_state', onPokerState);
    };
  }, [persistentDeviceId]);

  const isFormValid = playerName.trim().length > 0;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isGif = file.type === 'image/gif';
      const MAX_GIF_SIZE = 10 * 1024 * 1024;
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (isGif && file.size <= MAX_GIF_SIZE) {
          setAvatarUrl(result);
          return;
        }
        const img = new Image();
        img.onload = () => {
          if (isGif && file.size > MAX_GIF_SIZE) {
            const confirmStatic = window.confirm(`This GIF is quite large (${(file.size / 1024 / 1024).toFixed(1)}MB). Use a static version instead?`);
            if (!confirmStatic) return;
          }
          const canvas = document.createElement('canvas');
          const MAX_DIM = 200;
          let width = img.width;
          let height = img.height;
          if (width > height) { if (width > MAX_DIM) { height *= MAX_DIM / width; width = MAX_DIM; } }
          else { if (height > MAX_DIM) { width *= MAX_DIM / height; height = MAX_DIM; } }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          setAvatarUrl(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectGame = (gameType: 'poker' | 'snake') => {
    if (!isConnected) {
      alert("⚠️ Cannot connect to server!");
      return;
    }
    const globalRoomId = gameType === 'poker' ? 'GLOBAL_POKER' : 'GLOBAL_SNAKE';
    socket.emit('join_global_room', { gameType, roomId: globalRoomId }, (response: any) => {
      if (response && response.success) {
        setRoomId(globalRoomId);
        setSelectedGame(gameType);
        setMode('game');
      }
    });
  };

  const sendPokerAction = (action: string, payload?: any) => socket.emit('poker_action', { roomId, action, payload });

  const handleSitClick = (index: number) => {
    if (!isConnected) return;
    if (gameState.players.some((p: Player) => p.ownerId === persistentDeviceId)) {
      alert("You are already seated!");
      return;
    }
    sendPokerAction('sit_down', { index, name: playerName.trim(), avatarUrl, ownerId: persistentDeviceId });
  };

  const handleStandUp = (index: number) => sendPokerAction('stand_up', { index, ownerId: persistentDeviceId });
  const handleRefresh = (index: number) => sendPokerAction('refresh_player', { index });
  const handleNewHand = () => sendPokerAction('start_hand');
  const handleCall = () => sendPokerAction('call');
  const handleFold = () => sendPokerAction('fold');
  const handlePeek = () => setIsPeeking(!isPeeking);

  const handleRaiseClick = () => {
    const maxBet = Math.max(...gameState.players.map((p: Player) => p.currentBet));
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
        <div style={{ backgroundColor: '#1a1a1a', padding: '40px', borderRadius: '24px', border: '2px solid #2c1810', textAlign: 'center', maxWidth: 480, width: '95%' }}>
          <h1 style={{ color: '#f1c40f', marginBottom: 30, letterSpacing: 4 }}>💩 MULTIPLAYER POOP POOL 💩</h1>
          {lobbyStep === 'profile' && (
            <div>
              <div style={{ marginBottom: 35, backgroundColor: 'rgba(255,255,255,0.03)', padding: '30px', borderRadius: 20 }}>
                <div className="avatar-preview" style={{ width: 120, height: 120, fontSize: 60, margin: '0 auto 25px' }}>
                  {avatarUrl ? <img src={avatarUrl} alt="Avatar" /> : '👤'}
                </div>
                <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Enter Your Name" style={{ marginBottom: 15, textAlign: 'center', fontSize: 20, width: '100%', padding: '10px', boxSizing: 'border-box' }} />
                <label className="btn btn-secondary btn-small">📸 CHOOSE PHOTO<input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} /></label>
              </div>
              <button className="btn btn-primary btn-large" style={{ width: '100%' }} onClick={() => { localStorage.setItem('poop_poker_name', playerName.trim()); if (avatarUrl) localStorage.setItem('poop_poker_avatar', avatarUrl); setLobbyStep('menu'); }} disabled={!isFormValid}>PROCEED ✅</button>
            </div>
          )}
          {lobbyStep === 'menu' && (
            <div>
              <div style={{ marginBottom: 25, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '10px 20px', borderRadius: 12 }}>
                <span style={{ fontWeight: 'bold', color: '#f1c40f' }}>{playerName}</span>
                <button className="btn btn-secondary btn-small" onClick={() => setLobbyStep('profile')}>EDIT</button>
              </div>
              <div className="game-selection">
                <div className={`game-card ${selectedGame === 'poker' ? 'active' : ''}`} onClick={() => handleSelectGame('poker')}><span className="game-card-title">Texas Hold'em</span></div>
                <div className={`game-card ${selectedGame === 'snake' ? 'active' : ''}`} onClick={() => handleSelectGame('snake')}><span className="game-card-title">Poop Snake</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (selectedGame === 'snake') {
    return <SnakeGame player1Name={playerName.trim()} socket={socket} roomId={roomId} onExit={() => setMode('lobby')} />;
  }

  const hasSeatedPlayers = gameState.players.some((p: Player) => p.isSeated);
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.ownerId === persistentDeviceId;
  const iHaveSeat = gameState.players.some((p: Player) => p.ownerId === persistentDeviceId);

  return (
    <div className="app-container">
      <div className="game-header">
        <h1>💩 POOP POKER 💩</h1>
        <div style={{ position: 'absolute', right: 200, top: 20, fontSize: 16, color: '#f1c40f', fontWeight: 'bold' }}>
          🏦 BANK: 💩 {bankBalance.toLocaleString()}
        </div>
        <div style={{ position: 'absolute', right: 20, top: 20, fontSize: 16, color: isConnected ? '#2ecc71' : '#e74c3c' }}>{isConnected ? '🟢 ONLINE' : '🔴 OFFLINE'}</div>
        <div className="status-message">{gameState.message}</div>
      </div>
      <div className="game-main-area">
        <div className="table-container">
          <Table players={gameState.players} communityCards={gameState.communityCards} pot={gameState.pot} currentPlayerIndex={gameState.currentPlayerIndex} isPeeking={isPeeking} phase={gameState.phase} turnStartTime={gameState.turnStartTime} timeLimitMs={gameState.timeLimitMs} onSitDown={handleSitClick} onRefresh={handleRefresh} onStandUp={handleStandUp} deviceId={persistentDeviceId} />
        </div>
        <Sidebar players={gameState.players} currentPlayerIndex={gameState.currentPlayerIndex} />
      </div>
      <div className="controls-container">
        {!hasSeatedPlayers ? <div className="onboarding-tip">Click any seat to JOIN!</div> : !iHaveSeat ? <div className="onboarding-tip">Waiting for a seat...</div> : gameState.players.filter((p: Player) => p.isSeated).length < 2 ? <div className="onboarding-tip">Waiting for players...</div> : gameState.phase === 'Showdown' ? <button className="btn btn-primary btn-large" onClick={handleNewHand}>NEXT HAND 🔄</button> : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', opacity: isMyTurn ? 1 : 0.5, pointerEvents: isMyTurn ? 'auto' : 'none', width: '100%' }}>
            <div className="action-buttons">
              <button className="btn btn-secondary" onClick={handlePeek}>{isPeeking ? '🙈 HIDE' : '👁️ PEEK'}</button>
              <button className="btn btn-danger" onClick={handleFold}>💨 FOLD</button>
              <button className="btn btn-success" onClick={handleCall}>{Math.max(...gameState.players.map((p: Player) => p.currentBet)) - (currentPlayer?.currentBet || 0) === 0 ? '✅ CHECK' : '💰 CALL'}</button>
              <button className="btn btn-warning" onClick={handleRaiseClick}>🚀 {isRaising ? 'CANCEL' : 'RAISE'}</button>
            </div>
            {isRaising && (
              <div style={{ width: '100%', maxWidth: 400, backgroundColor: 'rgba(0,0,0,0.4)', padding: '20px', borderRadius: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f1c40f' }}><span>AMOUNT:</span><span>💩 {raiseAmount.toLocaleString()}</span></div>
                <input type="range" min={Math.max(...gameState.players.map((p: Player) => p.currentBet)) + (gameState.lastRaise || 200000)} max={currentPlayer.chips + currentPlayer.currentBet} step={100000} value={raiseAmount} onChange={(e) => setRaiseAmount(parseInt(e.target.value))} style={{ width: '100%' }} />
                <button className="btn btn-primary" onClick={confirmRaise} style={{ width: '100%' }}>CONFIRM 🚀</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
