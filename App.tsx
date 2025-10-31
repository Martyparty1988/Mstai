
import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { I18nProvider } from './contexts/I18nContext';
import { ThemeProvider } from './contexts/ThemeContext';
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
import ImageEditor from './components/ImageEditor';
import SplashScreen from './components/SplashScreen';

const APP_UNLOCKED_KEY = 'mst_app_unlocked';

const App: React.FC = () => {
  const [isUnlocked, setIsUnlocked] = useState(() => {
    return sessionStorage.getItem(APP_UNLOCKED_KEY) === 'true';
  });

  const handleUnlock = () => {
    sessionStorage.setItem(APP_UNLOCKED_KEY, 'true');
    setIsUnlocked(true);
  };

  if (!isUnlocked) {
    return (
        <I18nProvider>
            <ThemeProvider>
                <SplashScreen onUnlock={handleUnlock} />
            </ThemeProvider>
        </I18nProvider>
    );
  }

  return (
    <I18nProvider>
      <AuthProvider>
        <ThemeProvider>
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
                <Route path="/image-editor" element={<ImageEditor />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Layout>
          </HashRouter>
        </ThemeProvider>
      </AuthProvider>
    </I18nProvider>
  );
};

export default App;
