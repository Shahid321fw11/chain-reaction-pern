import React, { useState } from 'react';
import { motion } from 'framer-motion';
import './Game.css';

function Game({ userEmail }) {
  const ROWS = 9;
  const COLS = 6;
  const totalCells = ROWS * COLS;

  const [board, setBoard] = useState(
    Array.from({ length: totalCells }, () => ({ player: null, count: 0 }))
  );
  
  const [currentPlayer, setCurrentPlayer] = useState(1);

  // HELPER 1: Find the valid neighbors for any given cell
  const getNeighbors = (index) => {
    const neighbors = [];
    const isTopEdge = index < COLS;
    const isBottomEdge = index >= totalCells - COLS;
    const isLeftEdge = index % COLS === 0;
    const isRightEdge = (index + 1) % COLS === 0;

    if (!isTopEdge) neighbors.push(index - COLS);    // Up
    if (!isBottomEdge) neighbors.push(index + COLS); // Down
    if (!isLeftEdge) neighbors.push(index - 1);      // Left
    if (!isRightEdge) neighbors.push(index + 1);     // Right

    return neighbors;
  };

  const handleCellClick = (index) => {
    const cell = board[index];

    // Block invalid moves
    if (cell.player !== null && cell.player !== currentPlayer) return;

    // We must create a deep copy of the board so we don't mutate React state directly
    let newBoard = JSON.parse(JSON.stringify(board));
    
    // 1. Add the initial atom
    newBoard[index].count += 1;
    newBoard[index].player = currentPlayer;

    // 2. Process all chain reactions (The Explosion Logic)
    let isUnstable = true;
    
    // Keep checking the board until no more cells are exploding
    while (isUnstable) {
      isUnstable = false;
      let currentBoard = JSON.parse(JSON.stringify(newBoard));

      for (let i = 0; i < totalCells; i++) {
        const currentCell = currentBoard[i];
        const neighbors = getNeighbors(i);
        const criticalMass = neighbors.length; // 2, 3, or 4

        // If the cell is overfilled, it EXPLODES!
        if (currentCell.count >= criticalMass) {
          isUnstable = true; // The board is still exploding, loop again!
          
          // The cell loses its atoms and becomes empty
          newBoard[i].count -= criticalMass;
          if (newBoard[i].count === 0) {
            newBoard[i].player = null; 
          }

          // Distribute atoms to neighbors and conquer them
          neighbors.forEach(n => {
            newBoard[n].count += 1;
            newBoard[n].player = currentPlayer; // Take over the enemy cell!
          });
        }
      }
    }

    // 3. Save the final exploded board to React state
    setBoard(newBoard);

    // 4. Switch turns
    setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
  };

  const renderAtoms = (cell) => {
    if (cell.count === 0) return null;

    const playerClass = cell.player === 1 ? 'player-1' : 'player-2';
    
    const spinAnimation = {
      rotate: 360,
      transition: { duration: 2, repeat: Infinity, ease: "linear" }
    };

    if (cell.count === 1) {
      return <motion.div className={`atom atom-1 ${playerClass}`} animate={spinAnimation} />;
    }
    
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

  return (
    <div className="game-container">
      <div className="game-header">
        <h2>Sector Active</h2>
        <p>Commander: <span className="highlight" style={{ color: '#ff007f' }}>{userEmail}</span></p>
        <p>
          Current Turn: 
          <span style={{ 
            color: currentPlayer === 1 ? '#ff007f' : '#00ffcc', 
            fontWeight: 'bold',
            marginLeft: '8px'
          }}>
            Player {currentPlayer}
          </span>
        </p>
      </div>

      <div className="board">
        {board.map((cell, index) => (
          <div 
            key={index} 
            className="cell"
            onClick={() => handleCellClick(index)}
          >
            <div className="atom-container">
              {renderAtoms(cell)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Game;