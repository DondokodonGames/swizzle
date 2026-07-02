// 341-ramen-cook.js
// ラーメンクック — 麺を投入し、ゲージが緑のジャストゾーンに来た瞬間に引き上げる茹で時間タイミング
// 操作: タップで麺を投入、ジャストゾーンでもう一度タップして引き上げ
// 成功: 3杯 完璧に茹でる  失敗: 3杯 失敗 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ラーメン屋台） ──
  var C = { bg:'#0a0400', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', pot:'#241408' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'RAMEN COOK';
  var HOW_TO_PLAY = 'DROP NOODLES · LIFT THEM IN THE GREEN ZONE';
  var MAX_TIME = 15;
  var NEEDED   = 3;          // 修正2: 5 → 3
  var MAX_FAIL = 3;
  var COOK = 3.0, TOL = 0.5, MAXC = COOK * 2.2;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var phase, cookTimer, servings, failures, timeLeft, done, particles, bubbles, fbText, fbCol, fbTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#221400');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(snap(W * 0.18), snap(H * 0.52), snap(W * 0.64), snap(H * 0.24), C.pot, 0.9); game.draw.rect(snap(W * 0.16), snap(H * 0.52), snap(W * 0.68), 14, C.f, 0.5);
    game.draw.rect(snap(W * 0.20), snap(H * 0.54), snap(W * 0.60), snap(H * 0.20), C.e, 0.3);
  }

  function initGame() { phase = 'idle'; cookTimer = 0; servings = 0; failures = 0; timeLeft = MAX_TIME; done = false; particles = []; bubbles = []; fbText = ''; fbCol = C.g; fbTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (servings * 500 + Math.ceil(timeLeft) * 100) : servings * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawNoodles() { for (var ni = 0; ni < 6; ni++) { var nx = snap(W * 0.26 + ni * W * 0.09); for (var ns = 0; ns < 3; ns++) pline(nx + ns * 20, snap(H * 0.56), nx + ns * 20 + 12 * (Math.floor(game.time.elapsed * 4 + ns) % 2 ? 1 : -1), snap(H * 0.56 + 36), C.c, 0.9, 5); } }

  function lift() {
    if (phase !== 'cooking') return;
    phase = 'done'; var diff = Math.abs(cookTimer - COOK);
    if (diff <= TOL) { servings++; fbText = diff < 0.15 ? 'PERFECT!' : 'GOOD!'; fbCol = C.b; game.audio.play('se_success', 0.7); for (var k = 0; k < 10; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H * 0.55, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, life: 0.7, col: C.c }); } if (servings >= NEEDED) { finish(true); return; } }
    else { failures++; fbText = cookTimer < COOK - TOL ? 'UNDERCOOKED!' : 'OVERCOOKED!'; fbCol = C.a; game.audio.play('se_failure', 0.5); if (failures >= MAX_FAIL) { finish(false); return; } }
    fbTimer = 0.9;
    setTimeout(function() { if (!done) phase = 'idle'; }, 700);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (phase === 'idle') { phase = 'cooking'; cookTimer = 0; game.audio.play('se_tap', 0.3); }
    else if (phase === 'cooking') lift();
  });

  // ── 更新 & 描画 ──
  function drawGauge() {
    var gx = snap(W * 0.10), gy = snap(H * 0.44), gw = snap(W * 0.80);
    game.draw.rect(gx, gy, gw, 44, '#221400', 0.9);
    var pl = gx + gw * (COOK - TOL) / MAXC, pr = gx + gw * (COOK + TOL) / MAXC;
    game.draw.rect(snap(pl), gy - 4, snap(pr - pl), 52, C.b, 0.35);
    var pct = Math.min(1, cookTimer / MAXC), col = Math.abs(cookTimer - COOK) < TOL ? C.b : cookTimer > COOK ? C.a : C.c;
    game.draw.rect(gx, gy, snap(gw * pct), 44, col, 0.9);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawNoodles();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'IRASSHAI!' : 'KITCHEN CLOSED', W / 2, H * 0.35, 64, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (fbTimer > 0) fbTimer -= dt;
      if (phase === 'cooking') { cookTimer += dt; if (cookTimer > MAXC) { lift(); return; } }
      if (Math.random() < dt * 8) bubbles.push({ x: snap(W * 0.3 + Math.random() * W * 0.4), y: snap(H * 0.72), vy: -60 - Math.random() * 40, life: 0.8 });
      for (var bi = bubbles.length - 1; bi >= 0; bi--) { bubbles[bi].y += bubbles[bi].vy * dt; bubbles[bi].life -= dt; if (bubbles[bi].life <= 0) bubbles.splice(bi, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var bi2 = 0; bi2 < bubbles.length; bi2++) game.draw.rect(snap(bubbles[bi2].x) - 4, snap(bubbles[bi2].y) - 4, 8, 8, C.e, bubbles[bi2].life * 0.6);
    if (phase === 'cooking' || phase === 'done') drawNoodles();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.4);

    if (phase === 'cooking') { drawGauge(); txt(cookTimer.toFixed(1) + 's', W / 2, snap(H * 0.36), 72, Math.abs(cookTimer - COOK) < TOL ? C.b : cookTimer > COOK ? C.a : C.c); txt('LIFT AT ' + COOK + 's', W / 2, snap(H * 0.40) + 8, 32, C.g); }
    else if (phase === 'idle') txt('TAP TO DROP NOODLES', W / 2, snap(H * 0.40), 46, C.c);
    if (fbTimer > 0) txt(fbText, W / 2, snap(H * 0.82), 60, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(servings + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var fi = 0; fi < MAX_FAIL; fi++) game.draw.rect(snap(W / 2 + (fi - (MAX_FAIL - 1) / 2) * 56) - 10, 224, 20, 20, fi < failures ? C.a : '#221400');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
