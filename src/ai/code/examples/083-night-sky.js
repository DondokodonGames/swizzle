// 083-night-sky.js
// 星座つなぎ — 夜空に浮かぶ星を正しい順番でタップして星座を描く
// 操作: タップで星を順番につなぐ
// 成功: 1つの星座を完成させる  失敗: 3回間違える or 40秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'STAR LINK';
  var HOW_TO_PLAY = 'CONNECT STARS IN ORDER';
  var MAX_TIME = 40;
  var NEEDED = 1;           // 修正2: 5 → 1
  var MAX_MISS = 3;
  var PLAY_Y = H * 0.24, PLAY_H = H * 0.5;

  var CONSTELLATIONS = [
    { name: 'BIG DIPPER', stars: [{x:0.25,y:0.30},{x:0.35,y:0.25},{x:0.50,y:0.28},{x:0.62,y:0.32},{x:0.70,y:0.44},{x:0.65,y:0.56},{x:0.72,y:0.62}] },
    { name: 'ORION',      stars: [{x:0.35,y:0.22},{x:0.65,y:0.22},{x:0.30,y:0.38},{x:0.70,y:0.38},{x:0.40,y:0.50},{x:0.60,y:0.50},{x:0.50,y:0.62}] },
    { name: 'CASSIOPEIA', stars: [{x:0.20,y:0.35},{x:0.35,y:0.25},{x:0.50,y:0.35},{x:0.65,y:0.25},{x:0.80,y:0.35}] },
    { name: 'SOUTH CROSS',stars: [{x:0.50,y:0.22},{x:0.50,y:0.58},{x:0.28,y:0.40},{x:0.72,y:0.40}] }
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var curIdx, progress, lines, score, misses, timeLeft, done, feedback, flash, bgStars;

  function snap(v) { return Math.round(v / 8) * 8; }
  function drawPixelCircle(px, py, r, color, alpha) {
    var step = 8; px = snap(px); py = snap(py);
    for (var yy = -r; yy <= r; yy += step)
      for (var xx = -r; xx <= r; xx += step)
        if (xx * xx + yy * yy <= r * r) game.draw.rect(px + xx, py + yy, step, step, color, alpha);
  }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function con() { return CONSTELLATIONS[curIdx]; }
  function starPos(s) { return { x: s.x * W, y: PLAY_Y + s.y * PLAY_H }; }

  function initGame() {
    curIdx = Math.floor(Math.random() * CONSTELLATIONS.length);
    progress = 0; lines = []; score = 0; misses = 0; timeLeft = MAX_TIME; done = false; feedback = 0; flash = 0;
    bgStars = []; for (var i = 0; i < 50; i++) bgStars.push({ x: snap(Math.random() * W), y: snap(Math.random() * H), ph: Math.floor(Math.random() * 4) });
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (400 + Math.ceil(timeLeft) * 40) : progress * 60;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    var c = con(), sp = starPos(c.stars[progress]), dx = tx - sp.x, dy = ty - sp.y;
    if (Math.sqrt(dx * dx + dy * dy) < 80) {
      if (progress > 0) { var pv = starPos(c.stars[progress - 1]); lines.push({ x1: pv.x, y1: pv.y, x2: sp.x, y2: sp.y }); }
      progress++; game.audio.play('se_tap', 0.7);
      if (progress >= c.stars.length) { score++; flash = 0.6; if (score >= NEEDED) finish(true); }
    } else {
      for (var j = progress + 1; j < c.stars.length; j++) {
        var sp2 = starPos(c.stars[j]);
        if (Math.sqrt((tx - sp2.x) * (tx - sp2.x) + (ty - sp2.y) * (ty - sp2.y)) < 80) {
          misses++; feedback = 0.4; game.audio.play('se_failure', 0.6); if (misses >= MAX_MISS) finish(false); break;
        }
      }
    }
  });

  // 世界観: プラネタリウム。番号順に星を結んで夜空に星座を描く。
  function background() {
    game.draw.clear('#000011');
    for (var i = 0; i < bgStars.length; i++) { var b = bgStars[i], a = Math.floor(game.time.elapsed * 2 + b.ph) % 2 === 0 ? 0.5 : 0.15; game.draw.rect(b.x, b.y, 8, 8, C.c, a); }
    if (flash > 0) game.draw.rect(0, 0, W, H, C.d, flash / 0.6 * 0.15);
    txt('PLANETARIUM', W / 2, 250, 34, C.b);
  }

  function drawScene() {
    var c = con();
    for (var l = 0; l < lines.length; l++) game.draw.line(lines[l].x1, lines[l].y1, lines[l].x2, lines[l].y2, C.b, 6);
    for (var si = 0; si < c.stars.length; si++) {
      var sp = starPos(c.stars[si]), tapped = si < progress, isNext = si === progress;
      if (tapped) drawPixelCircle(sp.x, sp.y, 20, C.f, 1);
      else if (isNext) { drawPixelCircle(sp.x, sp.y, 28, C.d, 0.4 + 0.3 * (Math.floor(game.time.elapsed * 6) % 2)); drawPixelCircle(sp.x, sp.y, 24, C.d, 1); }
      else { drawPixelCircle(sp.x, sp.y, 16, C.c, 0.6); txt((si + 1) + '', sp.x + 30, sp.y - 30, 30, C.a); }
    }
    txt(c.name, W / 2, H * 0.82, 52, C.c);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (curIdx === undefined) initGame();
      background();
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.12, 84, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.175, 32, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.9, 64, C.g);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.c);
      }
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.d : C.e);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (feedback > 0) feedback -= dt;
      if (flash > 0) flash -= dt;
    }

    // ---- draw ----
    background();
    drawScene();
    if (feedback > 0) txt('WRONG ORDER!', W / 2, H * 0.28, 64, C.e);
    timeBar();
    txt('STAR ' + (progress) + ' / ' + con().stars.length, W / 2, 96, 44, C.c);
    for (var m = 0; m < MAX_MISS; m++) game.draw.rect(W / 2 + (m - 1) * 64 - 20, 150, 40, 40, m < misses ? C.e : '#000833');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
