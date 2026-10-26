import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import DesignStudio from './design/DesignStudio.jsx';
import DriverView from './cockpit/DriverView.jsx';
import './style.css';
import './journey.css';
import './album-covers.css';

const Screen = /^\/(drive|pleos)(?:\/|$)/.test(window.location.pathname) ? DriverView : window.location.pathname.startsWith('/design') ? DesignStudio : App;
createRoot(document.getElementById('root')).render(<React.StrictMode><Screen /></React.StrictMode>);
