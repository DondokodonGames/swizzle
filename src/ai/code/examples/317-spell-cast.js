// 317-spell-cast.js
// 呪文詠唱 — 魔法陣に示された方向の並びを、順にスワイプしてなぞり呪文を発動する
// 操作: 示された矢印の順にスワイプ（上下左右）
// 成功: 3回詠唱成功  失敗: 3回間違える or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、魔法陣） ──
  var C = { bg:'#060210', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SPELL CAST';
  var HOW_TO_PLAY = 'SWIPE THE ARROWS IN ORDER TO CAST';
  var MAX_TIME = 15;
  var NEEDED   = 3;          // 修正2: 10 → 3
  var MAX_ERR  = 3;          // 修正2: 5 → 3
  var SPELLS = [
    ['up', 'right', 'down'],
    ['left', 'up', 'right'],
    ['down', 'right', 'up', 'left'],
    ['up', 'up', 'right'],
    ['left', 'down', 'right', 'up']
  ];
  var SYM = { up: '^', down: 'v', left: '<', right: '>' };

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var spell, input, sIdx, cast, errors, timeLeft, done, particles, castAnim, wrongAnim, runeAngle, rings;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.16) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#100820');
  }

  function background() { game.draw.clear(C.bg); }

  function newSpell() { spell = SPELLS[sIdx % SPELLS.length].slice(); sIdx++; input = []; }

  function initGame() { sIdx = 0; cast = 0; errors = 0; timeLeft = MAX_TIME; done = false; particles = []; castAnim = 0; wrongAnim = 0; runeAngle = 0; rings = []; newSpell(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (cast * 500 + Math.ceil(timeLeft) * 100) : cast * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawCircle(cx, cy) {
    ring(cx, cy, 200, C.d, 0.6 + castAnim * 0.3); ring(cx, cy, 130, C.d, 0.3);
    for (var rm = 0; rm < 6; rm++) { var ra = runeAngle + rm / 6 * Math.PI * 2; pc(cx + Math.cos(ra) * 170, cy + Math.sin(ra) * 170, 10, C.d, 0.7); }
    for (var rm2 = 0; rm2 < 8; rm2++) { var ra2 = -runeAngle * 0.5 + rm2 / 8 * Math.PI * 2; game.draw.rect(snap(cx + Math.cos(ra2) * 198) - 4, snap(cy + Math.sin(ra2) * 198) - 4, 8, 8, C.e, 0.6); }
    if (wrongAnim > 0) ring(cx, cy, 210, C.a, wrongAnim);
    if (castAnim > 0) ring(cx, cy, 200 + 100 * (1 - castAnim), C.c, castAnim);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(d) {
    if (state !== S.PLAYING || done || castAnim > 0) return;
    input.push(d); var idx = input.length - 1; game.audio.play('se_tap', 0.25);
    if (d !== spell[idx]) {
      errors++; wrongAnim = 0.6; input = []; game.audio.play('se_failure', 0.5);
      for (var k = 0; k < 8; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H * 0.5, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.5, col: C.a }); }
      if (errors >= MAX_ERR) { finish(false); return; }
      return;
    }
    rings.push({ r: 60 + idx * 30, alpha: 0.8 });
    if (input.length === spell.length) {
      cast++; castAnim = 0.9; game.audio.play('se_success', 0.7);
      for (var k2 = 0; k2 < 14; k2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H * 0.5, vx: Math.cos(a2) * 300, vy: Math.sin(a2) * 300, life: 0.8, col: C.d }); }
      if (cast >= NEEDED) { finish(true); return; }
      setTimeout(function() { if (!done) newSpell(); }, 700);
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    runeAngle += dt * 0.8;
    if (state === S.ATTRACT) {
      background(); drawCircle(W / 2, H * 0.5);
      txt(GAME_TITLE, W / 2, H * 0.14, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ARCANE!' : 'FIZZLED', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (castAnim > 0) castAnim -= dt; if (wrongAnim > 0) wrongAnim -= dt;
      for (var gr = rings.length - 1; gr >= 0; gr--) { rings[gr].r += 50 * dt; rings[gr].alpha -= dt * 1.5; if (rings[gr].alpha <= 0) rings.splice(gr, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var gr2 = 0; gr2 < rings.length; gr2++) ring(W / 2, H * 0.5, rings[gr2].r, C.d, rings[gr2].alpha * 0.5);
    drawCircle(W / 2, H * 0.5);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.6);

    // 呪文の並び
    txt('SPELL', W / 2, snap(H * 0.24), 34, C.d);
    for (var si = 0; si < spell.length; si++) {
      var sx = snap(W / 2 - (spell.length - 1) * 60 + si * 120), inp = si < input.length, ok = inp && input[si] === spell[si];
      txt(SYM[spell[si]], sx, snap(H * 0.30) + 16, 64, inp ? (ok ? C.b : C.a) : C.c);
    }
    // 方向ヒント
    txt('^', W / 2, snap(H * 0.66), 50, C.e); txt('v', W / 2, snap(H * 0.84), 50, C.e); txt('<', snap(W * 0.10), snap(H * 0.5) + 16, 50, C.e); txt('>', snap(W * 0.90), snap(H * 0.5) + 16, 50, C.e);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(cast + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#100820');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
