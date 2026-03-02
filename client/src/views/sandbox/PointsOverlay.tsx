import { useCallback, useRef, useState, useEffect } from 'react';
import {
  SEAT_POSITIONS, BET_POSITIONS, TABLE_VIRTUAL_W, TABLE_VIRTUAL_H,
  POT_CENTER, COMMUNITY_CARDS_POS, GAME_INFO_POS, WINNING_HAND_POS,
  DEALER_BTN_OFFSET, CARD_OFFSET_DISTANCE, DECK_POS,
} from '../table/PokerTable.js';

interface Point { x: number; y: number }

export type OverlayCategory =
  | 'seats' | 'bets' | 'pot' | 'community' | 'gameInfo'
  | 'winningHand' | 'dealer' | 'cardOffset' | 'deck';

export const OVERLAY_CATEGORIES: { id: OverlayCategory; label: string; color: string }[] = [
  { id: 'seats', label: 'Seats (S0–S9)', color: '#4af' },
  { id: 'bets', label: 'Bets (B0–B9)', color: '#fa0' },
  { id: 'pot', label: 'Pot Center', color: '#f44' },
  { id: 'community', label: 'Community Cards', color: '#4f4' },
  { id: 'deck', label: 'Deck / Shuffle', color: '#a4f' },
  { id: 'gameInfo', label: 'Game Info', color: '#ff4' },
  { id: 'winningHand', label: 'Winning Hand Text', color: '#f4a' },
  { id: 'dealer', label: 'Dealer Btn Offset', color: '#4ff' },
  { id: 'cardOffset', label: 'Card Offset', color: '#aaa' },
];

interface DragState {
  category: OverlayCategory;
  index: number;
  startMouse: Point;
  startPos: Point;
}

/**
 * Draggable overlay for all table element positions.
 * Positions are mutated in-place — restart the animation to see changes.
 * Press Ctrl+P to log current positions to console.
 */
export function PointsOverlay({ activeCategories }: { activeCategories: Set<OverlayCategory> }) {
  const [, forceRender] = useState(0);
  const dragRef = useRef<DragState | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Resolve position object for a given category+index
  const getPos = (cat: OverlayCategory, index: number): Point => {
    switch (cat) {
      case 'seats': return SEAT_POSITIONS[index];
      case 'bets': return BET_POSITIONS[index];
      case 'pot': return POT_CENTER;
      case 'community': return COMMUNITY_CARDS_POS;
      case 'deck': return DECK_POS;
      case 'gameInfo': return GAME_INFO_POS;
      case 'winningHand': return WINNING_HAND_POS;
      case 'dealer': return { x: DEALER_BTN_OFFSET.distance, y: 0 };
      case 'cardOffset': return { x: CARD_OFFSET_DISTANCE.distance, y: 0 };
    }
  };

  const setPos = (cat: OverlayCategory, _index: number, x: number, y: number) => {
    switch (cat) {
      case 'seats': SEAT_POSITIONS[_index].x = x; SEAT_POSITIONS[_index].y = y; break;
      case 'bets': BET_POSITIONS[_index].x = x; BET_POSITIONS[_index].y = y; break;
      case 'pot': POT_CENTER.x = x; POT_CENTER.y = y; break;
      case 'community': COMMUNITY_CARDS_POS.x = x; COMMUNITY_CARDS_POS.y = y; break;
      case 'deck': DECK_POS.x = x; DECK_POS.y = y; break;
      case 'gameInfo': GAME_INFO_POS.x = x; GAME_INFO_POS.y = y; break;
      case 'winningHand': WINNING_HAND_POS.x = x; WINNING_HAND_POS.y = y; break;
      // Distance-based: drag X → distance
      case 'dealer': DEALER_BTN_OFFSET.distance = Math.max(0, x); break;
      case 'cardOffset': CARD_OFFSET_DISTANCE.distance = Math.max(0, x); break;
    }
  };

  const isDistanceBased = (cat: OverlayCategory) => cat === 'dealer' || cat === 'cardOffset';

  const onPointerDown = useCallback((category: OverlayCategory, index: number, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = getPos(category, index);
    dragRef.current = {
      category,
      index,
      startMouse: { x: e.clientX, y: e.clientY },
      startPos: { ...pos },
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const el = overlayRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const dx = e.clientX - drag.startMouse.x;
    const dy = e.clientY - drag.startMouse.y;

    if (isDistanceBased(drag.category)) {
      // Horizontal drag → distance value
      const newDist = Math.round(drag.startPos.x + dx);
      setPos(drag.category, drag.index, newDist, 0);
    } else {
      const newX = Math.round(drag.startPos.x + (dx / rect.width) * 100);
      const newY = Math.round(drag.startPos.y + (dy / rect.height) * 100);
      setPos(drag.category, drag.index, newX, newY);
    }

    forceRender(n => n + 1);
  }, []);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  // Ctrl+P: log positions to console
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'p' && e.ctrlKey) {
        e.preventDefault();
        console.log('SEAT_POSITIONS:', JSON.stringify(SEAT_POSITIONS, null, 2));
        console.log('BET_POSITIONS:', JSON.stringify(BET_POSITIONS, null, 2));
        console.log('POT_CENTER:', JSON.stringify(POT_CENTER));
        console.log('COMMUNITY_CARDS_POS:', JSON.stringify(COMMUNITY_CARDS_POS));
        console.log('DECK_POS:', JSON.stringify(DECK_POS));
        console.log('GAME_INFO_POS:', JSON.stringify(GAME_INFO_POS));
        console.log('WINNING_HAND_POS:', JSON.stringify(WINNING_HAND_POS));
        console.log('DEALER_BTN_OFFSET:', DEALER_BTN_OFFSET.distance);
        console.log('CARD_OFFSET_DISTANCE:', CARD_OFFSET_DISTANCE.distance);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const drag = dragRef.current;

  // Build dot list from active categories
  const dots: { cat: OverlayCategory; index: number; pos: Point; label: string; color: string }[] = [];

  for (const { id, color } of OVERLAY_CATEGORIES) {
    if (!activeCategories.has(id)) continue;

    switch (id) {
      case 'seats':
        SEAT_POSITIONS.forEach((pos, i) => dots.push({ cat: id, index: i, pos, label: `S${i}`, color }));
        break;
      case 'bets':
        BET_POSITIONS.forEach((pos, i) => dots.push({ cat: id, index: i, pos, label: `B${i}`, color }));
        break;
      case 'pot':
        dots.push({ cat: id, index: 0, pos: POT_CENTER, label: 'Pot', color });
        break;
      case 'community':
        dots.push({ cat: id, index: 0, pos: COMMUNITY_CARDS_POS, label: 'Cards', color });
        break;
      case 'deck':
        dots.push({ cat: id, index: 0, pos: DECK_POS, label: 'Deck', color });
        break;
      case 'gameInfo':
        dots.push({ cat: id, index: 0, pos: GAME_INFO_POS, label: 'Info', color });
        break;
      case 'winningHand':
        dots.push({ cat: id, index: 0, pos: WINNING_HAND_POS, label: 'Win', color });
        break;
      case 'dealer':
        // Show at table center with offset visualization
        dots.push({ cat: id, index: 0, pos: { x: 50, y: 50 }, label: `D:${DEALER_BTN_OFFSET.distance}px`, color });
        break;
      case 'cardOffset':
        dots.push({ cat: id, index: 0, pos: { x: 50, y: 50 }, label: `C:${CARD_OFFSET_DISTANCE.distance}px`, color });
        break;
    }
  }

  return (
    <div
      ref={overlayRef}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: 'absolute',
        width: TABLE_VIRTUAL_W,
        height: TABLE_VIRTUAL_H,
        top: 0,
        left: 0,
        zIndex: 40,
        pointerEvents: drag ? 'auto' : 'none',
      }}
    >
      {/* Connection lines: seat↔bet */}
      {activeCategories.has('seats') && activeCategories.has('bets') && (
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          {SEAT_POSITIONS.map((seat, i) => {
            const bet = BET_POSITIONS[i];
            return (
              <line
                key={i}
                x1={`${seat.x}%`} y1={`${seat.y}%`}
                x2={`${bet.x}%`} y2={`${bet.y}%`}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth={1}
                strokeDasharray="4,4"
              />
            );
          })}
        </svg>
      )}

      {/* Render all dots */}
      {dots.map(({ cat, index, pos, label, color }) => {
        const active = drag?.category === cat && drag.index === index;
        const isDist = isDistanceBased(cat);
        return (
          <Dot
            key={`${cat}-${index}`}
            pos={pos}
            color={color}
            label={isDist ? label : `${label} (${pos.x},${pos.y})`}
            active={active}
            onPointerDown={e => onPointerDown(cat, index, e)}
          />
        );
      })}
    </div>
  );
}

function Dot({ pos, color, label, active, onPointerDown }: {
  pos: Point;
  color: string;
  label: string;
  active: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  const size = active ? 16 : 12;
  return (
    <>
      <div
        onPointerDown={onPointerDown}
        style={{
          position: 'absolute',
          left: `${pos.x}%`,
          top: `${pos.y}%`,
          width: size,
          height: size,
          borderRadius: '50%',
          background: color,
          border: `2px solid ${active ? '#fff' : 'rgba(255,255,255,0.6)'}`,
          transform: 'translate(-50%, -50%)',
          cursor: 'grab',
          zIndex: active ? 100 : 10,
          boxShadow: active ? '0 0 10px rgba(255,255,255,0.5)' : '0 1px 3px rgba(0,0,0,0.5)',
          pointerEvents: 'auto',
        }}
        title={label}
      />
      <div
        style={{
          position: 'absolute',
          left: `${pos.x}%`,
          top: `calc(${pos.y}% + 10px)`,
          transform: 'translate(-50%, 0)',
          fontSize: 9,
          fontFamily: 'monospace',
          color,
          pointerEvents: 'none',
          textShadow: '0 1px 2px #000',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </div>
    </>
  );
}
