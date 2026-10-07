import { render } from 'preact';
import { App } from './app';
import './styles.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('No se pudo registrar el service worker de EÓN:', error);
    });
  });
}

render(<App />, document.getElementById('app')!);
