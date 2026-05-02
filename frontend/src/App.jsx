import { Routes, Route, Navigate } from 'react-router-dom';
import Nav from './components/Nav.jsx';
import Header from './components/Header.jsx';
import { useStore } from './store.js';
import FloorPlan from './pages/FloorPlan.jsx';
import Items from './pages/Items.jsx';
import Stock from './pages/Stock.jsx';
import Staff from './pages/Staff.jsx';
import Kitchen from './pages/Kitchen.jsx';
import Reports from './pages/Reports.jsx';
import Reservations from './pages/Reservations.jsx';
import Bar from './pages/Bar.jsx';
import Settings from './pages/Settings.jsx';
import Customers from './pages/Customers.jsx';
import Schedule from './pages/Schedule.jsx';
import QRSheet from './pages/QRSheet.jsx';
import Contracts from './pages/Contracts.jsx';
import RSZ from './pages/RSZ.jsx';

const HOME_BY_ROLE = {
  manager: '/floor',
  waiter: '/floor',
  kitchen: '/kitchen',
  bar: '/bar',
};

function RoleGuard({ allowed, children }) {
  const role = useStore((s) => s.role);
  if (!allowed.includes(role)) {
    return <Navigate to={HOME_BY_ROLE[role] || '/floor'} replace />;
  }
  return children;
}

export default function App() {
  const role = useStore((s) => s.role);
  return (
    <div className="h-screen flex">
      <Nav />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-auto bg-slate-50 dark:bg-transparent pb-[calc(env(safe-area-inset-bottom)+4rem)] md:pb-0">
          <Routes>
            <Route path="/" element={<Navigate to={HOME_BY_ROLE[role]} replace />} />
            <Route
              path="/floor"
              element={
                <RoleGuard allowed={['manager', 'waiter']}>
                  <FloorPlan />
                </RoleGuard>
              }
            />
            <Route
              path="/kitchen"
              element={
                <RoleGuard allowed={['manager', 'kitchen']}>
                  <Kitchen />
                </RoleGuard>
              }
            />
            <Route
              path="/bar"
              element={
                <RoleGuard allowed={['manager', 'bar']}>
                  <Bar />
                </RoleGuard>
              }
            />
            <Route path="/items"        element={<RoleGuard allowed={['manager']}><Items /></RoleGuard>} />
            <Route path="/stock"        element={<RoleGuard allowed={['manager']}><Stock /></RoleGuard>} />
            <Route path="/staff"        element={<RoleGuard allowed={['manager']}><Staff /></RoleGuard>} />
            <Route path="/reports"      element={<RoleGuard allowed={['manager']}><Reports /></RoleGuard>} />
            <Route path="/reservations" element={<RoleGuard allowed={['manager', 'waiter']}><Reservations /></RoleGuard>} />
            <Route path="/customers"    element={<RoleGuard allowed={['manager']}><Customers /></RoleGuard>} />
            <Route path="/schedule"     element={<RoleGuard allowed={['manager']}><Schedule /></RoleGuard>} />
            <Route path="/settings"     element={<RoleGuard allowed={['manager']}><Settings /></RoleGuard>} />
            <Route path="/qr-sheet"     element={<RoleGuard allowed={['manager']}><QRSheet /></RoleGuard>} />
            <Route path="/contracts"    element={<RoleGuard allowed={['manager']}><Contracts /></RoleGuard>} />
            <Route path="/rsz"          element={<RoleGuard allowed={['manager']}><RSZ /></RoleGuard>} />
            <Route path="*" element={<Navigate to={HOME_BY_ROLE[role]} replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
