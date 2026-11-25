// J-3DSDSDSTOP10-0020-tidepool-claw-flipper.js
// 潮だまりのハサミ弾き — カニの左右のハサミで真珠を弾き上げ、光っているイソギンチャクを狙い撃つ
// 操作: 画面の左半分を押すと左のハサミ、右半分で右のハサミが跳ね上がる(押し続けると上げたまま)。真珠がハサミのどこに乗った時に弾くかで飛ぶ向きが変わる
// 終わり: 光るイソギンチャクに5回当てればCLEAR。真珠を3個落とす/時間切れでGAME OVER
// @mechanic: trajectory
// @theme: tidepool_crab_flipper
// 世界観: 引き潮の岩場の潮だまりで、大きなカニが左右のハサミで迷い込んだ真珠を弾き返し、順番に光るイソギンチャクに当てて潮が満ちる前に目を覚まさせていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 得点・光る的に当てた数・落とした真珠数
// スタイル: 80s ISO

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s ISO: 菱形グリッド、6〜8色、影で高さを示す
  var STYLE = {
    bg: ['#e8c98a', '#d4b070', '#3a9ad9'],
    main: ['#e0503a', '#c050c0', '#f4f0ff'],
    accent: ['#ffd23a', '#2a1d3a'],
  };
  var SAND = '#e8c98a', SAND2 = '#d4b070', WATER = '#3a9ad9', DEEP = '#1d4f8a', CRAB = '#e0503a';
  var ANEM = '#c050c0', GOLD = '#ffd23a', INK = '#2a1d3a', PEARL = '#f4f0ff', SHADOW = 'rgba(42,29,58,0.35)';

  var GAME_TITLE = 'CLAW FLIP';
  var TIME_LIMIT = 18;
  var NEEDED = 5;
  var BALLS = 3;
  var GRAV = 1500;
  var BALL_R = 26;
  var FLIP_L = 190, FLIP_T = 14;
  var PIV_L = { x: 330, y: Math.round(H * 0.755) }, PIV_R = { x: 750, y: Math.round(H * 0.755) };
  var REST = 0.52, UP = -0.45, SWING = 11;
  var DRAIN_Y = Math.round(H * 0.86);
  var WALLS = [
    [90, 430, 250, 270], [250, 270, 830, 270], [830, 270, 990, 430],
    [90, 430, 90, 1250], [990, 430, 990, 1250],
    [90, 1250, 330, 1450], [990, 1250, 750, 1450],
  ];
  var TARGETS = [{ x: 300, y: 610 }, { x: 540, y: 500 }, { x: 780, y: 610 }, { x: 540, y: 1000 }];
  var BUMPERS = [{ x: 410, y: 820, r: 52 }, { x: 670, y: 820, r: 52 }];

  var ANEMONE = ['a.a.a', '.aaa.', 'aaaaa', '.ooo.', '.ooo.'];
  var CRAB_FACE = ['k....k', '.k..k.', 'rrrrrr', 'rwrrwr', 'rrrrrr', '.r..r.'];
  var PEARL_ART = ['.ww.', 'wwww', 'wwgw', '.ww.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var p = null;

  function tx(str, x, y, sz, col) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: INK, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  function initGame() {
    p = {
      ball: null, spawnT: 0.7, lit: 1, hits: 0, score: 0, lost: 0, stall: 0,
      angL: REST, angR: REST, velL: 0, velR: 0, pulseL: 0, pulseR: 0, holdL: false, holdR: false,
      bumpFx: [0, 0], targetFx: 0, timeLeft: TIME_LIMIT, ready: 0.8, hitStop: 0, hl: null,
      finished: false, done: false, ok: false, endWait: 0, mile: false,
    };
  }

  function tipOf(side) {
    var pv = side < 0 ? PIV_L : PIV_R, a = side < 0 ? p.angL : p.angR;
    return { x: pv.x + side * -1 * -Math.cos(a) * FLIP_L, y: pv.y + Math.sin(a) * FLIP_L };
  }

  // 弾いた位置 t(0=付け根,1=先端)から発射方向を決める(付け根ほど反対側へ、先端ほどまっすぐ)
  function launchVel(side, t) {
    var phi = (0.62 - 0.85 * t) * -side * -1;
    if (side > 0) phi = -(0.62 - 0.85 * t);
    else phi = 0.62 - 0.85 * t;
    var sp = 1750 + 450 * t;
    return { x: Math.sin(phi) * sp, y: -Math.cos(phi) * sp };
  }

  function segHit(b, x1, y1, x2, y2, pad) {
    var vx = x2 - x1, vy = y2 - y1, len2 = vx * vx + vy * vy;
    var t = len2 > 0 ? Math.max(0, Math.min(1, ((b.x - x1) * vx + (b.y - y1) * vy) / len2)) : 0;
    var cx = x1 + vx * t, cy = y1 + vy * t;
    var dx = b.x - cx, dy = b.y - cy, d = Math.hypot(dx, dy);
    if (d < BALL_R + pad && d > 0.0001) return { nx: dx / d, ny: dy / d, pen: BALL_R + pad - d, t: t };
    return null;
  }

  function bounce(b, h, e) {
    b.x += h.nx * h.pen; b.y += h.ny * h.pen;
    var vn = b.vx * h.nx + b.vy * h.ny;
    if (vn < 0) { b.vx -= (1 + e) * vn * h.nx; b.vy -= (1 + e) * vn * h.ny; }
  }

  function flipperCollide(b, side) {
    var pv = side < 0 ? PIV_L : PIV_R, tip = tipOf(side);
    var h = segHit(b, pv.x, pv.y, tip.x, tip.y, FLIP_T);
    if (!h) return;
    var swinging = side < 0 ? p.velL < 0 : p.velR < 0;
    if (swinging && h.ny < 0.2) {
      var v = launchVel(side, h.t);
      b.x += h.nx * h.pen; b.y += h.ny * h.pen - 4;
      b.vx = v.x; b.vy = v.y;
      game.audio.play('se_jump', 0.35);
    } else {
      bounce(b, h, 0.25);
    }
  }

  function lightNext() {
    var n;
    do { n = Math.floor(Math.random() * TARGETS.length); } while (n === p.lit);
    p.lit = n;
  }

  function physics(dt) {
    var b = p.ball;
    // ハサミの角度
    var wantL = (p.holdL || p.pulseL > 0) ? UP : REST, wantR = (p.holdR || p.pulseR > 0) ? UP : REST;
    var oL = p.angL, oR = p.angR;
    p.angL += Math.max(-SWING * dt, Math.min(SWING * dt, wantL - p.angL));
    p.angR += Math.max(-SWING * dt, Math.min(SWING * dt, wantR - p.angR));
    p.velL = p.angL - oL; p.velR = p.angR - oR;
    if (!b) return;
    var steps = 4, h = dt / steps;
    for (var s = 0; s < steps; s++) {
      b.vy += GRAV * h;
      var sp = Math.hypot(b.vx, b.vy);
      if (sp > 2600) { b.vx *= 2600 / sp; b.vy *= 2600 / sp; }
      b.x += b.vx * h; b.y += b.vy * h;
      for (var w = 0; w < WALLS.length; w++) {
        var wl = WALLS[w], hw = segHit(b, wl[0], wl[1], wl[2], wl[3], 4);
        if (hw) bounce(b, hw, 0.45);
      }
      flipperCollide(b, -1);
      flipperCollide(b, 1);
      for (var k = 0; k < BUMPERS.length; k++) {
        var bm = BUMPERS[k], dx = b.x - bm.x, dy = b.y - bm.y, d = Math.hypot(dx, dy);
        if (d < bm.r + BALL_R && d > 0.001) {
          var nx = dx / d, ny = dy / d;
          b.x = bm.x + nx * (bm.r + BALL_R + 1); b.y = bm.y + ny * (bm.r + BALL_R + 1);
          var kick = Math.max(900, Math.hypot(b.vx, b.vy) * 0.95);
          b.vx = nx * kick; b.vy = ny * kick;
          p.bumpFx[k] = 0.2; p.score += 50;
          game.audio.play('se_tap', 0.3);
          game.fx.burst(b.x - nx * BALL_R, b.y - ny * BALL_R, { color: PEARL, count: 5, speed: 180 });
        }
      }
      for (var ti = 0; ti < TARGETS.length; ti++) {
        var tg = TARGETS[ti];
        if (Math.hypot(b.x - tg.x, b.y - tg.y) < BALL_R + 46) {
          var ang = Math.atan2(b.y - tg.y, b.x - tg.x);
          b.x = tg.x + Math.cos(ang) * (BALL_R + 47); b.y = tg.y + Math.sin(ang) * (BALL_R + 47);
          var vn = b.vx * Math.cos(ang) + b.vy * Math.sin(ang);
          if (vn < 0) { b.vx -= 1.7 * vn * Math.cos(ang); b.vy -= 1.7 * vn * Math.sin(ang); }
          if (ti === p.lit) hitLit(tg);
          else { p.score += 100; game.audio.tone('G4', 0.06, { wave: 'square', volume: 0.05 }); }
          if (p.hitStop > 0) return;
        }
      }
    }
    // 止まり対策: ハサミで抱えていないのに動かない時は揺すって転がす
    var still = Math.hypot(b.vx, b.vy) < 40 && !p.holdL && !p.holdR;
    p.stall = still ? p.stall + dt : 0;
    if (p.stall > 2.2) { b.vx = (Math.random() < 0.5 ? -1 : 1) * 400; b.vy = -500; p.stall = 0; game.fx.shake(6, 0.2); }
    if (b.y > DRAIN_Y) drain();
  }

  function hitLit(tg) {
    p.hits++;
    p.score += 500;
    p.targetFx = 0.3; p.hl = { x: tg.x, y: tg.y }; p.hitStop = 0.18;
    game.feedback.good(tg.x, tg.y - 60, { text: p.hits >= NEEDED ? 'CLEAR' : 'NICE', color: GOLD, count: 16 });
    if (!p.mile && p.hits >= 3) {
      p.mile = true;
      game.audio.play('se_milestone', 0.45);
      game.fx.popup(p.hits + ' / ' + NEEDED, W / 2, 400, { color: GOLD, size: 60 });
    }
    if (p.hits >= NEEDED) { p.finished = true; p.ok = true; p.hitStop = 0.35; finish(); return; }
    lightNext();
  }

  function drain() {
    var b = p.ball;
    p.lost++;
    p.hl = { x: b.x, y: DRAIN_Y - 30 }; p.hitStop = 0.4;
    game.feedback.bad(W / 2, DRAIN_Y - 80, { text: 'MISS', color: CRAB });
    p.ball = null;
    if (p.lost >= BALLS) { p.finished = true; p.ok = false; finish(); }
    else p.spawnT = 0.8;
  }

  function finish() {
    if (p.done) return;
    p.done = true; p.endWait = 1.5;
    if (state !== S.PLAYING) return;
    game.audio.stopBgm();
    game.audio.play(p.ok ? 'se_success' : 'se_failure', 0.55);
  }

  function step(dt) {
    p.pulseL = Math.max(0, p.pulseL - dt);
    p.pulseR = Math.max(0, p.pulseR - dt);
    p.bumpFx[0] = Math.max(0, p.bumpFx[0] - dt); p.bumpFx[1] = Math.max(0, p.bumpFx[1] - dt);
    if (p.targetFx > 0) p.targetFx -= dt;
    if (p.hitStop > 0) { p.hitStop -= dt; return; }
    if (p.finished) return;
    if (!p.ball) {
      p.spawnT -= dt;
      if (p.spawnT <= 0) {
        p.ball = { x: 540 + game.random(-120, 120), y: 330, vx: game.random(-260, 260), vy: 60 };
        game.audio.play('se_coin', 0.3);
      }
    }
    physics(dt);
  }

  // 今この瞬間に弾いたら飛ぶ軌道(予告の点線に使う)
  function preview(side) {
    var b = p.ball;
    if (!b) return null;
    var pv = side < 0 ? PIV_L : PIV_R, tip = tipOf(side);
    var h = segHit(b, pv.x, pv.y, tip.x, tip.y, FLIP_T + 60);
    if (!h || b.y > pv.y + 80) return null;
    return { t: h.t, v: launchVel(side, h.t) };
  }

  // ── 描画 ─────────────────────────────────────────
  function drawPool() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, '#f2dca6'], [0.5, SAND], [1, SAND2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(t * 1.2));
    // 潮だまりの水面(菱形グリッド)
    game.draw.rect(90, 270, 900, 1330, WATER, 0.55);
    for (var i = -10; i < 14; i++) {
      game.draw.line(90 + i * 120, 270, 90 + i * 120 + 1330 * 0.58, 1600, DEEP, 2);
      game.draw.line(990 - i * 120, 270, 990 - i * 120 - 1330 * 0.58, 1600, DEEP, 2);
    }
    game.draw.rect(0, 1600, W, H - 1600, SAND2);
    // 岩の縁(影つき)
    for (var w = 0; w < WALLS.length; w++) {
      var wl = WALLS[w];
      game.draw.line(wl[0] + 8, wl[1] + 12, wl[2] + 8, wl[3] + 12, SHADOW, 22);
      game.draw.line(wl[0], wl[1], wl[2], wl[3], '#8a6a4a', 20);
      game.draw.line(wl[0], wl[1] - 4, wl[2], wl[3] - 4, '#b89068', 8);
    }
    // 排水口
    game.draw.rect(494, DRAIN_Y - 20, 92, 40, DEEP);
    // 泡(ゆらぎ)
    for (var k = 0; k < 8; k++) {
      var bx = 140 + ((k * 137 + t * 30) % 800), by = 1200 - ((t * 60 + k * 90) % 800);
      game.draw.circle(bx, by, 6 + (k % 3) * 3, PEARL, 0.35);
    }
  }

  function drawTargets() {
    var t = game.time.elapsed;
    for (var i = 0; i < TARGETS.length; i++) {
      var tg = TARGETS[i], lit = i === p.lit;
      game.draw.circle(tg.x + 10, tg.y + 16, 46, SHADOW);
      var pulse = lit ? 1 + Math.sin(t * 8) * 0.12 : 1;
      if (lit) game.draw.circle(tg.x, tg.y, 70 * pulse, GOLD, 0.35);
      var big = p.hl && p.hitStop > 0 && Math.hypot(p.hl.x - tg.x, p.hl.y - tg.y) < 5;
      game.draw.sprite(ANEMONE, { a: lit ? GOLD : ANEM, o: big ? '#ffffff' : '#8a2f8a' }, tg.x, tg.y + Math.sin(t * 2 + i) * 3, big ? 22 : 17, { anchor: 'center' });
    }
    for (var k = 0; k < BUMPERS.length; k++) {
      var bm = BUMPERS[k], f = p.bumpFx[k] > 0;
      game.draw.circle(bm.x + 10, bm.y + 16, bm.r, SHADOW);
      game.draw.circle(bm.x, bm.y, bm.r + (f ? 8 : 0), f ? PEARL : '#7a6a5a');
      game.draw.circle(bm.x - 12, bm.y - 14, bm.r * 0.45, '#a8988a');
    }
  }

  function drawClaws() {
    var t = game.time.elapsed;
    // 軌道の予告(点線の放物線)
    for (var sd = -1; sd <= 1; sd += 2) {
      var pr = preview(sd);
      if (!pr || !p.ball) continue;
      for (var k = 1; k < 9; k++) {
        var tau = k * 0.05;
        var x = p.ball.x + pr.v.x * tau, y = p.ball.y + pr.v.y * tau + GRAV * tau * tau / 2;
        game.draw.circle(x, y, 8, GOLD, 0.8 - k * 0.07);
      }
    }
    for (var s = -1; s <= 1; s += 2) {
      var pv = s < 0 ? PIV_L : PIV_R, tip = tipOf(s);
      game.draw.line(pv.x + 8, pv.y + 14, tip.x + 8, tip.y + 14, SHADOW, 34);
      game.draw.line(pv.x, pv.y, tip.x, tip.y, CRAB, 32);
      game.draw.line(pv.x, pv.y - 8, tip.x, tip.y - 8, '#ff8a6a', 8);
      game.draw.circle(tip.x, tip.y, 18, CRAB);
      game.draw.circle(pv.x, pv.y, 26, '#b83a2a');
    }
    // カニ本体(ハサミの持ち主、下で揺れる)
    game.draw.sprite(CRAB_FACE, { k: INK, r: CRAB, w: PEARL }, W / 2 + Math.sin(t * 1.6) * 8, H * 0.9 + Math.cos(t * 2.2) * 4, 22, { anchor: 'center' });
  }

  function drawBall() {
    var b = p.ball;
    if (!b) {
      if (!p.finished && Math.floor(game.time.elapsed * 10) % 2 === 0) game.draw.circle(540, 330, 40, GOLD, 0.5);
      return;
    }
    game.draw.circle(b.x + 8, b.y + 12, BALL_R, SHADOW);
    var sc = p.hl && p.hitStop > 0 && !p.ok ? 17 : 13;
    game.draw.sprite(PEARL_ART, { w: PEARL, g: '#c8c0e8' }, b.x, b.y, sc, { anchor: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 240, INK, 0.8);
    tx(p.hits + ' / ' + NEEDED, 200, 80, 60, GOLD);
    tx(String(p.score), W / 2 + 60, 80, 48, PEARL);
    for (var i = 0; i < BALLS; i++) game.draw.sprite(PEARL_ART, { w: i < BALLS - p.lost ? PEARL : '#5a4a6a', g: '#c8c0e8' }, W - 220 + i * 70, 80, 11, { anchor: 'center' });
    var frac = Math.max(0, p.timeLeft / TIME_LIMIT);
    var low = p.timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 170, W - 120, 24, '#4a3a5a');
    game.draw.rect(60, 170, (W - 120) * frac, 24, low ? CRAB : WATER);
    // 親指ゾーン: 左右の押し場所
    var lz = p.holdL || p.pulseL > 0, rz = p.holdR || p.pulseR > 0;
    game.draw.rect(40, H * 0.955, W / 2 - 60, 40, lz ? GOLD : CRAB, 0.7);
    game.draw.rect(W / 2 + 20, H * 0.955, W / 2 - 60, 40, rz ? GOLD : CRAB, 0.7);
  }

  function drawResult() {
    game.draw.rect(90, 620, W - 180, 520, INK, 0.9);
    tx(p.ok ? 'CLEAR' : 'GAME OVER', W / 2, 720, 92, p.ok ? GOLD : CRAB);
    tx('SCORE ' + p.score, W / 2, 840, 60, PEARL);
    tx(p.hits + ' / ' + NEEDED, W / 2, 930, 48, GOLD);
    if (p.ok && p.score > game.best) tx('NEW RECORD', W / 2, 1015, 52, GOLD);
    else if (!p.ok) tx('あと' + (NEEDED - p.hits) + '回!', W / 2, 1015, 52, WATER);
    tx('BEST ' + Math.max(game.best, p.ok ? p.score : 0), W / 2, 1090, 36, PEARL);
  }

  function drawScene() {
    drawPool();
    drawTargets();
    drawClaws();
    drawBall();
  }

  // ── ATTRACT: AI が同じ pulse/hold を使う(予告線が光る的へ向いた瞬間に弾く。最後は見送って落とす)──
  var demo = { t: 0, gx: W * 0.25, gy: H * 0.95, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7;
    if (cyc < dt || demo.t <= dt) { initGame(); p.ready = 0; p.spawnT = 0.2; }
    demo.press = false;
    if (p.ball && cyc < 5.4) {
      var tg = TARGETS[p.lit];
      for (var sd = -1; sd <= 1; sd += 2) {
        var pr = preview(sd);
        if (!pr) continue;
        var want = Math.atan2(tg.x - p.ball.x, -(tg.y - p.ball.y));
        var have = Math.atan2(pr.v.x, -pr.v.y);
        if (Math.abs(want - have) < 0.14 || pr.t > 0.85 || p.ball.y > PIV_L.y) {
          if (sd < 0) p.pulseL = 0.18; else p.pulseR = 0.18;
          demo.gx = sd < 0 ? W * 0.25 : W * 0.75;
          demo.press = true;
        }
      }
    }
    step(dt);
    p.timeLeft = TIME_LIMIT;
    if (p.done) { p.done = false; }
  }

  function press(x) {
    if (x < W / 2) p.pulseL = 0.16; else p.pulseR = 0.16;
    game.audio.tone(x < W / 2 ? 'D4' : 'F4', 0.05, { wave: 'square', volume: 0.05 });
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING; initGame(); tune();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function (x, y) {
    if (state !== S.PLAYING || p.ready > 0 || p.done) return;
    game.audio.play('se_tap', 0.12);
    press(x);
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (!p) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 13 });
      game.draw.rect(0, 0, W, 240, INK, 0.8);
      tx(GAME_TITLE, W / 2, H * 0.045, 84, GOLD);
      tx('HI-SCORE ' + game.best, W / 2, 175, 34, PEARL);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) tx('► 100円 投入 ◄', W / 2, H * 0.58, 48, GOLD);
      else tx('INSERT COIN', W / 2, H * 0.58, 42, PEARL);
      return;
    }
    if (state === S.RESULT) {
      drawScene(); drawHud(); drawResult();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) tx('TAP TO CONTINUE', W / 2, H * 0.58 + 600, 38, PEARL);
      return;
    }

    // 押さえている指で左右のハサミを上げたままにする
    var tc = game.touches;
    p.holdL = false; p.holdR = false;
    for (var i = 0; i < tc.length; i++) { if (tc[i].x < W / 2) p.holdL = true; else p.holdR = true; }

    if (p.done) {
      p.endWait -= dt;
      if (p.hitStop > 0) p.hitStop -= dt;
      if (p.endWait <= 0) {
        state = S.RESULT;
        var stats = { score: p.score, hits: p.hits, lost: p.lost };
        if (p.ok) game.end.success(p.score, stats);
        else game.end.failure(stats);
      }
    } else if (p.ready > 0) {
      p.ready -= dt;
      if (p.ready <= 0) game.audio.play('se_tap', 0.4);
    } else {
      if (p.hitStop <= 0) p.timeLeft -= dt;
      if (p.timeLeft <= 0 && !p.finished) {
        p.timeLeft = 0; p.finished = true; p.ok = false; p.hitStop = 0.4;
        game.feedback.bad(W / 2, H * 0.5, { text: 'TIME UP' });
        finish();
      } else {
        step(dt);
      }
    }

    drawScene();
    drawHud();
    if (p.ready > 0) tx(p.ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 110, GOLD);
    if (p.done) drawResult();
  });

  function tune() {
    game.audio.melody(
      [['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['A5', 1], ['G5', 1], ['F5', 0.5], ['D5', 0.5], ['B4', 0.5], ['D5', 0.5], ['C5', 2]],
      { tempo: 144, wave: 'square', volume: 0.045, loop: true, bass: [['C3', 2], ['A2', 2], ['F2', 2], ['G2', 2]] }
    );
  }

  game.onStart(function () {
    tune();
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);
