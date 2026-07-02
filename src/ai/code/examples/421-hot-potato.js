// 421-hot-potato.js
// ホットポテト — 熱を持つポテトが爆発する前に、3人の間でスワイプ／タップして手早くパスし続ける
// 操作: 持っている人からパス先の方向へスワイプ、または相手をタップして投げる
// 成功: 6回 パス成功  失敗: 持ちすぎて爆発 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、パーティ） ──
  var C = { bg:'#150800', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'HOT POTATO';
  var HOW_TO_PLAY = 'PASS THE POTATO BEFORE IT BLOWS · SWIPE OR TAP A PLAYER';
  var MAX_TIME = 15;
  var NEEDED   = 6;          // 修正2: 30 → 6
  var MAX_HEAT = 3.0, HEAT_RATE = 1.0;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var people, potato, passes, timeLeft, done, particles, flash;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#2a1000');
  }

  function background() { game.draw.clear(C.bg); }

  function initGame() { people = [{ x: snap(W * 0.5), y: snap(H * 0.28), name: 'A', has: true, heat: 0 }, { x: snap(W * 0.18), y: snap(H * 0.66), name: 'B', has: false, heat: 0 }, { x: snap(W * 0.82), y: snap(H * 0.66), name: 'C', has: false, heat: 0 }]; potato = null; passes = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (passes * 400 + Math.ceil(timeLeft) * 100) : passes * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function holder() { for (var i = 0; i < people.length; i++) if (people[i].has) return i; return -1; }

  function throwTo(fi, ti) {
    var from = people[fi], to = people[ti]; from.has = false;
    var dx = to.x - from.x, dy = to.y - from.y, d = Math.max(1, Math.hypot(dx, dy)), sp = d * 2.5;
    potato = { x: from.x, y: from.y, vx: dx / d * sp, vy: dy / d * sp, toIdx: ti, heat: from.heat }; from.heat = 0; passes++; game.audio.play('se_tap', 0.4);
    if (passes >= NEEDED) { finish(true); }
  }

  function drawPerson(p) {
    var hot = p.has, col = hot ? C.c : C.b;
    pc(p.x, p.y, 62, col, hot ? 0.8 + Math.sin(game.time.elapsed * 8) * 0.1 : 0.6); pc(p.x, p.y - 50, 34, col, 0.8); pc(p.x - 12, p.y - 58, 12, C.g, 0.5);
    txt(p.name, p.x, p.y + 18, 50, hot ? C.c : C.g);
    if (hot) { var hr = p.heat / MAX_HEAT; game.draw.rect(snap(p.x - 60), snap(p.y + 74), 120, 18, '#1a0a00', 0.9); game.draw.rect(snap(p.x - 60), snap(p.y + 74), snap(120 * hr), 18, hr > 0.7 ? C.a : hr > 0.4 ? C.f : C.c, 0.9); }
  }

  function drawPotato(x, y, heat) { pc(x, y, 32, C.f, 0.9); pc(x - 8, y - 12, 12, C.c, 0.5); var fr = 16 + heat / MAX_HEAT * 26; pc(x, y - 26, fr, C.f, 0.7); pc(x, y - 34, fr * 0.6, C.c, 0.6); }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || potato) return; var hi = holder(); if (hi < 0) return;
    var best = -1, bd = 999999; for (var i = 0; i < people.length; i++) { if (i === hi) continue; var d = Math.hypot(x - people[i].x, y - people[i].y); if (d < bd) { bd = d; best = i; } }
    if (best >= 0 && bd < 300) throwTo(hi, best);
  });

  game.onSwipe(function(d) {
    if (state !== S.PLAYING || done || potato) return; var hi = holder(); if (hi < 0) return; var ti = -1;
    if (hi === 0) { if (d === 'left' || d === 'down') ti = 1; else if (d === 'right') ti = 2; }
    else if (hi === 1) { if (d === 'right') ti = 2; else if (d === 'up') ti = 0; }
    else { if (d === 'left') ti = 1; else if (d === 'up') ti = 0; }
    if (ti >= 0) throwTo(hi, ti);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!people) initGame(); background(); for (var pi0 = 0; pi0 < people.length; pi0++) drawPerson(people[pi0]); drawPotato(people[0].x, people[0].y - 80, 0);
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.15, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'HOT HANDS!' : 'BOOM!', W / 2, H * 0.35, 82, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2;
      var hi = holder();
      if (hi >= 0) { var h = people[hi]; h.heat += HEAT_RATE * dt * (1 + passes * 0.06); if (h.heat >= MAX_HEAT) { for (var k = 0; k < 20; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: h.x, y: h.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300 - 100, life: 0.9, col: Math.random() < 0.5 ? C.f : C.c }); } game.audio.play('se_failure', 0.9); finish(false); return; } }
      if (potato) { potato.x += potato.vx * dt; potato.y += potato.vy * dt; var t = people[potato.toIdx]; if (Math.hypot(t.x - potato.x, t.y - potato.y) < 60) { t.has = true; t.heat = potato.heat; potato = null; flash = 0.3; } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var pi = 0; pi < people.length; pi++) drawPerson(people[pi]);
    var h2 = holder(); if (h2 >= 0 && !potato) drawPotato(people[h2].x, people[h2].y - 80, people[h2].heat);
    if (potato) drawPotato(potato.x, potato.y, potato.heat);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.c, flash * 0.08);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(passes + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
    state = S.ATTRACT;
    initGame();
  });
})(game);
