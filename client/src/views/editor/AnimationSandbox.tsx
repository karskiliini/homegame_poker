import { useState, useRef, useEffect, useCallback } from 'react';
import { PokerTable } from '../table/PokerTable.js';
import { useTableAnimations } from '../../hooks/useTableAnimations.js';
import { MockSocket } from './MockSocket.js';
import { AnimationDriver } from './AnimationDriver.js';
import { SCENARIOS } from './scenarios.js';
import { ControlPanel } from './ControlPanel.js';
import { TimelineBar } from './TimelineBar.js';
import { PointsOverlay, type OverlayCategory } from './PointsOverlay.js';
import type { GameState } from '@poker/shared';

export function AnimationSandbox() {
  const mockSocket = useRef(new MockSocket()).current;
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [soloSteps, setSoloSteps] = useState<Set<number>>(new Set());
  const [delayOverrides, setDelayOverrides] = useState<Map<number, number>>(new Map());
  const [activeOverlays, setActiveOverlays] = useState<Set<OverlayCategory>>(new Set());
  const driverRef = useRef<AnimationDriver | null>(null);

  // Initialize driver when scenario changes
  useEffect(() => {
    const driver = new AnimationDriver(mockSocket, SCENARIOS[scenarioIndex]);
    driver.onStepChange = (idx) => setCurrentStep(idx);
    driver.onComplete = () => setIsPlaying(false);
    driverRef.current = driver;
    return () => { driver.stop(); };
  }, [scenarioIndex, mockSocket]);

  const animations = useTableAnimations({
    socket: mockSocket,
    setGameState: (s: GameState) => setGameState(s),
    enableSound: false,
  });

  const handlePlay = useCallback(() => {
    const driver = driverRef.current;
    if (!driver) return;
    driver.setSpeed(speed);
    driver.play();
    setIsPlaying(true);
  }, [speed]);

  const handlePause = useCallback(() => {
    driverRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const handleRestart = useCallback(() => {
    const driver = driverRef.current;
    if (!driver) return;
    driver.setSpeed(speed);
    driver.restart();
    setIsPlaying(true);
  }, [speed]);

  const handleSpeedChange = useCallback((newSpeed: number) => {
    setSpeed(newSpeed);
    driverRef.current?.setSpeed(newSpeed);
  }, []);

  const handleScenarioChange = useCallback((index: number) => {
    driverRef.current?.stop();
    setScenarioIndex(index);
    setCurrentStep(-1);
    setIsPlaying(false);
    setGameState(null);
    setSoloSteps(new Set());
    setDelayOverrides(new Map());
  }, []);

  const handleSoloSteps = useCallback((steps: Set<number>) => {
    const driver = driverRef.current;
    if (!driver) return;
    driver.setSoloSteps(steps);
    setSoloSteps(steps);
    if (steps.size > 0 && isPlaying) {
      driver.restart();
    }
  }, [isPlaying]);

  const handleDelayChange = useCallback((stepIndex: number, delayMs: number) => {
    const driver = driverRef.current;
    if (!driver) return;
    driver.setDelayOverride(stepIndex, delayMs);
    setDelayOverrides(prev => {
      const next = new Map(prev);
      next.set(stepIndex, delayMs);
      return next;
    });
  }, []);

  const handleToggleOverlay = useCallback((cat: OverlayCategory) => {
    setActiveOverlays(prev => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }, []);

  const handleClearOverlays = useCallback(() => {
    setActiveOverlays(new Set());
  }, []);

  const handleSeek = useCallback((stepIndex: number) => {
    const driver = driverRef.current;
    if (!driver) return;
    driver.seekTo(stepIndex);
    setCurrentStep(stepIndex);
    setIsPlaying(false);
  }, []);

  return (
    <div style={{ width: '100%', height: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column' }}>
      {/* Top row: Table + ControlPanel */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div ref={containerRef} style={{
          flex: 1, position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {gameState ? (
            <PokerTable
              gameState={gameState}
              potAwards={animations.potAwards}
              winnerSeats={animations.winnerSeats}
              awardingPotIndex={animations.awardingPotIndex}
              timerData={animations.timerData}
              collectingBets={animations.collectingBets}
              potGrow={animations.potGrow}
              betChipAnimations={animations.betChipAnimations}
              dealCardAnimations={animations.dealCardAnimations}
              equities={animations.equities}
              dramaticRiver={animations.dramaticRiver}
              badBeat={animations.badBeat}
              chipTrick={animations.chipTrick}
              winningCards={animations.winningCards}
              shuffling={animations.shuffling}
              allInSpotlight={animations.allInSpotlight}
              winnerBanners={animations.winnerBanners}
              celebration={animations.celebration}
              dealPendingSeats={animations.dealPendingSeats}
            />
          ) : (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 20 }}>
                Select a scenario and press Play
              </div>
            </div>
          )}
          {activeOverlays.size > 0 && <PointsOverlay activeCategories={activeOverlays} />}
        </div>
        <ControlPanel
          scenarios={SCENARIOS}
          scenarioIndex={scenarioIndex}
          currentStep={currentStep}
          soloSteps={soloSteps}
          delayOverrides={delayOverrides}
          onScenarioChange={handleScenarioChange}
          onSoloSteps={handleSoloSteps}
          onDelayChange={handleDelayChange}
          activeOverlays={activeOverlays}
          onToggleOverlay={handleToggleOverlay}
          onClearOverlays={handleClearOverlays}
        />
      </div>
      {/* Bottom row: Timeline */}
      <TimelineBar
        scenario={SCENARIOS[scenarioIndex]}
        currentStep={currentStep}
        isPlaying={isPlaying}
        speed={speed}
        onPlay={handlePlay}
        onPause={handlePause}
        onRestart={handleRestart}
        onSpeedChange={handleSpeedChange}
        onSeek={handleSeek}
      />
    </div>
  );
}
