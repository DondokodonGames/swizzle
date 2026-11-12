// I-Switch2-0011v3-toyclass-slot-chute.js
// 仕切り板すき間通し — 木の盤の仕切り板にあいたすき間へ向けて樋の向きを合わせ、穴をよけて玉を一段ずつ通し、奥の巣穴まで届ける
// 操作: 下の帯を押したまま左右にずらすと手元の樋の向きが変わる(短い点線が向きの見本)。離すと玉がまっすぐ転がる。仕切り板のすき間を通れば次の段で止まる。後半は仕切り板が左右に動き、すき間を待って離す。迷っていると樋が傾いて勝手に転がる(社内メモ。画面には出さない)
// 終わり: 4枚の仕切り板と巣穴の入口の5か所を通せばCLEAR。仕切りにぶつける/穴に落とすと玉を1個失い、3個失うか20秒切れでGAME OVER
// @mechanic: gap_fit
// @theme: toyclass_wooden_slot_chute
// 世界観: 公民館の手作りおもちゃ教室で、講師が子どもたちに見本を見せながら、穴だらけの木の盤に並ぶ仕切り板のすき間へ樋の向きを合わせて玉を一段ずつ通し、奥のハムスターの巣穴まで届ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 通したすき間の数・PERFECT数・スコア
// スタイル: VOXEL BLOCK

(function(game) {
  var STYLE = { bg: ['#f2e6d0', '#d8c0a0', '#a88058'], main: ['#e8b878', '#c48a4a', '#8a5a2a'], accent: ['#5ab8e8', '#e85a4a'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  var GAME_TITLE = 'SLOT CHUTE';
  var TIME_LIMIT = 20;
  var NEEDED = 5;
  var BALLS = 3;
  var BL = 120, BRT = 960, CUBE = 60, BR = 24, SPEED = 950;
  var START = { x: W * 0.5, y: H * 0.73 };
  var PART_Y = [1190, 970, 750, 530, 330];
  var STAGES = [
    { gw: 180, amp: 0, w: 0, holes: 1, prev: 270, aim: 4.0 },
    { gw: 150, amp: 0, w: 0, holes: 2, prev: 230, aim: 3.6 },
    { gw: 140, amp: 120, w: 1.6, holes: 2, prev: 190, aim: 3.4 },
    { gw: 130, amp: 160, w: 2.1, holes: 3, prev: 160, aim: 3.1 },
    { gw: 120, amp: 0, w: 0, holes: 2, prev: 140, aim: 2.8 },
  ];
  var PANEL_Y = H * 0.86;

  var BALL_A = ['..kkkk..', '.kyyyyk.', 'kyyyyyyk', 'kykyykyk', 'kyyyyyyk', 'kyyrryyk', '.kyyyyk.', '..kkkk..'];
  var BALL_B = ['..kkkk..', '.kyyyyk.', 'kyyyyyyk', 'kyyyyyyk', 'kykyykyk', 'kyyrryyk', '.kyyyyk.', '..kkkk..'];
  var BALL_PAL = { k: '#5a3a1a', y: '#f8d898', r: '#e85a4a' };
  var HAM_A = ['.kk....kk.', 'kook..kook', 'kooooooook', 'koeooooeok', 'koooppoook', '.koowwook.', '..kkkkkk..'];
  var HAM_B = ['.kk....kk.', 'kook..kook', 'kooooooook', 'kokooookok', 'koooppoook', '.kowwwwok.', '..kkkkkk..'];
  var HAM_PAL = { k: '#5a3a1a', o: '#f0a858', e: '#2a1a0a', p: '#ff8a9a', w: '#ffffff' };
  var TEACH_A = ['..kkkk..', '.kggggk.', '.kssssk.', '.ksesek.', '.kssssk.', '..kaak..', '.kaaaak.', 'kaawwaak', 'ka.aa.ak', '..kbbk..', '..kbbk..', '.kk..kk.'];
  var TEACH_B = ['..kkkk..', '.kggggk.', '.kssssk.', '.ksesek.', '.kssmsk.', '..kaak.s', '.kaaaaks', 'kaawwaak', 'k..aa...', '..kbbk..', '.kb..bk.', '.kk..kk.'];
  var TEACH_PAL = { k: '#3a2a1a', g: '#6a6a6a', s: '#f2c8a0', e: '#2a1a0a', m: '#c84a3a', a: '#5a8ac8', w: '#ffffff', b: '#4a4a5a' };

  var STATE = { ATTRACT: 'ATTRACT', PLAYING: 'PLAYING', RESULT: 'RESULT' };
  var state = STATE.ATTRACT;

  var stage = 0, gapX = [], holes = [], decor = [];
  var ball = { x: 0, y: 0, vx: 0, vy: 0, mode: 'rest', rx: 0, ry: 0 }, ang = 0, aimT = 0, pressing = false;
  var passed = 0, balls = BALLS, perfects = 0, score = 0;
  var left = TIME_LIMIT, count = 0, stopT = 0, holdT = 0, fadeT = 0, celebT = 0, cheer = 0;
  var on = false, cleared = false, bestAtStart = 0, failAt = null, lineHit = false, tRow = 0;

  function write(str, x, y, size, color) {
    game.draw.text(str, x + 4, y + 4, { size: size, color: '#5a3a1a', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function st() { return STAGES[Math.min(STAGES.length - 1, stage)]; }
  function rowOffset(k) { var s = STAGES[k]; return s.amp * Math.sin(tRow * s.w + k); }
  function gapCenter(k) { return gapX[k] + rowOffset(k); }

  function buildBoard() {
    gapX = [];
    var prev = START.x;
    for (var k = 0; k < PART_Y.length; k++) {
      var g = prev + game.random(-340, 340);
      g = Math.max(BL + 150 + STAGES[k].amp, Math.min(BRT - 150 - STAGES[k].amp, g));
      gapX.push(g); prev = g;
    }
    decor = [];
    for (var d = 0; d < 26; d++) decor.push({ x: game.random(BL + 40, BRT - 40), y: game.random(PART_Y[4] + 60, START.y - 40), r: game.random(14, 26) });
  }

  // いまの段の穴: 玉→すき間の直線の両脇に置く(直線そのものはふさがない)
  function placeHoles() {
    var s = st();
    var tx = gapX[stage], ty = PART_Y[stage];
    var dx = tx - ball.x, dy = ty - ball.y, len = Math.hypot(dx, dy);
    var nx = -dy / len, ny = dx / len;
    holes = [];
    for (var i = 0; i < s.holes; i++) {
      var f = 0.35 + 0.4 * (i + 0.5) / s.holes;
      var side = i % 2 === 0 ? 1 : -1;
      var r = 34 + game.random(0, 10);
      var off = side * (r + BR + game.random(26, 46));
      var hx = Math.max(BL + r + 4, Math.min(BRT - r - 4, ball.x + dx * f + nx * off)), hy = ball.y + dy * f + ny * off;
      if (distToLine(hx, hy, ball.x, ball.y, tx, ty) > r + BR + 20) holes.push({ x: hx, y: hy, r: r });
    }
    for (var d = 0; d < decor.length; d++) {
      var h = decor[d];
      if (h.y > ty + 50 && h.y < ball.y - 50 && distToLine(h.x, h.y, ball.x, ball.y, tx, ty) > h.r + BR + 30) holes.push(h);
    }
    aimT = s.aim;
  }

  function distToLine(px, py, ax, ay, bx, by) {
    var vx = bx - ax, vy = by - ay;
    var t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)));
    return Math.hypot(ax + vx * t - px, ay + vy * t - py);
  }

  function resetBall() {
    ball.x = ball.rx; ball.y = ball.ry; ball.vx = 0; ball.vy = 0; ball.mode = 'rest'; failAt = null;
    aimT = st().aim;
  }

  function roll(live) {
    if (ball.mode !== 'rest') return;
    var a = ang * Math.PI / 180;
    ball.rx = ball.x; ball.ry = ball.y;
    ball.vx = Math.sin(a) * SPEED; ball.vy = -Math.cos(a) * SPEED; ball.mode = 'roll';
    game.audio.play('se_jump', live ? 0.3 : 0.1);
  }

  function failBall(x, y, kind, live) {
    ball.mode = 'fail'; stopT = 0.55;
    failAt = { x: x, y: y, kind: kind };
    game.feedback.bad(x, y, { text: 'MISS', shake: live ? 12 : 4, volume: live ? 1 : 0.4 });
    if (kind === 'jam') game.audio.play('se_break', live ? 0.35 : 0.12);
    if (!live) return;
    balls--;
    if (balls <= 0) { cleared = false; finishRun(); }
  }

  function passGap(live) {
    var off = Math.abs(ball.x - gapCenter(stage));
    var perfect = off < st().gw * 0.16;
    game.feedback.good(ball.x, PART_Y[stage] - 40, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? STYLE.accent[0] : '#ffffff', count: perfect ? 16 : 9, volume: live ? 1 : 0.4 });
    if (live) {
      passed++;
      if (perfect) perfects++;
      score += 100 + Math.round(aimT * 40) + (perfect ? 80 : 0);
      if (passed === 3) { game.fx.popup('3 / ' + NEEDED, W / 2, H * 0.5, { color: STYLE.accent[0], size: 60 }); game.audio.play('se_milestone', 0.5); }
    }
    if (stage >= PART_Y.length - 1) {
      ball.mode = 'home'; stopT = 0.6; cheer = 1.2;
      if (live) { cleared = true; finishRun(); }
      return;
    }
    ball.mode = 'settle'; ball.ty = PART_Y[stage] - 64;
  }

  // 実ロジック: 玉の転がりと当たり。戻り値 'next'(次の段へ) | 'retry' | 'home' | null
  function stepBall(dt, live) {
    tRow += dt;
    if (ball.mode === 'fail' || ball.mode === 'home') {
      stopT -= dt;
      if (stopT <= 0) return ball.mode === 'home' ? 'home' : 'retry';
      return null;
    }
    if (ball.mode === 'settle') {
      ball.x = Math.max(BL + BR + 10, Math.min(BRT - BR - 10, ball.x + ball.vx * dt * 0.4)); ball.y += ball.vy * dt * 0.4;
      if (ball.y <= ball.ty) { ball.y = ball.ty; ball.vx = 0; ball.vy = 0; ball.mode = 'rest'; stage++; return 'next'; }
      return null;
    }
    if (ball.mode !== 'roll') return null;
    var steps = 4;
    for (var i = 0; i < steps; i++) {
      var py = ball.y;
      ball.x += ball.vx * dt / steps; ball.y += ball.vy * dt / steps;
      if (ball.x < BL + BR || ball.x > BRT - BR) { failBall(ball.x, ball.y, 'jam', live); return null; }
      for (var h = 0; h < holes.length; h++) {
        if (Math.hypot(ball.x - holes[h].x, ball.y - holes[h].y) < holes[h].r) { failBall(holes[h].x, holes[h].y, 'hole', live); return null; }
      }
      var wy = PART_Y[stage] + CUBE * 0.5;
      if (py > wy && ball.y <= wy) {
        var gc = gapCenter(stage), half = st().gw / 2 - BR * 0.55;
        if (Math.abs(ball.x - gc) <= half) { passGap(live); return null; }
        failBall(ball.x, wy, 'jam', live); return null;
      }
    }
    return null;
  }

  function finishRun() {
    on = false; holdT = 0.6; celebT = 0;
    game.audio.stopBgm();
    if (cleared) { score += Math.round(left * 30); game.audio.play('se_success', 0.5); }
    else game.audio.play('se_failure', 0.45);
  }

  function startBgm() {
    game.audio.melody([
      ['G4', 0.5], ['A4', 0.5], ['B4', 0.5], ['D5', 0.5], ['C5', 1], ['A4', 1],
      ['B4', 0.5], ['G4', 0.5], ['A4', 0.5], ['F#4', 0.5], ['G4', 2],
    ], { tempo: 116, wave: 'triangle', volume: 0.06, loop: true, bass: [['G2', 2], ['C3', 2], ['D3', 2], ['G2', 2]] });
  }

  function initGame() {
    stage = 0; passed = 0; balls = BALLS; perfects = 0; score = 0;
    left = TIME_LIMIT; count = 0.8; stopT = 0; holdT = 0; fadeT = 0; celebT = 0; cheer = 0;
    on = false; cleared = false; pressing = false; ang = 0; tRow = 0; failAt = null;
    bestAtStart = game.best || 0;
    buildBoard();
    ball.x = START.x; ball.y = START.y; ball.rx = ball.x; ball.ry = ball.y; ball.mode = 'rest';
    placeHoles();
  }

  function angFromX(x) { return Math.max(-62, Math.min(62, (x - W / 2) / (W * 0.4) * 62)); }

  game.onPress(function(x, y) {
    if (state !== STATE.PLAYING || !on || ball.mode !== 'rest' || y < H * 0.76) return;
    pressing = true; ang = angFromX(x);
    game.audio.play('se_tap', 0.15);
  });
  game.onMove(function(x, y) {
    if (!pressing) return;
    var a = angFromX(x);
    if (Math.abs(a - ang) > 4) game.audio.tone(500 + a * 4, 0.02, { wave: 'square', volume: 0.04 });
    ang = a;
  });
  game.onRelease(function(x, y) {
    if (!pressing) return;
    pressing = false;
    if (state !== STATE.PLAYING || !on || ball.mode !== 'rest') { game.audio.tone('C4', 0.04, { wave: 'square', volume: 0.05 }); return; }
    game.fx.burst(ball.x, ball.y, { color: '#fff6c0', count: 6, speed: 140 });
    roll(true);
  });
  game.onTap(function(x, y) {
    if (state === STATE.ATTRACT) { game.audio.play('se_coin', 0.5); state = STATE.PLAYING; initGame(); startBgm(); return; }
    if (state === STATE.RESULT) { state = STATE.ATTRACT; initGame(); demo.t = 0; return; }
    if (y < H * 0.76) { game.audio.play('se_tap', 0.08); game.fx.burst(x, y, { color: STYLE.main[0], count: 3, speed: 70 }); }
  });

  // ── ATTRACT ゴースト実演: 本番の当たり判定で転がす。2周目の2段目はわざと少しずらして穴に落とす ──
  var demo = { t: 0, gx: W / 2, gy: PANEL_Y, press: false, wait: 0, n: 0 };
  function demoBoard() {
    stage = 0; buildBoard(); tRow = 0;
    ball.x = START.x; ball.y = START.y; ball.rx = ball.x; ball.ry = ball.y; ball.mode = 'rest';
    placeHoles(); demo.wait = 0; demo.n++;
  }
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt) { demo.n = 0; demoBoard(); }
    var ev = stepBall(dt, false);
    if (ev === 'next') { placeHoles(); demo.wait = 0; }
    if (ev === 'retry') { resetBall(); demo.wait = 0; demo.n++; }
    if (ev === 'home' || (ev === 'next' && stage >= 3)) { demoBoard(); return; }
    if (ball.mode !== 'rest') { demo.press = false; return; }
    demo.wait += dt;
    var wy = PART_Y[stage] + CUBE * 0.5;
    var T = Math.hypot(gapCenter(stage) - ball.x, ball.y - wy) / SPEED + 0.05;
    var gc = gapX[stage] + STAGES[stage].amp * Math.sin((tRow + T) * STAGES[stage].w + stage);
    var want = Math.atan2(gc - ball.x, ball.y - (PART_Y[stage] + CUBE * 0.5)) * 180 / Math.PI;
    if (demo.n % 2 === 0 && stage === 1) want += 24;
    var targetX = W / 2 + want / 62 * W * 0.4;
    if (demo.wait < 0.4) { demo.gx = W / 2; demo.press = false; }
    else {
      demo.press = true;
      demo.gx += (targetX - demo.gx) * Math.min(1, dt * 6);
      ang = angFromX(demo.gx);
      if (demo.wait > 1.3 && Math.abs(demo.gx - targetX) < 6) { demo.press = false; roll(false); }
    }
    demo.gy = PANEL_Y;
  }

  // ── 描画(立方体は上面・前面・側面の3明度) ──
  function cube(x, y, s, base) {
    var c = base || STYLE.main;
    game.draw.rect(x, y, s, s * 0.42, c[0]);
    game.draw.rect(x, y + s * 0.42, s, s * 0.58, c[1]);
    game.draw.rect(x + s * 0.82, y + s * 0.42, s * 0.18, s * 0.58, c[2]);
  }

  function drawTable() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.12, '#e8d6b8'], [0.13, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    for (var i = 0; i < 12; i++) game.draw.rect(0, 250 + i * 140, W, 3, '#8a6a48', 0.25);
    // 盤の外枠(立方体の列)
    for (var y = 250; y < H * 0.75; y += CUBE) { cube(BL - CUBE, y, CUBE); cube(BRT, y, CUBE); }
    game.draw.rect(BL, 250, BRT - BL, H * 0.75 - 250, '#c8a070');
    for (var g = 0; g < 14; g++) game.draw.rect(BL, 260 + g * 82, BRT - BL, 2, '#b08858', 0.6);
    // 巣穴の奥に住むハムスター
    var bob = Math.sin(t * 3) * 6 - (cheer > 0 ? 24 : 0);
    var hx = gapCenter(PART_Y.length - 1);
    game.draw.rect(hx - 70, 250, 140, 70, '#3a2412');
    game.draw.sprite(Math.floor(t * 2) % 2 && cheer <= 0 ? HAM_A : HAM_B, HAM_PAL, hx, 270 + bob, 10, { anchor: 'center' });
  }

  function drawPartitions(hl) {
    var t = game.time.elapsed;
    for (var k = 0; k < PART_Y.length; k++) {
      var s = STAGES[k];
      var gc = gapCenter(k);
      var y = PART_Y[k];
      var active = k === stage;
      var base = k === PART_Y.length - 1 ? ['#c8a0e8', '#9a6ac8', '#6a4a98'] : active ? STYLE.main : ['#d8b088', '#a8804e', '#7a5428'];
      for (var x = BL; x < BRT; x += CUBE) {
        var cx = x + CUBE / 2;
        if (Math.abs(cx - gc) < s.gw / 2) continue;
        cube(x, y, CUBE, base);
      }
      if (active) {
        // すき間 = 狙う所(明滅する白い縁)
        var a = 0.35 + 0.35 * Math.abs(Math.sin(t * 5));
        game.draw.rect(gc - s.gw / 2, y - 6, 8, CUBE + 12, '#ffffff', a);
        game.draw.rect(gc + s.gw / 2 - 8, y - 6, 8, CUBE + 12, '#ffffff', a);
        game.draw.rect(gc - s.gw / 2, y, s.gw, CUBE, '#fff6c0', 0.18 + 0.15 * Math.sin(t * 5));
      }
    }
  }

  function drawHoles(hl) {
    var t = game.time.elapsed;
    for (var i = 0; i < holes.length; i++) {
      var h = holes[i];
      game.draw.circle(h.x, h.y, h.r + 6, '#e85a4a', 0.55);
      game.draw.circle(h.x, h.y, h.r, '#2a1608');
      game.draw.circle(h.x - h.r * 0.2, h.y - h.r * 0.25, h.r * 0.55, '#120a04');
      if (hl && failAt && failAt.kind === 'hole' && Math.hypot(failAt.x - h.x, failAt.y - h.y) < 2) game.draw.circle(h.x, h.y, h.r + 30, '#ffffff', 0.5 + 0.3 * Math.sin(t * 22));
    }
    if (hl && failAt && failAt.kind === 'jam') game.draw.circle(failAt.x, failAt.y, 70, '#ffffff', 0.5 + 0.3 * Math.sin(t * 22));
  }

  function drawChute() {
    if (ball.mode !== 'rest') return;
    var a = ang * Math.PI / 180;
    var ux = Math.sin(a), uy = -Math.cos(a), nx = -uy, ny = ux;
    // 樋(2本の木の縁)
    game.draw.line(ball.x + nx * 34 - ux * 50, ball.y + ny * 34 - uy * 50, ball.x + nx * 34 + ux * 70, ball.y + ny * 34 + uy * 70, '#7a5428', 14);
    game.draw.line(ball.x - nx * 34 - ux * 50, ball.y - ny * 34 - uy * 50, ball.x - nx * 34 + ux * 70, ball.y - ny * 34 + uy * 70, '#7a5428', 14);
    // 向きの見本(短い点線。穴にかかると赤)
    var len = st().prev;
    lineHit = false;
    for (var d = 60; d < len; d += 24) {
      var px = ball.x + ux * d, py = ball.y + uy * d;
      for (var h = 0; h < holes.length; h++) if (Math.hypot(px - holes[h].x, py - holes[h].y) < holes[h].r + BR * 0.6) lineHit = true;
    }
    for (var e = 60; e < len; e += 24) game.draw.circle(ball.x + ux * e, ball.y + uy * e, 7, lineHit ? STYLE.accent[1] : '#ffffff', 0.9);
    // 傾き待ちの輪(尽きると勝手に転がる)
    var k = Math.max(0, aimT / st().aim);
    for (var q = 0; q < 24; q++) {
      if (q / 24 > k) break;
      var an = -Math.PI / 2 + q / 24 * Math.PI * 2;
      game.draw.circle(ball.x + Math.cos(an) * 52, ball.y + Math.sin(an) * 52, 6, k < 0.3 ? STYLE.accent[1] : STYLE.accent[0]);
    }
  }

  function drawBall(hl) {
    var t = game.time.elapsed;
    if (ball.mode === 'fail' && failAt && failAt.kind === 'hole') {
      var k = Math.max(0, stopT / 0.55);
      game.draw.sprite(BALL_B, BALL_PAL, failAt.x, failAt.y, 6 * (0.4 + k * 0.6) * (hl ? 1.3 : 1), { anchor: 'center' });
      return;
    }
    if (hl && ball.mode === 'fail') game.draw.circle(ball.x, ball.y, 56, '#ffffff', 0.6);
    game.draw.circle(ball.x + 6, ball.y + 8, BR, '#5a3a1a', 0.3);
    game.draw.sprite(Math.floor(t * 1.5) % 4 === 0 ? BALL_B : BALL_A, BALL_PAL, ball.x, ball.y, 6.5, { anchor: 'center' });
  }

  function drawPanel() {
    var t = game.time.elapsed;
    var live = ball.mode === 'rest';
    game.draw.rect(0, H * 0.76, W, H * 0.24, '#8a6440');
    game.draw.rect(0, H * 0.76, W, 10, '#c49a68');
    game.draw.rect(W * 0.1, PANEL_Y - 30, W * 0.8, 60, '#5a3a1a');
    game.draw.rect(W * 0.1, PANEL_Y - 30, W * 0.8, 12, live ? '#f8e0b0' : '#a8804e', live ? 0.6 + 0.3 * Math.sin(t * 5) : 0.5);
    var kx = W / 2 + ang / 62 * W * 0.4;
    cube(kx - 45, PANEL_Y - 50, 90, live ? [STYLE.accent[0], '#3a98c8', '#2a6a98'] : STYLE.main);
    game.draw.sprite(Math.floor(t * 3) % 2 ? TEACH_A : TEACH_B, TEACH_PAL, W * 0.1, H * 0.95, 9, { anchor: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 240, '#f2e6d0');
    for (var i = 0; i < 6; i++) cube(i * 190 - 20, 214, 30, STYLE.main);
    write(passed + ' / ' + NEEDED, W / 2, 96, 54, STYLE.main[2]);
    write(String(score), W - 140, 96, 34, STYLE.accent[0]);
    for (var b = 0; b < BALLS; b++) game.draw.sprite(BALL_A, BALL_PAL, 70 + b * 64, 96, 6, { anchor: 'center', alpha: b < balls ? 1 : 0.2 });
    var bw = W - 160;
    var low = left < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 160, bw, 20, '#a8804e');
    game.draw.rect(80, 160, bw * Math.max(0, left / TIME_LIMIT), 20, low ? STYLE.accent[1] : STYLE.accent[0]);
  }

  function drawAll(hl) {
    drawTable();
    drawHoles(hl);
    drawPartitions(hl);
    drawChute();
    drawBall(hl);
    drawPanel();
  }

  game.onUpdate(function(dt) {
    if (cheer > 0) cheer -= dt;

    if (state === STATE.ATTRACT) {
      stepDemo(dt);
      drawAll(ball.mode === 'fail');
      game.draw.rect(0, 0, W, 240, '#f2e6d0');
      for (var c = 0; c < 6; c++) cube(c * 190 - 20, 214, 30, STYLE.main);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      var bob = Math.sin(game.time.elapsed * 2) * 6;
      write(GAME_TITLE, W / 2, H * 0.05 + bob, 70, STYLE.main[2]);
      write('HI-SCORE ' + Math.round(game.best || 0), W / 2, H * 0.093, 30, STYLE.accent[0]);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) write('► 100円 投入 ◄', W / 2, H * 0.975, 40, '#fff6c0');
      else write('INSERT COIN', W / 2, H * 0.975, 32, '#ffffff');
      return;
    }

    if (state === STATE.RESULT) {
      tRow += dt;
      celebT -= dt;
      if (cleared && celebT <= 0) {
        celebT = 0.3; cheer = 0.3;
        game.fx.burst(game.random(W * 0.15, W * 0.85), game.random(H * 0.2, H * 0.6), { color: game.random(0, 1) < 0.5 ? STYLE.accent[0] : '#fff6c0', count: 14, speed: 360 });
      }
      drawAll(!cleared);
      game.draw.rect(0, 0, W, 250, '#f2e6d0', 0.92);
      write(cleared ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.055, 78, cleared ? STYLE.accent[0] : STYLE.accent[1]);
      write(passed + ' / ' + NEEDED + '   SCORE ' + score, W / 2, H * 0.1, 36, STYLE.main[2]);
      if (!cleared) write('あと' + (NEEDED - passed) + '枚!', W / 2, H * 0.8, 48, '#fff6c0');
      else write('PERFECT ' + perfects, W / 2, H * 0.8, 44, '#fff6c0');
      if (score > bestAtStart && score > 0) write('NEW RECORD', W / 2, H * 0.84, 34, Math.floor(game.time.elapsed * 4) % 2 ? '#fff6c0' : STYLE.accent[0]);
      else write('BEST ' + Math.round(game.best || 0), W / 2, H * 0.84, 30, '#ffffff');
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) write('TAP TO CONTINUE', W / 2, H * 0.975, 32, '#ffffff');
      return;
    }

    // ── PLAYING ──
    if (fadeT > 0) {
      fadeT -= dt;
      if (fadeT <= 0) {
        state = STATE.RESULT;
        var stats = { passed: passed, perfect: perfects, balls: balls };
        if (cleared) game.end.success(score, stats); else game.end.failure(stats);
        if (cleared && score > bestAtStart) game.audio.play('se_milestone', 0.5);
      }
    } else if (holdT > 0) {
      holdT -= dt;
      tRow += dt * 0.2;
      if (holdT <= 0) fadeT = 1.0;
    } else if (count > 0) {
      count -= dt;
      if (count <= 0) { on = true; game.audio.play('se_tap', 0.35); }
    } else if (on) {
      if (ball.mode === 'rest' || ball.mode === 'roll' || ball.mode === 'settle') left -= dt;
      if (ball.mode === 'rest') {
        aimT -= dt;
        if (aimT < 0.7 && aimT + dt >= 0.7) game.audio.tone('A3', 0.1, { wave: 'square', volume: 0.08 });
        if (aimT <= 0) { pressing = false; roll(true); }
      }
      var ev = stepBall(dt, true);
      if (ev === 'next') { placeHoles(); game.audio.play('se_coin', 0.25); }
      if (ev === 'retry') resetBall();
      if (on && left <= 0) {
        left = 0; cleared = false;
        failAt = { x: ball.x, y: ball.y, kind: 'jam' }; ball.mode = 'fail'; stopT = 0.5;
        game.feedback.bad(ball.x, ball.y, { text: 'TIME UP', shake: 10 });
        finishRun();
      }
    }

    drawAll((ball.mode === 'fail') && !cleared);
    drawHud();
    if (count > 0) write(count > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.62, 92, STYLE.accent[0]);
  });

  game.onStart(function() {
    startBgm();
    state = STATE.ATTRACT;
    initGame();
  });
})(game);
