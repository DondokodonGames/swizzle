// 311-escape-room.js
// 脱出パズル — 暗号のヒントを解き、数字キーパッドで正しい答えを入力して部屋を脱出する
// 操作: 数字ボタンをタップして答えを入力（桁数分入れると自動判定）
// 成功: 3つの謎を解く  失敗: 3回間違える or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、暗号金庫室） ──
  var C = { bg:'#0a0805', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', panel:'#1c1810' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ESCAPE ROOM';
  var HOW_TO_PLAY = 'READ THE CLUE · ENTER THE CODE ON THE KEYPAD';
  var MAX_TIME = 15;
  var NEEDED   = 3;
  var MAX_ERR  = 3;          // 修正2: 5 → 3
  var PUZZLES = [
    { clue: 'RED x BLUE = ?   R=3  B=4', ans: [1, 2], digits: 2 },
    { clue: '1 + 2 + 3 + 4 + 5 = ?', ans: [1, 5], digits: 2 },
    { clue: '7 - 3 = ?', ans: [4], digits: 1 },
    { clue: '3 x 3 = ?', ans: [9], digits: 1 },
    { clue: '2 x 2 x 2 = ?', ans: [8], digits: 1 },
    { clue: '10 - 7 + 2 = ?', ans: [5], digits: 1 }
  ];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var order, pIdx, entered, solved, errors, timeLeft, done, particles, flashOk, flashNg, shake;
  var ROWS = [[1, 2, 3, 4, 5], [6, 7, 8, 9, 0]];
  var BW, BH, GAP, BX0, BY0;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1408');
  }

  function background() { game.draw.clear(C.bg); }

  function shuffle(arr) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  function cur() { return order[pIdx]; }

  function initGame() { order = shuffle(PUZZLES).slice(0, 5); pIdx = 0; entered = []; solved = 0; errors = 0; timeLeft = MAX_TIME; done = false; particles = []; flashOk = 0; flashNg = 0; shake = 0; BW = snap((W - 80) / 5) - 16; BH = 120; GAP = 16; BX0 = snap(40); BY0 = snap(H * 0.72); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (solved * 700 + Math.ceil(timeLeft) * 100) : solved * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function check() {
    var p = cur(), ok = entered.length === p.ans.length;
    for (var i = 0; ok && i < p.ans.length; i++) if (entered[i] !== p.ans[i]) ok = false;
    if (ok) {
      solved++; flashOk = 1.0; game.audio.play('se_success', 0.6);
      for (var k = 0; k < 12; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H * 0.5, vx: Math.cos(a) * 280, vy: Math.sin(a) * 280, life: 0.8, col: C.b }); }
      if (solved >= NEEDED) { finish(true); return; }
      pIdx = (pIdx + 1) % order.length; entered = [];
    } else { errors++; flashNg = 0.6; shake = 0.3; entered = []; game.audio.play('se_failure', 0.5); if (errors >= MAX_ERR) finish(false); }
  }

  function drawKeypad() {
    for (var r = 0; r < 2; r++) for (var col = 0; col < 5; col++) {
      var bx = BX0 + col * (BW + GAP), by = BY0 + r * (BH + 20);
      game.draw.rect(bx, by, BW, BH, C.panel, 0.95); game.draw.rect(bx, by, BW, 8, C.d, 0.5);
      txt(ROWS[r][col] + '', bx + BW / 2, by + BH * 0.68, 56, C.c);
    }
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var r = 0; r < 2; r++) for (var col = 0; col < 5; col++) {
      var bx = BX0 + col * (BW + GAP), by = BY0 + r * (BH + 20);
      if (x >= bx && x <= bx + BW && y >= by && y <= by + BH) { entered.push(ROWS[r][col]); game.audio.play('se_tap', 0.2); if (entered.length >= cur().digits) check(); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!order) initGame(); background(); drawKeypad();
      txt(GAME_TITLE, W / 2, H * 0.16, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.40, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.46, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ESCAPED!' : 'LOCKED IN', W / 2, H * 0.35, 78, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flashOk > 0) flashOk -= dt * 1.5; if (flashNg > 0) flashNg -= dt * 2; if (shake > 0) shake -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    var sh = shake > 0 ? (Math.floor(game.time.elapsed * 40) % 2 ? 10 : -10) : 0;
    background();
    if (flashOk > 0) game.draw.rect(0, 0, W, H, C.b, flashOk * 0.25);
    if (flashNg > 0) game.draw.rect(0, 0, W, H, C.a, flashNg * 0.3);

    var p2 = cur();
    game.draw.rect(snap(W * 0.08) + sh, snap(H * 0.30), snap(W * 0.84), snap(H * 0.14), C.panel, 0.95);
    game.draw.rect(snap(W * 0.08) + sh, snap(H * 0.30), snap(W * 0.84), 8, C.e, 0.6);
    txt(p2.clue, W / 2 + sh, snap(H * 0.38), 40, C.e);
    // 入力表示
    var disp = ''; for (var di = 0; di < p2.digits; di++) disp += (di < entered.length ? entered[di] : '_') + ' ';
    txt(disp.trim(), W / 2 + sh, snap(H * 0.52), 64, C.c);
    txt('PUZZLE ' + (pIdx + 1) + ' / ' + order.length, W / 2, snap(H * 0.60), 34, C.d);
    drawKeypad();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(solved + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#1a1408');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
