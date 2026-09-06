// Polyfill Uint8Array.prototype.toHex and Uint8Array.setFromHex for pdfjs-dist
if (!Uint8Array.prototype.toHex) {
  Uint8Array.prototype.toHex = function() {
    return Array.from(this).map(b => b.toString(16).padStart(2, '0')).join('');
  };
}
if (!Uint8Array.setFromHex) {
  Uint8Array.setFromHex = function(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
  };
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Protegido from './auth/Protegido.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Protegido>
      <App />
    </Protegido>
  </StrictMode>,
)
