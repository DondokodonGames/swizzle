// 532-torch-relay.js
// トーチリレー — 炎を絶やさずにランナーへ渡し、全員をゴールまで運ぶ
// 操作: タップで走者を加速＆炎を煽る / 右スワイプで次の走者へ炎を渡す（接近時）
// 成功: 走者 3人 全員ゴール  失敗: 炎が消える or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、聖火リレー） ──
  var C = { bg:'#020304', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TORCH RELAY';
  var HOW_TO_PLAY = 'TAP TO BOOST & FAN THE FLAME · SWIPE RIGHT TO PASS THE TORCH';
  var MAX_TIME = 15;
  var NEEDED   = 3;          // 修正2: 5 → 3
  var FLAME_DRAIN = 0.06;
  var GROUND_Y = snap(H * 0.80), GOAL_X = W - 90;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var runners, cur, flameLife, score, timeLeft, done, particles, flameP, flash, boostCd;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#1a0e04');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, '#0d1a0a', 0.9);
    game.draw.rect(0, GROUND_Y, W, 12, C.b, 0.4);
    game.draw.rect(GOAL_X - 4, snap(H * 0.14), 8, GROUND_Y - snap(H * 0.14), C.b, 0.8);
    game.draw.rect(GOAL_X - 44, snap(H * 0.14), 88, 56, C.b, 0.7);
    txt('GOAL', GOAL_X, snap(H * 0.14) + 40, 32, C.g);
  }

  function initGame() {
    runners = []; for (var i = 0; i < NEEDED; i++) runners.push({ x: 90 + i * 70, y: GROUND_Y - 80, vx: 100 + i * 20, hasTorch: i === 0, finished: false, runAnim: Math.random() * Math.PI * 2 });
    cur = 0; flameLife = 1.0; score = 0; timeLeft = MAX_TIME; done = false; particles = []; flameP = []; flash = 0; boostCd = 0;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 800 + Math.ceil(timeLeft) * 100 + Math.round(flameLife * 500)) : score * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawRunner(r, ri) {
    var col = ri === cur ? C.e : '#445566';
    pc(r.x, r.y - 40, 26, col, 0.9);
    game.draw.rect(snap(r.x) - 7, r.y - 12, 14, 52, col, 0.9);
    game.draw.line(r.x, r.y + 40, r.x - 20 + Math.cos(r.runAnim) * 20, r.y + 80, col, 10);
    game.draw.line(r.x, r.y + 40, r.x + 20 - Math.cos(r.runAnim) * 20, r.y + 80, col, 10);
    game.draw.line(r.x, r.y + 10, r.x + 30 + Math.cos(r.runAnim) * 20, r.y - 10, col, 8);
    if (r.hasTorch) {
      var tx2 = r.x + 34, ty2 = r.y - 72;
      game.draw.line(r.x + 20, r.y + 10, tx2, ty2 + 20, C.f, 8);
      pc(tx2, ty2, 16, C.f, 0.9);
      pc(tx2, ty2 - 14, 14 * flameLife, flameLife > 0.5 ? C.c : C.a, 0.95);
    }
    if (r.finished) { pc(r.x, r.y - 84, 20, C.b, 0.9); txt('OK', r.x, r.y - 76, 22, C.bg); }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || boostCd > 0) return;
    var r = runners[cur]; if (!r || r.finished) return;
    r.vx = Math.min(r.vx + 140, 600); boostCd = 0.28; flameLife = Math.min(1.0, flameLife + 0.14); game.audio.play('se_tap', 0.3);
    for (var pi = 0; pi < 4; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: r.x, y: r.y - 20, vx: Math.cos(a) * 100 + r.vx * 0.3, vy: Math.sin(a) * 100 - 80, life: 0.35, col: C.e }); }
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || dir !== 'right') return;
    var c = runners[cur], n = runners[cur + 1]; if (!n || !c) return;
    if (Math.abs(c.x - n.x) < 220) {
      c.hasTorch = false; n.hasTorch = true; cur++; game.audio.play('se_success', 0.6); flameLife = Math.min(1.0, flameLife + 0.3);
      for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: (c.x + n.x) / 2, y: c.y - 30, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140 - 60, life: 0.4, col: C.c }); }
    } else game.audio.play('se_failure', 0.3);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!runners) initGame(); background(); for (var ri = 0; ri < runners.length; ri++) drawRunner(runners[ri], ri);
      txt(GAME_TITLE, W / 2, H * 0.24, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.285, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.55, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.59, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'FLAME CARRIED!' : 'FLAME OUT', W / 2, H * 0.35, 60, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (boostCd > 0) boostCd -= dt;
      flameLife -= FLAME_DRAIN * dt * (1 + game.time.elapsed * 0.03);
      if (flameLife <= 0) { flameLife = 0; flash = 0.8; finish(false); return; }

      for (var i = 0; i < runners.length; i++) {
        var r = runners[i]; if (r.finished) continue;
        r.runAnim += dt * 8;
        var ts = i === cur ? 160 : (i < cur ? 210 : 80); r.vx += (ts - r.vx) * dt * 2; r.x += r.vx * dt; r.y = GROUND_Y - 80 + Math.sin(r.runAnim) * 8;
        if (r.x >= GOAL_X) {
          r.finished = true; r.x = GOAL_X; score++; game.audio.play('se_success', 0.7);
          if (r.hasTorch && cur < runners.length - 1) { r.hasTorch = false; runners[cur + 1].hasTorch = true; cur++; flameLife = Math.min(1.0, flameLife + 0.2); }
          else if (r.hasTorch) { finish(true); return; }
        }
      }

      var torchR = null; for (var tr = 0; tr < runners.length; tr++) if (runners[tr].hasTorch) { torchR = runners[tr]; break; }
      if (torchR && flameLife > 0.1) for (var fpi = 0; fpi < 2; fpi++) flameP.push({ x: torchR.x + 34, y: torchR.y - 86, vx: (Math.random() - 0.5) * 60, vy: -80 - Math.random() * 80, life: 0.3 + Math.random() * 0.3, size: 10 + Math.random() * 18 });
      for (var fp = flameP.length - 1; fp >= 0; fp--) { var f = flameP[fp]; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 30 * dt; f.life -= dt * 2; if (f.life <= 0) flameP.splice(fp, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var fp2 = 0; fp2 < flameP.length; fp2++) { var fa = flameP[fp2]; game.draw.rect(snap(fa.x) - fa.size * fa.life / 2, snap(fa.y) - fa.size * fa.life / 2, fa.size * fa.life, fa.size * fa.life, fa.life > 0.5 ? C.c : (fa.life > 0.2 ? C.f : C.a), fa.life * 0.8); }
    for (var ri2 = 0; ri2 < runners.length; ri2++) drawRunner(runners[ri2], ri2);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.a, flash * 0.15);

    // 炎メーター
    var fCol = flameLife > 0.5 ? C.f : flameLife > 0.25 ? C.c : C.a;
    game.draw.rect(W / 2 - 200, snap(H * 0.90), 400, 24, '#1a0e04', 0.7);
    game.draw.rect(W / 2 - 200, snap(H * 0.90), snap(400 * flameLife), 24, fCol, 0.9);
    txt('FLAME ' + Math.round(flameLife * 100) + '%', W / 2, snap(H * 0.935), 32, fCol);
    if (flameLife < 0.3 && Math.floor(game.time.elapsed * 8) % 2 === 0) txt('TAP!', W / 2, snap(H * 0.965), 48, C.a);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
