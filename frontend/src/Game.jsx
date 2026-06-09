import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { io } from 'socket.io-client';
import './Game.css';

// 1. Connect to the backend server
const socket = io('http://localhost:5000');

// --- THE 8-BIT SOUND ENGINE (FIXED) ---
// Create the audio engine ONCE outside the function to prevent browser memory limits
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

const playSound = (type) => {
  try {
    // SECURITY FIX: Browsers put audio to sleep to prevent annoying autoplay ads. 
    // This line forces the engine to wake up the moment the user clicks a cell.
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'pop') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'boom') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    }
  } catch (e) {
    console.error("Audio error:", e);
  }
};

function Game({ userEmail }) {
  // --- APP NAVIGATION STATE ---
  const [view, setView] = useState('menu'); // 'menu' | 'lobby' | 'playing'
  const [roomInput, setRoomInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // --- MULTIPLAYER STATE ---
  const [roomCode, setRoomCode] = useState(null);
  const [players, setPlayers] = useState([]);
  const [myPlayerNum, setMyPlayerNum] = useState(null); // Am I player 1, 2, 3, or 4?

  // --- GAME STATE ---
  const ROWS = 9;
  const COLS = 6;
  const totalCells = ROWS * COLS;

  const [board, setBoard] = useState(
    Array.from({ length: totalCells }, () => ({ player: null, count: 0 }))
  );
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [totalMoves, setTotalMoves] = useState(0);
  const [winner, setWinner] = useState(null);

  // --- WEBSOCKET LISTENERS ---
  useEffect(() => {
    socket.on('room_created', (data) => {
      setRoomCode(data.roomCode);
      setPlayers(data.players);
      setMyPlayerNum(1); // The creator is always Player 1
      setView('lobby');
    });

    socket.on('player_joined', (updatedPlayers) => {
      setPlayers(updatedPlayers);
      // If I just joined, figure out my player number
      const me = updatedPlayers.find(p => p.socketId === socket.id);
      if (me && !myPlayerNum) setMyPlayerNum(me.playerNum);

      if (view === 'menu') setView('lobby');
    });

    socket.on('game_started', () => {
      setView('playing');
    });

    // When the opponent makes a move, update our local board
    socket.on('receive_move', (data) => {
      setBoard(data.newBoard);
      setCurrentPlayer(data.nextPlayer);
      setTotalMoves(data.totalMoves);
      setWinner(data.winner);
    });

    socket.on('error_message', (msg) => {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(''), 3000);
    });
    socket.on('game_restarted', () => {
      resetGame();
    });

    socket.on('player_disconnected', (email) => {
      setErrorMessage(`${email} has disconnected. The match is void.`);
      resetGame();
      setView('lobby'); // Kick everyone back to the waiting room
    });

    // Make sure to add them to the cleanup return statement at the bottom of useEffect!
    return () => {
      socket.off('room_created');
      socket.off('player_joined');
      socket.off('game_started');
      socket.off('receive_move');
      socket.off('error_message');
      socket.off('game_restarted');
      socket.off('player_disconnected');
    };
  }, [view, myPlayerNum]);

  // --- MENU ACTIONS ---
  const handleCreateRoom = () => {
    socket.emit('create_room', { email: userEmail });
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (roomInput.trim().length > 0) {
      setRoomCode(roomInput.toUpperCase());
      socket.emit('join_room', { roomCode: roomInput.toUpperCase(), email: userEmail });
    }
  };

  const handleStartGame = () => {
    socket.emit('start_game', roomCode);
  };

  // --- HELPER: WIPE THE BOARD CLEAN ---
  const resetGame = () => {
    setBoard(Array.from({ length: totalCells }, () => ({ player: null, count: 0 })));
    setCurrentPlayer(1);
    setTotalMoves(0);
    setWinner(null);
  };

  // --- GAME LOGIC ---
  const getNeighbors = (index) => {
    const neighbors = [];
    const isTopEdge = index < COLS;
    const isBottomEdge = index >= totalCells - COLS;
    const isLeftEdge = index % COLS === 0;
    const isRightEdge = (index + 1) % COLS === 0;

    if (!isTopEdge) neighbors.push(index - COLS);
    if (!isBottomEdge) neighbors.push(index + COLS);
    if (!isLeftEdge) neighbors.push(index - 1);
    if (!isRightEdge) neighbors.push(index + 1);
    return neighbors;
  };

  const handleCellClick = (index) => {
    // SECURITY: Block clicks if it's not your turn, or the game is over
    if (winner !== null || currentPlayer !== myPlayerNum) return;

    const cell = board[index];
    if (cell.player !== null && cell.player !== currentPlayer) return;

    let newBoard = JSON.parse(JSON.stringify(board));

    newBoard[index].count += 1;
    newBoard[index].player = currentPlayer;

    // --> ADD THIS LINE: Play the pop sound when an atom is placed
    playSound('pop');

    let isUnstable = true;
    while (isUnstable) {
      isUnstable = false;
      let currentBoard = JSON.parse(JSON.stringify(newBoard));

      for (let i = 0; i < totalCells; i++) {
        const currentCell = currentBoard[i];
        const neighbors = getNeighbors(i);
        const criticalMass = neighbors.length;

        if (currentCell.count >= criticalMass) {
          isUnstable = true;
          // --> ADD THIS LINE: Play the boom sound for every explosion!
          playSound('boom');
          newBoard[i].count -= criticalMass;
          if (newBoard[i].count === 0) newBoard[i].player = null;

          neighbors.forEach(n => {
            newBoard[n].count += 1;
            newBoard[n].player = currentPlayer;
          });
        }
      }
    }

    const newTotalMoves = totalMoves + 1;
    let nextPlayer = currentPlayer === players.length ? 1 : currentPlayer + 1;
    let currentWinner = null;

    // WIN CONDITION LOGIC (Modified for up to 4 players)
    if (newTotalMoves >= players.length) {
      const activePlayers = new Set();
      for (let i = 0; i < totalCells; i++) {
        if (newBoard[i].player !== null) {
          activePlayers.add(newBoard[i].player);
        }
      }

      // If only one player is left on the board, they win!
      if (activePlayers.size === 1) {
        currentWinner = Array.from(activePlayers)[0];
      }
      // If no winner yet, we skip players who have been eliminated
      else if (!activePlayers.has(nextPlayer)) {
        nextPlayer = nextPlayer === players.length ? 1 : nextPlayer + 1;
      }
    }

    // Update Local State
    setBoard(newBoard);
    setCurrentPlayer(nextPlayer);
    setTotalMoves(newTotalMoves);
    if (currentWinner) setWinner(currentWinner);

    // BROADCAST MOVE TO OPPONENTS
    socket.emit('send_move', {
      roomCode,
      newBoard,
      nextPlayer,
      totalMoves: newTotalMoves,
      winner: currentWinner
    });
  };

  const renderAtoms = (cell) => {
    if (cell.count === 0) return null;
    const playerClass = `player-${cell.player}`;
    const spinAnimation = { rotate: 360, transition: { duration: 2, repeat: Infinity, ease: "linear" } };

    if (cell.count === 1) return <motion.div className={`atom atom-1 ${playerClass}`} animate={spinAnimation} />;

    if (cell.count === 2) {
      return (
        <>
          <motion.div className={`atom atom-2 ${playerClass}`} style={{ x: -8 }} animate={spinAnimation} />
          <motion.div className={`atom atom-2 ${playerClass}`} style={{ x: 8 }} animate={spinAnimation} />
        </>
      );
    }

    if (cell.count >= 3) {
      return (
        <>
          <motion.div className={`atom atom-3 ${playerClass}`} style={{ y: -10 }} animate={spinAnimation} />
          <motion.div className={`atom atom-3 ${playerClass}`} style={{ x: -10, y: 8 }} animate={spinAnimation} />
          <motion.div className={`atom atom-3 ${playerClass}`} style={{ x: 10, y: 8 }} animate={spinAnimation} />
        </>
      );
    }
  };

  // --- RENDER MENU ---
  if (view === 'menu') {
    return (
      <div className="game-container">
        <div className="auth-card">
          <h2 className="title">Chain Reaction</h2>
          <h3 className="subtitle">Multiplayer Hub</h3>

          <button className="primary-btn" onClick={handleCreateRoom} style={{ marginBottom: '30px' }}>
            Create New Game
          </button>

          <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#33334d' }}></div>
            <span style={{ padding: '0 10px', color: '#8c8c9e', fontSize: '0.9rem' }}>OR</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#33334d' }}></div>
          </div>

          <form onSubmit={handleJoinRoom} className="auth-form">
            <div className="input-group">
              <input
                type="text"
                placeholder="Enter 6-Digit Room Code"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                maxLength="6"
                style={{ textAlign: 'center', letterSpacing: '3px', textTransform: 'uppercase' }}
              />
            </div>
            <button type="submit" className="primary-btn" style={{ backgroundColor: '#1e1e2f', color: '#00ffcc' }}>
              Join Game
            </button>
          </form>
          {errorMessage && <p className="message">{errorMessage}</p>}
        </div>
      </div>
    );
  }

  // --- RENDER LOBBY ---
  if (view === 'lobby') {
    return (
      <div className="game-container">
        <div className="auth-card" style={{ maxWidth: '500px' }}>
          <h2 className="title">Room: {roomCode}</h2>
          <p className="subtitle">Waiting for players...</p>

          <div className="player-list">
            {players.map((p, index) => (
              <div key={index} className="player-row">
                <span className={`player-dot player-${p.playerNum}`}></span>
                <span style={{ color: p.socketId === socket.id ? '#fff' : '#b3b3cc' }}>
                  {p.email} {p.socketId === socket.id ? "(You)" : ""}
                </span>
              </div>
            ))}
          </div>

          {myPlayerNum === 1 ? (
            <button
              className="primary-btn"
              onClick={handleStartGame}
              disabled={players.length < 2}
              style={{ marginTop: '20px', opacity: players.length < 2 ? 0.5 : 1 }}
            >
              {players.length < 2 ? 'Need more players...' : 'Start Game'}
            </button>
          ) : (
            <p style={{ marginTop: '20px', color: '#00ffcc' }}>Waiting for host to start...</p>
          )}
        </div>
      </div>
    );
  }

  // --- RENDER GAME BOARD ---

  // 1. CALCULATE SCORES DYNAMICALLY
  const scores = { 1: 0, 2: 0, 3: 0, 4: 0 };
  board.forEach(cell => {
    if (cell.player !== null) {
      scores[cell.player] += cell.count;
    }
  });

  return (
    <div className="game-container">
      <div className="game-header">
        <h2>Room {roomCode}</h2>
        <p>You are <span className={`highlight player-text-${myPlayerNum}`}>Player {myPlayerNum}</span></p>

        {!winner && (
          <p style={{ marginTop: '10px', fontSize: '1.2rem' }}>
            Current Turn: <span className={`player-text-${currentPlayer}`} style={{ fontWeight: 'bold' }}>Player {currentPlayer}</span>
          </p>
        )}
      </div>

      {/* 2. THE NEW SCOREBOARD UI */}
      <div className="scoreboard">
        {players.map(p => (
          <div key={p.playerNum} className={`score-card player-border-${p.playerNum}`}>
            <span className={`player-text-${p.playerNum}`} style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>
              Player {p.playerNum}
            </span>
            <span className={`player-text-${p.playerNum}`} style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
              {scores[p.playerNum]}
            </span>
          </div>
        ))}
      </div>

      <div className="board" style={{ opacity: winner ? 0.3 : 1, transition: 'opacity 0.5s ease' }}>
        {board.map((cell, index) => (
          <div key={index} className="cell" onClick={() => handleCellClick(index)}>
            <div className="atom-container">
              {renderAtoms(cell)}
            </div>
          </div>
        ))}
      </div>

      {winner && (
        <div className="victory-overlay">
          <h1 className={`player-text-${winner}`}>Player {winner} Wins!</h1>
          <p>Total moves: {totalMoves}</p>
          <button 
            className="primary-btn" 
            onClick={() => socket.emit('restart_game', roomCode)} 
            style={{ marginTop: '20px' }}
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}

export default Game;