import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import 'leaflet/dist/leaflet.css';
import './index.css';

// Render the app in dark mode by default for the LumiNight visual theme.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <div className="dark">
      <App />
    </div>
  </React.StrictMode>
);
