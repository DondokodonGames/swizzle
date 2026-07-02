// 188-drum-fill.js
// ドラムフィル — 光ったパッドをビートに合わせて叩き続けるリズム感テスト
// 操作: タップで光ったパッドを叩く
// 成功: 3ヒット達成  失敗: 8回外す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ドラム） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var PAD = [C.e, C.c, C.b, C.a];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'DRUM FILL';
  var HOW_TO_PLAY = 'HIT THE LIT PAD ON THE BEAT';
  var MAX_TIME = 15;             // 修正2: 40 → 15
  var NEEDED   = 3;              // 修正2: 30 → 3
  var MAX_MISS = 8;
  var BPM = 100, BEAT = 60 / 100, WINDOW = 0.24;   // 修正2: 判定甘め
  var PAD_R = 200;
  var POS = [{ x: snap(W * 0.28), y: snap(H * 0.4) }, { x: snap(W * 0.72), y: snap(H * 0.4) }, { x: snap(W * 0.28), y: snap(H * 0.66) }, { x: snap(W * 0.72), y: snap(H * 0.66) }];
  var SEQ = [0, 2, 1, 3, 0, 1, 2, 3];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var score, misses, timeLeft, elapsed, beatIdx, nextBeatT, currentPad, beatWindow, flash, hitFlash, done;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#2a0a3a');
  }

  function background() { game.draw.clear(C.bg); }

  function drawPad(i) {
    var p = POS[i], active = flash[i] > 0, hit = hitFlash[i] > 0;
    pc(p.x, p.y, PAD_R, PAD[i], active ? 0.95 : 0.35);
    pc(p.x, p.y, PAD_R - 40, C.bg, 0.5);
    pc(p.x, p.y, PAD_R * 0.3, C.g, active ? 0.6 : 0.15);
    if (hit) pc(p.x, p.y, PAD_R + 20, C.g, hitFlash[i]);
    if (active) for (var a = 0; a < Math.PI * 2; a += 0.3) game.draw.rect(snap(p.x + Math.cos(a) * (PAD_R + 12)) - 5, snap(p.y + Math.sin(a) * (PAD_R + 12)) - 5, 10, 10, C.g, flash[i] / (BEAT * 0.6) * 0.7);
  }

  function initGame() {
    score = 0; misses = 0; timeLeft = MAX_TIME; elapsed = 0; beatIdx = 0; nextBeatT = 0.5;
    currentPad = -1; beatWindow = 0; flash = [0, 0, 0, 0]; hitFlash = [0, 0, 0, 0]; done = false;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 30) : score * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var hitPad = -1;
    for (var pi = 0; pi < 4; pi++) if (Math.hypot(x - POS[pi].x, y - POS[pi].y) < PAD_R) { hitPad = pi; break; }
    if (hitPad < 0) return;
    if (hitPad === currentPad && beatWindow > 0) {
      score++; hitFlash[hitPad] = 0.3;
      game.audio.play('se_tap', 0.7);
      if (score >= NEEDED) { finish(true); return; }
    } else {
      misses++; game.audio.play('se_failure', 0.3);
      if (misses >= MAX_MISS) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      flash = [Math.floor(game.time.elapsed * 2) % 4 === 0 ? 0.5 : 0, Math.floor(game.time.elapsed * 2) % 4 === 1 ? 0.5 : 0, Math.floor(game.time.elapsed * 2) % 4 === 2 ? 0.5 : 0, Math.floor(game.time.elapsed * 2) % 4 === 3 ? 0.5 : 0];
      hitFlash = [0, 0, 0, 0];
      for (var i = 0; i < 4; i++) drawPad(i);
      txt(GAME_TITLE, W / 2, H * 0.14, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.84, 30, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄  TAP TO START', W / 2, H * 0.90, 44, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'IN THE POCKET!' : 'GAME OVER', W / 2, H * 0.35, 68, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (beatWindow > 0) beatWindow -= dt;
      if (elapsed >= nextBeatT) { currentPad = SEQ[beatIdx % SEQ.length]; beatIdx++; beatWindow = WINDOW; flash[currentPad] = BEAT * 0.6; nextBeatT = elapsed + BEAT; }
      for (var pi = 0; pi < 4; pi++) { if (flash[pi] > 0) flash[pi] -= dt; if (hitFlash[pi] > 0) hitFlash[pi] -= dt; }
    }

    // ---- 描画 ----
    background();
    for (var pi2 = 0; pi2 < 4; pi2++) drawPad(pi2);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) {
      var mx = snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 44);
      game.draw.rect(mx - 8, H - 96, 16, 16, mm < misses ? C.a : '#2a0a3a');
    }
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
