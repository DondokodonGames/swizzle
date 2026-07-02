// 306-ghost-type.js
// ゴーストタイプ — 浮遊する幽霊の弱点属性をスワイプで選び、正しい属性でタップして祓う
// 操作: スワイプで属性選択（上=火 下=水 左=草 右=雷）→ 幽霊をタップ
// 成功: 3体祓う  失敗: 3回属性ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、心霊の間） ──
  var C = { bg:'#060210', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var TYPES = ['fire', 'water', 'grass', 'thunder'];
  var TYPE_COL = { fire: C.f, water: C.e, grass: C.b, thunder: C.c };
  var TYPE_LTR = { fire: 'F', water: 'W', grass: 'G', thunder: 'T' };
  var SWIPE_TYPE = { up: 'fire', down: 'water', left: 'grass', right: 'thunder' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'GHOST TYPE';
  var HOW_TO_PLAY = 'SWIPE TO PICK ELEMENT · TAP THE GHOST';
  var MAX_TIME = 15;
  var NEEDED   = 3;          // 修正2: 20 → 3
  var MAX_ERR  = 3;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var ghosts, selType, selTimer, defeated, errors, timeLeft, done, spawnTimer, particles;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#100820');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnGhost() { if (ghosts.length >= 3) return; ghosts.push({ x: snap(150 + Math.random() * (W - 300)), y: H + 100, vy: -110 - Math.random() * 60, weak: TYPES[Math.floor(Math.random() * 4)], revealed: false, life: 7, hit: 0 }); }

  function initGame() { ghosts = []; selType = null; selTimer = 0; defeated = 0; errors = 0; timeLeft = MAX_TIME; done = false; spawnTimer = 0.3; particles = []; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (defeated * 500 + Math.ceil(timeLeft) * 100) : defeated * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawGhost(g) {
    var wob = Math.floor(game.time.elapsed * 4) % 2 ? 12 : -12, r = 66;
    var blink = g.hit > 0 && Math.floor(game.time.elapsed * 16) % 2 === 0, col = blink ? C.a : C.d;
    pc(g.x + wob, g.y, r, col, 0.85);
    game.draw.rect(snap(g.x + wob - r * 0.35), snap(g.y - r * 0.2), 14, 14, C.g, 0.9); game.draw.rect(snap(g.x + wob + r * 0.15), snap(g.y - r * 0.2), 14, 14, C.g, 0.9);
    for (var wb = 0; wb < 3; wb++) game.draw.rect(snap(g.x + wob - r + wb * (r * 2 / 3)), snap(g.y + r - 8), snap(r * 2 / 3), 16, C.bg, 1);
    // 弱点バッジ
    var bx = g.x + wob + r * 0.55, by = g.y - r * 0.55;
    if (g.revealed) { pc(bx, by, 26, TYPE_COL[g.weak], 0.95); txt(TYPE_LTR[g.weak], bx, by + 12, 34, '#000'); }
    else { pc(bx, by, 26, '#1a1030', 0.9); txt('?', bx, by + 12, 34, C.g); }
  }

  // ── 入力 ──
  game.onSwipe(function(d) { if (state !== S.PLAYING || done) return; var t = SWIPE_TYPE[d]; if (t) { selType = t; selTimer = 2.0; game.audio.play('se_tap', 0.25); } });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || !selType) return;
    for (var gi = ghosts.length - 1; gi >= 0; gi--) {
      var g = ghosts[gi], dx = x - g.x, dy = y - g.y;
      if (dx * dx + dy * dy < 84 * 84) {
        if (selType === g.weak) {
          defeated++; game.audio.play('se_success', 0.5);
          for (var k = 0; k < 8; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: g.x, y: g.y, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, life: 0.6, col: TYPE_COL[selType] }); }
          ghosts.splice(gi, 1); selType = null;
          if (defeated >= NEEDED) { finish(true); return; }
        } else {
          errors++; g.hit = 0.4; selType = null; game.audio.play('se_failure', 0.4);
          if (errors >= MAX_ERR) { finish(false); return; }
        }
        return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!ghosts) initGame(); background(); drawGhost({ x: W / 2, y: H * 0.42, weak: 'fire', revealed: true, hit: 0 });
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
      txt(resultSuccess ? 'EXORCISED!' : 'HAUNTED', W / 2, H * 0.35, 76, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (selTimer > 0) { selTimer -= dt; if (selTimer <= 0) selType = null; }
      spawnTimer -= dt; if (spawnTimer <= 0) { spawnGhost(); spawnTimer = 1.4 + Math.random() * 0.8; }
      for (var gi = ghosts.length - 1; gi >= 0; gi--) {
        var g = ghosts[gi]; g.y += g.vy * dt; g.life -= dt; if (g.hit > 0) g.hit -= dt;
        if (g.y < H * 0.66) g.revealed = true;
        if (g.y < H * 0.18) g.vy = Math.abs(g.vy);
        if (g.life <= 0 || g.y > H + 120) ghosts.splice(gi, 1);
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var gi2 = 0; gi2 < ghosts.length; gi2++) drawGhost(ghosts[gi2]);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    // 属性ボタン表示
    var arr = [['fire', '^ FIRE'], ['water', 'v WATER'], ['grass', '< GRASS'], ['thunder', 'THUNDER >']];
    for (var bt = 0; bt < 4; bt++) { var bx = snap(W * 0.13 + bt * W * 0.22), on = selType === arr[bt][0]; game.draw.rect(bx - 44, snap(H * 0.82), 88, 88, on ? TYPE_COL[arr[bt][0]] : '#161028', 0.9); txt(TYPE_LTR[arr[bt][0]], bx, snap(H * 0.82) + 58, 44, on ? '#000' : TYPE_COL[arr[bt][0]]); }
    txt(selType ? TYPE_LTR[selType] + ' SELECTED - TAP!' : 'SWIPE TO SELECT', W / 2, snap(H * 0.78), 34, selType ? TYPE_COL[selType] : '#66557a');

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(defeated + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#100820');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
