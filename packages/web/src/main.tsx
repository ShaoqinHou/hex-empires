import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/layer-tokens.css';
import './styles/spacing-tokens.css';
import './styles/palette-tokens.css';
import './styles/typography-tokens.css';
import './styles/opacity-tokens.css';
import './styles/motion-tokens.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
