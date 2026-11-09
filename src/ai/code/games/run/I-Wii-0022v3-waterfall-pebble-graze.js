// I-Wii-0022v3-waterfall-pebble-graze.js
// 滝のかすめ登り — 押している間だけ岩壁を登り、落ちてくる小石の真下をぎりぎりでかすめて登るほど高得点
// 操作: 画面を押している間だけ登る。押したまま指を左右に動かすと登山者が同じ位置へ寄る。離すと岩にしがみついて止まる(止まっている間はかすめても点にならない)。小石は画面上端の赤い印で0.5〜0.7秒前に予告される
// 終わり: 滝の上(高さメーターの頂上)に着けばCLEAR(かすめた点がスコア)。小石に当たる/20秒で着けなければGAME OVER
// @mechanic: near_miss
// @theme: autumn_stream_climb_graze
// 世界観: 紅葉の沢登りで、沢登りの達人が滝の脇の岩壁を登りながら、滝口から崩れ落ちてくる小石の真下をぎりぎりでかすめて滝の上を目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + かすめた回数・PERFECT数・スコア
// スタイル: 2010s FLAT MOBILE

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: ベタ塗り数色・丸角・影なし。差し色は紅葉の赤と黄
  var STYLE = { bg: ['#2e4057', '#34495e'], main: ['#7f8c9d', '#ecf0f1', '#48c9b0'], accent: ['#e74c3c', '#f1c40f'] };
  var ROCK = STYLE.main[0], FOAM = STYLE.main[1], TEAL = STYLE.main[2], RED = STYLE.accent[0], YEL = STYLE.accent[1];
  var NAVY = '#22313f', ORANGE = '#e67e22';

  var TITLE = 'GRAZE CLIMB';
  var TIME_LIMIT = 20;
  var GOAL_H = 2700;
  var CLIMB_V = 270;
  var VIEW_Y = Math.round(H * 0.62);
  var WALL_L = 140, WALL_R = 760;
  var BODY_R = 44;
  var GRAZE = 92;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var CLIMBER = [
    ['...yyyy...', '..yyyyyy..', '..ffffff..', '..fkffkf..', '...ffff...', 'f.rrrrrr.f', 'frrrrrrrrf', '..rrrrrr..', '..nnnnnn..', '..n....n..', '.nn....nn.'],
    ['f..yyyy...', 'f.yyyyyy..', '.fffffff..', '..fkffkf..', '...ffff...', '..rrrrrr.f', '.rrrrrrrrf', 'f.rrrrrr..', '..nnnnnn..', '.nn....n..', '......nn..'],
    ['...yyyy..f', '..yyyyyy.f', '..fffffff.', '..fkffkf..', '...ffff...', 'f.rrrrrr..', 'frrrrrrrr.', '..rrrrrr.f', '..nnnnnn..', '..n....nn.', '..nn......'],
  ];
  var OUCH = ['...yyyy...', '..yyyyyy..', '..ffffff..', '..fkffkf..', '...fOOf...', 'f.rrrrrr.f', 'frrrrrrrrf', '..rrrrrr..', '..nnnnnn..', '..n....n..', '.nn....nn.'];
  var CPAL = { y: YEL, f: '#f5cba7', k: NAVY, r: RED, n: '#2c3e50', O: NAVY };
  var PEBBLE = ['..s.s..', '.srrrs.', 'srrRrrs', '.rRRrr.', 'srrrrrs', '.srrrs.', '..s.s..'];
  var PPAL = { s: '#c0392b', r: '#95a5a6', R: '#bdc3c7' };
  var MAPLE = ['..o..', 'o.o.o', '.ooo.', 'ooooo', '..o..'];

  function txt(s, x, y, sz, col) {
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }
  function rrect(x, y, w, h, r, col) {
    game.draw.rect(x + r, y, w - r * 2, h, col);
    game.draw.rect(x, y + r, w, h - r * 2, col);
    game.draw.circle(x + r, y + r, r, col); game.draw.circle(x + w - r, y + r, r, col);
    game.draw.circle(x + r, y + h - r, r, col); game.draw.circle(x + w - r, y + h - r, r, col);
  }

  // ── 背景: 岩壁・滝・紅葉(ベタ塗り) ──
  function drawWorld(camY, t) {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [1, STYLE.bg[1]]]);
    // 遠景の紅葉の山(ゆっくり)
    for (var m = 0; m < 5; m++) {
      var my = ((m * 520 - camY * 0.25) % (H + 400)) - 200;
      game.draw.circle(-40, my, 200, m % 2 ? '#d35400' : '#c0392b');
      game.draw.circle(W + 20, my + 260, 170, m % 2 ? '#c0392b' : '#e67e22');
    }
    // 岩壁(丸角ブロックの段)
    for (var i = -2; i < 14; i++) {
      var wy = Math.floor((camY) / 180) * 180 + i * 180;
      var sy = wy - camY;
      var sh = ((wy / 180) % 3 + 3) % 3;
      rrect(WALL_L - 40 + (sh * 23) % 40, sy, WALL_R - WALL_L + 60, 170, 24, sh === 0 ? '#7f8c9d' : (sh === 1 ? '#6c7a89' : '#8899a6'));
    }
    // 滝(右側の白い流れ)
    game.draw.rect(WALL_R + 40, 0, W - WALL_R - 40, H, '#3498db');
    for (var s = 0; s < 6; s++) {
      var fx = WALL_R + 60 + s * 44;
      var off = (t * 900 + s * 130) % 240;
      for (var k = -1; k < 10; k++) rrect(fx, k * 240 + off - 120, 20, 150, 10, FOAM);
    }
    // 落ち葉
    for (var l = 0; l < 7; l++) {
      var lx = (l * 157 + Math.sin(t + l) * 60) % W, ly = (t * 90 + l * 280) % H;
      game.draw.sprite(MAPLE, { o: l % 2 ? ORANGE : RED }, lx, ly, 7, { anchor: 'center' });
    }
  }

  function drawGoal(camY) {
    var gy = -GOAL_H - camY;
    if (gy < -120 || gy > H) return;
    rrect(WALL_L - 60, gy - 60, WALL_R - WALL_L + 120, 70, 30, TEAL);
    for (var f = 0; f < 5; f++) game.draw.rect(WALL_L + f * 140, gy - 140, 12, 80, NAVY);
    game.draw.rect(WALL_L + 12, gy - 140, 70, 44, YEL);
  }

  // ── 小石(本番・デモ共通) ──
  function makePebble(x, warn, speed, r) { return { x: x, y: 0, warn: warn, vy: speed, r: r, live: false, done: false, hl: 0 }; }
  // 1フレーム進め、登山者との関係を返す: 'hit' | {graze, perfect} | null
  function stepPebble(p, dt, camY, cl) {
    if (p.done) return null;
    if (!p.live) {
      p.warn -= dt;
      if (p.warn <= 0) { p.live = true; p.y = camY - 60; }
      return null;
    }
    var prevY = p.y;
    p.y += p.vy * dt;
    if (p.y - camY > H + 80) { p.done = true; return null; }
    if (game.hit.circle(cl.x, cl.y - 10, BODY_R, p.x, p.y, p.r * 0.82)) { p.done = true; return 'hit'; }
    var cpy = cl.py === undefined ? cl.y : cl.py;
    if (prevY - cpy < 0 && p.y - cl.y >= 0) {
      var dx = Math.abs(p.x - cl.x) - BODY_R - p.r * 0.82;
      if (dx < GRAZE) { p.hl = 0.3; return { graze: true, perfect: dx < GRAZE * 0.35, dx: dx }; }
    }
    return null;
  }
  function drawPebbles(list, camY, t, cl, hitP) {
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      if (p.done && p !== hitP) continue;
      if (!p.live) {
        // 予告: 上端の赤い三角+縦の警告線
        if (Math.floor(t * 12) % 2 === 0) {
          for (var a = 0; a < 5; a++) game.draw.rect(p.x - 40 + a * 8, 240 + a * 14, 80 - a * 16, 14, RED);
        }
        for (var g = 300; g < H; g += 90) game.draw.rect(p.x - 3, g, 6, 40, '#e74c3c55');
        continue;
      }
      var sy = p.y - camY;
      var sc = p === hitP ? 1.6 : 1;
      if (p === hitP) game.draw.circle(p.x, sy, p.r * 2.2, '#ffffff');
      var near = Math.abs(p.x - cl.x) < BODY_R + p.r + GRAZE && sy < VIEW_Y + 40;
      if (near || p.hl > 0) game.draw.circle(p.x, sy, p.r * 1.35, p.hl > 0 ? YEL : '#e74c3c66');
      game.draw.sprite(PEBBLE, p === hitP ? { s: '#ffffff', r: '#ffffff', R: '#ffffff' } : PPAL, p.x, sy, p.r / 3.2 * sc, { anchor: 'center' });
    }
  }

  function drawClimber(cl, camY, t, hit) {
    var sy = cl.y - camY;
    var fr = cl.climbing ? 1 + Math.floor(t * 8) % 2 : 0;
    if (hit) game.draw.circle(cl.x, sy - 10, 90, '#ffffff');
    game.draw.sprite(hit ? OUCH : CLIMBER[fr], CPAL, cl.x, sy, hit ? 13 : 10, { anchor: 'center' });
    // かすめ範囲(足元の帯)
    if (cl.climbing) {
      game.draw.rect(cl.x - BODY_R - GRAZE - 20, sy + 70, 20, 8, '#f1c40f88');
      game.draw.rect(cl.x + BODY_R + GRAZE, sy + 70, 20, 8, '#f1c40f88');
    }
  }

  function drawSlider(cl, pressing) {
    // 親指ゾーン: 押して左右に滑らせるレール(つまみ=登山者の位置)
    var y = H * 0.885;
    rrect(WALL_L - 40, y - 36, WALL_R - WALL_L + 80, 72, 36, NAVY);
    rrect(WALL_L - 30, y - 26, WALL_R - WALL_L + 60, 52, 26, pressing ? '#2c3e50' : '#34495e');
    for (var a = 0; a < 3; a++) game.draw.rect(W - 240 + a * 50 - (pressing ? 0 : 4), y - 60 - a * 26 + (Math.floor(game.time.elapsed * 3) % 2) * 6, 30, 16, pressing ? YEL : '#95a5a6');
    var k = 1 + (pressing ? 0 : Math.sin(game.time.elapsed * 5) * 0.06);
    game.draw.circle(cl.x, y, 58 * k, pressing ? YEL : FOAM);
    game.draw.circle(cl.x, y, 30 * k, pressing ? ORANGE : TEAL);
  }

  // ── ゲーム状態 ──
  var cl, pebbles, camY, spawnT, timeLeft, ready, over, won, endT, score, grazes, perfects, combo, prevBest, halt, hitP, pressingNow, targetX, playT;

  function initGame() {
    cl = { x: (WALL_L + WALL_R) / 2, y: 0, climbing: false };
    pebbles = []; camY = cl.y - VIEW_Y; spawnT = 0.9; timeLeft = TIME_LIMIT; ready = 0.8;
    over = false; won = false; endT = 0; score = 0; grazes = 0; perfects = 0; combo = 0; prevBest = game.best || 0;
    halt = null; hitP = null; pressingNow = false; targetX = cl.x; playT = 0;
  }
  function progress() { return Math.min(1, -cl.y / GOAL_H); }
  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.5;
    if (ok) score += Math.floor(timeLeft * 30);
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
  }
  function spawnWave() {
    var k = progress();
    var warn = 0.7 - k * 0.15;
    var speed = 950 + k * 450;
    var r = 26 + Math.random() * 14 + k * 10;
    // 直撃(よけ幅ぎりぎりでかすめる練習) / 脇を落ちる誘い球 / ばらばら
    var roll = Math.random(), x;
    var pending = pebbles.some(function (q) { return !q.done && !q.live; });
    if (pending && roll < 0.45) roll = 0.6;
    if (roll < 0.45) x = cl.x + (Math.random() - 0.5) * 50;
    else if (roll < 0.75) x = cl.x + (Math.random() < 0.5 ? -1 : 1) * (BODY_R + r + 10 + Math.random() * 150);
    else x = WALL_L + Math.random() * (WALL_R - WALL_L);
    x = Math.max(WALL_L, Math.min(WALL_R, x));
    pebbles.push(makePebble(x, warn, speed, r));
    if (k > 0.55 && Math.random() < 0.3) {
      // 崩落: 隣にもう1つ(間は登山者がちょうど通れる幅)
      var x2 = x + (x < (WALL_L + WALL_R) / 2 ? 1 : -1) * (r * 2 + BODY_R * 2 + 110);
      pebbles.push(makePebble(Math.max(WALL_L, Math.min(WALL_R, x2)), warn, speed, r));
    }
    game.audio.tone('G2', 0.12, { wave: 'square', volume: 0.05, slide: -40 });
    spawnT = Math.max(0.62, 1.1 - k * 0.45);
  }

  function onGraze(res, p) {
    grazes++; combo++;
    if (res.perfect) perfects++;
    var pts = Math.floor((res.perfect ? 150 : 60) * (1 + Math.min(combo - 1, 5) * 0.3));
    score += pts;
    game.feedback.good(cl.x, cl.y - camY - 150, { text: res.perfect ? 'PERFECT' : 'NICE', color: YEL, count: res.perfect ? 16 : 8 });
    game.audio.tone(600 + Math.min(combo, 8) * 60, 0.06, { wave: 'triangle', volume: 0.06 });
    if (combo >= 3) game.fx.popup('x' + combo, cl.x + 160, cl.y - camY - 60, { color: ORANGE, size: 54 });
    if (grazes === 5) { game.fx.popup(grazes + ' NICE', W / 2, H * 0.3, { color: YEL, size: 64 }); game.audio.play('se_milestone', 0.4); }
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.45); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function (x, y) {
    if (state !== S.PLAYING || over || ready > 0) return;
    pressingNow = true; targetX = Math.max(WALL_L, Math.min(WALL_R, x));
    game.audio.play('se_tap', 0.2);
  });
  game.onMove(function (x, y) {
    if (state !== S.PLAYING || !pressingNow) return;
    var nx = Math.max(WALL_L, Math.min(WALL_R, x));
    if (Math.abs(nx - targetX) > 120) game.audio.tone('E4', 0.02, { wave: 'sine', volume: 0.02 });
    targetX = nx;
  });
  game.onRelease(function () {
    if (state === S.PLAYING && pressingNow) game.audio.tone('C3', 0.05, { wave: 'square', volume: 0.04 });
    pressingNow = false; combo = 0;
  });

  // ── ATTRACT ゴースト実演: 予告→真下ぎりぎりをかすめて登る → 2つ目は寄りすぎて当たる ──
  var demo = { t: 0, cl: null, list: null, camY: 0, hitT: 0, hitP: null, gx: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.8;
    if (cyc < dt || demo.t <= dt || !demo.cl) {
      demo.cl = { x: 450, y: 0, climbing: true }; demo.camY = -VIEW_Y; demo.hitP = null; demo.hitT = 0;
      demo.list = [makePebble(450 + BODY_R + 32 + 22, 0.6, 1000, 32), makePebble(300, 2.8, 1000, 32)];
    }
    var c = demo.cl;
    c.py = c.y;
    if (demo.hitT > 0) { demo.hitT -= dt; if (demo.hitT <= 0) game.feedback.bad(c.x, c.y - demo.camY - 150, { text: 'MISS', volume: 0.2, shake: 4 }); return; }
    if (demo.hitP) return;
    var tx = cyc < 2.6 ? 450 : 300 + 8;
    c.x += (tx - c.x) * Math.min(1, dt * 6);
    c.climbing = true;
    c.y -= CLIMB_V * dt;
    demo.camY = c.y - VIEW_Y;
    for (var i = 0; i < demo.list.length; i++) {
      var r = stepPebble(demo.list[i], dt, demo.camY, c);
      if (r === 'hit') { demo.hitP = demo.list[i]; demo.hitT = 0.45; c.climbing = false; }
      else if (r && r.graze) game.feedback.good(c.x, c.y - demo.camY - 150, { text: r.perfect ? 'PERFECT' : 'NICE', color: YEL, count: 8, volume: 0.2 });
    }
  }

  function drawHud() {
    var mx = W - 50, top = 250, bot = H * 0.72;
    rrect(mx - 18, top, 36, bot - top, 18, NAVY);
    var k = progress();
    rrect(mx - 10, bot - 8 - (bot - top - 16) * k, 20, Math.max(20, (bot - top - 16) * k), 10, TEAL);
    game.draw.rect(mx - 30, top - 10, 60, 20, YEL);
    txt(String(score), W / 2, 80, 64, FOAM);
    txt(grazes + ' NICE', 170, 80, 40, YEL);
    txt(Math.round(k * 100) + '%', W - 160, 80, 40, TEAL);
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    rrect(60, 150, W - 120, 24, 12, NAVY);
    if (fr > 0.03) rrect(60, 150, (W - 120) * fr, 24, 12, timeLeft < 5 && Math.floor(game.time.elapsed * 6) % 2 === 0 ? RED : FOAM);
  }

  function drawResult() {
    rrect(80, H * 0.2, W - 160, 400, 40, NAVY);
    txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.2 + 90, 100, won ? TEAL : RED);
    txt(grazes + ' NICE   PERFECT ' + perfects, W / 2, H * 0.2 + 185, 42, FOAM);
    if (score > prevBest && prevBest > 0) txt('NEW RECORD ' + score, W / 2, H * 0.2 + 260, 52, YEL);
    else txt('SCORE ' + score + '  BEST ' + Math.max(prevBest, score), W / 2, H * 0.2 + 260, 42, FOAM);
    if (!won) txt('あと' + Math.max(1, Math.round((1 - progress()) * GOAL_H / 10)) + 'm!', W / 2, H * 0.2 + 340, 54, YEL);
  }

  game.onUpdate(function (dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawWorld(demo.camY, t);
      drawPebbles(demo.list, demo.camY, t, demo.cl, demo.hitP);
      drawClimber(demo.cl, demo.camY, t, !!demo.hitP);
      drawSlider(demo.cl, !demo.hitP);
      game.draw.hand(demo.cl.x, H * 0.885, { press: !demo.hitP, scale: 14 });
      txt(TITLE, W / 2, H * 0.06, 96, FOAM);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.105, 40, YEL);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.97, 42, YEL);
      else txt('TAP TO START', W / 2, H * 0.97, 40, FOAM);
      return;
    }
    if (state === S.RESULT) {
      drawWorld(camY, t);
      drawClimber(cl, camY, t, !won);
      drawResult();
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.97, 36, FOAM);
      return;
    }

    // ── PLAYING ──
    if (over) {
      endT -= dt;
      if (endT <= 0) {
        state = S.RESULT;
        var stats = { grazes: grazes, perfect: perfects, height: Math.round(progress() * 100) };
        if (won) game.end.success(score, stats); else game.end.failure(stats);
      }
    } else if (halt) {
      halt.t -= dt;
      if (halt.t <= 0) { game.feedback.bad(cl.x, cl.y - camY - 150, { text: 'MISS' }); game.audio.play('se_break', 0.35); halt = null; finish(false); }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.25);
    } else {
      timeLeft -= dt; playT += dt;
      cl.climbing = pressingNow;
      cl.py = cl.y;
      if (pressingNow) {
        cl.x += (targetX - cl.x) * Math.min(1, dt * 12);
        cl.y -= CLIMB_V * dt;
      }
      camY += ((cl.y - VIEW_Y) - camY) * Math.min(1, dt * 8);
      spawnT -= dt;
      if (spawnT <= 0) spawnWave();
      for (var i = 0; i < pebbles.length; i++) {
        var r = stepPebble(pebbles[i], dt, camY, cl);
        if (r === 'hit') { hitP = pebbles[i]; halt = { t: 0.5 }; cl.climbing = false; game.audio.tone('C2', 0.2, { wave: 'square', volume: 0.1 }); break; }
        if (r && r.graze) { if (cl.climbing) onGraze(r, pebbles[i]); else game.audio.tone('A3', 0.04, { wave: 'sine', volume: 0.03 }); }
        if (pebbles[i].hl > 0) pebbles[i].hl -= dt;
      }
      pebbles = pebbles.filter(function (p) { return !p.done || p === hitP; });
      if (progress() >= 1 && !over) { game.fx.popup('CLEAR', W / 2, H * 0.4, { color: TEAL, size: 90 }); finish(true); }
      if (timeLeft <= 0 && !over) { timeLeft = 0; game.feedback.bad(W / 2, H * 0.4, { text: 'TIME UP' }); finish(false); }
    }

    drawWorld(camY, t);
    drawGoal(camY);
    drawPebbles(pebbles, camY, t, cl, hitP);
    drawClimber(cl, camY, t, !!hitP);
    drawSlider(cl, pressingNow);
    if (ready <= 0 && playT < 1.2 && !pressingNow && !over) game.draw.hand(cl.x, H * 0.885, { press: Math.floor(t * 3) % 2 === 0, scale: 13, alpha: 0.7 });
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 120, YEL);
    if (over) drawResult();
  });

  game.onStart(function () {
    game.audio.melody([
      ['A4', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 1], ['D5', 0.5], ['C5', 0.5], ['A4', 0.5], ['G4', 1], ['A4', 0.5], ['C5', 0.5], ['E5', 0.5], ['D5', 1.5], ['R', 0.5],
    ], { tempo: 150, wave: 'square', volume: 0.04, loop: true, bass: [['A2', 1], ['A2', 1], ['G2', 1], ['E2', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
