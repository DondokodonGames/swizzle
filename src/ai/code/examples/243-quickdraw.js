// 243-quickdraw.js
// クイックドロウ — 「DRAW!」の合図で相手より速く銃を抜く、西部劇の一瞬の早撃ち対決
// 操作: DRAW!が出た瞬間タップ（フライングは反則）
// 成功: 2回相手より速く抜く  失敗: 撃ち負ける or フライング3回

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、荒野の決闘） ──
  var C = { bg:'#1a0a00', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'QUICKDRAW';
  var HOW_TO_PLAY = 'TAP THE INSTANT "DRAW!" FLASHES';
  var NEEDED   = 2;           // 修正2: 5 → 2
  var MAX_EARLY = 3;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var phase, waitTime, waitDur, drawTime, enemyTime, wins, early, round, resultMsg, resultCol, resultTimer, flash, done;

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

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(0, 0, W, H * 0.5, '#2a1a3a', 1);
    pc(W * 0.82, H * 0.14, 70, C.c, 0.8);
    game.draw.rect(0, H * 0.5, W, H * 0.5, '#3a2a10', 1);
    game.draw.rect(0, H * 0.5, W, 8, C.f, 0.5);
  }

  function drawGunman(x, col, drawn, faceLeft) {
    pc(x, H * 0.44, 44, col, 0.9);
    game.draw.rect(snap(x) - 24, snap(H * 0.5), 48, 90, col, 0.85);
    var gx = x + (faceLeft ? -1 : 1) * (drawn ? 50 : 30), gy = H * 0.54 + (drawn ? -8 : 12);
    game.draw.rect(snap(gx) - 10, snap(gy) - 6, 20, 12, C.g, 0.9);
  }

  function startRound() { phase = 'wait'; waitDur = 1.5 + Math.random() * 2; waitTime = 0; drawTime = 0; enemyTime = Math.max(0.24, 0.42 - round * 0.02 + (Math.random() - 0.5) * 0.08); round++; }

  function initGame() { wins = 0; early = 0; round = 0; resultMsg = ''; resultCol = C.g; resultTimer = 0; flash = 0; done = false; startRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (wins * 600 + 400) : wins * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (phase === 'wait') { early++; resultMsg = 'TOO EARLY!'; resultCol = C.f; resultTimer = 0.8; game.audio.play('se_failure', 0.4); if (early >= MAX_EARLY) { finish(false); return; } startRound(); return; }
    if (phase === 'draw') {
      flash = 0.15;
      if (drawTime < enemyTime) {
        wins++; resultMsg = 'WIN! ' + Math.round(drawTime * 1000) + 'ms'; resultCol = C.b; game.audio.play('se_success', 0.8);
        if (wins >= NEEDED) { finish(true); return; }
        phase = 'result'; resultTimer = 1.0; setTimeout(function() { if (!done && state === S.PLAYING) startRound(); }, 1100);
      } else { resultMsg = 'LOSE! ' + Math.round(drawTime * 1000) + 'ms'; resultCol = C.a; game.audio.play('se_failure', 0.7); finish(false); }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawGunman(W * 0.2, C.b, false, false); drawGunman(W * 0.8, C.a, false, true);
      txt(GAME_TITLE, W / 2, H * 0.3, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.37, 26, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 48, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'FASTEST GUN!' : 'OUTGUNNED', W / 2, H * 0.35, 68, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      if (flash > 0) flash -= dt; if (resultTimer > 0) resultTimer -= dt;
      if (phase === 'wait') { waitTime += dt; if (waitTime >= waitDur) { phase = 'draw'; drawTime = 0; game.audio.play('se_tap', 0.6); } }
      else if (phase === 'draw') { drawTime += dt; if (drawTime > enemyTime + 0.5) { resultMsg = 'TOO SLOW!'; resultCol = C.a; game.audio.play('se_failure', 0.7); finish(false); return; } }
    }

    // ---- 描画 ----
    background();
    var drawn = phase === 'draw' || phase === 'result';
    drawGunman(W * 0.2, C.b, drawn, false);
    drawGunman(W * 0.8, C.a, phase === 'draw' && drawTime > enemyTime, true);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.g, flash * 3);
    if (phase === 'wait') txt('. . .', W / 2, H * 0.26, 60, C.f);
    else if (phase === 'draw') { txt('DRAW!', W / 2, H * 0.24, 110, C.g); var bw = W * Math.min(1, drawTime / enemyTime); game.draw.rect(40, snap(H * 0.34), W - 80, 16, '#333', 0.5); game.draw.rect(40, snap(H * 0.34), snap((W - 80) * Math.min(1, drawTime / enemyTime)), 16, C.a, 0.8); }
    if (resultTimer > 0) txt(resultMsg, W / 2, H * 0.30, 52, resultCol);

    for (var wi = 0; wi < NEEDED; wi++) game.draw.rect(snap(W / 2 + (wi - (NEEDED - 1) / 2) * 60) - 12, 168, 24, 24, wi < wins ? C.b : '#2a1a10');
    for (var ei = 0; ei < MAX_EARLY; ei++) game.draw.rect(snap(60 + ei * 44), H - 80, 20, 20, ei < early ? C.f : '#2a1a10');
    txt('WINS ' + wins + ' / ' + NEEDED, W / 2, 100, 44, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
