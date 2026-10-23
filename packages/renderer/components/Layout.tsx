import React from 'react';
import { Outlet } from 'lucide-react';

const routes: Record<string, React.ComponentType> = {
  boosts: React.lazy(() => import('../components/BoostsEditor')),
  settings: React.lazy(() => import('../components/Settings')),
};

export default function Layout() {
  return <Outlet />;
}
