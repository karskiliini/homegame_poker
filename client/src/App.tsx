import { Routes, Route } from 'react-router-dom';
import { TableView } from './views/table/TableView.js';
import { PlayerView } from './views/player/PlayerView.js';

export function App() {
  return (
    <Routes>
      <Route path="/table/:tableId" element={<TableView />} />
      <Route path="/table" element={<TableView />} />
      <Route path="/*" element={<PlayerView />} />
    </Routes>
  );
}
