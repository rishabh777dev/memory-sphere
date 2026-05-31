import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import SphereViewer from './pages/SphereViewer';
import Auth from './pages/Auth';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';

// Blocks unauthenticated access and prevents the flash of protected UI
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  // Still loading — render nothing to avoid flash
  if (session === undefined) return null;

  return session ? <>{children}</> : <Navigate to="/auth" replace />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/sphere/:id" element={<ProtectedRoute><SphereViewer /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}
