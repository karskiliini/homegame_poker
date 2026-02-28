import { Routes, Route } from 'react-router-dom';
import { PlayerView } from './views/player/PlayerView.js';

export function App() {
  return (
    <Routes>
      <Route path="/*" element={<PlayerView />} />
    </Routes>
  );
}
