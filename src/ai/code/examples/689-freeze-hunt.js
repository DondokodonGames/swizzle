// 689-freeze-hunt.js
// フリーズハント — 跳ね回るオーブを全部タップして凍結させる
// 操作: 動いているオーブをタップして凍結。全部凍らせるとラウンドクリア（時間で溶ける）
// 成功: 5ラウンド 完了  失敗: 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、氷原） ──
  var C = { bg:'#020a12', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'FREEZE HUNT';
  var HOW_TO_PLAY = 'TAP EVERY BOUNCING ORB TO FREEZE IT · CLEAR THE ROUND BEFORE THEY THAW';
  var MAX_TIME = 18;
  var NEEDED   = 5;          // 修正2: 15 → 5
  var ORBS_PER_ROUND = 4, ORB_R = 50, THAW_TIME = 4.0, PLAY_Y0 = 280, PLAY_Y1 = snap(H * 0.85);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var orbs, round, roundComplete, waitTimer, timeLeft, done, particles, flash, resultText, resultTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#030d18');
  }

  function background() { game.draw.clear(C.bg); }

  function newRound() {
    round++;
    var speed = 260 + round * 20; orbs = [];
    for (var i = 0; i < ORBS_PER_ROUND; i++) {
      var a = Math.random() * Math.PI * 2;
      orbs.push({ x: ORB_R + 20 + Math.random() * (W - ORB_R * 2 - 40), y: PLAY_Y0 + ORB_R + Math.random() * (PLAY_Y1 - PLAY_Y0 - ORB_R * 2), vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, frozen: false, frozenTimer: 0, phase: Math.random() * Math.PI * 2 });
    }
    roundComplete = false; waitTimer = 0;
  }

  function initGame() { round = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; resultText = ''; resultTimer = 0; newRound(); }

  function allFrozen() { for (var i = 0; i < orbs.length; i++) if (!orbs[i].frozen) return false; return true; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (round * 600 + Math.ceil(timeLeft) * 100) : round * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(0, PLAY_Y0, W, 4, '#1e3a5f', 0.8);
    for (var i2 = 0; i2 < orbs.length; i2++) {
      var orb = orbs[i2];
      if (orb.frozen) {
        var freezeRatio = orb.frozenTimer / THAW_TIME;
        pc(orb.x, orb.y, ORB_R, '#082f49', 0.9); pc(orb.x, orb.y, ORB_R * 0.7, C.e, 0.4);
        for (var seg = 0; seg < 12; seg++) { if (seg / 12 > freezeRatio) continue; var a3 = -Math.PI / 2 + seg * Math.PI * 2 / 12; pc(orb.x + Math.cos(a3) * ORB_R * 0.85, orb.y + Math.sin(a3) * ORB_R * 0.85, 7, C.e, 0.7); }
        // pixel snowflake cross
        game.draw.rect(snap(orb.x) - 3, snap(orb.y) - 22, 6, 44, C.g, 0.8); game.draw.rect(snap(orb.x) - 22, snap(orb.y) - 3, 44, 6, C.g, 0.8);
      } else {
        pc(orb.x, orb.y, ORB_R, C.e, 0.85); pc(orb.x - ORB_R * 0.3, orb.y - ORB_R * 0.35, ORB_R * 0.22, C.g, 0.5);
      }
    }
    var frozenCount = 0; for (var fc = 0; fc < orbs.length; fc++) if (orbs[fc].frozen) frozenCount++;
    txt(frozenCount + ' / ' + orbs.length + ' FROZEN', W / 2, PLAY_Y1 + 64, 40, '#00cfff88');
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || roundComplete) return;
    for (var i = 0; i < orbs.length; i++) {
      var o = orbs[i]; if (o.frozen) continue;
      var dx = tx - o.x, dy = ty - o.y;
      if (dx * dx + dy * dy < (ORB_R + 20) * (ORB_R + 20)) {
        o.frozen = true; o.frozenTimer = THAW_TIME; game.audio.play('se_tap', 0.15);
        for (var p = 0; p < 4; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: o.x, y: o.y, vx: Math.cos(pa) * 120, vy: Math.sin(pa) * 120, life: 0.4, col: C.g }); }
        if (allFrozen()) {
          roundComplete = true; flash = 0.35; resultText = 'ROUND ' + round + ' CLEAR!'; resultTimer = 0.7; game.audio.play('se_success', 0.7);
          if (round >= NEEDED) { finish(true); return; }
          waitTimer = 0.8;
        }
        break;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!orbs) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.92, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'DEEP FREEZE!' : 'THEY THAWED', W / 2, H * 0.35, 58, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      if (waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) newRound(); }
      for (var i = 0; i < orbs.length; i++) {
        var o = orbs[i];
        if (o.frozen) { o.frozenTimer -= dt; if (o.frozenTimer <= 0) { o.frozen = false; o.frozenTimer = 0; var speed2 = 260 + round * 20, a2 = Math.random() * Math.PI * 2; o.vx = Math.cos(a2) * speed2; o.vy = Math.sin(a2) * speed2; } continue; }
        o.phase += dt; o.x += o.vx * dt; o.y += o.vy * dt;
        if (o.x < ORB_R) { o.x = ORB_R; o.vx = Math.abs(o.vx); }
        if (o.x > W - ORB_R) { o.x = W - ORB_R; o.vx = -Math.abs(o.vx); }
        if (o.y < PLAY_Y0 + ORB_R) { o.y = PLAY_Y0 + ORB_R; o.vy = Math.abs(o.vy); }
        if (o.y > PLAY_Y1 - ORB_R) { o.y = PLAY_Y1 - ORB_R; o.vy = -Math.abs(o.vy); }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.life -= dt * 2.5; if (p2.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.b, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.90), 52, C.b);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(round + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
