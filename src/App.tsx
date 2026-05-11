import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import SphereViewer from './pages/SphereViewer';
import Auth from './pages/Auth';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/sphere/:id" element={<SphereViewer />} />
      </Routes>
    </Router>
  );
}
