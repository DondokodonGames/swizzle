// 213-color-wave.js
// カラーウェーブ — 押し寄せる色の洪水が来る前に、その色のゾーンから別ゾーンへ逃げる判断ゲーム
// 操作: タップで4つのゾーンを移動
// 成功: 8秒生き残る  失敗: 警告色のゾーンで波に飲まれる

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、色彩チャンバー） ──
  var C = { bg:'#040608', g:'#ffffff' };
  var ZC = ['#ff2079', '#00ff9f', '#00cfff', '#ffe600'];
  var ZN = ['R', 'G', 'B', 'Y'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'COLOR WAVE';
  var HOW_TO_PLAY = 'TAP TO FLEE THE WARNED COLOR ZONE';
  var NEEDED   = 8;           // 修正2: 25 → 8（サバイバル短縮）
  var TOP = 220, BOT = H - 180;
  var ZONES = [
    { x: 0, y: TOP, w: W / 2, h: (BOT - TOP) / 2, colorIdx: 0 },
    { x: W / 2, y: TOP, w: W / 2, h: (BOT - TOP) / 2, colorIdx: 1 },
    { x: 0, y: TOP + (BOT - TOP) / 2, w: W / 2, h: (BOT - TOP) / 2, colorIdx: 2 },
    { x: W / 2, y: TOP + (BOT - TOP) / 2, w: W / 2, h: (BOT - TOP) / 2, colorIdx: 3 }
  ];
  var ANNOUNCE = 1.3, INCOMING = 0.9, STRIKE = 0.5, WAIT = 1.2;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var playerZone, waveColor, wavePhase, waveTimer, waveAlpha, survived, timeLeft, done, feedback, feedbackOk;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.g : '#1a1a2a');
  }

  function drawZones() {
    for (var zi = 0; zi < ZONES.length; zi++) {
      var z = ZONES[zi], isPlayer = zi === playerZone, isWave = z.colorIdx === waveColor;
      game.draw.rect(z.x + 4, z.y + 4, z.w - 8, z.h - 8, ZC[z.colorIdx], isPlayer ? 0.5 : 0.22);
      if (isWave && wavePhase !== 'wait' && waveAlpha > 0) game.draw.rect(z.x + 4, z.y + 4, z.w - 8, z.h - 8, C.g, waveAlpha * (Math.floor(game.time.elapsed * 8) % 2 ? 0.7 : 0.4));
      txt(ZN[z.colorIdx], z.x + z.w / 2, z.y + z.h / 2 - 40, 96, ZC[z.colorIdx]);
      if (isPlayer) { pc(z.x + z.w / 2, z.y + z.h * 0.72, 36, C.g, 0.9); game.draw.rect(snap(z.x + z.w / 2) - 12, snap(z.y + z.h * 0.72) - 4, 6, 6, '#000'); game.draw.rect(snap(z.x + z.w / 2) + 6, snap(z.y + z.h * 0.72) - 4, 6, 6, '#000'); }
    }
  }

  function background() { game.draw.clear(C.bg); }

  function startWave() { waveColor = Math.floor(Math.random() * 4); wavePhase = 'announce'; waveTimer = ANNOUNCE; }

  function initGame() { playerZone = 0; waveColor = -1; wavePhase = 'wait'; waveTimer = 1.0; waveAlpha = 0; survived = 0; timeLeft = NEEDED; done = false; feedback = 0; feedbackOk = false; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (600 + Math.ceil(survived) * 120) : Math.round(survived * 150);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var zi = 0; zi < ZONES.length; zi++) { var z = ZONES[zi]; if (x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h) { if (zi !== playerZone) { playerZone = zi; game.audio.play('se_tap', 0.3); } break; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); playerZone = Math.floor(game.time.elapsed) % 4; waveColor = -1; drawZones();
      txt(GAME_TITLE, W / 2, H * 0.12, 80, C.g);
      txt(HOW_TO_PLAY, W / 2, H * 0.17, 28, ZC[1]);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, ZC[0]);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SURVIVED!' : 'FLOODED', W / 2, H * 0.35, 82, resultSuccess ? ZC[1] : ZC[0]);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, ZC[3]);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      survived += dt; timeLeft -= dt;
      if (timeLeft <= 0) { finish(true); return; }
      if (feedback > 0) feedback -= dt;
      waveTimer -= dt;
      if (wavePhase === 'announce') { waveAlpha = (ANNOUNCE - waveTimer) / ANNOUNCE * 0.3; if (waveTimer <= 0) { wavePhase = 'incoming'; waveTimer = INCOMING; } }
      else if (wavePhase === 'incoming') {
        waveAlpha = 0.3 + (INCOMING - waveTimer) / INCOMING * 0.5;
        if (waveTimer <= 0) {
          wavePhase = 'strike'; waveTimer = STRIKE;
          if (ZONES[playerZone].colorIdx === waveColor) { feedbackOk = false; feedback = 0.4; finish(false); return; }
          else { feedbackOk = true; feedback = 0.3; game.audio.play('se_success', 0.4); }
        }
      }
      else if (wavePhase === 'strike') { waveAlpha = Math.max(0, waveAlpha - dt * 2); if (waveTimer <= 0) { wavePhase = 'wait'; waveTimer = WAIT * (0.6 + Math.random() * 0.6); waveColor = -1; } }
      else if (wavePhase === 'wait') { if (waveTimer <= 0) startWave(); }
    }

    // ---- 描画 ----
    background(); drawZones();
    if (wavePhase === 'announce' || wavePhase === 'incoming') txt('AVOID  ' + ZN[waveColor], W / 2, TOP + (BOT - TOP) / 2, 76, ZC[waveColor]);
    if (feedback > 0) game.draw.rect(0, 0, W, H, feedbackOk ? ZC[1] : ZC[0], feedback * 0.1);

    timeBar();
    txt(timeLeft.toFixed(1) + 's', W / 2, 96, 44, C.g);
    txt('FLEE THE WARNED COLOR', W / 2, H - 100, 38, C.g);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
