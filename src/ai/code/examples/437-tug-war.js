// 437-tug-war.js
// 綱引き — 連打でパワーを溜め、綱の中心マーカーを自分側のラインまで引き込む力比べ
// 操作: 素早く連打してロープを引く（相手も引き返してくる）
// 成功: 自分側ラインまで 引き込む  失敗: 相手側に 引き込まれる or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、運動会） ──
  var C = { bg:'#0a0500', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TUG OF WAR';
  var HOW_TO_PLAY = 'TAP FAST TO PULL THE ROPE TO YOUR SIDE';
  var MAX_TIME = 15;
  var WIN_DIST = 200;
  var CY = snap(H * 0.52), PX = snap(W * 0.22), EX = snap(W * 0.78);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var offset, vel, power, tapCount, tapCd, timeLeft, done, particles, flash, flashCol;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a0c00');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, snap(H * 0.62), W, H, '#1a0c00', 0.9); game.draw.rect(0, snap(H * 0.62), W, 4, C.f, 0.4); }

  function initGame() { offset = 0; vel = 0; power = 0; tapCount = 0; tapCd = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.ceil(timeLeft) * 200 + tapCount * 20) : tapCount * 10;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawWrestler(x, col, lean) {
    pc(x, CY - 84, 40, col, 0.9); pc(x - 12, CY - 92, 14, C.g, 0.5); game.draw.rect(snap(x - 34), snap(CY - 44), 68, 44, col, 0.85);
    pline(x - 16, CY, x - 30, CY + 56, C.g, 0.7, 8); pline(x + 16, CY, x + 30, CY + 56, C.g, 0.7, 8);
    pline(x + lean * 36, CY - 24, x + lean * 70 + offset * 0.5, CY + 4, C.g, 0.7, 8);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || tapCd > 0) return;
    tapCd = 0.05; tapCount++; power = Math.min(100, power + 8); vel += 16; game.audio.play('se_tap', 0.2);
    particles.push({ x: PX, y: CY - 80, vx: -50 - Math.random() * 50, vy: -80 - Math.random() * 40, life: 0.4, col: C.e });
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (offset === undefined) initGame(); background();
      pline(PX + offset, CY, EX + offset, CY, C.f, 0.9, 14); drawWrestler(EX, C.a, -1); drawWrestler(PX, C.e, 1);
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.91, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'HEAVE HO!' : 'DRAGGED OUT', W / 2, H * 0.35, 72, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2; if (tapCd > 0) tapCd -= dt;
      var enemyForce = 7 + (MAX_TIME - timeLeft) * 0.5; vel -= enemyForce * dt * 60;
      power *= (1 - dt * 3); if (power < 0) power = 0;
      vel *= (1 - dt * 4); offset += vel * dt;
      if (offset >= WIN_DIST) { flash = 1.0; flashCol = C.b; for (var k = 0; k < 20; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2 + offset, y: CY, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250 - 150, life: 0.9, col: C.c }); } finish(true); return; }
      if (offset <= -WIN_DIST) { flash = 1.0; flashCol = C.a; finish(false); return; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    var cx = W / 2, ml = cx - WIN_DIST, mr = cx + WIN_DIST;
    game.draw.rect(mr - 2, snap(H * 0.44), 4, snap(H * 0.2), C.e, 0.7); game.draw.rect(ml - 2, snap(H * 0.44), 4, snap(H * 0.2), C.a, 0.7);
    for (var ri = 0; ri < 16; ri++) { var rx1 = PX + offset + (W * 0.56 / 16) * ri, ry = CY + Math.sin((ri / 16 + game.time.elapsed * 2) * Math.PI * 2) * 6; game.draw.rect(snap(rx1), snap(ry) - 7, snap(W * 0.56 / 16), 14, ri % 2 === 0 ? C.f : '#8a4a10', 0.9); }
    var rc = cx + offset; game.draw.rect(rc - 3, snap(H * 0.46), 6, snap(H * 0.16), C.b, 0.8); pc(rc, CY, 18, C.c, 0.8);
    drawWrestler(EX, C.a, -1); drawWrestler(PX, C.e, 1);
    var pr = power / 100; game.draw.rect(W * 0.06, snap(H * 0.72), W * 0.35, 28, '#1a0c00', 0.8); game.draw.rect(W * 0.06, snap(H * 0.72), W * 0.35 * pr, 28, C.b, 0.85); txt('POWER', W * 0.06 + W * 0.175, snap(H * 0.72) - 20, 30, C.b);
    txt('MASH!', W / 2, snap(H * 0.78), 54, C.c);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    var or = offset / WIN_DIST; game.draw.rect(W * 0.15, 160, W * 0.7, 20, '#1a0c00', 0.8); game.draw.rect(W * 0.5, 160, W * 0.35 * Math.max(-1, Math.min(1, or)), 20, or > 0 ? C.e : C.a, 0.85);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
    state = S.ATTRACT;
    initGame();
  });
})(game);
