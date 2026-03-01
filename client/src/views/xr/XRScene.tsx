import type { Socket } from 'socket.io-client';
import type { GameState, PrivatePlayerState, CardString } from '@poker/shared';
import { SEAT_POSITIONS } from '../table/PokerTable.js';
import { PokerTableMesh } from './scene/PokerTableMesh.js';
import { XRPlayerSeat } from './scene/XRPlayerSeat.js';
import { CommunityCardsPanel } from './scene/CommunityCardsPanel.js';
import { ActionHUD } from './scene/ActionHUD.js';

// Table center in world space
const TABLE_CENTER: [number, number, number] = [0, 0.75, -1.5];

// Convert 2D seat position (percentage) to 3D world coordinates around the table
function seatTo3D(seatPos: { x: number; y: number }): [number, number, number] {
  const nx = (seatPos.x - 50) / 50;  // -1..1
  const nz = (seatPos.y - 50) / 50;  // -1..1
  return [
    nx * 2.2,                         // table half-width in meters
    0.9,                              // slightly above table surface
    nz * 1.4 + TABLE_CENTER[2],       // table half-depth + center offset
  ];
}

interface XRSceneProps {
  socket: Socket;
  gameState: GameState | null;
  privateState: PrivatePlayerState | null;
  winnerSeats: number[];
  winningCards: CardString[];
}

export function XRScene({ socket, gameState, privateState, winnerSeats }: XRSceneProps) {
  const seatRotation = privateState?.seatIndex ?? 0;

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[0, 5, 0]} intensity={0.8} />
      <pointLight position={[0, 3, -1.5]} intensity={0.4} color="#ffeecc" />

      {/* Dark floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>

      {/* Poker table */}
      <PokerTableMesh position={TABLE_CENTER} />

      {/* Player seats */}
      {gameState?.players.map((player) => {
        const rotatedIndex = ((player.seatIndex - seatRotation + 10) % 10);
        const pos = seatTo3D(SEAT_POSITIONS[rotatedIndex]);
        const isWinner = winnerSeats.includes(player.seatIndex);

        return (
          <XRPlayerSeat
            key={player.seatIndex}
            position={pos}
            player={player}
            isWinner={isWinner}
          />
        );
      })}

      {/* Community cards + pot */}
      <CommunityCardsPanel
        position={[TABLE_CENTER[0], TABLE_CENTER[1] + 0.35, TABLE_CENTER[2]]}
        communityCards={gameState?.communityCards ?? []}
        pots={gameState?.pots ?? []}
      />

      {/* Action HUD near player */}
      <ActionHUD
        position={[0, 1.0, -0.6]}
        socket={socket}
        privateState={privateState}
        gameConfig={gameState?.config ?? null}
        isHandActive={gameState?.phase === 'hand_in_progress'}
      />
    </>
  );
}
