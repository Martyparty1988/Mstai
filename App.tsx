
import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Workers from './components/Workers';
import Projects from './components/Projects';
import Settings from './components/Settings';
import Statistics from './components/Statistics';
import TimeRecords from './components/TimeRecords';
import Plan from './components/Plan';
import Reports from './components/Reports';
import Attendance from './components/Attendance';
import ProjectFinder from './components/ProjectFinder';
import SplashScreen from './components/SplashScreen';
import Login from './components/Login';
import DataImporter from './components/DataImporter';

const App: React.FC = () => {
  const { isAuthenticated, login } = useAuth();
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  const handleUnlock = (role: 'user' | 'admin') => {
    if (role === 'user') {
      login({ username: 'user', role: 'user' });
    } else if (role === 'admin') {
      setShowAdminLogin(true);
    }
  };
  
  const handleBackFromLogin = () => {
    setShowAdminLogin(false);
  };

  if (!isAuthenticated) {
    if (showAdminLogin) {
      return <Login onBack={handleBackFromLogin} />;
    }
    return <SplashScreen onUnlock={handleUnlock} />;
  }

  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/workers" element={<Workers />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/records" element={<TimeRecords />} />
          <Route path="/plan" element={<Plan />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/project-finder" element={<ProjectFinder />} />
          <Route path="/import" element={<DataImporter />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;