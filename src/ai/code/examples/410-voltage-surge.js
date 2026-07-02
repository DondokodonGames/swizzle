// 410-voltage-surge.js
// 電圧サージ — 突発サージで暴れる電圧を、タップ／スワイプで上下調整して正常範囲に保ち続ける
// 操作: 画面左タップ/左スワイプで電圧を下げ、右で上げる（危険ゾーンに入れない）
// 成功: 10秒 正常に保つ  失敗: 3回 危険ゾーンに入る

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、制御盤） ──
  var C = { bg:'#020a04', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'VOLTAGE SURGE';
  var HOW_TO_PLAY = 'TAP LEFT/RIGHT TO BALANCE VOLTAGE · STAY IN THE GREEN';
  var GOAL = 10;             // 修正2: 90秒 → 10秒
  var MAX_DANGER = 3;        // 修正2: 5 → 3
  var SAFE_MIN = 0.25, SAFE_MAX = 0.75, WARN_MIN = 0.12, WARN_MAX = 0.88;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var voltage, vvel, control, danger, inDanger, survived, done, particles, surgeTimer, surgeInt, history;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function survBar() {
    var t = Math.ceil(Math.min(1, survived / GOAL) * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1a0c');
  }

  function background() { game.draw.clear(C.bg); for (var gx = 0; gx < W; gx += 80) game.draw.rect(gx, 0, 2, H, C.d, 0.1); for (var gy = 0; gy < H; gy += 80) game.draw.rect(0, gy, W, 2, C.d, 0.1); }

  function addSurge() { vvel += (Math.random() < 0.5 ? 1 : -1) * (0.03 + Math.random() * 0.04); surgeInt = 1.0 + Math.random() * 1.4; surgeTimer = 0; for (var k = 0; k < 6; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: snap(W / 2 + (Math.random() - 0.5) * 200), y: H * 0.5, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.4, col: C.b }); } }

  function initGame() { voltage = 0.5; vvel = 0; control = 0; danger = 0; inDanger = false; survived = 0; done = false; particles = []; surgeTimer = 0; surgeInt = 1.5; history = []; addSurge(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.round(survived) * 400 + (MAX_DANGER - danger) * 500 + 1000) : Math.round(survived * 200);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawPanel() {
    var hx = 60, hw = W - 120, hy = snap(H * 0.42), hh = snap(H * 0.22);
    game.draw.rect(hx, hy, hw, hh, '#0a1a0c', 0.9);
    game.draw.rect(hx, hy, hw, hh * WARN_MIN, C.a, 0.12); game.draw.rect(hx, hy + hh * WARN_MAX, hw, hh * (1 - WARN_MAX), C.a, 0.12);
    game.draw.rect(hx, hy + hh * (1 - SAFE_MAX), hw, hh * (SAFE_MAX - SAFE_MIN), C.b, 0.1);
    for (var hi = 1; hi < history.length; hi++) { var x1 = hx + (hi - 1) / 80 * hw, x2 = hx + hi / 80 * hw, y1 = hy + (1 - history[hi - 1]) * hh, y2 = hy + (1 - history[hi]) * hh, col = (history[hi] < WARN_MIN || history[hi] > WARN_MAX) ? C.a : (history[hi] < SAFE_MIN || history[hi] > SAFE_MAX) ? C.f : C.b; game.draw.rect(snap(x2) - 2, snap(y2) - 2, 5, 5, col, 0.9); }
    // ゲージ
    var gx = W - 76, gy = snap(H * 0.20), gh = snap(H * 0.6); game.draw.rect(gx - 20, gy, 40, gh, '#0a1a0c', 0.9); game.draw.rect(gx - 20, gy + gh * (1 - SAFE_MAX), 40, gh * (SAFE_MAX - SAFE_MIN), C.d, 0.3);
    var ny = gy + (1 - voltage) * gh, nc = (voltage < WARN_MIN || voltage > WARN_MAX) ? C.a : (voltage < SAFE_MIN || voltage > SAFE_MAX) ? C.f : C.c; game.draw.rect(gx - 24, snap(ny) - 6, 48, 12, nc, 0.95); txt(Math.round(voltage * 100) + 'V', gx, snap(ny) - 26, 30, nc);
  }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return; control = x < W / 2 ? -0.4 : 0.4;
  });

  game.onSwipe(function(d) {
    if (state !== S.PLAYING || done) return;
    if (d === 'left') control = -0.6; else if (d === 'right') control = 0.6;
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (voltage === undefined) initGame(); background(); drawPanel();
      txt(GAME_TITLE, W / 2, H * 0.14, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.91, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'STABLE!' : 'OVERLOAD', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      survived += dt;
      if (survived >= GOAL) { finish(true); return; }
      surgeTimer += dt; if (surgeTimer > surgeInt) addSurge();
      vvel += (0.5 - voltage) * 0.5 * dt; vvel += control * 2.0 * dt; control *= (1 - 3 * dt); vvel *= (1 - 2.5 * dt); voltage += vvel * dt; voltage = Math.max(0, Math.min(1, voltage));
      history.push(voltage); if (history.length > 80) history.shift();
      var nd = voltage < WARN_MIN || voltage > WARN_MAX;
      if (nd) { if (!inDanger) { inDanger = true; danger++; game.audio.play('se_failure', 0.5); if (danger >= MAX_DANGER) { finish(false); return; } } } else inDanger = false;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawPanel();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (inDanger) game.draw.rect(0, 0, W, H, C.a, 0.08 + Math.sin(game.time.elapsed * 12) * 0.05);
    txt('<  LOWER      RAISE  >', W / 2, snap(H * 0.80), 34, C.d);

    survBar();
    txt(survived.toFixed(1) + 's', W / 2, 96, 44, C.g);
    txt(survived.toFixed(1) + ' / ' + GOAL + 's', W / 2, 168, 48, C.b);
    for (var di = 0; di < MAX_DANGER; di++) game.draw.rect(snap(W / 2 + (di - (MAX_DANGER - 1) / 2) * 56) - 10, 224, 20, 20, di < danger ? C.a : '#0a1a0c');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
