import { Routes, Route } from 'react-router-dom';
import { PlayerView } from './views/player/PlayerView.js';
import { ThemeApplier } from './themes/ThemeApplier.js';

export function App() {
  return (
    <>
      <ThemeApplier />
      <Routes>
        <Route path="/*" element={<PlayerView />} />
      </Routes>
    </>
  );
}
