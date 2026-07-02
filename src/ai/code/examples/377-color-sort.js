// 377-color-sort.js
// カラーソート — 試験管の液体を注ぎ分け、各試験管を単色にそろえる水そろえパズル
// 操作: 試験管をタップで選び、注ぎ先の試験管をタップ（上の色が同じか空にだけ注げる）
// 成功: 全色そろえる  失敗: 30秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、実験室） ──
  var C = { bg:'#08061a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var LIQ = [C.a, C.b, C.e];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'COLOR SORT';
  var HOW_TO_PLAY = 'POUR TO SORT EACH TUBE INTO A SINGLE COLOR';
  var MAX_TIME = 30;
  var NUM_COLORS = 3;        // 修正2: 4 → 3
  var CAP = 3;               // 修正2: 4 → 3
  var TUBES = NUM_COLORS + 2;
  var TW = snap(W * 0.11), TH = snap(H * 0.24), GAP = snap(W * 0.04);
  var OX = snap((W - (TUBES * TW + (TUBES - 1) * GAP)) / 2), OY = snap(H * 0.40);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var tubes, selected, timeLeft, done, particles, pourAnim, moves;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#181030');
  }

  function background() { game.draw.clear(C.bg); }

  function shuffleTubes() {
    var all = [];
    for (var c = 0; c < NUM_COLORS; c++) for (var l = 0; l < CAP; l++) all.push(c);
    for (var i = all.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = all[i]; all[i] = all[j]; all[j] = t; }
    tubes = [];
    for (var k = 0; k < TUBES; k++) tubes.push(k < NUM_COLORS ? all.slice(k * CAP, (k + 1) * CAP) : []);
  }

  function isSolved() {
    var filled = 0;
    for (var t = 0; t < TUBES; t++) { if (tubes[t].length === 0) continue; if (tubes[t].length !== CAP) return false; for (var l = 1; l < CAP; l++) if (tubes[t][l] !== tubes[t][0]) return false; filled++; }
    return filled === NUM_COLORS;
  }

  function canPour(from, to) {
    if (from === to || tubes[from].length === 0 || tubes[to].length === CAP) return false;
    if (tubes[to].length === 0) return true;
    return tubes[from][tubes[from].length - 1] === tubes[to][tubes[to].length - 1];
  }

  function initGame() { shuffleTubes(); while (isSolved()) shuffleTubes(); selected = -1; timeLeft = MAX_TIME; done = false; particles = []; pourAnim = null; moves = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.ceil(timeLeft) * 200 + Math.max(0, 30 - moves) * 100) : 0;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function pour(from, to) {
    if (!canPour(from, to)) { game.audio.play('se_failure', 0.2); return; }
    var col = tubes[from].pop(); tubes[to].push(col); moves++; pourAnim = { from: from, to: to, color: col, p: 0 }; game.audio.play('se_tap', 0.3);
    if (isSolved()) { for (var pi = 0; pi < 16; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: OY + TH / 2, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, life: 0.8, col: LIQ[Math.floor(Math.random() * NUM_COLORS)] }); } finish(true); }
  }

  function tubeX(i) { return OX + i * (TW + GAP); }

  function drawTubes() {
    for (var t = 0; t < TUBES; t++) {
      var tx = tubeX(t), sel = selected === t;
      game.draw.rect(tx - 4, OY - 4, TW + 8, TH + 8, sel ? C.c : '#223', sel ? 0.9 : 0.5);
      game.draw.rect(tx, OY, TW, TH, '#0a0a1e', 0.85);
      var tube = tubes[t], lh = TH / CAP;
      for (var l = 0; l < tube.length; l++) { var ly = OY + TH - (l + 1) * lh; game.draw.rect(tx + 4, snap(ly) + 2, TW - 8, snap(lh) - 4, LIQ[tube[l]], 0.9); game.draw.rect(tx + 6, snap(ly) + 4, (TW - 12) * 0.4, 8, C.g, 0.25); }
      game.draw.rect(tx + 8, OY + 8, 4, TH - 16, C.e, 0.4);
    }
    if (pourAnim) { var fx = tubeX(pourAnim.from) + TW / 2, tox = tubeX(pourAnim.to) + TW / 2, px = fx + (tox - fx) * pourAnim.p, py = OY - 50 + pourAnim.p * 90; pc(px, py, 12, LIQ[pourAnim.color], 0.9); }
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || pourAnim) return;
    for (var t = 0; t < TUBES; t++) {
      var tx = tubeX(t);
      if (x >= tx - 8 && x < tx + TW + 8 && y >= OY - 8 && y < OY + TH + 40) {
        if (selected === -1) { if (tubes[t].length > 0) { selected = t; game.audio.play('se_tap', 0.2); } }
        else if (t === selected) selected = -1;
        else { pour(selected, t); selected = -1; }
        return;
      }
    }
    selected = -1;
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!tubes) initGame(); background(); drawTubes();
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.89, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SORTED!' : 'TIME OUT', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (pourAnim) { pourAnim.p += dt * 5; if (pourAnim.p >= 1) pourAnim = null; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawTubes();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    txt(selected >= 0 ? 'TAP A TUBE TO POUR' : 'TAP A TUBE TO SELECT', W / 2, snap(H * 0.74), 40, selected >= 0 ? C.c : C.e);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('MOVES ' + moves, W / 2, 168, 44, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
