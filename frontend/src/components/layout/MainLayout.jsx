import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const EXPANDED_W  = 220;
const COLLAPSED_W = 64;

export default function MainLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const sidebarW = collapsed ? COLLAPSED_W : EXPANDED_W;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--c-bg)' }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: '100vh',
          marginLeft: sidebarW,
          display: 'flex',
          flexDirection: 'column',
          transition: 'margin-left 0.25s ease',
        }}
      >
        <Header />
        <main style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', overflowX: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
