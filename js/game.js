/* Matching Game (4x4) - populates #game-root
   Features:
   - 4x4 grid of cards (8 pairs)
   - flip animation, matching detection
   - move counter and countdown timer (configurable)
   - reset button and simple win/lose messages
   - uses CSS classes defined in CSS/style.css to match site theme
*/

(() => {
  const ROOT_ID = 'game-root';
  const DEFAULT_SECONDS = 120; // countdown length (2 minutes)

  // Default images (use game1..game8). Keep these relative to `game.html`.
  const DEFAULT_IMAGE_PATHS = [
    'images/game1.png',
    'images/game2.png',
    'images/game3.png',
    'images/game4.png',
    'images/game5.png',
    'images/game6.png',
    'images/game7.png',
    'images/game8.png'
  ];

  // Helper: allow users to override the images list easily by adding a
  // `data-images` attribute on the `#game-root` element in `game.html`.
  // Example:
  // <div id="game-root" data-images="images/a.jpg, images/b.jpg"></div>
  // This function will always return exactly 8 image paths by repeating
  // provided images as needed (so the 4x4 board can be filled).
  function getConfiguredImages() {
    const root = document.getElementById(ROOT_ID);
    const raw = root && root.dataset.images ? root.dataset.images : null;
    const source = raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : DEFAULT_IMAGE_PATHS.slice();
    // If we got no valid entries, fall back to defaults
    const parts = source.length ? source : DEFAULT_IMAGE_PATHS.slice();
    // Repeat items until we have 8
    const out = [];
    for (let i = 0; out.length < 8; i++) out.push(parts[i % parts.length]);
    return out.slice(0, 8);
  }

  const PAIRS = 8; // number of unique pairs on the board

  // State
  let deck = [];
  let firstCard = null;
  let secondCard = null;
  let lockBoard = false;
  let moves = 0;
  let matches = 0;
  let timer = null;
  let timeLeft = DEFAULT_SECONDS;

  function $(sel, ctx = document) { return ctx.querySelector(sel); }
  function $all(sel, ctx = document) { return Array.from(ctx.querySelectorAll(sel)); }

  function init() {
    const root = document.getElementById(ROOT_ID);
    if (!root) return console.warn('No #' + ROOT_ID + ' element found');

    root.innerHTML = buildShell();

    // attach events
    $('#reset-btn', root).addEventListener('click', resetGame);
    $('#board', root).addEventListener('click', onBoardClick);

    startNewGame();
  }

  function buildShell() {
    return `
      <div class="matching-header">
        <div class="matching-controls">
          <div class="matching-timer" id="match-timer" aria-live="polite">--:--</div>
          <div class="matching-moves" id="match-moves">Moves: 0</div>
        </div>
        <div>
          <button id="reset-btn" class="matching-reset" aria-label="Restart game">Restart</button>
        </div>
      </div>
      <div id="board" class="matching-board" role="grid" aria-label="Memory cards"></div>
      <div class="matching-info" id="match-info"></div>
    `;
  }

  function startNewGame() {
    // reset state
    deck = buildDeck();
    firstCard = null; secondCard = null; lockBoard = false;
    moves = 0; matches = 0; timeLeft = DEFAULT_SECONDS;
    clearInterval(timer);
    renderBoard();
    updateMoves();
    updateTimerDisplay();
    $('#match-info').textContent = '';
    // small timeout so first paint is visible
    setTimeout(() => startTimer(), 300);
  }

  function buildDeck() {
    // Determine which images to use (default or overridden via data-images)
    const pairs = getConfiguredImages();
    const list = pairs.concat(pairs).map((path, i) => ({ id: i + '-' + path, img: path }));
    return shuffle(list);
  }

  function shuffle(array) {
    const a = array.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function renderBoard() {
    const board = $('#board');
    board.innerHTML = deck.map((card, idx) => (
      `<button class="matching-card" data-index="${idx}" data-value="${escapeHtml(card.img)}" aria-label="Card ${idx+1}" aria-pressed="false">
         <span class="card-inner">
           <span class="card-face card-front"></span>
           <span class="card-face card-back"><img src="${escapeHtml(card.img)}" alt="card ${idx+1}"></span>
         </span>
       </button>`
    )).join('');
  }

  function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function onBoardClick(e) {
    const btn = e.target.closest('.matching-card');
    if (!btn) return;
    if (lockBoard) return;
    if (btn.classList.contains('is-flipped') || btn.classList.contains('is-matched')) return;

    flip(btn);
    if (!firstCard) {
      firstCard = btn; return;
    }
    secondCard = btn;
    lockBoard = true;
    moves++;
    updateMoves();
    checkForMatch();
  }

  function flip(cardEl) {
    cardEl.classList.add('is-flipped');
    cardEl.setAttribute('aria-pressed','true');
  }

  function unflip(cardEl) {
    cardEl.classList.remove('is-flipped');
    cardEl.setAttribute('aria-pressed','false');
  }

  function checkForMatch() {
    const v1 = firstCard.dataset.value;
    const v2 = secondCard.dataset.value;
    if (v1 === v2) {
      // match
      firstCard.classList.add('is-matched');
      secondCard.classList.add('is-matched');
      matches++;
      resetTurn();
      if (matches === PAIRS) {
        winGame();
      }
    } else {
      // not match: flip back
      setTimeout(() => {
        unflip(firstCard);
        unflip(secondCard);
        resetTurn();
      }, 700);
    }
  }

  function resetTurn() {
    firstCard = null; secondCard = null; lockBoard = false;
  }

  function updateMoves() {
    const el = $('#match-moves');
    if (el) el.textContent = `Moves: ${moves}`;
  }

  function startTimer() {
    stopTimer();
    updateTimerDisplay();
    timer = setInterval(() => {
      timeLeft--;
      updateTimerDisplay();
      if (timeLeft <= 0) {
        stopTimer();
        loseGame();
      }
    }, 1000);
  }

  function stopTimer() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function updateTimerDisplay() {
    const el = $('#match-timer');
    if (!el) return;
    const mm = String(Math.floor(timeLeft / 60)).padStart(2,'0');
    const ss = String(timeLeft % 60).padStart(2,'0');
    el.textContent = `${mm}:${ss}`;
  }

  function winGame() {
    stopTimer();
    const info = $('#match-info');
    if (info) info.innerHTML = `You won! 🎉&nbsp; Moves: ${moves} — Time left: ${formatTime(timeLeft)} <button id="play-again" class="matching-reset">Play again</button>`;
    $('#board').querySelectorAll('.matching-card').forEach(c => c.classList.add('disabled'));
    const again = $('#play-again');
    if (again) again.addEventListener('click', startNewGame);
  }

  function loseGame() {
    const info = $('#match-info');
    if (info) info.innerHTML = `Time's up ⏱️ — Moves: ${moves} <button id="try-again" class="matching-reset">Try again</button>`;
    $('#board').querySelectorAll('.matching-card').forEach(c => c.classList.add('disabled'));
    const again = $('#try-again');
    if (again) again.addEventListener('click', startNewGame);
  }

  function formatTime(sec) {
    const m = Math.floor(sec/60); const s = sec % 60;
    return `${m}:${String(s).padStart(2,'0')}`;
  }

  function resetGame() {
    startNewGame();
  }

  // initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }

})();
