// 364-wind-chime.js
// ウィンドチャイム — 番号で示されたメロディの順に、その風鈴の上をスワイプで鳴らして曲を奏でる
// 操作: 目標メロディの順番どおりに風鈴をスワイプして鳴らす
// 成功: 3つのメロディを完成  失敗: 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、縁側の風鈴） ──
  var C = { bg:'#020c18', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'WIND CHIME';
  var HOW_TO_PLAY = 'SWIPE THE CHIMES IN THE MELODY ORDER';
  var MAX_TIME = 15;
  var NEEDED   = 3;          // 修正2: 8 → 3
  var NUM = 5;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var chimes, melody, player, completed, timeLeft, done, particles, notes, okAnim, ngAnim, windDir, windStr;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.24) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1a2e');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(snap(W * 0.05), snap(H * 0.22), snap(W * 0.9), 16, '#4a3a20', 0.9); }

  function setupChimes() { chimes = []; for (var i = 0; i < NUM; i++) chimes.push({ x: snap(W * 0.12 + i * W * 0.76 / (NUM - 1)), baseY: snap(H * 0.24), angle: 0, vel: 0, ring: 0, len: 150 + i * 20 }); }

  function genMelody() { melody = []; player = []; var len = 3; for (var i = 0; i < len; i++) melody.push(Math.floor(Math.random() * NUM)); }

  function initGame() { setupChimes(); completed = 0; timeLeft = MAX_TIME; done = false; particles = []; notes = []; okAnim = 0; ngAnim = 0; windDir = 0; windStr = 0; genMelody(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (completed * 500 + Math.ceil(timeLeft) * 100) : completed * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function ringChime(i) { chimes[i].vel += (Math.random() > 0.5 ? 1 : -1) * 2; chimes[i].ring = 0.6; game.audio.play('se_tap', 0.3 + i * 0.06); notes.push({ x: chimes[i].x, y: chimes[i].baseY + chimes[i].len, life: 1.0 }); }

  function drawScene() {
    for (var i = 0; i < chimes.length; i++) {
      var c = chimes[i], tx = c.x + Math.sin(c.angle) * c.len, ty = c.baseY + Math.cos(c.angle) * c.len, lit = c.ring > 0;
      if (melody[player.length] === i) ring(c.x, c.baseY, 26 + 4 * (Math.floor(game.time.elapsed * 4) % 2), C.b, 0.5);
      pline(c.x, c.baseY + 16, tx, ty - 18, lit ? C.g : C.e, 0.7, 4);
      pc(tx, ty, 22, lit ? C.c : C.d, 0.9); pc(tx, ty, 12, lit ? C.g : C.e, 0.8);
      txt('' + (i + 1), c.x, c.baseY + 4, 26, C.e);
    }
    for (var n = 0; n < notes.length; n++) { pc(notes[n].x, notes[n].y, 10 * notes[n].life, C.a, notes[n].life * 0.7); }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(d, x1, y1, x2, y2) {
    if (state !== S.PLAYING || done) return;
    windDir = Math.sign(x2 - x1); windStr = Math.min(1, Math.abs(x2 - x1) / W * 3);
    var minX = Math.min(x1, x2) - 40, maxX = Math.max(x1, x2) + 40;
    for (var i = 0; i < NUM; i++) {
      if (chimes[i].x >= minX && chimes[i].x <= maxX) {
        ringChime(i);
        if (melody[player.length] === i) {
          player.push(i);
          if (player.length === melody.length) { completed++; okAnim = 1.0; game.audio.play('se_success', 0.7); for (var k = 0; k < 12; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H * 0.5, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.7, col: C.a }); } if (completed >= NEEDED) { finish(true); return; } setTimeout(function() { if (!done) genMelody(); }, 800); }
        } else { player = []; ngAnim = 0.5; game.audio.play('se_failure', 0.3); }
        break;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!chimes) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.62, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.68, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'HARMONY!' : 'DISCORD', W / 2, H * 0.35, 78, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (okAnim > 0) okAnim -= dt * 1.5; if (ngAnim > 0) ngAnim -= dt * 3; windStr *= (1 - 2 * dt);
      for (var i = 0; i < chimes.length; i++) { var c = chimes[i]; c.vel += (-c.angle * 6 + windDir * windStr * 3) * dt; c.vel *= (1 - 2 * dt); c.angle += c.vel * dt; c.angle = Math.max(-0.8, Math.min(0.8, c.angle)); if (c.ring > 0) c.ring -= dt * 2; }
      for (var nt = notes.length - 1; nt >= 0; nt--) { notes[nt].y -= 60 * dt; notes[nt].life -= dt * 1.5; if (notes[nt].life <= 0) notes.splice(nt, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    // 目標メロディ
    txt('MELODY', W / 2, snap(H * 0.72), 34, C.d);
    for (var mi = 0; mi < melody.length; mi++) { var mx = snap(W / 2 - (melody.length - 1) * 40 + mi * 80), on = mi < player.length; pc(mx, snap(H * 0.78), 24, on ? C.b : '#1a3050', 0.9); txt('' + (melody[mi] + 1), mx, snap(H * 0.78) + 10, 30, on ? '#000' : C.e); }
    if (okAnim > 0) txt('MELODY DONE!', W / 2, snap(H * 0.86), 50, C.b);
    else if (ngAnim > 0) txt('WRONG ORDER', W / 2, snap(H * 0.86), 46, C.a);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(completed + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
