// main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import Setup from './components/Setup.jsx';
import Discussion from './components/Discussion.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/discussion/:discussionId" element={<Discussion />} />
      </Routes>
    </Router>
  </React.StrictMode>
);
