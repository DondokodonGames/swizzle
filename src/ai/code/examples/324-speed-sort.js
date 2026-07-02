// 324-speed-sort.js
// スピードソート — 落ちてくる荷を色で見分け、青は左・赤は右へスワイプで素早く仕分ける
// 操作: 左スワイプ=左(青)ボックス、右スワイプ=右(赤)ボックス
// 成功: 6個 正しく仕分ける  失敗: 3個 誤分類 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、仕分けライン） ──
  var C = { bg:'#0f1117', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SPEED SORT';
  var HOW_TO_PLAY = 'SWIPE BLUE LEFT · RED RIGHT · BEFORE IT LANDS';
  var MAX_TIME = 15;
  var NEEDED   = 6;          // 修正2: 30 → 6
  var MAX_ERR  = 3;          // 修正2: 8 → 3

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var item, sorted, errors, combo, speedMult, timeLeft, done, particles, flashL, flashR, fbText, fbCol, fbTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#151820');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(W / 2 - 1, snap(H * 0.20), 2, snap(H * 0.55), C.d, 0.5); }

  function nextItem() { var type = Math.floor(Math.random() * 2); item = { x: snap(W / 2 + (Math.random() - 0.5) * W * 0.4), y: snap(H * 0.22), vy: 280 * speedMult, type: type, r: 60, deciding: false }; }

  function initGame() { sorted = 0; errors = 0; combo = 0; speedMult = 1; timeLeft = MAX_TIME; done = false; particles = []; flashL = 0; flashR = 0; fbText = ''; fbCol = C.g; fbTimer = 0; nextItem(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (sorted * 400 + combo * 60 + Math.ceil(timeLeft) * 100) : sorted * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBoxes() {
    var bw = snap(W * 0.35), by = snap(H * 0.76);
    game.draw.rect(snap(W * 0.05), by, bw, 200, C.e, 0.25 + flashL * 0.5); game.draw.rect(snap(W * 0.05), by, bw, 12, C.e, 0.8); txt('< BLUE', snap(W * 0.05) + bw / 2, by + 120, 40, C.e);
    game.draw.rect(snap(W * 0.60), by, bw, 200, C.a, 0.25 + flashR * 0.5); game.draw.rect(snap(W * 0.60), by, bw, 12, C.a, 0.8); txt('RED >', snap(W * 0.60) + bw / 2, by + 120, 40, C.a);
  }

  function drawItem() { if (!item) return; var col = item.type === 0 ? C.e : C.a; pc(item.x, item.y, item.r, col, 0.95); pc(item.x - item.r * 0.35, item.y - item.r * 0.35, item.r * 0.2, C.g, 0.5); }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(d) {
    if (state !== S.PLAYING || done || !item || item.deciding) return;
    var choice = d === 'left' ? 0 : 1; item.deciding = true;
    if (choice === item.type) {
      sorted++; combo++; speedMult = 1 + Math.min(1.0, sorted * 0.06); fbText = combo > 2 ? combo + ' COMBO!' : 'OK!'; fbCol = C.b; fbTimer = 0.4;
      if (choice === 0) flashL = 0.4; else flashR = 0.4; game.audio.play('se_success', 0.5);
      for (var k = 0; k < 5; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: item.x, y: item.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.4, col: item.type === 0 ? C.e : C.a }); }
      if (sorted >= NEEDED) { finish(true); return; }
    } else { errors++; combo = 0; fbText = 'WRONG!'; fbCol = C.a; fbTimer = 0.4; game.audio.play('se_failure', 0.4); if (errors >= MAX_ERR) { finish(false); return; } }
    item = null; setTimeout(function() { if (!done && state === S.PLAYING) nextItem(); }, 250);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawBoxes(); item = { x: W / 2, y: H * 0.4, r: 60, type: 0 }; drawItem(); item = null;
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.18, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.50, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.56, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SORTED!' : 'JAMMED', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flashL > 0) flashL -= dt * 2; if (flashR > 0) flashR -= dt * 2; if (fbTimer > 0) fbTimer -= dt;
      if (item && !item.deciding) { item.y += item.vy * dt; if (item.y > H * 0.80) { errors++; combo = 0; game.audio.play('se_failure', 0.3); item = null; if (errors >= MAX_ERR) { finish(false); return; } nextItem(); } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawBoxes(); drawItem();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (fbTimer > 0) txt(fbText, W / 2, snap(H * 0.66), 52, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(sorted + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#151820');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
