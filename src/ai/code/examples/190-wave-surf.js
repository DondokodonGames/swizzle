// 190-wave-surf.js
// 波乗り — サーファーが波の頂点に乗り続けるバランス感覚ゲーム
// 操作: タップ/スワイプで上下に動かす
// 成功: 6秒波に乗り続ける  失敗: 波から大きく外れる

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ナイトサーフ） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'WAVE SURF';
  var HOW_TO_PLAY = 'TAP UP/DOWN TO STAY ON THE CREST';
  var NEEDED   = 6;              // 修正2: 25 → 6（サバイバル短縮）
  var TOP    = 220;
  var SURFER_X = snap(W * 0.35), SURF_R = 30, SURFER_SPEED = 600;
  var WAVE_SPEED = 1.6, SAFE_ZONE = 120;   // 修正2: 判定を広く

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var surferY, surferVY, waveTime, survived, timeLeft, done, foam;

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
    var t = Math.ceil(timeLeft / NEEDED * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#2a0a3a');
  }

  function waveY(t) { return H * 0.5 + Math.sin(t * WAVE_SPEED) * 160 + Math.sin(t * WAVE_SPEED * 1.7 + 0.5) * 60 + Math.sin(t * WAVE_SPEED * 0.5 + 1.2) * 90; }

  function drawScene(wy, diff) {
    game.draw.clear(C.bg);
    // 海
    game.draw.rect(0, snap(wy + 24), W, H - wy - 24, C.d, 0.5);
    for (var wx = 0; wx < W; wx += 24) { var wyo = snap(wy + Math.sin((wx + waveTime * 200) * 0.02) * 8); game.draw.rect(wx, wyo, 16, 16, C.e, 0.7); }
    // セーフゾーン
    for (var yy = snap(wy - SAFE_ZONE); yy < wy + SAFE_ZONE; yy += 16) game.draw.rect(SURFER_X - 70, yy, 8, 8, C.b, 0.4);
    // フォーム
    for (var fi = 0; fi < foam.length; fi++) game.draw.rect(snap(foam[fi].x) - 6, snap(foam[fi].y) - 6, 12, 12, C.g, foam[fi].life * 0.5);
    if (diff !== undefined && diff > SAFE_ZONE) game.draw.rect(0, 0, W, H, C.a, Math.min(1, (diff - SAFE_ZONE) / 120) * 0.25);
    // サーファー＋ボード
    game.draw.rect(SURFER_X - 56, snap(surferY) + SURF_R - 4, 112, 18, C.d);
    game.draw.rect(SURFER_X - 56, snap(surferY) + SURF_R - 4, 112, 6, C.a);
    pc(SURFER_X, surferY, SURF_R, C.c, 1);
    game.draw.rect(SURFER_X - 8, snap(surferY) - 10, 8, 8, C.bg);
  }

  function initGame() {
    surferY = H * 0.5; surferVY = 0; waveTime = 0; survived = 0; timeLeft = NEEDED; done = false; foam = [];
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (600 + Math.round(survived) * 100) : Math.round(survived * 120);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    surferVY = y < surferY ? -SURFER_SPEED : SURFER_SPEED;
    game.audio.play('se_tap', 0.2);
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'up') surferVY = -SURFER_SPEED; else if (dir === 'down') surferVY = SURFER_SPEED;
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      waveTime += dt; surferY = waveY(waveTime); foam = foam || [];
      drawScene(waveY(waveTime));
      txt(GAME_TITLE, W / 2, H * 0.16, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.26, 30, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.80, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.86, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.92, 40, '#886699');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      drawScene(waveY(waveTime));
      txt(resultSuccess ? 'SICK RIDE!' : 'WIPEOUT', W / 2, H * 0.35, 78, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    var wy = waveY(waveTime), diff = Math.abs(surferY - wy);
    if (!done) {
      waveTime += dt;
      surferY += surferVY * dt; surferVY *= Math.pow(0.88, dt * 60);
      surferY = Math.max(TOP + SURF_R, Math.min(H - SURF_R - 80, surferY));
      wy = waveY(waveTime); diff = Math.abs(surferY - wy);
      if (diff < SAFE_ZONE) { survived += dt; if (survived >= NEEDED) { finish(true); return; } }
      else if (diff > 220) { finish(false); return; }
      if (Math.random() < 0.3) foam.push({ x: game.random(0, W), y: wy + game.random(-40, 40), life: 0.8, vx: -game.random(80, 140) });
      for (var fi = foam.length - 1; fi >= 0; fi--) { foam[fi].x += foam[fi].vx * dt; foam[fi].life -= dt; if (foam[fi].life <= 0 || foam[fi].x < -20) foam.splice(fi, 1); }
    }

    // ---- 描画 ----
    drawScene(wy, diff);

    timeBar();
    txt(Math.ceil(NEEDED - survived) + 's', W / 2, 96, 44, C.g);
    txt(diff < SAFE_ZONE ? 'RIDING!' : 'GET BACK ON!', W / 2, 168, 40, diff < SAFE_ZONE ? C.b : C.a);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
