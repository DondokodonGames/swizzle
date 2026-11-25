// I-GBA-0008v3-chimney-soot-shove.js
// チムニー・スートショーブ — 煙道に詰まった煤の塊をブラシで突き上げ、向きと勢いを合わせて上の出口から外へ押し出す
// 操作: 指でブラシ頭を動かし、下から塊に勢いよくぶつけて突き上げる(当てる角度で飛ぶ向き、振る速さで勢いが決まる)。塊の近くをタップすると短く突く
// 終わり: 22秒以内に3本の煙道(出口が中央→左→右と狭く・棚が増える)から塊を押し出せばCLEAR。時間切れでGAME OVER
// @mechanic: push_out
// @theme: winter_machiya_chimney_sweep
// 世界観: 冬の町家の屋根の上で、煙突掃除人が屋根沿いの煙道に詰まった煤の塊をブラシで下から突き、棚をかわす角度と勢いで反対側の出口の外まで押し出す
// 残るもの: 正誤(CLEAR/GAME OVER) + 押し出した本数・突いた回数・一発で抜けた数
// スタイル: 2000s BILLBOARD 3D

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s BILLBOARD 3D: 奥行きは sprite の px スケール、接地影で位置を示す
  var STYLE = { bg: ['#1d2a4a', '#6d86b5', '#c9d7ee'], main: ['#a3452f', '#6b2a1d', '#2b2320'], accent: ['#ffe07a', '#ffffff'] };
  var BRICK = STYLE.main[0], BRICK_D = STYLE.main[1], SOOT = STYLE.main[2], GOLD = STYLE.accent[0], SNOW = STYLE.accent[1];
  var RED = '#ff5b4a';

  var TITLE = 'SOOT SHOVE';
  var TIME_LIMIT = 22;
  var NEEDED = 3;
  var GRAV = 950;
  var FL = W * 0.2, FR = W * 0.8;          // 煙道の左右の壁
  var TOP = H * 0.2;                        // 出口の高さ
  var HEARTH = H * 0.74;                    // 炉の格子(塊の床)
  var BRUSH_R = 62;

  var S = { ATTRACT: 1, PLAYING: 2, RESULT: 3 };
  var mode = S.ATTRACT;

  // 煙道の設計: 出口の範囲 [x0,x1] と 棚 {x,y,w,h}
  var FLUES = [
    { ex0: W * 0.34, ex1: W * 0.66, ledges: [], r: 54 },
    { ex0: W * 0.2, ex1: W * 0.44, ledges: [{ x: W * 0.56, y: H * 0.42, w: W * 0.24, h: 34 }], r: 60 },
    { ex0: W * 0.58, ex1: W * 0.8, ledges: [{ x: W * 0.2, y: H * 0.36, w: W * 0.26, h: 34 }, { x: W * 0.5, y: H * 0.52, w: W * 0.14, h: 30 }], r: 66 },
  ];

  var SWEEP = [
    ['..kkk...', '.kkkkk..', 'kkkkkkk.', '..fff...', '..f.f...', '.ggggg..', 'g.ggg.g.', '..ggg...', '..g.g...', '.kk.kk..'],
    ['..kkk...', '.kkkkk..', 'kkkkkkk.', '..fff...', '..f.f...', '.ggggg..', '.gggggg.', '..ggg.g.', '..g.g...', '.kk.kk..'],
  ];
  var SWEEP_PAL = { k: '#1a1a1a', f: '#f2c9a0', g: '#3c4a66' };
  var BRUSH = ['k.k.k.k.k', 'kkkkkkkkk', '.wwwwwww.', '...ww....', '...ww....'];
  var LUMP = [
    ['..####..', '.######.', '###o####', '########', '.######.', '..####..'],
    ['..####..', '.#####o.', '########', '###o####', '.######.', '..####..'],
  ];
  var FAR_CHIMNEY = ['.##.', '####', '####', '####'];

  var flakes = [];
  for (var f = 0; f < 40; f++) flakes.push({ x: Math.random() * W, y: Math.random() * H, v: 40 + Math.random() * 80, z: 0.4 + Math.random() * 0.8 });

  // ── 状態 ──
  var flue, lump, brush, timeLeft, ready, cleared, shoves, oneShot, shoveThis, halt, exitT, over, won, endT, score, prevBest;

  function makeLump(r) { return { x: W / 2, y: HEARTH - r, vx: 0, vy: 0, r: r, spin: 0 }; }

  function initGame() {
    flue = 0; lump = makeLump(FLUES[0].r);
    brush = { x: W / 2, y: H * 0.86, px: W / 2, py: H * 0.86, vx: 0, vy: 0, cool: 0 };
    timeLeft = TIME_LIMIT; ready = 0.8; cleared = 0; shoves = 0; oneShot = 0; shoveThis = 0;
    halt = null; exitT = 0; over = false; won = false; endT = 0; score = 0;
    prevBest = game.best || 0;
  }

  function say(s, x, y, sz, col) {
    game.draw.text(s, x + 3, y + 4, { size: sz, color: '#0b0f1c', bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  // ── 物理(プレイとデモ共通) ──
  function hitBrush(L, B, jab) {
    var dx = L.x - B.x, dy = L.y - B.y;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d > L.r + BRUSH_R || d < 1) return false;
    var nx = dx / d, ny = dy / d;
    // めり込み解消
    L.x = B.x + nx * (L.r + BRUSH_R); L.y = B.y + ny * (L.r + BRUSH_R);
    var rel = (B.vx - L.vx) * nx + (B.vy - L.vy) * ny;
    if (rel <= 0 && !jab) return false;
    var heavy = 54 / L.r;
    var imp = jab ? 1150 * heavy : rel * 1.15 * heavy;
    L.vx += nx * imp; L.vy += ny * imp;
    var sp = Math.sqrt(L.vx * L.vx + L.vy * L.vy);
    if (sp > 3200) { L.vx *= 3200 / sp; L.vy *= 3200 / sp; }
    return true;
  }

  function stepLump(L, fl, dt) {
    L.vy += GRAV * dt;
    L.vx *= (1 - 0.6 * dt);
    L.x += L.vx * dt; L.y += L.vy * dt;
    L.spin += L.vx * dt * 0.02;
    var bumped = false;
    if (L.x - L.r < FL) { L.x = FL + L.r; L.vx = Math.abs(L.vx) * 0.6; bumped = true; }
    if (L.x + L.r > FR) { L.x = FR - L.r; L.vx = -Math.abs(L.vx) * 0.6; bumped = true; }
    if (L.y + L.r > HEARTH) { L.y = HEARTH - L.r; L.vy = -Math.abs(L.vy) * 0.25; L.vx *= 0.85; }
    // 出口の天井(蓋): 出口の外側に当たると跳ね返る
    if (L.y - L.r < TOP && (L.x < fl.ex0 + L.r * 0.4 || L.x > fl.ex1 - L.r * 0.4)) {
      L.y = TOP + L.r; L.vy = Math.abs(L.vy) * 0.5; bumped = true;
    }
    for (var i = 0; i < fl.ledges.length; i++) {
      var g = fl.ledges[i];
      var cx = Math.max(g.x, Math.min(L.x, g.x + g.w)), cy = Math.max(g.y, Math.min(L.y, g.y + g.h));
      var ddx = L.x - cx, ddy = L.y - cy, dd = Math.sqrt(ddx * ddx + ddy * ddy);
      if (dd < L.r && dd > 0.01) {
        var nx = ddx / dd, ny = ddy / dd;
        L.x = cx + nx * L.r; L.y = cy + ny * L.r;
        var vn = L.vx * nx + L.vy * ny;
        if (vn < 0) { L.vx -= 1.55 * vn * nx; L.vy -= 1.55 * vn * ny; }
        bumped = true;
      }
    }
    return { out: L.y + L.r < TOP - 10, bumped: bumped };
  }

  function clampBrush(B, tx, ty) {
    B.x = Math.max(FL + 40, Math.min(FR - 40, tx));
    B.y = Math.max(H * 0.5, Math.min(H * 0.9, ty));
  }

  // ── 描画 ──
  function drawSky() {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.5, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    // 遠景の町家の屋根と煙突(奥ほど小さいビルボード)
    for (var i = 0; i < 6; i++) {
      var s = 5 + (i % 3) * 3;
      var x = 60 + i * 190, y = H * 0.18 + (i % 3) * 30;
      game.draw.rect(x - 90, y + s * 3, 180, 18, '#2a3350', 0.8);
      game.draw.sprite(FAR_CHIMNEY, { '#': '#4a3a44' }, x, y, s, { anchor: 'center' });
      game.draw.circle(x, y - s * 3 - ((game.time.elapsed * 20 + i * 30) % 60), s * 2, '#dde6f5', 0.25);
    }
    for (var k = 0; k < flakes.length; k++) game.draw.circle(flakes[k].x, flakes[k].y, 3 * flakes[k].z, SNOW, 0.5 * flakes[k].z);
  }

  function drawFlue(fl) {
    // 煙道の外壁(屋根の雪)
    game.draw.rect(0, H * 0.78, W, H * 0.22, '#e8eef8');
    game.draw.rect(0, H * 0.78, W, 12, '#b8c6dd');
    game.draw.rect(FL - 60, TOP - 40, FR - FL + 120, HEARTH - TOP + 80, BRICK_D);
    // 内壁のレンガ(奥の面)
    game.draw.rect(FL, TOP, FR - FL, HEARTH - TOP, '#3a2420');
    for (var r = 0; r * 40 < HEARTH - TOP; r++) {
      var yy = TOP + r * 40;
      game.draw.rect(FL, yy, FR - FL, 3, '#261614');
      for (var c = 0; c < 6; c++) game.draw.rect(FL + ((r % 2) * 55 + c * 110) % (FR - FL), yy, 3, 40, '#261614');
    }
    // 出口の蓋と開口
    game.draw.rect(FL - 60, TOP - 40, FR - FL + 120, 40, BRICK);
    game.draw.rect(fl.ex0, TOP - 44, fl.ex1 - fl.ex0, 48, '#9fc3ff');
    var glow = 0.25 + 0.2 * Math.sin(game.time.elapsed * 4);
    game.draw.rect(fl.ex0, TOP - 44, fl.ex1 - fl.ex0, 48, GOLD, glow);
    game.draw.rect(fl.ex0 - 6, TOP - 60, fl.ex1 - fl.ex0 + 12, 16, SNOW);
    // 棚
    for (var i = 0; i < fl.ledges.length; i++) {
      var g = fl.ledges[i];
      game.draw.rect(g.x, g.y + g.h, g.w, 14, '#000000', 0.35);
      game.draw.rect(g.x, g.y, g.w, g.h, BRICK);
      game.draw.rect(g.x, g.y, g.w, 6, '#d67a5e');
    }
    // 炉の格子
    for (var b = 0; b < 9; b++) game.draw.rect(FL + b * (FR - FL) / 9, HEARTH, 12, 30, '#555555');
    game.draw.rect(FL, HEARTH + 26, FR - FL, 10, '#333333');
  }

  function drawLump(L, scale) {
    // 接地影: 下の面との距離で濃さが変わる
    var floorY = HEARTH;
    var h = floorY - (L.y + L.r);
    var sa = Math.max(0.08, 0.45 - h / 1400);
    game.draw.rect(L.x - L.r * (0.9 - h / 3000), floorY - 6, L.r * 2 * (0.9 - h / 3000), 10, '#000000', sa);
    var px = (L.r * 2 / 8) * (scale || 1);
    game.draw.sprite(LUMP[Math.floor(Math.abs(L.spin)) % 2], { '#': SOOT, 'o': '#5a4c44' }, L.x, L.y, px, { anchor: 'center' });
  }

  function drawBrush(B, frame) {
    // 竿: 掃除人の手からブラシ頭へ
    var hx = W * 0.9, hy = H * 0.86;
    game.draw.line(hx - 20, hy - 60, B.x, B.y + 30, '#8a6a3a', 14);
    game.draw.sprite(BRUSH, { k: '#1b1b1b', w: '#c89a5a' }, B.x, B.y, 14, { anchor: 'center' });
    game.draw.sprite(SWEEP[frame], SWEEP_PAL, hx, hy, 14, { anchor: 'center' });
  }

  function drawHud() {
    say(cleared + ' / ' + NEEDED, W * 0.18, 90, 54, SNOW);
    say(String(score), W * 0.82, 90, 48, GOLD);
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(60, 164, W - 120, 22, '#0b0f1c', 0.6);
    game.draw.rect(60, 164, (W - 120) * fr, 22, timeLeft < 5 && Math.floor(game.time.elapsed * 6) % 2 === 0 ? RED : GOLD);
    for (var i = 0; i < NEEDED; i++) game.draw.sprite(FAR_CHIMNEY, { '#': i < cleared ? GOLD : '#44506e' }, W / 2 - 80 + i * 80, 96, 10, { anchor: 'center' });
  }

  // ── 入力 ──
  game.onTap(function (x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin', 0.45); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { game.audio.play('se_tap', 0.2); mode = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || halt || exitT > 0 || ready > 0) { game.audio.play('se_tap', 0.05); return; }
    // 短い突き: タップ位置から塊へ向けて押す(近いときだけ届く)
    var dx = lump.x - x, dy = lump.y - y;
    if (Math.sqrt(dx * dx + dy * dy) < lump.r + BRUSH_R + 90 && brush.cool <= 0) {
      clampBrush(brush, x, y);
      if (hitBrush(lump, brush, true)) { onShove(); brush.cool = 0.25; return; }
    }
    game.audio.play('se_tap', 0.1);
    game.fx.burst(x, y, { color: '#8a8a8a', count: 4, speed: 80 });
  });
  game.onPress(function (x, y) {
    if (mode !== S.PLAYING || over) return;
    game.audio.play('se_tap', 0.06);
    clampBrush(brush, x, y); brush.px = brush.x; brush.py = brush.y;
  });
  game.onMove(function (x, y) {
    if (mode !== S.PLAYING || over || halt) return;
    clampBrush(brush, x, y);
    if (Math.random() < 0.05) game.audio.tone('C6', 0.02, { wave: 'triangle', volume: 0.02 });
  });

  function onShove() {
    shoves++; shoveThis++;
    game.audio.play('se_jump', 0.3);
    game.fx.burst(lump.x, lump.y + lump.r, { color: '#555555', count: 10, speed: 220 });
  }

  function flueOut() {
    cleared++;
    var single = shoveThis === 1;
    if (single) oneShot++;
    score += 200 + (single ? 150 : 0) + Math.floor(timeLeft * 10);
    exitT = 0.8;
    game.feedback.good(lump.x, TOP - 60, { text: single ? 'PERFECT' : 'NICE', color: GOLD, count: 22 });
    game.audio.play('se_break', 0.35);
    if (cleared === 2) { game.fx.popup('2 / ' + NEEDED, W / 2, H * 0.3, { color: GOLD, size: 64 }); game.audio.play('se_milestone', 0.4); }
  }

  function nextFlue() {
    flue++;
    if (cleared >= NEEDED) { won = true; wrap(); return; }
    lump = makeLump(FLUES[flue].r); shoveThis = 0;
  }

  function wrap() {
    if (over) return;
    over = true; endT = 1.4;
    if (won) score += Math.floor(timeLeft * 30);
    game.audio.stopBgm();
    game.audio.play(won ? 'se_success' : 'se_failure', 0.55);
  }

  // ── ATTRACT: ゴーストがブラシを塊の下へ運び、一気に突き上げて出口から抜く ──
  var demo = { t: 0, L: null, B: null, press: false, out: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt || !demo.L) {
      demo.L = makeLump(FLUES[0].r); demo.L.x = W * 0.46;
      demo.B = { x: W * 0.6, y: H * 0.88, vx: 0, vy: 0 };
      demo.out = false;
    }
    var B = demo.B, L = demo.L;
    var ox = B.x, oy = B.y;
    if (cyc < 0.9) { clampBrush(B, B.x + (L.x + 6 - B.x) * Math.min(1, dt * 6), H * 0.88); demo.press = cyc > 0.5; }
    else if (cyc < 1.15) { clampBrush(B, L.x + 6, B.y - 2600 * dt); demo.press = true; }
    else { clampBrush(B, B.x, B.y + (H * 0.86 - B.y) * Math.min(1, dt * 4)); demo.press = false; }
    B.vx = (B.x - ox) / Math.max(dt, 0.001); B.vy = (B.y - oy) / Math.max(dt, 0.001);
    if (!demo.out) {
      if (hitBrush(L, B, false)) game.audio.play('se_jump', 0.12);
      var r = stepLump(L, FLUES[0], dt);
      if (r.out) { demo.out = true; game.feedback.good(L.x, TOP - 60, { text: 'NICE', color: GOLD, count: 10, volume: 0.2 }); }
    } else {
      L.y -= 900 * dt;
    }
  }

  game.onUpdate(function (dt) {
    for (var k = 0; k < flakes.length; k++) {
      flakes[k].y += flakes[k].v * dt; flakes[k].x += Math.sin(game.time.elapsed + k) * 15 * dt;
      if (flakes[k].y > H) { flakes[k].y = -10; flakes[k].x = Math.random() * W; }
    }
    var frame = Math.floor(game.time.elapsed * 2) % 2;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawSky();
      drawFlue(FLUES[0]);
      drawLump(demo.L, 1);
      drawBrush(demo.B, frame);
      game.draw.hand(demo.B.x + 10, demo.B.y + 10, { press: demo.press, scale: 16 });
      say(TITLE, W / 2, H * 0.06, 72, GOLD);
      say('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.105, 36, SNOW);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) say('► 100円 投入 ◄', W / 2, H * 0.955, 44, GOLD);
      else say('INSERT COIN', W / 2, H * 0.955, 38, '#1d2a4a');
      return;
    }

    if (mode === S.RESULT) {
      drawSky();
      drawFlue(FLUES[Math.min(flue, 2)]);
      if (!won) drawLump(lump, 1);
      game.draw.rect(60, H * 0.25, W - 120, H * 0.3, '#0b0f1c', 0.7);
      say(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.31, 96, won ? GOLD : RED);
      say(cleared + ' / ' + NEEDED, W / 2, H * 0.37, 56, SNOW);
      say('SCORE ' + score, W / 2, H * 0.42, 44, SNOW);
      if (won && score > prevBest) say('NEW RECORD', W / 2, H * 0.48, 52, GOLD);
      else say('BEST ' + Math.max(prevBest, game.best || 0), W / 2, H * 0.48, 38, '#aab6d0');
      if (!won) say('あと' + (NEEDED - cleared) + '本!', W / 2, H * 0.52, 44, GOLD);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) say('TAP TO CONTINUE', W / 2, H * 0.955, 38, '#1d2a4a');
      return;
    }

    // ── PLAYING ──
    brush.vx = (brush.x - brush.px) / Math.max(dt, 0.001);
    brush.vy = (brush.y - brush.py) / Math.max(dt, 0.001);
    brush.px = brush.x; brush.py = brush.y;
    if (brush.cool > 0) brush.cool -= dt;

    if (over) {
      endT -= dt;
      if (endT <= 0) {
        mode = S.RESULT;
        var st = { flues: cleared, shoves: shoves, oneShot: oneShot };
        if (won) game.end.success(score, st); else game.end.failure(st);
      }
    } else if (halt) {
      halt.t -= dt;
      if (halt.t <= 0) { halt = null; game.feedback.bad(lump.x, lump.y, { text: 'TIME UP' }); wrap(); }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else if (exitT > 0) {
      exitT -= dt;
      lump.y -= 1000 * dt;
      if (exitT <= 0) nextFlue();
    } else {
      timeLeft -= dt;
      if (game.input.pressing && brush.cool <= 0 && hitBrush(lump, brush, false)) { onShove(); brush.cool = 0.12; }
      var res = stepLump(lump, FLUES[flue], dt);
      if (res.bumped && Math.abs(lump.vy) > 300) game.audio.tone('G2', 0.05, { wave: 'square', volume: 0.05 });
      if (res.out) flueOut();
      if (timeLeft <= 0 && exitT <= 0) { timeLeft = 0; won = false; halt = { t: 0.45, max: 0.45 }; }
    }

    drawSky();
    drawFlue(FLUES[Math.min(flue, 2)]);
    if (halt) {
      var k = 1 - halt.t / halt.max;
      game.draw.circle(lump.x, lump.y, lump.r * (1.4 + k), SNOW, 0.6 * (1 - k) + 0.15);
      drawLump(lump, 1 + k * 0.4);
    } else {
      drawLump(lump, 1);
    }
    drawBrush(brush, frame);
    drawHud();
    if (ready > 0) say(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 104, GOLD);
  });

  game.onStart(function () {
    game.audio.melody([['C4', 0.5], ['E4', 0.5], ['G4', 0.5], ['E4', 0.5], ['F4', 0.5], ['A4', 0.5], ['G4', 1], ['E4', 0.5], ['D4', 0.5], ['C4', 0.5], ['D4', 0.5], ['E4', 1], ['R', 1]], { tempo: 132, wave: 'triangle', volume: 0.05, loop: true });
    mode = S.ATTRACT;
    initGame();
  });
})(game);
