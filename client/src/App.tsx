import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { PlayerView } from './views/player/PlayerView.js';
import { TableWindowView } from './views/player/TableWindowView.js';
import { ThemeApplier } from './themes/ThemeApplier.js';

const AnimationSandbox = lazy(() =>
  import('./views/sandbox/AnimationSandbox.js').then(m => ({ default: m.AnimationSandbox })),
);

const sandboxEnabled = import.meta.env.VITE_SANDBOX_ENABLED === 'true';

export function App() {
  return (
    <>
      <ThemeApplier />
      <Routes>
        <Route path="/table/:tableId" element={<TableWindowView />} />
        {sandboxEnabled && (
          <Route path="/sandbox" element={<Suspense><AnimationSandbox /></Suspense>} />
        )}
        <Route path="/*" element={<PlayerView />} />
      </Routes>
    </>
  );
}
