import { useState } from 'react';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import './Layout.css';

export default function CustomerLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="layout">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className="layout-main">
        <Navbar onMenuToggle={() => setCollapsed(!collapsed)} notifCount={2} />
        <main className="layout-content page-enter">
          {children}
        </main>
      </div>
    </div>
  );
}
