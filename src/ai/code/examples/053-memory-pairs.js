// 053-memory-pairs.js
// メモリーペア — カードをめくってペアを見つける集中力と記憶のゲーム
// 操作: タップでカードをめくる
// 成功: 全2ペアを制限時間内に揃える  失敗: 45秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'MEMORY PAIRS';
  var HOW_TO_PLAY = 'TAP CARDS TO FIND PAIRS';
  var MAX_TIME = 45;
  var PAIRS = 2;            // 修正2: 8ペア → 2ペア
  var COLS = 2, ROWS = 2, CARD_W = 360, CARD_H = 420, GAP = 40;
  var GRID_X = (W - (COLS * CARD_W + (COLS - 1) * GAP)) / 2, GRID_Y = (H - (ROWS * CARD_H + (ROWS - 1) * GAP)) / 2;
  var SYMBOLS = [{ col: C.a, sh: 'circle' }, { col: C.b, sh: 'square' }];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var cards, flipped, matched, lockTimer, timeLeft, done;

  function snap(v) { return Math.round(v / 8) * 8; }
  function drawPixelCircle(px, py, r, color, alpha) {
    var step = 8; px = snap(px); py = snap(py);
    for (var yy = -r; yy <= r; yy += step)
      for (var xx = -r; xx <= r; xx += step)
        if (xx * xx + yy * yy <= r * r) game.draw.rect(px + xx, py + yy, step, step, color, alpha);
  }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function initCards() {
    var p = []; for (var i = 0; i < PAIRS; i++) { p.push(i); p.push(i); }
    for (var s = p.length - 1; s > 0; s--) { var r = Math.floor(Math.random() * (s + 1)); var t = p[s]; p[s] = p[r]; p[r] = t; }
    cards = p; flipped = []; matched = []; lockTimer = 0; timeLeft = MAX_TIME; done = false;
  }
  function cardRect(idx) { var col = idx % COLS, row = Math.floor(idx / COLS); return { x: GRID_X + col * (CARD_W + GAP), y: GRID_Y + row * (CARD_H + GAP) }; }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (300 + Math.ceil(timeLeft) * 40) : matched.length / 2 * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawSymbol(sym, cx, cy) {
    if (sym.sh === 'circle') drawPixelCircle(cx, cy, 90, sym.col, 1);
    else game.draw.rect(snap(cx) - 90, snap(cy) - 90, 180, 180, sym.col);
    game.draw.rect(snap(cx) - 60, snap(cy) - 60, 32, 32, C.g, 0.4);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initCards(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done || lockTimer > 0) return;
    for (var i = 0; i < cards.length; i++) {
      if (matched.indexOf(i) >= 0 || flipped.indexOf(i) >= 0) continue;
      var r = cardRect(i);
      if (x >= r.x && x <= r.x + CARD_W && y >= r.y && y <= r.y + CARD_H) {
        flipped.push(i); game.audio.play('se_tap', 0.5);
        if (flipped.length === 2) {
          var a = flipped[0], b = flipped[1];
          if (cards[a] === cards[b]) {
            lockTimer = 0.5;
            setTimeout(function() { matched.push(a); matched.push(b); flipped = []; game.audio.play('se_tap', 0.9); if (matched.length === PAIRS * 2) finish(true); }, 450);
          } else { lockTimer = 0.8; setTimeout(function() { flipped = []; }, 800); }
        }
        break;
      }
    }
  });

  // 世界観: 神経衰弱の対戦テーブル。裏向きカードから同じ絵柄のペアを見つける。
  function background() {
    game.draw.clear('#0a0018');
    game.draw.rect(GRID_X - 48, GRID_Y - 48, COLS * (CARD_W + GAP) - GAP + 96, ROWS * (CARD_H + GAP) - GAP + 96, '#0a2a1a'); // フェルト台
    txt('CARD TABLE', W / 2, GRID_Y - 80, 36, C.b);
  }

  function drawCards() {
    for (var i = 0; i < cards.length; i++) {
      var r = cardRect(i), cx = r.x + CARD_W / 2, cy = r.y + CARD_H / 2;
      var isM = matched.indexOf(i) >= 0, isF = flipped.indexOf(i) >= 0;
      if (isM) { game.draw.rect(r.x, r.y, CARD_W, CARD_H, '#003322'); drawSymbol(SYMBOLS[cards[i]], cx, cy); }
      else if (isF) { game.draw.rect(r.x, r.y, CARD_W, CARD_H, '#1a0a2a'); drawSymbol(SYMBOLS[cards[i]], cx, cy); }
      else { game.draw.rect(r.x, r.y, CARD_W, CARD_H, C.d); game.draw.rect(r.x + 16, r.y + 16, CARD_W - 32, CARD_H - 32, '#3a1a5a'); txt('?', cx, cy, 120, C.g); }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!cards) initCards();
      background();
      drawCards();
      txt(GAME_TITLE,  W / 2, H * 0.1, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.17, 38, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 72, C.a);
        txt('TAP TO START', W / 2, H * 0.9, 52, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.96, 42, '#888888');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.c : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (lockTimer > 0) lockTimer -= dt;
    }

    // ---- draw ----
    background();
    drawCards();
    timeBar();
    txt(matched.length / 2 + ' / ' + PAIRS + ' PAIRS', W / 2, 96, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initCards();
  });
})(game);
