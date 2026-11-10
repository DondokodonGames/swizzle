// I-Switch-0003v3-camp-balloon-sling.js
// 林間学校の紙風船ゴムはじき — 枝から吊るされて振り子のように揺れる紙風船へ、ゴム玩具を引く向きと強さで松ぼっくりを放ち、真ん中を射抜く
// 操作: 画面のどこかを押してそのまま引き、離すと引いた逆向きへ松ぼっくりが飛ぶ。引く長さ=速さ(弱いと届く前に落ちる)。風船は揺れているので、飛ぶ間に風船が来る所へ放つ。真ん中に近いほど高得点
// 終わり: 18秒・松ぼっくり9個のうちに4組6個の紙風船を全部割ればCLEAR。松ぼっくりが尽きる/時間切れでGAME OVER
// @mechanic: slingshot
// @theme: camp_paper_balloon_sling
// 世界観: 夏の林間学校の夕暮れ、キャンプ係の少年が手作りのゴム玩具で松ぼっくりを飛ばし、キャンプファイアの脇の枝に吊るして揺れる顔つきの紙風船の真ん中を射抜いていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 割った数・真ん中(PERFECT)数・残り松ぼっくりのスコア
// スタイル: HD POST 3D

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  // HD POST 3D: 褐色〜灰に寄せた低彩度、ブルーム(半透明円の重ね)、ビネット(四辺の黒)
  var STYLE = { bg: ['#2a2420', '#5a4a3a', '#8a7055'], main: ['#c9b48f', '#7d8c6a', '#e8dcc0'], accent: ['#ff9a3c', '#d94f3d'] };
  var DARK = '#15110e';

  var CONES = 9, TIME_LIMIT = 18, GRAV = 820, PULL_K = 6.4, PULL_MAX = 270;
  var BRANCH_Y = H * 0.13;
  var SLING = { x: W * 0.5, y: H * 0.8 };
  var BR = 70;

  var WAVES = [
    [{ px: 540, L: 500, A: 0.3, om: 1.7, ph: 0.4 }],
    [{ px: 540, L: 700, A: 0.42, om: 2.1, ph: 2.2 }],
    [{ px: 330, L: 470, A: 0.36, om: 2.3, ph: 0 }, { px: 750, L: 640, A: 0.36, om: 2.3, ph: Math.PI }],
    [{ px: 300, L: 650, A: 0.46, om: 2.7, ph: 1.0 }, { px: 790, L: 430, A: 0.5, om: 3.0, ph: 4.0, gold: true }],
  ];
  var TOTAL = 6;

  var S = { ATTRACT: 'ATTRACT', PLAYING: 'PLAYING', RESULT: 'RESULT' };
  var st = S.ATTRACT;
  var g = null;

  var FACE_A = [
    '...pppp...',
    '..pqqqqp..',
    '.pqqqqqqp.',
    'pqqeqqeqqp',
    'pqqqqqqqqp',
    'pqqmqqmqqp',
    'pqqqmmqqqp',
    '.pqqqqqqp.',
    '..pqqqqp..',
    '...pppp...',
  ];
  var FACE_B = [
    '...pppp...',
    '..pqqqqp..',
    '.pqqqqqqp.',
    'pqqqqqqqqp',
    'pqeeqqeeqp',
    'pqqqqqqqqp',
    'pqqqmmqqqp',
    '.pqqqqqqp.',
    '..pqqqqp..',
    '...pppp...',
  ];
  var KID_A = [
    '...hhhh...',
    '..hhhhhh..',
    '..hffffh..',
    '..fefeff..',
    '...ffff...',
    '..rrrrrr..',
    '.ggrrrrgg.',
    '.f.gggg.f.',
    '...gggg...',
    '...b..b...',
    '...b..b...',
    '..kk..kk..',
  ];
  var KID_UP = [
    '.f.hhhh.f.',
    '.fhhhhhhf.',
    '.ghffffhg.',
    '.gfefeffg.',
    '..gffffg..',
    '..rrrrrr..',
    '..grrrrg..',
    '...gggg...',
    '...gggg...',
    '...b..b...',
    '...b..b...',
    '..kk..kk..',
  ];
  var KID_SAD = [
    '..........',
    '...hhhh...',
    '..hhhhhh..',
    '..hffffh..',
    '..ffffff..',
    '..fefeff..',
    '..rrrrrr..',
    '.ggrrrrgg.',
    '.f.gggg.f.',
    '...gggg...',
    '...b..b...',
    '..kk..kk..',
  ];
  var KID_PAL = { h: '#3a2a20', f: '#e0b48a', e: DARK, r: STYLE.accent[1], g: STYLE.main[1], b: '#4a4038', k: '#221a14' };
  var CONE = ['.cc.', 'cddc', 'cddc', '.cc.'];
  var CONE_PAL = { c: '#8a5a32', d: '#b8804a' };

  function fresh() {
    return {
      phase: 'ready', readyT: 0.8, clock: TIME_LIMIT, t: 0,
      wave: 0, balloons: [], cones: CONES, shot: null, reload: 0,
      popped: 0, perfects: 0, score: 0, chain: 0, closest: 9999,
      drag: null, mood: 0, moodKind: 0,
      stopT: 0, won: false, prevBest: 0, partyT: 0,
    };
  }

  function loadWave(i) {
    g.wave = i;
    g.balloons = [];
    var defs = WAVES[i];
    for (var k = 0; k < defs.length; k++) {
      var d = defs[k];
      g.balloons.push({ px: d.px, L: d.L, A: d.A, om: d.om, ph: d.ph, gold: !!d.gold, alive: true, hitT: 0, wob: 0 });
    }
  }

  function bPos(b, t) {
    var th = b.A * Math.sin(b.om * t + b.ph) + b.wob * Math.sin(t * 14);
    return { x: b.px + b.L * Math.sin(th), y: BRANCH_Y + b.L * Math.cos(th) };
  }

  function startRound() {
    g.phase = 'run';
    loadWave(0);
  }

  // 引いた量 → 初速
  function launchVec(dx, dy) {
    var len = Math.hypot(dx, dy);
    if (len > PULL_MAX) { dx *= PULL_MAX / len; dy *= PULL_MAX / len; }
    return { vx: -dx * PULL_K, vy: -dy * PULL_K, pdx: dx, pdy: dy };
  }

  function release(dx, dy) {
    var v = launchVec(dx, dy);
    if (Math.hypot(v.pdx, v.pdy) < 40) { game.audio.play('se_tap', 0.2); return; }
    g.shot = { x: SLING.x + v.pdx, y: SLING.y - 20 + v.pdy, vx: v.vx, vy: v.vy, near: 9999, spin: 0 };
    g.cones--;
    g.reload = 0.3;
    game.audio.play('se_jump', 0.4);
    game.audio.tone(220 + Math.hypot(v.pdx, v.pdy), 0.06, { wave: 'square', volume: 0.05, slide: 300 });
  }

  function hitBalloon(b, d) {
    var perfect = d <= BR * 0.38;
    b.alive = false; b.hitT = 0.35;
    g.popped++;
    if (perfect) { g.perfects++; g.chain++; } else g.chain = 0;
    var base = perfect ? 300 : 120;
    if (b.gold) base *= 2;
    var mult = g.chain >= 2 ? 2 : 1;
    g.score += base * mult;
    var p = bPos(b, g.t);
    game.feedback.good(p.x, p.y, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? STYLE.accent[0] : STYLE.main[2], size: 56 });
    game.fx.burst(p.x, p.y, { color: b.gold ? '#ffd76a' : STYLE.main[2], count: 22, speed: 420 });
    game.audio.play('se_break', 0.3);
    if (b.gold) game.audio.play('se_coin', 0.45);
    if (mult > 1) game.fx.popup('x2', p.x, p.y - 110, { color: STYLE.accent[0], size: 48 });
    if (g.popped === 3) { game.fx.popup('3 / ' + TOTAL, W / 2, H * 0.22, { color: STYLE.main[2], size: 60 }); game.audio.play('se_milestone', 0.45); }
    g.mood = 0.6; g.moodKind = 1;
    // 残りの風船が揺さぶられる
    for (var i = 0; i < g.balloons.length; i++) if (g.balloons[i].alive) g.balloons[i].wob = 0.05;
  }

  function stepShot(dt) {
    var s = g.shot;
    var ox = s.x, oy = s.y;
    s.vy += GRAV * dt;
    s.x += s.vx * dt; s.y += s.vy * dt;
    s.spin += dt * 12;
    for (var i = 0; i < g.balloons.length; i++) {
      var b = g.balloons[i];
      if (!b.alive) continue;
      var p = bPos(b, g.t);
      // 線分と中心の最短距離(すり抜け防止)
      var vx = s.x - ox, vy = s.y - oy;
      var l2 = vx * vx + vy * vy;
      var u = l2 > 0 ? Math.max(0, Math.min(1, ((p.x - ox) * vx + (p.y - oy) * vy) / l2)) : 0;
      var d = Math.hypot(p.x - (ox + vx * u), p.y - (oy + vy * u));
      if (d < s.near) s.near = d;
      if (d <= BR) { hitBalloon(b, d); g.shot = null; afterShot(true); return; }
    }
    if ((s.vy > 0 && s.y > H * 0.72) || s.x < -80 || s.x > W + 80 || s.y < -200) {
      var miss = Math.max(1, Math.round((s.near - BR) / 4));
      if (s.near < 9999) g.closest = Math.min(g.closest, s.near - BR);
      var mx = Math.max(80, Math.min(W - 80, ox)), my = Math.max(260, Math.min(H * 0.72, oy));
      g.shot = null;
      g.chain = 0;
      g.mood = 0.6; g.moodKind = -1;
      if (afterShot(false)) return;
      game.feedback.bad(mx, my, { text: 'MISS', size: 46 });
      if (s.near < 400) game.fx.popup('あと' + miss + 'cm', mx, my - 80, { color: STYLE.main[2], size: 34 });
    }
  }

  // 返り値 true = 決着
  function afterShot(hit) {
    var left = 0;
    for (var i = 0; i < g.balloons.length; i++) if (g.balloons[i].alive) left++;
    if (hit && left === 0) {
      if (g.wave + 1 >= WAVES.length) { g.phase = 'stop'; g.stopT = 0.55; g.won = true; return true; }
      loadWave(g.wave + 1);
      game.audio.tone('G5', 0.1, { wave: 'triangle', volume: 0.06 });
      return false;
    }
    if (!hit && g.cones <= 0) { g.phase = 'stop'; g.stopT = 0.5; g.won = false; game.fx.flash('#ffffff', 0.12); return true; }
    return false;
  }

  function advance(dt) {
    g.t += dt;
    g.clock -= dt;
    if (g.reload > 0) g.reload -= dt;
    if (g.mood > 0) g.mood -= dt;
    for (var i = 0; i < g.balloons.length; i++) { var b = g.balloons[i]; b.wob *= Math.max(0, 1 - dt * 2.5); if (b.hitT > 0) b.hitT -= dt; }
    if (g.shot) stepShot(dt);
    if (g.phase !== 'run') return;
    if (g.clock <= 0) { g.clock = 0; g.drag = null; g.phase = 'stop'; g.stopT = 0.5; g.won = false; game.fx.flash('#ffffff', 0.12); }
  }

  function settle() {
    g.prevBest = game.best;
    var stats = { popped: g.popped, total: TOTAL, perfect: g.perfects, conesLeft: g.cones };
    if (g.won) {
      g.score += g.cones * 80;
      game.feedback.good(W / 2, H * 0.4, { text: 'CLEAR', color: STYLE.accent[0], size: 72 });
      game.audio.play('se_success', 0.6);
      game.end.success(g.score, stats);
    } else {
      var target = null;
      for (var i = 0; i < g.balloons.length; i++) if (g.balloons[i].alive) { target = bPos(g.balloons[i], g.t); break; }
      game.feedback.bad(target ? target.x : W / 2, target ? target.y : H * 0.4, { text: 'MISS', size: 60 });
      game.audio.play('se_failure', 0.6);
      game.end.failure(stats);
    }
    st = S.RESULT;
  }

  // ── 描画 ───────────────────────────────────────────
  function drawWorld() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.45, STYLE.bg[1]], [0.8, STYLE.bg[2]], [1, '#3a3028']]);
    // 遠景の木立(灰褐色のシルエット)
    for (var i = 0; i < 8; i++) {
      var tx = i * 150 + 20;
      game.draw.rect(tx + 40, H * 0.2, 26, H * 0.5, '#3a322a');
      game.draw.circle(tx + 52, H * 0.22 + (i % 3) * 30, 110, '#332c25', 0.9);
    }
    // キャンプファイアのブルーム
    var fl = 0.5 + 0.5 * Math.sin(t * 11) * Math.sin(t * 7);
    game.draw.circle(W * 0.86, H * 0.69, 210 + fl * 20, STYLE.accent[0], 0.08);
    game.draw.circle(W * 0.86, H * 0.69, 120 + fl * 14, STYLE.accent[0], 0.14);
    game.draw.circle(W * 0.86, H * 0.69, 50 + fl * 8, '#ffd9a0', 0.45);
    game.draw.rect(0, H * 0.72, W, H * 0.28, '#3b3128');
    for (var r = 0; r < 6; r++) game.draw.rect(0, H * 0.72 + r * 30, W, 2, '#4a3e33', 0.6);
    // 吊るし枝
    game.draw.rect(0, BRANCH_Y - 22, W, 44, '#4a3626');
    game.draw.rect(0, BRANCH_Y - 22, W, 10, '#6a5038');
    for (var l = 0; l < 10; l++) game.draw.circle(l * 120 + 40, BRANCH_Y - 40 + Math.sin(t * 1.4 + l) * 5, 52, '#3d4a32', 0.85);
  }

  function vignette() {
    game.draw.rect(0, 0, W, 60, '#000000', 0.35);
    game.draw.rect(0, H - 70, W, 70, '#000000', 0.35);
    game.draw.rect(0, 0, 50, H, '#000000', 0.3);
    game.draw.rect(W - 50, 0, 50, H, '#000000', 0.3);
  }

  function drawBalloons(hlAll) {
    var t = game.time.elapsed;
    for (var i = 0; i < g.balloons.length; i++) {
      var b = g.balloons[i];
      var p = bPos(b, g.t);
      if (!b.alive) {
        if (b.hitT > 0) game.draw.circle(p.x, p.y, BR * (1.6 - b.hitT), STYLE.main[2], b.hitT * 1.5);
        continue;
      }
      game.draw.line(b.px, BRANCH_Y, p.x, p.y - BR, '#d8ccb0', 3);
      var pal = b.gold ? { p: '#b8902a', q: '#ffd76a', e: DARK, m: '#c0602a' } : { p: '#a88a6a', q: i % 2 ? '#e8b8a0' : '#cfd8b8', e: DARK, m: STYLE.accent[1] };
      if (hlAll) pal = { p: '#ffffff', q: '#ffffff', e: '#ffffff', m: '#ffffff' };
      var blink = Math.floor(t * 2 + i) % 5 === 0;
      var px = hlAll ? 19 : 14;
      game.draw.circle(p.x, p.y, BR + 14, b.gold ? '#ffd76a' : '#ffffff', 0.1 + 0.08 * Math.sin(t * 6 + i));
      game.draw.sprite(blink ? FACE_B : FACE_A, pal, p.x, p.y, px, { anchor: 'center' });
      game.draw.circle(p.x, p.y, BR * 0.38, '#ffffff', 0.12);
    }
  }

  function drawSling() {
    var t = game.time.elapsed;
    var sx = SLING.x, sy = SLING.y;
    var pdx = 0, pdy = 0;
    if (g.drag) { var v = launchVec(g.drag.x - g.drag.x0, g.drag.y - g.drag.y0); pdx = v.pdx; pdy = v.pdy; }
    // Y字の枝
    game.draw.line(sx, sy + 200, sx, sy + 60, '#6a4a2e', 26);
    game.draw.line(sx, sy + 70, sx - 90, sy - 30, '#6a4a2e', 22);
    game.draw.line(sx, sy + 70, sx + 90, sy - 30, '#6a4a2e', 22);
    var ppx = sx + pdx, ppy = sy - 20 + pdy;
    game.draw.line(sx - 90, sy - 30, ppx, ppy, '#c9a77a', 7);
    game.draw.line(sx + 90, sy - 30, ppx, ppy, '#c9a77a', 7);
    if (!g.shot && g.cones > 0 && g.reload <= 0) game.draw.sprite(CONE, CONE_PAL, ppx, ppy, 14, { anchor: 'center' });
    if (g.drag) {
      var v2 = launchVec(g.drag.x - g.drag.x0, g.drag.y - g.drag.y0);
      for (var k = 1; k <= 4; k++) {
        var tt = k * 0.045;
        game.draw.circle(ppx + v2.vx * tt, ppy + v2.vy * tt + 0.5 * GRAV * tt * tt, 9 - k, STYLE.main[2], 0.75 - k * 0.12);
      }
    } else if (st !== S.RESULT && !g.shot) {
      game.draw.circle(ppx, ppy, 46 + Math.sin(t * 6) * 6, '#ffffff', 0.12);
    }
  }

  function drawKid() {
    var t = game.time.elapsed;
    var art = KID_A;
    if (st === S.RESULT) art = g.won ? (Math.floor(t * 4) % 2 ? KID_UP : KID_A) : KID_SAD;
    else if (g.mood > 0) art = g.moodKind > 0 ? KID_UP : KID_SAD;
    game.draw.circle(W * 0.2, H * 0.86 + 84, 56, '#000000', 0.22);
    game.draw.sprite(art, KID_PAL, W * 0.2, H * 0.86 + Math.sin(t * 3) * 4, 15, { anchor: 'center' });
  }

  function drawShot() {
    if (!g.shot) return;
    game.draw.circle(g.shot.x, g.shot.y, 30, STYLE.accent[0], 0.15);
    game.draw.sprite(CONE, CONE_PAL, g.shot.x, g.shot.y, 14, { anchor: 'center', flipX: Math.floor(g.shot.spin) % 2 === 0 });
  }

  function out(s, x, y, size, color) {
    game.draw.text(s, x + 3, y + 4, { size: size, color: DARK, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function drawHud() {
    out(g.popped + ' / ' + TOTAL, 150, 100, 52, STYLE.main[2]);
    out('SCORE ' + g.score, W - 240, 100, 38, STYLE.accent[0]);
    game.draw.rect(70, 150, W - 140, 14, DARK, 0.5);
    var f = Math.max(0, g.clock / TIME_LIMIT);
    game.draw.rect(70, 150, (W - 140) * f, 14, f < 0.25 ? STYLE.accent[1] : STYLE.main[0]);
    // 残りの松ぼっくり(親指ゾーン右下に並べる)
    for (var i = 0; i < CONES; i++) {
      var cx = W * 0.62 + (i % 5) * 70, cy = H * 0.9 + Math.floor(i / 5) * 70;
      game.draw.sprite(CONE, i < g.cones ? CONE_PAL : { c: '#3a3028', d: '#4a3e33' }, cx, cy, 10, { anchor: 'center' });
    }
  }

  function drawAll(hl) {
    drawWorld();
    drawBalloons(hl);
    drawKid();
    drawSling();
    drawShot();
    vignette();
  }

  // ── ATTRACT: 実ロジックをボットが遊ぶ ───────────────
  var demo = { t: 0, x: W * 0.5, y: H * 0.85, press: false, step: 0, aim: null, holdT: 0 };
  function botAim(fail) {
    var b = null;
    for (var i = 0; i < g.balloons.length; i++) if (g.balloons[i].alive) { b = g.balloons[i]; break; }
    if (!b) return null;
    var T = 0.72;
    var p = bPos(b, g.t + 0.55 + T);
    var dx = 0, dy = 0;
    for (var it = 0; it < 3; it++) {
      var x0 = SLING.x + dx, y0 = SLING.y - 20 + dy;
      var vx = (p.x - x0) / T, vy = (p.y - y0 - 0.5 * GRAV * T * T) / T;
      dx = -vx / PULL_K; dy = -vy / PULL_K;
    }
    var k = fail ? 0.62 : 1;
    return { dx: dx * k, dy: dy * k };
  }
  function runDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.2;
    if (cyc < dt || demo.t <= dt) { g = fresh(); startRound(); g.cones = 9; demo.step = 0; demo.holdT = 0; demo.press = false; g.drag = null; }
    advance(dt);
    if (g.phase !== 'run') return;
    var startAt = demo.step === 0 ? 0.3 : 2.6;
    if (demo.step < 2 && !g.shot && cyc >= startAt) {
      if (!g.drag) {
        demo.aim = botAim(demo.step === 1);
        if (!demo.aim) return;
        g.drag = { x0: W * 0.5, y0: H * 0.84, x: W * 0.5, y: H * 0.84 };
        demo.holdT = 0;
      }
      demo.holdT += dt;
      var k = Math.min(1, demo.holdT / 0.5);
      g.drag.x = g.drag.x0 + demo.aim.dx * k;
      g.drag.y = g.drag.y0 + demo.aim.dy * k;
      demo.x = g.drag.x; demo.y = g.drag.y; demo.press = true;
      if (demo.holdT >= 0.55) {
        release(g.drag.x - g.drag.x0, g.drag.y - g.drag.y0);
        g.drag = null; demo.press = false; demo.step++;
      }
    } else {
      demo.x += (W * 0.5 - demo.x) * Math.min(1, dt * 3);
      demo.y += (H * 0.84 - demo.y) * Math.min(1, dt * 3);
    }
  }

  function canShoot() { return st === S.PLAYING && g.phase === 'run' && !g.shot && g.cones > 0 && g.reload <= 0; }

  game.onTap(function () {
    if (st === S.ATTRACT) { g = fresh(); st = S.PLAYING; game.audio.play('se_coin', 0.5); return; }
    if (st === S.RESULT) { game.audio.play('se_tap', 0.3); st = S.ATTRACT; g = fresh(); demo.t = 0; return; }
  });
  game.onPress(function (x, y) {
    if (!canShoot()) return;
    g.drag = { x0: x, y0: y, x: x, y: y };
    game.audio.tone(330, 0.04, { wave: 'triangle', volume: 0.05 });
  });
  game.onMove(function (x, y) {
    if (!g.drag || st !== S.PLAYING) return;
    var before = Math.hypot(g.drag.x - g.drag.x0, g.drag.y - g.drag.y0);
    g.drag.x = x; g.drag.y = y;
    var after = Math.hypot(x - g.drag.x0, y - g.drag.y0);
    if (Math.floor(after / 60) !== Math.floor(before / 60) && after < PULL_MAX + 30) game.audio.tone(300 + after, 0.03, { wave: 'triangle', volume: 0.04 });
  });
  game.onRelease(function (x, y) {
    if (!g.drag || st !== S.PLAYING) { g && (g.drag = null); return; }
    var d = g.drag; g.drag = null;
    if (!canShoot()) { game.audio.play('se_tap', 0.15); return; }
    release(x - d.x0, y - d.y0);
  });

  game.onUpdate(function (dt) {
    if (!g) g = fresh();
    if (st === S.ATTRACT) {
      runDemo(dt);
      drawAll(false);
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 14 });
      out('PAPER POP', W / 2, H * 0.05 + 30, 84, STYLE.main[2]);
      out('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, H * 0.1 + 34, 34, STYLE.accent[0]);
      if (Math.floor(game.time.elapsed * 1.6) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.95, 42, STYLE.accent[0]);
      else out('INSERT COIN', W / 2, H * 0.95, 36, STYLE.main[2]);
      return;
    }
    if (st === S.RESULT) {
      drawAll(false);
      if (g.won) {
        g.partyT -= dt;
        if (g.partyT <= 0) {
          g.partyT = 0.4;
          game.fx.burst(game.random(150, W - 150), game.random(H * 0.2, H * 0.5), { color: Math.random() < 0.5 ? '#ffd76a' : STYLE.main[2], count: 18, speed: 400 });
        }
      }
      game.draw.rect(0, H * 0.3, W, H * 0.3, DARK, 0.75);
      out(g.won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.355, 86, g.won ? '#ffd76a' : STYLE.accent[1]);
      out('SCORE ' + g.score, W / 2, H * 0.425, 52, STYLE.main[2]);
      out('PERFECT ' + g.perfects + '    ' + g.popped + ' / ' + TOTAL, W / 2, H * 0.475, 38, STYLE.main[0]);
      if (!g.won) {
        out('あと' + (TOTAL - g.popped) + '個!', W / 2, H * 0.53, 46, '#ffd76a');
        if (g.closest < 9999) out('あと' + Math.max(1, Math.round(g.closest / 4)) + 'cm', W / 2, H * 0.575, 34, STYLE.main[2]);
      } else if (g.score > g.prevBest) out('NEW RECORD', W / 2, H * 0.53, 48, '#ffd76a');
      else out('BEST ' + g.prevBest, W / 2, H * 0.53, 40, STYLE.main[2]);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.95, 36, STYLE.main[2]);
      return;
    }
    if (g.phase === 'ready') {
      g.readyT -= dt;
      g.t += dt;
      if (g.readyT <= 0) { startRound(); game.audio.play('se_tap', 0.3); }
    } else if (g.phase === 'run') {
      advance(dt);
    } else if (g.phase === 'stop') {
      g.stopT -= dt;
      if (g.stopT <= 0) settle();
    }
    var hl = g.phase === 'stop' && !g.won;
    drawAll(hl);
    if (g.phase === 'stop' && g.won) game.draw.circle(W / 2, H * 0.4, 300, '#ffd76a', 0.12);
    drawHud();
    if (g.phase === 'ready') {
      if (!g.balloons.length) loadWave(0);
      out(g.readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 96, '#ffd76a');
    }
    if (g.phase === 'run' && g.wave === 0 && g.cones === CONES && !g.drag && g.t < 2.5) {
      var pulse = Math.sin(game.time.elapsed * 8);
      game.draw.hand(W * 0.5 + 20, H * 0.84 + 120 + pulse * 40, { press: true, scale: 12, alpha: 0.6 });
    }
  });

  game.onStart(function () {
    game.audio.melody([
      ['D4', 1], ['F4', 0.5], ['A4', 0.5], ['G4', 1], ['E4', 1],
      ['D4', 0.5], ['E4', 0.5], ['F4', 1], ['C4', 1], ['D4', 2],
    ], {
      tempo: 96, wave: 'triangle', volume: 0.07, loop: true,
      bass: [['D2', 2], ['A2', 2], ['F2', 2], ['A2', 2]],
    });
    st = S.ATTRACT;
    g = fresh();
    demo.t = 0;
  });
})(game);
