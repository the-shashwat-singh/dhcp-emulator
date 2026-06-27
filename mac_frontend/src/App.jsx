import React from 'react';
import { BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import { ToastProvider} from './context/ToastContext';
import ToastContainer from './components/Toast';

export default function App() {
 return (
 <ToastProvider>
 <Router>
 <Routes>
 <Route path="/" element={<LandingPage />} />
 <Route path="/dashboard" element={<Dashboard />} />
 </Routes>
 <ToastContainer />
 </Router>
 </ToastProvider>
 );
}
