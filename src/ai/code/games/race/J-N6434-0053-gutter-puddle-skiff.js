// J-N6434-0053-gutter-puddle-skiff.js
// 雨どいパドルスキフ — 櫂を引いて放し、葉っぱの小舟を水たまりから水たまりへ滑らせて排水口まで運ぶ
// 操作: 画面を押して引っぱり、離すと引いた反対向きに舟が滑る(引いた長さ=勢い)。点線の先が泥なら赤くなる
// 終わり: 3つ先の排水口まで着けば成功。泥に乗り上げる/時間切れで失敗
// @mechanic: slingshot
// @theme: rain_puddle_leaf_skiff
// 世界観: 雨上がりの裏庭で、甲虫の渡し守が葉っぱの小舟を櫂のひと掻きずつ水たまり伝いに漕ぎ、泥に乗り上げる前に排水口の船着き場へ届ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 渡った水たまり数・漕いだ回数
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: 影なしのベタ塗り、丸い形、余白多め
  var STYLE = { bg: ['#d9c7a7', '#bfa782'], main: ['#5cc6f0', '#2e8fcf', '#ffffff'], accent: ['#ff7847', '#ffd23f'] };
  var C = {
    mud: '#c7b08a', mudDark: '#a88f68', water: '#5cc6f0', waterDeep: '#3aa7dc', shine: '#e9f8ff',
    ink: '#2b2a33', good: '#34c77b', bad: '#ff5064', gold: '#ffc233', warn: '#ff7847', white: '#ffffff'
  };

  var GAME_TITLE = 'PUDDLE SKIFF';
  var TIME_LIMIT = 16;
  var NEEDED = 3;
  var RETAIN = 0.5;                 // 1秒あたりの速度保持率
  var LN_R = Math.log(1 / RETAIN);
  var POWER = 2.3;                  // 引いた長さ → 初速
  var MAX_PULL = 280;
  var BOAT_R = 24;
  var CH_HW = 74;                   // 水路の半幅
  var AIM_TIMEOUT = 2.5;

  var POOLS = [
    { x: 540, y: H * 0.69, r: 220 },
    { x: 300, y: H * 0.495, r: 190 },
    { x: 770, y: H * 0.315, r: 180 },
    { x: 430, y: H * 0.18, r: 110 }
  ];
  var PEBBLES = [
    { x: 385, y: 1425, r: 30 }, { x: 695, y: 1245, r: 32 },
    { x: 195, y: 1040, r: 28 }, { x: 405, y: 1065, r: 30 },
    { x: 875, y: 700, r: 30 }, { x: 860, y: 470, r: 26 }
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var bx, by, vx, vy, reached, strokes, timeLeft, ready, hitStop, finished, ok, endWait, done;
  var aiming, aimX0, aimY0, aimX, aimY, aimT, lastStroke, flashObj, rowAnim, bumpCool, score;
  var drops = [], ripples = [];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 2, y + 3, { size: sz, color: 'rgba(0,0,0,0.18)', bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  var SKIFF_A = [
    '.....gg.....',
    '....gGGg....',
    '...gGGGGg...',
    'o.gGbbbbGg.o',
    '.ogGbKKbGgo.',
    '..gGbbbbGg..',
    '..gGGyyGGg..',
    '...gGGGGg...',
    '....gGGg....',
    '.....gg.....'
  ];
  var SKIFF_B = [
    '.....gg.....',
    '....gGGg....',
    '...gGGGGg...',
    '..gGbbbbGg..',
    '.ogGbKKbGgo.',
    'o.gGbbbbGg.o',
    '..gGGyyGGg..',
    '...gGGGGg...',
    '....gGGg....',
    '.....gg.....'
  ];
  var SKIFF_PAL = { g: '#2f9e55', G: '#4fcf73', b: '#7a4bd1', K: '#2b2a33', y: '#ffd23f', o: '#8a5a2b' };
  var STONE = ['.sss.', 'sSSSs', 'sSSSs', '.sss.'];
  var STONE_PAL = { s: '#8d8a93', S: '#b6b3bd' };
  var GRATE = ['kkkkkkk', 'k.k.k.k', 'kkkkkkk', 'k.k.k.k', 'kkkkkkk'];
  var GRATE_PAL = { k: '#4a4d5c' };
  var FROG_A = ['.w.w.', 'fffff', 'fFfFf', 'fffff', 'f...f'];
  var FROG_B = ['.w.w.', 'fffff', 'fFfFf', 'fffff', '.f.f.'];
  var FROG_PAL = { w: '#ffffff', f: '#3fae4b', F: '#2b2a33' };

  for (var i = 0; i < 26; i++) drops.push({ x: game.random(0, W), y: game.random(0, H), s: game.random(700, 1000) });

  function segDist(px, py, a, b) {
    var ux = b.x - a.x, uy = b.y - a.y;
    var l2 = ux * ux + uy * uy;
    var t = Math.max(0, Math.min(1, ((px - a.x) * ux + (py - a.y) * uy) / l2));
    return Math.hypot(px - (a.x + ux * t), py - (a.y + uy * t));
  }
  function inWater(x, y) {
    for (var k = 0; k < POOLS.length; k++) if (Math.hypot(x - POOLS[k].x, y - POOLS[k].y) < POOLS[k].r) return true;
    for (var m = 1; m < POOLS.length; m++) if (segDist(x, y, POOLS[m - 1], POOLS[m]) < CH_HW) return true;
    return false;
  }

  function initGame() {
    bx = POOLS[0].x; by = POOLS[0].y + 60; vx = 0; vy = 0;
    reached = 0; strokes = 0; timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0;
    finished = false; ok = false; endWait = 0; done = false; score = 0;
    aiming = false; aimT = 0; lastStroke = 9; flashObj = null; rowAnim = 0; bumpCool = 0;
    ripples = [];
  }

  // 引いたベクトル(px,py)の反対向きに舟を押し出す — プレイもデモもここを通る
  function launch(px, py, live) {
    var len = Math.hypot(px, py);
    if (len < 26) return false;
    var p = Math.min(MAX_PULL, len);
    vx = -px / len * p * POWER;
    vy = -py / len * p * POWER;
    strokes++; lastStroke = 0; rowAnim = 0.35;
    ripples.push({ x: bx, y: by + 20, t: 0 });
    if (live) game.audio.play('se_jump', 0.35);
    return true;
  }

  function previewEnd(px, py) {
    var len = Math.hypot(px, py);
    var p = Math.min(MAX_PULL, len);
    var dist = (p * POWER) / LN_R;
    return { dx: -px / (len || 1), dy: -py / (len || 1), dist: dist };
  }

  function stepBoat(dt, live) {
    var keep = Math.pow(RETAIN, dt);
    bx += vx * dt; by += vy * dt;
    vx *= keep; vy *= keep;
    if (Math.hypot(vx, vy) < 14) { vx = 0; vy = 0; }
    if (rowAnim > 0) rowAnim -= dt;
    if (bumpCool > 0) bumpCool -= dt;
    lastStroke += dt;
    for (var k = 0; k < PEBBLES.length; k++) {
      var s = PEBBLES[k];
      var d = Math.hypot(bx - s.x, by - s.y);
      if (d < s.r + BOAT_R && d > 0) {
        var nx = (bx - s.x) / d, ny = (by - s.y) / d;
        var dot = vx * nx + vy * ny;
        if (dot < 0) { vx = (vx - 2 * dot * nx) * 0.6; vy = (vy - 2 * dot * ny) * 0.6; }
        bx = s.x + nx * (s.r + BOAT_R + 1); by = s.y + ny * (s.r + BOAT_R + 1);
        if (live && bumpCool <= 0) {
          bumpCool = 0.5;
          game.feedback.bad(bx, by, { text: 'MISS', shake: 5, flashColor: '#ffffff' });
        }
      }
    }
    var next = POOLS[reached + 1];
    if (next && Math.hypot(bx - next.x, by - next.y) < next.r * 0.75) {
      reached++;
      if (live) {
        if (reached < NEEDED) {
          game.audio.play('se_milestone', 0.5);
          game.fx.popup(reached + ' / ' + NEEDED, next.x, next.y - 90, { color: C.gold, size: 54 });
          game.fx.burst(next.x, next.y, { color: C.shine, count: 14, speed: 300 });
        }
      }
    }
  }

  function endRun(success, x, y) {
    if (finished) return;
    finished = true; ok = success; hitStop = 0.45;
    flashObj = { x: x, y: y, t: 0.45 };
    if (success) {
      score = reached * 100 + Math.round(timeLeft * 25) + Math.max(0, 10 - strokes) * 10;
      game.feedback.good(x, y, { text: 'CLEAR', color: C.good, count: 24 });
    } else {
      game.feedback.bad(x, y, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS' });
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; music(); return; }
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || finished || ready > 0) return;
    aiming = true; aimX0 = x; aimY0 = y; aimX = x; aimY = y; aimT = 0;
    game.audio.play('se_tap', 0.25);
    game.fx.burst(bx, by, { color: C.shine, count: 5, speed: 120 });
  });

  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !aiming) return;
    aimX = x; aimY = y;
    if (Math.random() < 0.04) game.audio.tone(300 + Math.min(MAX_PULL, Math.hypot(x - aimX0, y - aimY0)) * 2, 0.03, { wave: 'triangle', volume: 0.03 });
  });

  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !aiming) return;
    aiming = false;
    if (finished) return;
    if (launch(x - aimX0, y - aimY0, true)) {
      game.fx.burst(bx, by + 30, { color: C.white, count: 8, speed: 220 });
    } else {
      game.audio.play('se_tap', 0.12);
    }
  });

  // ── ATTRACT: 本物の launch/stepBoat を AI の引きで動かす ──
  var demo = { t: 0, gx: 540, gy: 1300, press: false, st: 0, px: 0, py: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.2;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; demo.st = 0; }
    demo.st += dt;
    var tgt = POOLS[Math.min(POOLS.length - 1, reached + 1)];
    if (demo.st < 0.25) {
      demo.press = false; demo.gx = bx; demo.gy = by;
    } else if (demo.st < 0.75) {
      var k = (demo.st - 0.25) / 0.5;
      var dx = tgt.x - bx, dy = tgt.y - by;
      var dist = Math.hypot(dx, dy) || 1;
      var pull = Math.min(MAX_PULL, (dist * LN_R) / POWER * 1.15);
      demo.px = -dx / dist * pull; demo.py = -dy / dist * pull;
      demo.press = true; demo.gx = bx + demo.px * k; demo.gy = by + demo.py * k;
    } else if (demo.st < 0.8) {
      if (demo.press) launch(demo.px, demo.py, false);
      demo.press = false;
    } else if (demo.st > 1.25) {
      demo.st = 0;
    }
    if (reached < NEEDED) stepBoat(dt, false);
  }

  function drawWorld(t) {
    var pulse = 0.04 + 0.04 * Math.sin(t * 1.4);
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [1, STYLE.bg[1]]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    // 泥の斑点(遠景)
    for (var q = 0; q < 14; q++) {
      game.draw.circle((q * 263) % W, (q * 431) % H, 40 + (q % 3) * 18, C.mudDark, 0.25);
    }
    // 水路と水たまり
    for (var m = 1; m < POOLS.length; m++) {
      game.draw.line(POOLS[m - 1].x, POOLS[m - 1].y, POOLS[m].x, POOLS[m].y, C.waterDeep, CH_HW * 2 + 12);
    }
    for (var k = 0; k < POOLS.length; k++) game.draw.circle(POOLS[k].x, POOLS[k].y, POOLS[k].r + 6, C.waterDeep);
    for (var m2 = 1; m2 < POOLS.length; m2++) {
      game.draw.line(POOLS[m2 - 1].x, POOLS[m2 - 1].y, POOLS[m2].x, POOLS[m2].y, C.water, CH_HW * 2);
    }
    for (var k2 = 0; k2 < POOLS.length; k2++) {
      var P = POOLS[k2];
      game.draw.circle(P.x, P.y, P.r, C.water);
      game.draw.circle(P.x - P.r * 0.35, P.y - P.r * 0.4, P.r * 0.22, C.shine, 0.35 + 0.1 * Math.sin(t * 2 + k2));
      if (k2 > 0 && k2 <= reached) game.draw.circle(P.x, P.y, 16, C.good, 0.8);
    }
    // 排水口(ゴール)
    var G = POOLS[3];
    game.draw.circle(G.x, G.y, 70, '#ffffff', 0.25 + 0.2 * Math.sin(t * 4));
    game.draw.sprite(GRATE, GRATE_PAL, G.x, G.y, 16, { anchor: 'center' });
    // 小石
    for (var s = 0; s < PEBBLES.length; s++) {
      var pb = PEBBLES[s];
      game.draw.sprite(STONE, STONE_PAL, pb.x, pb.y + Math.sin(t * 1.3 + s) * 2, pb.r / 2.2, { anchor: 'center' });
    }
    // 雨と波紋(常時動く)
    for (var d = 0; d < drops.length; d++) {
      var dr = drops[d];
      var yy = (dr.y + t * dr.s) % H;
      game.draw.line(dr.x, yy, dr.x - 6, yy + 26, '#ffffff', 3);
      if (Math.floor(t * 2 + d) % 9 === 0 && inWater(dr.x, yy)) game.draw.circle(dr.x, yy, 10 + (t * 40) % 20, C.shine, 0.25);
    }
    // 岸のカエル(見物)
    var fb = Math.sin(t * 3) * 6;
    game.draw.sprite(Math.floor(t * 2) % 2 ? FROG_A : FROG_B, FROG_PAL, 900, H * 0.47 + fb, 14, { anchor: 'center' });
    game.draw.sprite(Math.floor(t * 2 + 1) % 2 ? FROG_A : FROG_B, FROG_PAL, 150, H * 0.26 - fb, 12, { anchor: 'center', flipX: true });
  }

  function drawRipples(dt) {
    for (var r = ripples.length - 1; r >= 0; r--) {
      var rp = ripples[r];
      rp.t += dt;
      game.draw.circle(rp.x, rp.y, 20 + rp.t * 90, C.shine, Math.max(0, 0.45 - rp.t * 0.5));
      if (rp.t > 0.9) ripples.splice(r, 1);
    }
  }

  function drawAim(px, py) {
    var pe = previewEnd(px, py);
    var bad = false;
    var n = 14;
    for (var j = 1; j <= n; j++) {
      var f = j / n;
      var ex = bx + pe.dx * pe.dist * f, ey = by + pe.dy * pe.dist * f;
      if (!inWater(ex, ey)) bad = true;
      game.draw.circle(ex, ey, 7, bad ? C.bad : C.white, bad ? 0.9 : 0.8);
    }
    var len = Math.min(MAX_PULL, Math.hypot(px, py));
    game.draw.line(bx, by, bx + px / (Math.hypot(px, py) || 1) * len, by + py / (Math.hypot(px, py) || 1) * len, '#8a5a2b', 8);
    // 親指ゾーンの勢いゲージ
    game.draw.rect(140, H * 0.9, W - 280, 26, '#ffffff', 0.6);
    game.draw.rect(140, H * 0.9, (W - 280) * (len / MAX_PULL), 26, bad ? C.bad : C.gold);
  }

  function drawBoat(t) {
    var fr = (rowAnim > 0 && Math.floor(rowAnim * 12) % 2) ? SKIFF_B : SKIFF_A;
    var bob = Math.sin(t * 3.2) * 4;
    if (flashObj && flashObj.t > 0) {
      game.draw.circle(bx, by, 60 + (0.45 - flashObj.t) * 80, '#ffffff', 0.7);
      game.draw.sprite(fr, SKIFF_PAL, bx, by + bob, 11, { anchor: 'center' });
    } else {
      game.draw.sprite(fr, SKIFF_PAL, bx + Math.sin(t * 2.1) * 2, by + bob, 8, { anchor: 'center' });
    }
  }

  function drawHud() {
    txt(reached + ' / ' + NEEDED, W / 2, 70, 56, C.ink);
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(90, 140, W - 180, 22, '#ffffff', 0.7);
    game.draw.rect(90, 140, (W - 180) * Math.max(0, timeLeft / TIME_LIMIT), 22, lowTime ? C.bad : C.good);
    txt(String(strokes), 70, 70, 40, C.warn, 'left');
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (bx === undefined) initGame();

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawWorld(t);
      drawRipples(dt);
      if (demo.press) drawAim(demo.gx - bx, demo.gy - by);
      drawBoat(t);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.06, 70, C.ink);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.105, 34, C.warn);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 46, C.warn);
      else txt('INSERT COIN', W / 2, H * 0.94, 40, C.ink);
      return;
    }

    if (state === S.RESULT) {
      drawWorld(t);
      drawBoat(t);
      game.draw.rect(0, H * 0.34, W, H * 0.3, '#ffffff', 0.85);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 96, ok ? C.good : C.bad);
      txt(reached + ' / ' + NEEDED + '   x' + strokes, W / 2, H * 0.47, 48, C.ink);
      if (ok) {
        txt('SCORE ' + score, W / 2, H * 0.53, 46, C.warn);
        if (score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.59, 44, C.gold);
        else txt('BEST ' + (game.best || 0), W / 2, H * 0.59, 36, C.ink);
      } else {
        txt('あと' + (NEEDED - reached) + 'つ!', W / 2, H * 0.53, 50, C.warn);
        txt('BEST ' + (game.best || 0), W / 2, H * 0.59, 36, C.ink);
      }
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 40, C.ink);
      return;
    }

    // PLAYING
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        game.audio.stopBgm();
        if (ok) { game.audio.play('se_success', 0.6); game.end.success(score, { puddles: reached, strokes: strokes }); }
        else { game.audio.play('se_failure', 0.6); game.end.failure({ puddles: reached, strokes: strokes }); }
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (flashObj) flashObj.t -= dt;
      if (hitStop <= 0) { done = true; endWait = 0.8; }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.4);
    } else if (!finished) {
      timeLeft -= dt;
      if (aiming) {
        aimT += dt;
        if (aimT > AIM_TIMEOUT) {
          aiming = false;
          game.feedback.bad(bx, by, { text: 'MISS', shake: 4 });
        }
      }
      stepBoat(dt, true);
      if (reached >= NEEDED) endRun(true, bx, by);
      else if (!inWater(bx, by)) endRun(false, bx, by);
      else if (timeLeft <= 0) { timeLeft = 0; endRun(false, bx, by); }
    }

    drawWorld(t);
    drawRipples(dt);
    if (aiming && !finished) drawAim(aimX - aimX0, aimY - aimY0);
    drawBoat(t);
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 96, C.warn);
  });

  function music() {
    game.audio.melody([['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['A4', 0.5], ['C5', 0.5], ['D5', 1]], { tempo: 132, wave: 'triangle', volume: 0.05, loop: true, bass: true });
  }
  game.onStart(function() {
    music();
    state = S.ATTRACT;
    initGame();
  });
})(game);
