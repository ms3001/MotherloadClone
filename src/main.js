import { Game } from './game.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game');
  // Defer game start to next frame so the "Generating world..." overlay paints first.
  requestAnimationFrame(() => {
    const game = new Game(canvas);
    document.getElementById('loading')?.remove();
    game.start();
  });
});
