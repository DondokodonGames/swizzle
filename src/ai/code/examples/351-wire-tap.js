// 351-wire-tap.js
// ワイヤータップ — 表示された番号順を覚え、その順にスイッチをタップで切って回路を無力化する
// 操作: 番号どおりの順でスイッチをタップ（順番を間違えると爆発）
// 成功: 3回 回路を切断  失敗: 3回 間違える or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、爆弾解除盤） ──
  var C = { bg:'#020a06', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#eaffea', wire:'#0a3018' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'WIRE TAP';
  var HOW_TO_PLAY = 'MEMORIZE THE ORDER · TAP SWITCHES OFF IN SEQUENCE';
  var MAX_TIME = 15;
  var NEEDED   = 3;          // 修正2: 5 → 3
  var MAX_FAIL = 3;
  var N = 4;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var switches, order, tapped, phase, showTimer, attempts, fails, timeLeft, done, particles, fbText, fbCol, fbTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.2) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a2010');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, snap(H * 0.5) - 6, W, 12, C.wire, 0.9); }

  function setupRound() {
    switches = []; var ys = [snap(H * 0.34), snap(H * 0.45), snap(H * 0.56), snap(H * 0.67)];
    var idx = [0, 1, 2, 3]; for (var i = idx.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
    order = idx.slice(); tapped = [];
    for (var s = 0; s < N; s++) switches.push({ x: snap(W / 2), y: ys[s], on: true, num: order.indexOf(s) + 1 });
    phase = 'show'; showTimer = 2.0;
  }

  function initGame() { attempts = 0; fails = 0; timeLeft = MAX_TIME; done = false; particles = []; fbText = ''; fbCol = C.g; fbTimer = 0; setupRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (attempts * 500 + Math.ceil(timeLeft) * 100) : attempts * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBoard() {
    for (var i = 0; i < switches.length; i++) {
      var sw = switches[i]; game.draw.rect(snap(sw.x) - 84, snap(sw.y) - 32, 168, 64, sw.on ? '#0a3018' : '#153020', 0.9); game.draw.rect(snap(sw.x) - 84, snap(sw.y) - 32, 168, 8, sw.on ? C.b : C.wire, 0.6);
      txt(sw.on ? 'ON' : 'OFF', sw.x, sw.y + 14, 40, sw.on ? C.b : '#557');
      if (phase === 'show') { pc(sw.x + 120, sw.y, 26, C.c, 0.9); txt('' + sw.num, sw.x + 120, sw.y + 12, 34, '#000'); }
    }
    if (phase === 'play') { var ni = order[tapped.length]; if (ni !== undefined) ring(switches[ni].x, switches[ni].y, 96 + 6 * (Math.floor(game.time.elapsed * 6) % 2), C.b, 0.6); }
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || phase !== 'play') return;
    for (var i = 0; i < switches.length; i++) {
      var sw = switches[i]; if (!sw.on) continue;
      if (Math.abs(x - sw.x) < 100 && Math.abs(y - sw.y) < 44) {
        if (i === order[tapped.length]) {
          sw.on = false; tapped.push(i); game.audio.play('se_tap', 0.4);
          if (tapped.length === N) { attempts++; fbText = 'DEFUSED!'; fbCol = C.b; fbTimer = 0.8; game.audio.play('se_success', 0.7); for (var k = 0; k < 10; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H * 0.5, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, life: 0.7, col: C.b }); } if (attempts >= NEEDED) { finish(true); return; } phase = 'wait'; setTimeout(function() { if (!done) setupRound(); }, 800); }
        } else {
          fails++; fbText = 'BOOM!'; fbCol = C.a; fbTimer = 0.8; game.audio.play('se_failure', 0.7); for (var k2 = 0; k2 < 15; k2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: sw.x, y: sw.y, vx: Math.cos(a2) * 300, vy: Math.sin(a2) * 300, life: 0.8, col: C.a }); } if (fails >= MAX_FAIL) { finish(false); return; } phase = 'wait'; setTimeout(function() { if (!done) setupRound(); }, 900);
        }
        return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!switches) initGame(); background(); drawBoard();
      txt(GAME_TITLE, W / 2, H * 0.14, 78, C.b);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.e);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL DEFUSED!' : 'DETONATED', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
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
      if (phase === 'show') { showTimer -= dt; if (showTimer <= 0) phase = 'play'; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawBoard();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (phase === 'show') txt('MEMORIZE THE ORDER', W / 2, snap(H * 0.26), 48, C.c);
    else if (phase === 'play') txt('TAP NEXT IN ORDER', W / 2, snap(H * 0.78), 40, C.b);
    if (fbTimer > 0) txt(fbText, W / 2, snap(H * 0.84), 62, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(attempts + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var fi = 0; fi < MAX_FAIL; fi++) game.draw.rect(snap(W / 2 + (fi - (MAX_FAIL - 1) / 2) * 56) - 10, 224, 20, 20, fi < fails ? C.a : '#0a2010');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
