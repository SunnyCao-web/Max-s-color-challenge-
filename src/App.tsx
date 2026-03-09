/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Timer, RotateCcw, Info, Play, ChevronRight, Eye } from 'lucide-react';
import confetti from 'canvas-confetti';

// --- Types ---
interface Color {
  h: number;
  s: number;
  l: number;
}

interface GameState {
  status: 'idle' | 'playing' | 'gameover';
  score: number;
  timeLeft: number;
  bestScore: number;
}

// --- Constants ---
const INITIAL_TIME = 60;
const INITIAL_DIFF = 15; // Initial lightness difference in %
const MIN_DIFF = 1.2; // Minimum lightness difference for extreme levels

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    status: 'idle',
    score: 0,
    timeLeft: INITIAL_TIME,
    bestScore: parseInt(localStorage.getItem('color_best_score') || '0'),
  });

  const [colors, setColors] = useState<Color[]>([]);
  const [targetIndex, setTargetIndex] = useState<number>(-1);
  const [diffValue, setDiffValue] = useState<number>(INITIAL_DIFF);
  const [currentGridSize, setCurrentGridSize] = useState<number>(4);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Helpers ---
  const getGridSize = (score: number) => {
    if (score < 5) return 4;
    if (score < 15) return 5;
    if (score < 30) return 6;
    if (score < 50) return 7;
    if (score < 80) return 8;
    return 9;
  };

  const generateLevel = useCallback((score: number) => {
    const gridSize = getGridSize(score);
    setCurrentGridSize(gridSize);

    const baseH = Math.floor(Math.random() * 360);
    const baseS = 40 + Math.floor(Math.random() * 50); // 40-90%
    const baseL = 35 + Math.floor(Math.random() * 50); // 35-85%

    // Difficulty curve: difference decreases as score increases
    const currentDiff = Math.max(MIN_DIFF, INITIAL_DIFF - (score * 0.4));
    setDiffValue(currentDiff);

    const isLighter = Math.random() > 0.5;
    const targetL = isLighter 
      ? Math.min(96, baseL + currentDiff) 
      : Math.max(4, baseL - currentDiff);

    const newColors = Array(gridSize * gridSize).fill({ h: baseH, s: baseS, l: baseL });
    const randomIndex = Math.floor(Math.random() * (gridSize * gridSize));
    
    newColors[randomIndex] = { h: baseH, s: baseS, l: targetL };
    
    setColors(newColors);
    setTargetIndex(randomIndex);
  }, []);

  const startGame = () => {
    setGameState(prev => ({ ...prev, status: 'playing', score: 0, timeLeft: INITIAL_TIME }));
    generateLevel(0);
  };

  const handleBlockClick = (index: number) => {
    if (gameState.status !== 'playing') return;

    if (index === targetIndex) {
      // Correct
      const nextScore = gameState.score + 1;
      setGameState(prev => ({ 
        ...prev, 
        score: nextScore,
        timeLeft: Math.min(INITIAL_TIME, prev.timeLeft + 2) // Bonus time
      }));
      generateLevel(nextScore);
    } else {
      // Wrong - penalty
      setGameState(prev => ({ 
        ...prev, 
        timeLeft: Math.max(0, prev.timeLeft - 4) 
      }));
    }
  };

  // --- Effects ---
  useEffect(() => {
    if (gameState.status === 'playing') {
      timerRef.current = setInterval(() => {
        setGameState(prev => {
          if (prev.timeLeft <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            
            // Handle Game Over
            const newBest = Math.max(prev.bestScore, prev.score);
            localStorage.setItem('color_best_score', newBest.toString());
            
            if (prev.score > prev.bestScore && prev.score > 0) {
              confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 }
              });
            }
            
            return { ...prev, status: 'gameover', timeLeft: 0, bestScore: newBest };
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState.status]);

  const colorToCss = (c: Color) => `hsl(${c.h}, ${c.s}%, ${c.l}%)`;

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] font-sans selection:bg-emerald-100 p-4 md:p-8 flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-2xl mb-8 flex justify-between items-end border-b border-black/5 pb-6">
        <div>
          <h1 className="text-4xl font-light tracking-tight mb-1 font-serif italic">Max 色彩挑战</h1>
          <p className="text-xs uppercase tracking-widest text-black/40 font-medium">Max Color Challenge</p>
        </div>
        <div className="flex gap-6 text-right">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-black/40 font-bold">Best</span>
            <span className="text-2xl font-light tabular-nums">{gameState.bestScore}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-black/40 font-bold">Score</span>
            <span className="text-2xl font-light tabular-nums">{gameState.score}</span>
          </div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="w-full max-w-2xl flex flex-col items-center gap-8">
        
        {/* Stats Bar */}
        <div className="w-full flex justify-between items-center px-2">
          <div className="flex items-center gap-2">
            <Timer className={`w-4 h-4 ${gameState.timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-black/60'}`} />
            <span className={`text-sm font-mono font-medium ${gameState.timeLeft < 10 ? 'text-red-500' : 'text-black/80'}`}>
              {Math.floor(gameState.timeLeft / 60)}:{(gameState.timeLeft % 60).toString().padStart(2, '0')}
            </span>
          </div>
          <div className="flex items-center gap-2 text-black/40 text-[10px] uppercase tracking-widest font-bold">
            <Eye className="w-3 h-3" />
            <span>Grid {currentGridSize}x{currentGridSize}</span>
          </div>
        </div>

        {/* Game Container */}
        <div className="relative w-full aspect-square max-w-[500px] bg-white rounded-3xl shadow-2xl shadow-black/5 p-4 border border-black/5">
          <AnimatePresence mode="wait">
            {gameState.status === 'idle' && (
              <motion.div 
                key="idle"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-10"
              >
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                  <Play className="w-8 h-8 text-emerald-600 fill-emerald-600 ml-1" />
                </div>
                <h2 className="text-2xl font-serif italic mb-4">准备好测试你的眼力了吗？</h2>
                <p className="text-sm text-black/60 leading-relaxed mb-8 max-w-xs">
                  在不断扩大的网格中找出那个颜色略有不同的色块。随着得分增加，网格会变大，差异会越来越小。
                </p>
                <button 
                  onClick={startGame}
                  className="px-8 py-3 bg-black text-white rounded-full text-sm font-medium hover:scale-105 transition-transform active:scale-95"
                >
                  开始挑战
                </button>
              </motion.div>
            )}

            {gameState.status === 'gameover' && (
              <motion.div 
                key="gameover"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-10 bg-white/90 backdrop-blur-sm rounded-3xl"
              >
                <Trophy className="w-12 h-12 text-amber-500 mb-4" />
                <h2 className="text-3xl font-serif italic mb-2">挑战结束</h2>
                <div className="flex flex-col gap-1 mb-8">
                  <span className="text-sm text-black/40 uppercase tracking-widest font-bold">最终得分</span>
                  <span className="text-6xl font-light tabular-nums">{gameState.score}</span>
                </div>
                <button 
                  onClick={startGame}
                  className="flex items-center gap-2 px-8 py-3 bg-black text-white rounded-full text-sm font-medium hover:scale-105 transition-transform active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  再试一次
                </button>
              </motion.div>
            )}

            {gameState.status === 'playing' && (
              <motion.div 
                key="playing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid gap-2 w-full h-full"
                style={{ 
                  gridTemplateColumns: `repeat(${currentGridSize}, 1fr)`,
                  gridTemplateRows: `repeat(${currentGridSize}, 1fr)` 
                }}
              >
                {colors.map((color, idx) => (
                  <motion.button
                    key={`${gameState.score}-${idx}`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: idx * (0.1 / (currentGridSize * currentGridSize)) }}
                    whileHover={{ scale: 0.98 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleBlockClick(idx)}
                    className="w-full h-full rounded-lg shadow-sm transition-shadow hover:shadow-md"
                    style={{ backgroundColor: colorToCss(color) }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Visual Explanation / Info */}
        <section className="w-full bg-white rounded-2xl p-6 border border-black/5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-4 h-4 text-black/40" />
            <h3 className="text-xs uppercase tracking-widest font-bold text-black/60">色彩差异可视化说明</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <p className="text-sm text-black/60 leading-relaxed">
                本挑战基于 <span className="font-mono text-black">HSL</span> 色彩空间。差异主要体现在 <span className="italic">亮度 (Lightness)</span> 的微调。
              </p>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-8 rounded-md bg-emerald-500" />
                <ChevronRight className="w-4 h-4 text-black/20" />
                <div className="flex-1 h-8 rounded-md bg-emerald-400" />
              </div>
              <p className="text-[10px] text-black/40 uppercase tracking-wider">
                当前难度差异: <span className="text-black font-mono">{diffValue.toFixed(1)}%</span>
              </p>
            </div>
            
            <div className="bg-stone-50 rounded-xl p-4 flex flex-col justify-center">
              <h4 className="text-[11px] font-bold uppercase tracking-tight mb-2">艺术生贴士</h4>
              <p className="text-xs text-black/50 italic leading-relaxed">
                "在极高亮度或极低饱和度下，人眼对亮度的敏感度会下降。尝试稍微眯起眼睛，利用视觉残留来捕捉那个'跳跃'的色块。"
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-12 text-black/20 text-[10px] uppercase tracking-[0.2em] font-bold">
        Visual Perception Lab &copy; 2024
      </footer>
    </div>
  );
}
