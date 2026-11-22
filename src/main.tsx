import {createRoot} from 'react-dom/client';
import {HashRouter} from 'react-router-dom';
import App from './App.tsx';
import {ErrorBoundary} from './components/ErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary
    onReset={() => {
      if (window.location.hash && window.location.hash !== '#/') {
        window.location.hash = '#/';
      }
    }}
  >
    <HashRouter>
      <App />
    </HashRouter>
  </ErrorBoundary>
);
