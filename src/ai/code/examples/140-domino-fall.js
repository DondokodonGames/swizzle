// 140-domino-fall.js
// ドミノ倒し — 最初の1枚を倒す瞬間の連鎖の興奮を体験する
// 操作: タップで先頭のドミノを押す
// 成功: 全ドミノ倒す  失敗: 10秒以内に倒しきれない

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'DOMINO FALL';
  var HOW_TO_PLAY = 'TAP TO PUSH THE FIRST DOMINO';
  var MAX_TIME = 10;             // 修正2: 20 → 10
  var COUNT = 8;                 // 修正2: 18 → 8（連鎖短め）
  var TOP    = 220;
  var BOTTOM = H - 180;

  var DOMINO_W = 40, DOMINO_H = 120;
  var GROUND_Y = snap(H * 0.62);
  var SPACING = snap((W - 160) / (COUNT - 1));
  var START_X = snap(80);
  var FALL_SPEED = 4.0, FALL_ANGLE = Math.PI / 2;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var dominos, started, timeLeft, done, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }

  function timeBar() {
    var lit = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(0, GROUND_Y, W, 8, C.d);
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, C.d, 0.25);
  }

  // ── ドミノスプライト（8pxブロックで傾く） ──
  function drawDomino(d, highlight) {
    var pivX = d.x + DOMINO_W / 2, pivY = GROUND_Y;
    var ax = Math.sin(d.angle), ay = -Math.cos(d.angle);
    var col = d.fallen ? C.d : (highlight ? C.c : C.e);
    for (var len = 8; len <= DOMINO_H; len += 8) {
      var bx = pivX + ax * len, by = pivY + ay * len;
      for (var w = -DOMINO_W / 2; w < DOMINO_W / 2; w += 8) {
        var wx = -Math.cos(d.angle) * w, wy = -Math.sin(d.angle) * w;
        game.draw.rect(snap(bx + wx) - 4, snap(by + wy) - 4, 8, 8, col, d.fallen ? 0.7 : 1);
      }
    }
    // ピップ（点）
    if (!d.fallen) {
      var px = pivX + ax * DOMINO_H * 0.6, py = pivY + ay * DOMINO_H * 0.6;
      game.draw.rect(snap(px) - 6, snap(py) - 6, 12, 12, C.g);
    }
  }

  function initGame() {
    dominos = [];
    for (var i = 0; i < COUNT; i++) dominos.push({ x: START_X + i * SPACING, angle: 0, falling: false, fallen: false });
    started = false;
    timeLeft = MAX_TIME;
    done = false;
    particles = [];
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    var fallen = dominos.filter(function(d) { return d.fallen; }).length;
    finalScore = success ? (COUNT * 60 + Math.ceil(timeLeft) * 40) : fallen * 40;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || started) return;
    started = true;
    dominos[0].falling = true;
    game.audio.play('se_tap', 0.8);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      for (var d = 0; d < COUNT; d++) {
        var da = Math.max(0, Math.min(FALL_ANGLE, (game.time.elapsed * 2 - d * 0.3)));
        drawDomino({ x: START_X + d * SPACING, angle: da % (FALL_ANGLE + 1), fallen: false }, d === 0);
      }
      txt(GAME_TITLE, W / 2, H * 0.16, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 32, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.80, 64, C.a);
        txt('TAP TO START', W / 2, H * 0.86, 50, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.92, 40, '#886699');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CHAIN COMPLETE!' : 'TIME OUT', W / 2, H * 0.35, 68, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      for (var i = 0; i < dominos.length; i++) {
        var dm = dominos[i];
        if (!dm.falling || dm.fallen) continue;
        dm.angle += FALL_SPEED * dt;
        if (dm.angle >= FALL_ANGLE) {
          dm.angle = FALL_ANGLE; dm.fallen = true; dm.falling = false;
          if (i + 1 < dominos.length) {
            dominos[i + 1].falling = true;
            game.audio.play('se_tap', 0.5);
            for (var pi = 0; pi < 5; pi++) {
              var ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
              particles.push({ x: dominos[i + 1].x, y: GROUND_Y - DOMINO_H / 2, vx: Math.cos(ang) * 120, vy: Math.sin(ang) * 120, life: 0.4 });
            }
          } else { finish(true); return; }
        }
      }
    }
    for (var p = 0; p < particles.length; p++) {
      particles[p].x += particles[p].vx * dt; particles[p].y += particles[p].vy * dt;
      particles[p].vy += 400 * dt; particles[p].life -= dt;
    }
    particles = particles.filter(function(pt) { return pt.life > 0; });

    // ---- 描画 ----
    background();
    for (var i2 = 0; i2 < dominos.length; i2++) drawDomino(dominos[i2], i2 === 0 && !started);
    for (var pp = 0; pp < particles.length; pp++) {
      game.draw.rect(snap(particles[pp].x) - 4, snap(particles[pp].y) - 4, 8, 8, C.e, particles[pp].life * 2.5);
    }
    if (!started && Math.floor(game.time.elapsed * 8) % 2 === 0) {
      txt('PUSH!', dominos[0].x + 40, GROUND_Y - DOMINO_H - 40, 44, C.c, 'left');
    }

    var fallen = dominos.filter(function(dd) { return dd.fallen; }).length;
    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(fallen + ' / ' + COUNT, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
