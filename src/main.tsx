import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './context/AuthContext.tsx';
import { SubjectControlsProvider } from './context/SubjectControlsContext.tsx';
import { NotificationsProvider } from './context/NotificationsContext.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <SubjectControlsProvider>
          <NotificationsProvider>
            <App />
          </NotificationsProvider>
        </SubjectControlsProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);



