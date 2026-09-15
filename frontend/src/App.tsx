import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Lab from './pages/Lab';
import Devices from './pages/Devices';
import Events from './pages/Events';
import Settings from './pages/Settings';
import Portal from './pages/Portal';
import Analysis from './pages/Analysis';
import Detections from './pages/Detections';
import Learn from './pages/Learn';
import Review from './pages/Review';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="lab" element={<Lab />} />
          <Route path="devices" element={<Devices />} />
          <Route path="events" element={<Events />} />
          <Route path="analysis" element={<Analysis />} />
          <Route path="detections" element={<Detections />} />
          <Route path="learn" element={<Learn />} />
          <Route path="review" element={<Review />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="/portal" element={<Portal />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
