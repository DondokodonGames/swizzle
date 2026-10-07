// I-GBA-0001v2-toy-arrow-graze.js
// トイアローグレイズ — 正面から迫る吸盤矢を、追尾が切れる赤線を越えるまで引きつけてから一歩横へかわす
// 操作: 親指ゾーンの左/右パッドをタップすると人形が隣のレーンへ一歩移る。矢は床の赤線を越えるまで人形のレーンを追うので、越えた後のぎりぎりでかわすほど高得点
// 終わり: 12本すべてかわせば成功(引きつけ得点の合計がスコア)。1本でも当たる/時間切れで失敗
// @mechanic: near_miss
// @theme: toy_factory_arrow_test
// 世界観: 玩具工場の試験室で、テスト係の木製人形が発射台から飛んでくる吸盤付きの玩具の矢を、追尾が切れる瞬間まで引きつけてかわし安全基準の数値を稼ぐ
// 残るもの: 正誤(CLEAR/GAME OVER) + 引きつけ得点とPERFECT数
// スタイル: 2000s BILLBOARD 3D

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  // 2000s BILLBOARD 3D: 奥行きはスプライトのpx倍率で表し、接地影で位置を示す
  var STYLE = { bg: ['#27324d', '#5d6f96', '#b9a47c'], main: ['#e6b86e', '#7d5028', '#f6f0e4'], accent: ['#ff5a4e', '#52e3ff'] };
  var INK = '#1a1f2e';

  var VX = W / 2, HY = H * 0.25, FY = H * 0.69;
  var LANE_W = 300;
  var LOCK_P = 0.62;
  var ARROWS = 12;
  var TIME_LIMIT = 24;

  var MODE = 'ATTRACT';
  var w = null;

  var DOLL_A = ['...##...', '..####..', '..#ee#..', '...##...', '.######.', '#.####.#', '#.####.#', '..####..', '..#..#..', '..#..#..', '.##..##.'];
  var DOLL_B = ['...##...', '..####..', '..#ee#..', '#..##..#', '#######.', '..####.#', '..####..', '..####..', '..#..#..', '..#..#..', '.##..##.'];
  var DOLL_L = ['..##....', '.####...', '.#ee#...', '..##....', '.######.', '#.####..', '..####.#', '..####..', '...#..#.', '..#..#..', '.##..##.'];
  var DOLL_PAL = { '#': STYLE.main[0], 'e': INK };
  var CUP = ['..###..', '.#####.', '##ooo##', '##oWo##', '##ooo##', '.#####.', '..###..'];
  var CUP_PAL = { '#': STYLE.accent[0], 'o': '#b8322a', 'W': STYLE.main[2] };
  var CUP_GOLD = { '#': '#ffd34d', 'o': '#c8961c', 'W': '#ffffff' };
  var CUP_HL = { '#': '#ffffff', 'o': '#ffe0dc', 'W': '#ffffff' };
  var LAUNCHER = ['.####.', '#oooo#', '#o..o#', '#oooo#', '.#..#.'];
  var LAUNCHER_PAL = { '#': '#8b96b3', 'o': '#44506e' };
  var LAUNCHER_HOT = { '#': STYLE.accent[0], 'o': '#ffd0c8' };
  var PAD_L = ['...#', '..##', '.###', '####', '.###', '..##', '...#'];
  var PAD_R = ['#...', '##..', '###.', '####', '###.', '##..', '#...'];

  function depth(p) { var e = p * p; return { y: HY + (FY - 40 - HY) * e, s: 0.16 + 0.84 * e }; }
  function laneX(lx, s) { return VX + lx * LANE_W * s; }

  function freshWorld() {
    return {
      lane: 0, dollX: 0, stepT: 0, lean: 0,
      arrows: [], warn: null, launched: 0, nextT: 0.3,
      dodged: 0, perfects: 0, score: 0, chain: 0, clock: TIME_LIMIT,
      phase: 'ready', readyT: 0.8, stopT: 0, culprit: null, won: false,
      padL: 0, padR: 0, lockFlash: 0,
    };
  }

  function travelTime(n) { return Math.max(0.78, 1.5 - n * 0.065); }

  function queueShot() {
    w.warn = { lane: w.lane, t: 0.6, gold: (w.launched % 4) === 3 };
    game.audio.tone(w.warn.gold ? 'A5' : 'E5', 0.08, { wave: 'square', volume: 0.05 });
  }

  function fire() {
    var n = w.launched;
    w.arrows.push({ lx: w.warn.lane, p: 0, spd: 1 / travelTime(n), locked: false, done: false, halved: false, gold: w.warn.gold });
    w.launched++;
    w.warn = null;
    game.audio.play('se_jump', 0.25);
  }

  function step(dir) {
    if (w.phase !== 'run') return;
    if (dir < 0) w.padL = 0.18; else w.padR = 0.18;
    var target = w.lane + dir;
    if (target < -1 || target > 1) {
      game.audio.play('se_tap', 0.2);
      game.fx.shake(4, 0.1);
      w.lean = dir * 0.6;
      return;
    }
    var from = w.lane;
    w.lane = target;
    w.stepT = 0.14;
    w.lean = dir;
    game.audio.play('se_tap', 0.3);
    for (var i = 0; i < w.arrows.length; i++) {
      var a = w.arrows[i];
      if (a.done) continue;
      if (a.locked && Math.round(a.lx) === from) { grade(a); }
      else if (!a.locked && a.p > 0.3 && !a.halved) {
        a.halved = true;
        w.chain = 0;
        var d = depth(a.p);
        game.feedback.bad(laneX(a.lx, d.s), d.y, { text: 'MISS', size: 34, shake: 2 });
      }
    }
  }

  function grade(a) {
    a.done = true;
    var cm = Math.max(1, Math.round((1 - a.p) * 260));
    var base = cm <= 30 ? 300 : cm <= 80 ? 160 : 60;
    var word = cm <= 30 ? 'PERFECT' : cm <= 80 ? 'GOOD' : 'NICE';
    if (a.halved) base = Math.round(base / 2);
    if (a.gold) base *= 2;
    if (cm <= 30) { w.perfects++; w.chain++; } else w.chain = 0;
    var mult = w.chain >= 3 ? 2 : 1;
    w.score += base * mult;
    w.dodged++;
    var d = depth(a.p);
    var x = laneX(a.lx, d.s);
    game.feedback.good(x, d.y, { text: word, color: cm <= 30 ? STYLE.accent[1] : '#ffffff', size: 44 });
    game.fx.popup('あと' + cm + 'cm', x, d.y - 90, { color: '#ffe27a', size: 34 });
    if (a.gold) game.audio.play('se_coin', 0.4);
    if (mult > 1) game.fx.popup('x2', laneX(w.dollX, 1), FY - 300, { color: STYLE.accent[1], size: 40 });
    if (w.dodged === ARROWS / 2) { game.fx.popup(w.dodged + ' / ' + ARROWS, VX, H * 0.2, { color: '#ffffff', size: 48 }); game.audio.play('se_milestone', 0.4); }
  }

  function strike(a) {
    w.phase = 'stop'; w.stopT = 0.5; w.culprit = a; w.won = false;
    game.fx.flash('#ffffff', 0.12);
    game.audio.play('se_break', 0.4);
  }

  function advance(dt) {
    w.clock -= dt;
    if (w.stepT > 0) w.stepT -= dt;
    w.dollX += (w.lane - w.dollX) * Math.min(1, dt * 18);
    w.lean *= Math.max(0, 1 - dt * 6);
    if (w.padL > 0) w.padL -= dt;
    if (w.padR > 0) w.padR -= dt;
    if (w.lockFlash > 0) w.lockFlash -= dt;

    if (w.warn) { w.warn.lane = w.lane; w.warn.t -= dt; if (w.warn.t <= 0) fire(); }
    else if (w.launched < ARROWS) { w.nextT -= dt; if (w.nextT <= 0) { queueShot(); w.nextT = Math.max(0.35, 1.25 - w.launched * 0.07); } }

    for (var i = 0; i < w.arrows.length; i++) {
      var a = w.arrows[i];
      if (a.done) continue;
      a.p += a.spd * dt;
      if (!a.locked) {
        a.lx += (w.lane - a.lx) * Math.min(1, dt * 7);
        if (a.p >= LOCK_P) { a.locked = true; a.lx = w.lane; w.lockFlash = 0.2; game.audio.tone('C6', 0.05, { wave: 'triangle', volume: 0.05 }); }
      }
      if (a.p >= 1) {
        if (Math.abs(w.dollX - a.lx) < 0.5) { strike(a); return; }
        a.done = true;
      }
    }
    var clean = [];
    for (var k = 0; k < w.arrows.length; k++) if (!w.arrows[k].done) clean.push(w.arrows[k]);
    w.arrows = clean;

    if (w.dodged >= ARROWS && w.arrows.length === 0) {
      w.phase = 'stop'; w.stopT = 0.5; w.won = true; w.culprit = null;
      game.fx.burst(laneX(w.dollX, 1), FY - 120, { color: '#ffd34d', count: 30, speed: 480 });
      return;
    }
    if (w.clock <= 0) {
      w.clock = 0;
      strike(w.arrows[0] || null);
    }
  }

  function settle() {
    var stats = { dodged: w.dodged, total: ARROWS, perfect: w.perfects };
    if (w.won) {
      game.feedback.good(laneX(w.dollX, 1), FY - 160, { text: 'CLEAR', color: '#ffd34d', size: 60 });
      game.audio.play('se_success', 0.6);
      game.end.success(w.score, stats);
    } else {
      var x = VX, y = FY - 160;
      if (w.culprit) { var d = depth(Math.min(1, w.culprit.p)); x = laneX(w.culprit.lx, d.s); y = d.y; }
      game.feedback.bad(x, y, { text: 'MISS', size: 60 });
      game.audio.play('se_failure', 0.6);
      game.end.failure(stats);
    }
    MODE = 'RESULT';
  }

  // ── 描画 ───────────────────────────────────────────
  function drawRoom() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.24, STYLE.bg[1]], [0.26, '#6b6250'], [1, STYLE.bg[2]]]);
    for (var i = 1; i < 8; i++) game.draw.line(0, HY - i * 46, W, HY - i * 46, '#46557a', 2);
    game.draw.circle(VX, HY - 180, 70 + Math.sin(t * 2.2) * 6, '#fff6c8', 0.18 + 0.06 * Math.sin(t * 2.2));
    game.draw.rect(VX - 140, HY - 200, 280, 14, '#39445f');
    for (var r = 0; r < 12; r++) {
      var p = ((r / 12) + t * 0.04) % 1;
      var d = depth(p);
      game.draw.rect(0, d.y, W, 2 + d.s * 3, '#ffffff', 0.05 + 0.08 * d.s);
    }
    for (var l = -1.5; l <= 1.5; l += 1) {
      var n = depth(0), f = depth(1);
      game.draw.line(laneX(l, n.s), n.y, laneX(l, f.s), f.y + 40, '#3b3526', 3);
    }
    var ld = depth(LOCK_P);
    var hot = w && w.arrows.some(function (a) { return !a.locked && a.p > 0.35; });
    var blink = hot && Math.floor(t * 12) % 2 === 0;
    game.draw.line(laneX(-1.5, ld.s), ld.y, laneX(1.5, ld.s), ld.y, STYLE.accent[0], blink || w.lockFlash > 0 ? 9 : 4);
  }

  function drawLaunchers() {
    var d = depth(0);
    for (var l = -1; l <= 1; l++) {
      var warm = w.warn && w.warn.lane === l && Math.floor(game.time.elapsed * 14) % 2 === 0;
      game.draw.sprite(LAUNCHER, warm ? LAUNCHER_HOT : LAUNCHER_PAL, laneX(l, d.s), d.y - 16, 7, { anchor: 'center' });
    }
    if (w.warn) {
      var aim = depth(0.05);
      game.draw.circle(laneX(w.warn.lane, aim.s), aim.y - 16, 30 * (1 - w.warn.t / 0.6) + 8, w.warn.gold ? '#ffd34d' : STYLE.accent[0], 0.35);
    }
  }

  function drawArrow(a, hl) {
    var d = depth(Math.min(1.05, a.p));
    var x = laneX(a.lx, d.s);
    var floorY = depth(Math.min(1, a.p) ).y + 30 * d.s;
    game.draw.circle(x, floorY + 60 * d.s, 40 * d.s, '#000000', 0.22);
    var px = 3 + 15 * d.s;
    if (hl) px *= 1.4;
    game.draw.line(x, d.y, x, d.y + 5 * px, STYLE.main[1], px * 0.8);
    game.draw.sprite(CUP, hl ? CUP_HL : (a.gold ? CUP_GOLD : CUP_PAL), x, d.y, px, { anchor: 'center' });
    if (!a.locked && a.p > 0.2) game.draw.line(x, d.y, laneX(w.lane, 1), FY - 120, STYLE.accent[0], 2);
  }

  function drawDoll() {
    var t = game.time.elapsed;
    var x = laneX(w.dollX, 1);
    var bob = Math.sin(t * 5) * 6;
    game.draw.circle(x, FY + 30, 90, '#000000', 0.25);
    var art = Math.abs(w.lean) > 0.3 ? DOLL_L : (Math.floor(t * 3) % 2 ? DOLL_A : DOLL_B);
    game.draw.sprite(art, DOLL_PAL, x, FY - 120 + bob, 22, { anchor: 'center', flipX: w.lean > 0.3 });
    if (w.phase === 'stop' && w.won) game.draw.circle(x, FY - 120, 160, '#ffffff', 0.18);
  }

  function drawPads() {
    game.draw.rect(0, H * 0.78, W, H * 0.22, '#1d2233', 0.55);
    var y = H * 0.87;
    game.draw.circle(W * 0.25, y, 130, w.padL > 0 ? STYLE.accent[1] : '#8b96b3', w.padL > 0 ? 0.55 : 0.25);
    game.draw.circle(W * 0.75, y, 130, w.padR > 0 ? STYLE.accent[1] : '#8b96b3', w.padR > 0 ? 0.55 : 0.25);
    game.draw.sprite(PAD_L, { '#': STYLE.main[2] }, W * 0.25, y, 18, { anchor: 'center' });
    game.draw.sprite(PAD_R, { '#': STYLE.main[2] }, W * 0.75, y, 18, { anchor: 'center' });
  }

  function label(s, x, y, size, color) {
    game.draw.text(s, x + 3, y + 3, { size: size, color: INK, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function drawStage() {
    drawRoom();
    drawLaunchers();
    var order = w.arrows.slice().sort(function (a, b) { return a.p - b.p; });
    var dollDrawn = false;
    for (var i = 0; i < order.length; i++) {
      if (!dollDrawn && order[i].p > 0.97) { drawDoll(); dollDrawn = true; }
      drawArrow(order[i], false);
    }
    if (!dollDrawn) drawDoll();
    if (w.phase === 'stop' && w.culprit) drawArrow(w.culprit, true);
    drawPads();
  }

  function drawHud() {
    label(w.dodged + ' / ' + ARROWS, W * 0.2, 70, 44, '#ffffff');
    label('SCORE ' + w.score, W * 0.7, 70, 40, '#ffe27a');
    game.draw.rect(60, 150, W - 120, 18, INK, 0.6);
    var frac = Math.max(0, w.clock / TIME_LIMIT);
    game.draw.rect(60, 150, (W - 120) * frac, 18, frac < 0.2 ? STYLE.accent[0] : STYLE.accent[1]);
    game.draw.rect(60, 180, (W - 120) * (w.dodged / ARROWS), 8, '#ffe27a');
  }

  // ── ATTRACT(実ロジック+ボット) ─────────────────────
  var demo = { t: 0, gx: W * 0.75, gy: H * 0.87, press: 0, early: false };
  function botPress(dir) {
    demo.gx = dir < 0 ? W * 0.25 : W * 0.75; demo.gy = H * 0.87; demo.press = 0.2;
    step(dir);
  }
  function runDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) { w = freshWorld(); w.phase = 'run'; w.nextT = 0.1; demo.early = false; }
    if (demo.press > 0) demo.press -= dt;
    if (w.phase === 'run') {
      advance(dt);
      for (var i = 0; i < w.arrows.length; i++) {
        var a = w.arrows[i];
        if (!demo.early && !a.locked && a.p > 0.38) { demo.early = true; botPress(w.lane <= 0 ? 1 : -1); break; }
        if (a.locked && !a.done && Math.round(a.lx) === w.lane && a.p > 0.9) { botPress(w.lane >= 0 ? -1 : 1); break; }
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
    if (MODE === 'RESULT') { MODE = 'ATTRACT'; w = freshWorld(); demo.t = 0; return; }
    if (w.phase !== 'run') { game.audio.play('se_tap', 0.1); return; }
    step(x < W / 2 ? -1 : 1);
  });

  game.onUpdate(function (dt) {
    if (!w) w = freshWorld();
    if (MODE === 'ATTRACT') {
      runDemo(dt);
      drawStage();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 14 });
      label('ARROW GRAZE', VX, 90, 58, '#ffe27a');
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), VX, 165, 32, '#ffffff');
      if (Math.floor(game.time.elapsed * 1.6) % 2 === 0) label('► 100円 投入 ◄', VX, H * 0.965, 40, '#ffe27a');
      else label('INSERT COIN', VX, H * 0.965, 34, '#ffffff');
      return;
    }
    if (MODE === 'RESULT') {
      drawStage();
      game.draw.rect(0, H * 0.3, W, H * 0.3, INK, 0.72);
      label(w.won ? 'CLEAR' : 'GAME OVER', VX, H * 0.36, 86, w.won ? '#ffd34d' : STYLE.accent[0]);
      label('SCORE ' + w.score, VX, H * 0.43, 50, '#ffffff');
      label('PERFECT ' + w.perfects + '   ' + w.dodged + ' / ' + ARROWS, VX, H * 0.48, 36, STYLE.accent[1]);
      if (!w.won) label('あと' + (ARROWS - w.dodged) + '本!', VX, H * 0.535, 44, '#ffe27a');
      else if (w.score > game.best) label('NEW RECORD', VX, H * 0.535, 46, '#ffe27a');
      else label('BEST ' + game.best, VX, H * 0.535, 40, '#ffffff');
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', VX, H * 0.965, 34, '#ffffff');
      return;
    }
    // play
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
    drawHud();
    if (w.phase === 'ready') label(w.readyT > 0.35 ? 'READY?' : 'GO!', VX, H * 0.45, 90, '#ffe27a');
  });

  game.onStart(function () {
    game.audio.melody([['E4', 0.5], ['G4', 0.25], ['C5', 0.25], ['B4', 0.5], ['G4', 0.5], ['A4', 0.25], ['F4', 0.25], ['E4', 1]], { tempo: 150, wave: 'triangle', volume: 0.05, loop: true, bass: true });
    MODE = 'ATTRACT';
    w = freshWorld();
    demo.t = 0;
  });
})(game);
