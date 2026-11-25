// I-Switch-0003v2-park-disc-lead.js
// 芝生のディスクリード — 芝生を駆け抜ける犬の行く先を足あとで読み、円盤が落ちる瞬間に犬が来る地点へ投げて口で受け止めさせる
// 操作: 芝生の上をタップすると、トレーナーがその地点へ円盤を投げる。遠い地点ほど長く飛ぶので、円盤が着く頃に犬が来る地点(足あとの先)を狙う。犬が走り抜けるまでに投げないと1回落とした扱い
// 終わり: 7回の犬の走りのうち5回受け止めさせればCLEAR。3回落とす/20秒で決着しなければGAME OVER
// @mechanic: trajectory
// @theme: park_disc_dog
// 世界観: 公園の芝生広場で、ドッグトレーナーが左右から駆け抜ける愛犬の行く先を足あとで読み、円盤の落ちる地点へ犬がちょうど来るように投げて口で受け止めさせる
// 残るもの: 正誤(CLEAR/GAME OVER) + 受け止め数・PERFECT数・受け止めの近さのスコア
// スタイル: 2010s FLAT MOBILE

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  // 2010s FLAT MOBILE: ベタ塗り数色・丸い形・大きい余白。判定は色の変化で示す
  var STYLE = { bg: ['#8fd473', '#79c25f', '#62ad4d'], main: ['#ffffff', '#ff8a3d', '#3d6bff'], accent: ['#ffd23d', '#ff4d6d'] };
  var INK = '#23412a';

  var RUNS = 7, NEED = 5, DROPS = 3, TIME_LIMIT = 20;
  var HAND = { x: W * 0.5, y: H * 0.78 };
  var FIELD_TOP = H * 0.2, FIELD_BOT = H * 0.68;
  var CATCH_R = 105, PERFECT_R = 45;

  var MODE = 'ATTRACT';
  var w = null;

  var DOG_A = [
    '........bb..',
    '.......bbbb.',
    '.......bbebk',
    'b......bbbb.',
    '.bbbbbbbbbw.',
    '..bbbbbbbb..',
    '.b.b....b.b.',
    'b...b..b...b',
  ];
  var DOG_B = [
    '........bb..',
    '.......bbbb.',
    '.......bbebk',
    '.b.....bbbb.',
    '.bbbbbbbbbw.',
    '..bbbbbbbb..',
    '..b.b..b.b..',
    '..b.b..b.b..',
  ];
  var DOG_LEAP = [
    '.........bb.',
    '........bbbb',
    '........bbeb',
    'b......bbbbk',
    '.bbbbbbbbbw.',
    'bbbbbbbbb...',
    'b.......b...',
    '.........b..',
  ];
  var DOG_SIT = [
    '............',
    '.......bb...',
    '......bbbb..',
    '......bebb..',
    '......kbbb..',
    'bb...bbbbw..',
    '.bbbbbbbbb..',
    '..bb.bb.bb..',
  ];
  var DOG_PAL = { b: '#c98a3e', e: INK, k: '#2b2b2b', w: '#fff3dc' };

  var TRAINER_A = [
    '..cccc..',
    '.cccccc.',
    '..ffff..',
    '..fefe..',
    '..ffff..',
    '.ssssss.',
    'fssssssf',
    'f.ssss.f',
    '..pppp..',
    '..p..p..',
    '..p..p..',
    '.kk..kk.',
  ];
  var TRAINER_B = [
    '..cccc.f',
    '.cccccsf',
    '..ffffs.',
    '..fefes.',
    '..ffffs.',
    '.ssssss.',
    'fssssss.',
    'f.ssss..',
    '..pppp..',
    '..p..p..',
    '..p..p..',
    '.kk..kk.',
  ];
  var TRAINER_PAL = { c: STYLE.main[2], f: '#f2c79a', e: INK, s: STYLE.main[1], p: '#3a4a6b', k: '#2b2b2b' };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function freshWorld() {
    return {
      phase: 'ready', readyT: 0.8, clock: TIME_LIMIT,
      run: -1, route: null, rt: 0, gap: 0.35, thrown: false,
      disc: null, grassDisc: null, held: false,
      caught: 0, drops: 0, perfects: 0, score: 0, chain: 0, closest: 9999,
      dogX: -200, dogY: H * 0.42, face: 1, leapT: 0, armT: 0,
      results: [], stopT: 0, won: false, culprit: null, prevBest: 0, partyT: 0,
    };
  }

  // 犬の走り: 左右の端から反対へ横切りつつ、奥/手前へ波打つ。後半は途中でUターンするフェイントが混ざる
  function makeRoute(r) {
    var dir = r % 2 === 0 ? 1 : -1;
    var v = 430 + r * 42;
    var depths = [0.44, 0.31, 0.53, 0.37, 0.27, 0.5, 0.34];
    var turn = 0;
    if (r === 4 || r === 6) turn = (W * game.random(0.55, 0.68) + 90) / v;
    return {
      dir: dir, v: v, cy: H * depths[r % depths.length], amp: 40 + r * 26,
      om: 2.1 + r * 0.32, ph: game.random(0, 6.28), turn: turn, x0: dir > 0 ? -90 : W + 90,
    };
  }

  function dogAt(R, t) {
    var tt = t, back = false;
    if (R.turn > 0 && t > R.turn) { tt = R.turn - (t - R.turn) * 0.95; back = true; }
    return { x: R.x0 + R.dir * R.v * tt, y: R.cy + R.amp * Math.sin(R.om * t + R.ph), face: back ? -R.dir : R.dir };
  }

  function flightTime(d) { return 0.5 + d / 1500; }

  function nextRun() {
    w.run++;
    w.route = makeRoute(w.run);
    w.rt = 0; w.thrown = false; w.held = false; w.grassDisc = null;
    var p = dogAt(w.route, 0);
    w.dogX = p.x; w.dogY = p.y; w.face = p.face;
    game.audio.tone(w.route.dir > 0 ? 'E5' : 'G5', 0.07, { wave: 'triangle', volume: 0.06 });
  }

  function throwAt(x, y) {
    if (w.phase !== 'run' || w.disc || w.thrown || !w.route || w.gap > 0) {
      game.audio.play('se_tap', 0.15);
      return;
    }
    var tx = clamp(x, 70, W - 70), ty = clamp(y, FIELD_TOP + 30, FIELD_BOT);
    var d = Math.hypot(tx - HAND.x, ty - HAND.y);
    w.disc = { sx: HAND.x + 30, sy: HAND.y - 70, tx: tx, ty: ty, t: 0, T: flightTime(d), gold: w.run === 3 || w.run === 6 };
    w.thrown = true; w.armT = 0.3;
    game.audio.play('se_jump', 0.35);
    game.fx.burst(HAND.x + 30, HAND.y - 70, { color: '#ffffff', count: 6, speed: 160 });
  }

  function markResult(kind) { w.results.push(kind); }

  function land() {
    var d = w.disc; w.disc = null;
    var dist = Math.hypot(w.dogX - d.tx, w.dogY - d.ty);
    if (dist <= CATCH_R) {
      var perfect = dist <= PERFECT_R;
      w.caught++; w.chain++;
      if (perfect) w.perfects++;
      var base = perfect ? 300 : 150;
      if (d.gold) base *= 2;
      var mult = w.chain >= 3 ? 2 : 1;
      w.score += base * mult;
      w.leapT = 0.45; w.held = true;
      markResult(d.gold ? 'gold' : 'catch');
      game.feedback.good(d.tx, d.ty - 60, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? STYLE.accent[0] : '#ffffff', size: 54 });
      if (d.gold) game.audio.play('se_coin', 0.45);
      if (mult > 1) game.fx.popup('x2', d.tx, d.ty - 150, { color: STYLE.accent[0], size: 46 });
      if (w.caught === 3) { game.fx.popup('3 / ' + NEED, W / 2, H * 0.17, { color: '#ffffff', size: 60 }); game.audio.play('se_milestone', 0.45); }
      if (w.caught >= NEED) { w.phase = 'stop'; w.stopT = 0.55; w.won = true; w.culprit = { kind: 'dog' }; return; }
      w.gap = 0.6;
    } else {
      w.drops++; w.chain = 0;
      w.closest = Math.min(w.closest, dist - CATCH_R);
      w.grassDisc = { x: d.tx, y: d.ty, gold: d.gold };
      markResult('drop');
      if (w.drops >= DROPS) { w.phase = 'stop'; w.stopT = 0.5; w.won = false; w.culprit = { kind: 'disc', x: d.tx, y: d.ty }; game.fx.flash('#ffffff', 0.12); return; }
      game.feedback.bad(d.tx, d.ty, { text: 'MISS', size: 46 });
      game.fx.popup('あと' + Math.max(1, Math.round((dist - CATCH_R) / 4)) + 'cm', d.tx, d.ty - 90, { color: '#ffffff', size: 36 });
      w.gap = 0.6;
    }
  }

  function noThrow() {
    w.drops++; w.chain = 0;
    markResult('drop');
    var ex = clamp(w.dogX, 80, W - 80);
    if (w.drops >= DROPS) { w.phase = 'stop'; w.stopT = 0.5; w.won = false; w.culprit = { kind: 'gone', x: ex, y: w.dogY }; game.fx.flash('#ffffff', 0.12); return; }
    game.feedback.bad(ex, w.dogY, { text: 'MISS', size: 46 });
    w.gap = 0.4;
  }

  function advance(dt) {
    w.clock -= dt;
    if (w.armT > 0) w.armT -= dt;
    if (w.leapT > 0) w.leapT -= dt;
    if (w.gap > 0) { w.gap -= dt; if (w.gap <= 0) { w.gap = 0; nextRun(); } }
    if (w.route) {
      w.rt += dt;
      var p = dogAt(w.route, w.rt);
      w.dogX = p.x; w.dogY = p.y; w.face = p.face;
    }
    if (w.disc) {
      w.disc.t += dt;
      if (w.disc.t >= w.disc.T) { land(); if (w.phase !== 'run') return; }
    }
    if (w.route && !w.thrown && w.gap <= 0 && w.rt > 0.5 && (w.dogX < -130 || w.dogX > W + 130)) {
      noThrow();
      if (w.phase !== 'run') return;
    }
    if (w.clock <= 0) {
      w.clock = 0; w.phase = 'stop'; w.stopT = 0.5; w.won = false;
      w.culprit = { kind: 'gone', x: clamp(w.dogX, 80, W - 80), y: w.dogY };
      game.fx.flash('#ffffff', 0.12);
    }
  }

  function settle() {
    w.prevBest = game.best;
    var stats = { caught: w.caught, need: NEED, perfect: w.perfects, drops: w.drops };
    if (w.won) {
      game.feedback.good(w.dogX, w.dogY - 80, { text: 'CLEAR', color: STYLE.accent[0], size: 70 });
      game.fx.burst(w.dogX, w.dogY, { color: STYLE.accent[0], count: 34, speed: 520 });
      game.audio.play('se_success', 0.6);
      game.end.success(w.score, stats);
    } else {
      var c = w.culprit || { x: W / 2, y: H / 2 };
      game.feedback.bad(c.x || W / 2, c.y || H / 2, { text: 'MISS', size: 60 });
      game.audio.play('se_failure', 0.6);
      game.end.failure(stats);
    }
    MODE = 'RESULT';
  }

  // ── 描画 ───────────────────────────────────────────
  function drawLawn() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.6, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    for (var i = 0; i < 12; i++) if (i % 2 === 0) game.draw.rect(0, H * 0.14 + i * 100, W, 100, '#ffffff', 0.08);
    game.draw.rect(0, H * 0.1, W, 70, '#4f9a45');
    for (var k = 0; k < 7; k++) {
      var sway = Math.sin(t * 1.3 + k) * 6;
      game.draw.circle(60 + k * 165 + sway, H * 0.1, 78, k % 2 ? '#3f8a3a' : '#468f3f');
    }
    for (var f = 0; f < 9; f++) {
      var fx = (f * 131 + 40) % W, fy = H * 0.24 + ((f * 277) % 900);
      game.draw.circle(fx, fy, 7, f % 3 === 0 ? STYLE.accent[0] : '#ffffff', 0.8);
    }
    game.draw.circle(HAND.x, H * 0.86, 290, '#ecdcae');
    game.draw.rect(0, H * 0.86, W, H * 0.14, '#ecdcae');
  }

  function drawPrints() {
    if (!w.route || w.held) return;
    for (var k = 1; k <= 9; k++) {
      var p = dogAt(w.route, w.rt + k * 0.17);
      if (p.x < -40 || p.x > W + 40) continue;
      var off = k % 2 ? -12 : 12;
      game.draw.circle(p.x, p.y + 34 + off, 9, '#2f6b2a', Math.max(0.08, 0.6 - k * 0.055));
      game.draw.circle(p.x - p.face * 10, p.y + 26 + off, 5, '#2f6b2a', Math.max(0.06, 0.5 - k * 0.05));
    }
  }

  function drawDog(hl) {
    var t = game.time.elapsed;
    var art;
    if (MODE === 'RESULT' && !w.won) art = DOG_SIT;
    else if (w.leapT > 0 || (MODE === 'RESULT' && w.won && Math.floor(t * 3) % 2 === 0)) art = DOG_LEAP;
    else art = Math.floor(t * 10) % 2 ? DOG_A : DOG_B;
    var lift = w.leapT > 0 ? Math.sin((w.leapT / 0.45) * Math.PI) * 60 : 0;
    var px = hl ? 18 : 14;
    game.draw.circle(w.dogX, w.dogY + 54, 58, '#000000', 0.12);
    game.draw.sprite(art, hl ? { b: '#ffffff', e: '#ffffff', k: '#ffffff', w: '#ffffff' } : DOG_PAL, w.dogX, w.dogY - lift, px, { anchor: 'center', flipX: w.face < 0 });
    if (w.held) {
      var mx = w.dogX + w.face * 80, my = w.dogY - lift - 14;
      game.draw.circle(mx, my, 20, STYLE.main[1]);
      game.draw.circle(mx, my, 9, '#ffffff');
    }
  }

  function drawDisc() {
    var g = w.grassDisc;
    if (g) {
      var big = w.phase === 'stop' && w.culprit && w.culprit.kind === 'disc';
      var r = big ? 44 : 26;
      game.draw.circle(g.x, g.y, r, big ? '#ffffff' : (g.gold ? STYLE.accent[0] : STYLE.main[1]));
      game.draw.circle(g.x, g.y, r * 0.45, big ? STYLE.accent[1] : '#ffffff');
    }
    var d = w.disc;
    if (!d) return;
    var s = Math.min(1, d.t / d.T);
    var gx = d.sx + (d.tx - d.sx) * s, gy = d.sy + (d.ty - d.sy) * s;
    var h = 1000 * s * (1 - s) * Math.min(1.2, d.T);
    game.draw.circle(d.tx, d.ty, 30 + 60 * (1 - s), '#ffffff', 0.35 + 0.3 * s);
    game.draw.circle(d.tx, d.ty, 22 + 50 * (1 - s), STYLE.bg[1], 0.9);
    game.draw.circle(gx, gy, 24, '#000000', 0.18);
    var r2 = 26 + h * 0.04;
    game.draw.circle(gx, gy - h, r2, d.gold ? STYLE.accent[0] : STYLE.main[1]);
    game.draw.circle(gx, gy - h, r2 * 0.45, '#ffffff');
  }

  function drawTrainer() {
    var t = game.time.elapsed;
    var bob = Math.sin(t * 3) * 4;
    game.draw.circle(HAND.x, HAND.y + 88, 60, '#000000', 0.1);
    game.draw.sprite(w.armT > 0 ? TRAINER_B : TRAINER_A, TRAINER_PAL, HAND.x, HAND.y + bob, 13, { anchor: 'center' });
  }

  function drawStage() {
    drawLawn();
    drawPrints();
    if (MODE === 'PLAYING' && w.run === 0 && !w.thrown && w.route && w.phase === 'run') {
      var lp = solveLead(w.route, w.rt);
      var pulse = 0.5 + 0.5 * Math.sin(game.time.elapsed * 9);
      game.draw.circle(lp.x, lp.y, 40 + pulse * 18, '#ffffff', 0.25 + 0.2 * pulse);
    }
    var hl = w.phase === 'stop' && w.won;
    if (w.dogY < (w.disc ? w.disc.ty : 0)) { drawDog(hl); drawDisc(); } else { drawDisc(); drawDog(hl); }
    drawTrainer();
  }

  function label(s, x, y, size, color) {
    game.draw.text(s, x + 3, y + 3, { size: size, color: INK, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function drawDiscRow(y) {
    for (var i = 0; i < RUNS; i++) {
      var x = W / 2 - (RUNS - 1) * 46 + i * 92;
      var r = w.results[i];
      if (r === 'catch' || r === 'gold') { game.draw.circle(x, y, 26, r === 'gold' ? STYLE.accent[0] : STYLE.main[1]); game.draw.circle(x, y, 11, '#ffffff'); }
      else if (r === 'drop') { game.draw.circle(x, y, 26, INK, 0.35); game.draw.line(x - 14, y - 14, x + 14, y + 14, STYLE.accent[1], 6); }
      else { game.draw.circle(x, y, 26, '#ffffff', i === w.run ? 0.9 : 0.4); game.draw.circle(x, y, 18, STYLE.bg[1]); }
    }
  }

  function drawHud() {
    label(w.caught + ' / ' + NEED, 140, 70, 54, '#ffffff');
    label('SCORE ' + w.score, W - 240, 70, 40, STYLE.accent[0]);
    game.draw.rect(60, 126, W - 120, 16, INK, 0.3);
    var f = Math.max(0, w.clock / TIME_LIMIT);
    game.draw.rect(60, 126, (W - 120) * f, 16, f < 0.25 ? STYLE.accent[1] : '#ffffff');
    drawDiscRow(190);
  }

  // ── ATTRACT(実ロジック+ボット) ─────────────────────
  function solveLead(R, rt) {
    var T = 1.0, p = dogAt(R, rt + T);
    for (var i = 0; i < 6; i++) {
      p = dogAt(R, rt + T);
      T = flightTime(Math.hypot(p.x - HAND.x, p.y - HAND.y));
    }
    return { x: clamp(p.x, 70, W - 70), y: clamp(p.y, FIELD_TOP + 30, FIELD_BOT) };
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.6, press: 0, aimed: -1 };
  function runDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.6;
    if (cyc < dt || demo.t <= dt) { w = freshWorld(); w.phase = 'run'; w.gap = 0.05; demo.aimed = -1; }
    if (demo.press > 0) demo.press -= dt;
    if (w.phase === 'run') {
      advance(dt);
      if (w.route && !w.thrown && w.gap <= 0 && demo.aimed !== w.run) {
        var aim = w.run % 2 === 0 ? solveLead(w.route, w.rt) : { x: w.dogX, y: w.dogY };
        demo.gx += (aim.x - demo.gx) * Math.min(1, dt * 6);
        demo.gy += (aim.y - demo.gy) * Math.min(1, dt * 6);
        if (w.rt > 0.5) { demo.aimed = w.run; demo.press = 0.22; demo.gx = aim.x; demo.gy = aim.y; throwAt(aim.x, aim.y); }
      }
    } else if (w.phase === 'stop') {
      w.stopT -= dt;
    }
  }

  function begin() {
    w = freshWorld();
    MODE = 'PLAYING';
    game.audio.play('se_coin', 0.5);
  }

  game.onTap(function (x, y) {
    if (MODE === 'ATTRACT') { begin(); return; }
    if (MODE === 'RESULT') { game.audio.play('se_tap', 0.3); MODE = 'ATTRACT'; w = freshWorld(); demo.t = 0; return; }
    throwAt(x, y);
  });

  game.onUpdate(function (dt) {
    if (!w) w = freshWorld();
    if (MODE === 'ATTRACT') {
      runDemo(dt);
      drawStage();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 14 });
      label('DISC DASH', W / 2, H * 0.05 + 10, 84, '#ffffff');
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, H * 0.1 + 20, 36, STYLE.accent[0]);
      if (Math.floor(game.time.elapsed * 1.6) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.94, 44, STYLE.accent[1]);
      else label('TAP TO START', W / 2, H * 0.94, 40, INK);
      return;
    }
    if (MODE === 'RESULT') {
      if (w.leapT > 0) w.leapT -= dt;
      drawStage();
      if (w.won) {
        w.partyT -= dt;
        if (w.partyT <= 0) { w.partyT = 0.45; game.fx.burst(game.random(160, W - 160), game.random(H * 0.25, H * 0.55), { color: Math.random() < 0.5 ? STYLE.accent[0] : STYLE.main[1], count: 16, speed: 380 }); }
      }
      game.draw.rect(0, H * 0.3, W, H * 0.29, INK, 0.72);
      label(w.won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.355, 88, w.won ? STYLE.accent[0] : STYLE.accent[1]);
      label('SCORE ' + w.score, W / 2, H * 0.425, 54, '#ffffff');
      label('PERFECT ' + w.perfects + '    ' + w.caught + ' / ' + NEED, W / 2, H * 0.475, 38, STYLE.main[0]);
      if (!w.won) {
        label('あと' + (NEED - w.caught) + '回!', W / 2, H * 0.53, 46, STYLE.accent[0]);
        if (w.closest < 9999) label('あと' + Math.max(1, Math.round(w.closest / 4)) + 'cm', W / 2, H * 0.575, 34, '#ffffff');
      }
      else if (w.score > w.prevBest) label('NEW RECORD', W / 2, H * 0.53, 48, STYLE.accent[0]);
      else label('BEST ' + w.prevBest, W / 2, H * 0.53, 40, '#ffffff');
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.94, 36, INK);
      return;
    }
    if (w.phase === 'ready') {
      w.readyT -= dt;
      if (w.readyT <= 0) { w.phase = 'run'; game.audio.play('se_tap', 0.3); }
    } else if (w.phase === 'run') {
      advance(dt);
    } else if (w.phase === 'stop') {
      w.stopT -= dt;
      if (w.stopT <= 0) settle();
    }
    drawStage();
    if (w.phase === 'stop' && w.culprit && w.culprit.kind === 'gone') {
      game.draw.circle(w.culprit.x, w.culprit.y, 90, '#ffffff', 0.35);
    }
    drawHud();
    if (w.phase === 'ready') label(w.readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 96, '#ffffff');
  });

  game.onStart(function () {
    game.audio.melody([
      ['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['B4', 0.5], ['C5', 0.5], ['E5', 0.5], ['D5', 1],
      ['B4', 0.5], ['G4', 0.5], ['A4', 0.5], ['C5', 0.5], ['B4', 1], ['R', 1],
    ], {
      tempo: 138, wave: 'triangle', volume: 0.06, loop: true,
      bass: [['G2', 2], ['C3', 2], ['D3', 2], ['G2', 2]],
    });
    MODE = 'ATTRACT';
    w = freshWorld();
    demo.t = 0;
  });
})(game);
