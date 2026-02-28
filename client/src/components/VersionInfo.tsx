import { useGameStore } from '../hooks/useGameStore.js';

declare const __APP_VERSION__: string;

export function VersionInfo() {
  const { isConnected, serverVersion } = useGameStore();

  return (
    <div
      className="fixed bottom-2 right-2 z-10 font-mono"
      style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', lineHeight: 1.4 }}
    >
      <div>client: {__APP_VERSION__}</div>
      <div>server: {isConnected && serverVersion ? serverVersion : 'disconnected'}</div>
    </div>
  );
}
