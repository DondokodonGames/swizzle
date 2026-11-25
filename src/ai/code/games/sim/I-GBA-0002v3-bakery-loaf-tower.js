// I-GBA-0002v3-bakery-loaf-tower.js
// ローフタワー — 棚から転がり落ちる丸パンを盆で受け、揺らさないように高く積み上げる
// 操作: 指を左右になぞると盆が付いてくる。落ちてくるパンを積み山の頂上で受け、急に動かすと山が揺れて傾く
// 終わり: 8個積み上げれば成功。受け損ねて床に落とす/山が傾きすぎて崩れる/時間切れで失敗
// @mechanic: stack
// @theme: bakery_loaf_stack
// 世界観: パン工房の窯前で、見習いのパン職人が棚から転がり落ちてくる焼きたての丸パンを盆で受け、崩さないように一段ずつ積み上げて店先へ運ぶ準備をする
// 残るもの: 正誤(CLEAR/GAME OVER) + 積んだ個数と芯に乗せた数
// スタイル: 90s PRE-RENDER

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  // 90s PRE-RENDER: 暗め・金属質、粒状ノイズ、背景は1枚絵として描く
  var STYLE = { bg: ['#1c1512', '#3a2a20', '#5a4032'], main: ['#d9a15a', '#8c5a2e', '#f3dcb0'], accent: ['#ff8a3d', '#9fc4d8'] };

  var TRAY_Y = H * 0.70;
  var LOAF_W = 150, LOAF_H = 70;
  var GOAL = 8;
  var TIME_LIMIT = 22;
  var TOPPLE = 180;
  var SHELF_Y = H * 0.24;

  var LOAF = ['..######..', '.########.', '##"##"####', '##########', '.########.'];
  var LOAF_PAL = { '#': STYLE.main[0], '"': STYLE.main[2] };
  var LOAF_HOT = { '#': '#ffffff', '"': '#ffe6c0' };
  var BAKER = ['..####..', '.######.', '..#ee#..', '..####..', '.######.', '#.####.#', '..####..', '..#..#..', '.##..##.'];
  var BAKER2 = ['..####..', '.######.', '..#ee#..', '..####..', '#######.', '..####.#', '..####..', '..#..#..', '.##..##.'];
  var BAKER_PAL = { '#': '#e8e2d6', 'e': '#2a1c14' };

  var stage = { now: 'ATTRACT' };
  var b;

  function newBake() {
    return {
      trayX: W / 2, aimX: W / 2, prevV: 0, sway: 0, swayV: 0, pile: [], drop: null, cue: null,
      gap: 0.4, clock: TIME_LIMIT, lead: 0.8, pause: 0, fail: '', done: false, cores: 0, lastLean: 0, spark: 0,
    };
  }

  function pileTopX() {
    if (!b.pile.length) return b.trayX;
    var i = b.pile.length - 1;
    return b.trayX + b.pile[i] + b.sway * (i + 1) * 0.5;
  }

  function comOffset() {
    var s = 0;
    for (var i = 0; i < b.pile.length; i++) s += b.pile[i];
    return b.pile.length ? s / b.pile.length : 0;
  }

  function leanNow() { return comOffset() * 1.6 + b.sway * b.pile.length * 0.5; }

  function cueLoaf() {
    var side = game.random(0, 1) < 0.5 ? -1 : 1;
    var x = b.trayX + side * game.random(140, 400);
    if (x < W * 0.16 || x > W * 0.84) x = b.trayX - side * game.random(140, 400);
    x = Math.max(W * 0.16, Math.min(W * 0.84, x));
    b.cue = { x: x, t: 0.6 };
    game.audio.tone('A3', 0.1, { wave: 'sawtooth', volume: 0.04 });
  }

  function dropLoaf() {
    var n = b.pile.length;
    b.drop = { x: b.cue.x, y: SHELF_Y + 20, vy: 200 + n * 40, drift: game.random(-60, 60) * (n >= 4 ? 1 : 0) };
    b.cue = null;
    game.audio.play('se_jump', 0.2);
  }

  function catchLoaf() {
    var d = b.drop;
    var topX = pileTopX();
    var diff = d.x - topX;
    b.drop = null;
    if (Math.abs(diff) > LOAF_W * 0.72) {
      b.fail = 'drop'; b.pause = 0.5; b.hot = { x: d.x, y: TRAY_Y + 120 };
      game.fx.flash('#ffffff', 0.12);
      game.audio.play('se_break', 0.4);
      return;
    }
    var baseOff = b.pile.length ? b.pile[b.pile.length - 1] : 0;
    b.pile.push(baseOff + diff);
    b.swayV += diff * 0.5;
    var core = Math.abs(diff) < 22;
    if (core) b.cores++;
    var y = TRAY_Y - b.pile.length * LOAF_H;
    game.feedback.good(topX + diff, y, { text: core ? 'PERFECT' : 'GOOD', color: core ? STYLE.accent[0] : STYLE.main[2], size: 44 });
    if (b.pile.length === GOAL / 2) { game.fx.popup(b.pile.length + ' / ' + GOAL, W / 2, H * 0.2, { color: STYLE.main[2], size: 50 }); game.audio.play('se_milestone', 0.4); }
    if (b.pile.length >= GOAL) { b.done = true; b.pause = 0.5; }
  }

  function bake(dt) {
    b.clock -= dt;
    var prev = b.trayX;
    b.trayX += (b.aimX - b.trayX) * Math.min(1, dt * 16);
    var v = (b.trayX - prev) / Math.max(dt, 0.001);
    var acc = (v - b.prevV) / Math.max(dt, 0.001);
    b.prevV = v;
    b.swayV += (-22 * b.sway - 3.2 * b.swayV - acc * 0.08 * (1 + b.pile.length * 0.25)) * dt;
    b.sway += b.swayV * dt;
    if (b.spark > 0) b.spark -= dt;

    var lean = leanNow();
    if (Math.abs(lean) > TOPPLE * 0.7 && Math.abs(b.lastLean) <= TOPPLE * 0.7) game.audio.tone('E6', 0.08, { wave: 'square', volume: 0.05 });
    b.lastLean = lean;
    if (b.pile.length >= 2 && Math.abs(lean) > TOPPLE) {
      b.fail = 'topple'; b.pause = 0.5; b.hot = { x: pileTopX(), y: TRAY_Y - b.pile.length * LOAF_H };
      game.fx.flash('#ffffff', 0.12);
      game.audio.play('se_break', 0.45);
      return;
    }

    if (b.cue) { b.cue.t -= dt; if (b.cue.t <= 0) dropLoaf(); }
    else if (!b.drop && b.pile.length < GOAL) { b.gap -= dt; if (b.gap <= 0) { cueLoaf(); b.gap = Math.max(0.2, 0.5 - b.pile.length * 0.04); } }

    if (b.drop) {
      var d = b.drop;
      d.vy += 1500 * dt;
      d.y += d.vy * dt;
      d.x += d.drift * dt;
      var landY = TRAY_Y - (b.pile.length + 0.5) * LOAF_H;
      if (d.y >= landY) catchLoaf();
    }
    if (b.clock <= 0 && !b.done && !b.fail) { b.clock = 0; b.fail = 'time'; b.pause = 0.5; b.hot = { x: b.trayX, y: TRAY_Y }; }
  }

  function closeOut() {
    var stats = { stacked: b.pile.length, total: GOAL, core: b.cores };
    if (b.done) {
      game.feedback.good(pileTopX(), TRAY_Y - GOAL * LOAF_H - 60, { text: 'CLEAR', color: STYLE.accent[0], size: 64 });
      game.audio.play('se_success', 0.6);
      game.end.success(b.pile.length * 100 + b.cores * 50, stats);
    } else {
      game.feedback.bad(b.hot.x, b.hot.y, { text: b.fail === 'time' ? 'TIME UP' : 'MISS', size: 58 });
      game.audio.play('se_failure', 0.6);
      game.end.failure(stats);
    }
    stage.now = 'RESULT';
  }

  // ── 描画(1枚絵の背景+粒状ノイズ) ─────────────
  function backdrop() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.55, STYLE.bg[1]], [1, STYLE.bg[0]]]);
    // 窯の口(奥で炎が脈打つ)
    game.draw.circle(W * 0.5, H * 0.46, 260, '#2a1a12');
    game.draw.circle(W * 0.5, H * 0.48, 200, STYLE.accent[0], 0.18 + 0.08 * Math.sin(t * 3.1));
    game.draw.circle(W * 0.5, H * 0.50, 120, '#ffc26b', 0.12 + 0.06 * Math.sin(t * 4.3));
    for (var r = 0; r < 9; r++) for (var c = 0; c < 8; c++) {
      if ((r + c) % 2) game.draw.rect(c * 140 - (r % 2) * 70, H * 0.3 + r * 50, 132, 44, STYLE.bg[2], 0.22);
    }
    // 棚(金属質の天板)
    game.draw.rect(0, SHELF_Y, W, 26, '#6f6a66');
    game.draw.rect(0, SHELF_Y, W, 6, '#c9c3bb');
    game.draw.rect(0, SHELF_Y + 26, W, 10, '#000000', 0.4);
    for (var i = 0; i < 5; i++) game.draw.sprite(LOAF, LOAF_PAL, W * (0.1 + i * 0.2), SHELF_Y - 22, 9, { anchor: 'center' });
    // 床
    game.draw.rect(0, H * 0.78, W, H * 0.22, '#15100d');
    for (var f = 0; f < 5; f++) game.draw.rect(0, H * 0.78 + f * 60, W, 3, STYLE.bg[2], 0.4);
    // 粒状ノイズ
    for (var g = 0; g < 40; g++) game.draw.rect(game.random(0, W), game.random(0, H), 3, 3, '#ffffff', 0.05);
  }

  function cueMark() {
    if (!b.cue) return;
    var blink = Math.floor(game.time.elapsed * 12) % 2 === 0;
    var jig = Math.sin(game.time.elapsed * 40) * 6;
    game.draw.sprite(LOAF, blink ? LOAF_HOT : LOAF_PAL, b.cue.x + jig, SHELF_Y - 22, 9, { anchor: 'center' });
    for (var y = SHELF_Y + 50; y < TRAY_Y - 60; y += 60) game.draw.rect(b.cue.x - 3, y, 6, 30, STYLE.accent[0], 0.5);
  }

  function pileDraw(highlight) {
    game.draw.circle(b.trayX, TRAY_Y + 50, 150, '#000000', 0.35);
    var bob = Math.sin(game.time.elapsed * 3) * 3;
    game.draw.sprite(Math.abs(b.prevV) > 200 ? BAKER2 : BAKER, BAKER_PAL, b.trayX, TRAY_Y + 130 + bob, 16, { anchor: 'center' });
    game.draw.rect(b.trayX - 130, TRAY_Y - 6, 260, 16, '#b8b2aa');
    game.draw.rect(b.trayX - 130, TRAY_Y - 6, 260, 4, '#ffffff', 0.6);
    for (var i = 0; i < b.pile.length; i++) {
      var x = b.trayX + b.pile[i] + b.sway * (i + 1) * 0.5;
      var y = TRAY_Y - (i + 0.5) * LOAF_H;
      game.draw.circle(x, y + 16, LOAF_W * 0.45, '#000000', 0.2);
      game.draw.sprite(LOAF, highlight ? LOAF_HOT : LOAF_PAL, x, y, highlight ? 17 : 15, { anchor: 'center' });
    }
    var lean = leanNow();
    if (Math.abs(lean) > TOPPLE * 0.7 && Math.floor(game.time.elapsed * 10) % 2 === 0) {
      game.draw.circle(pileTopX(), TRAY_Y - b.pile.length * LOAF_H, 60, '#ff3b2f', 0.35);
    }
  }

  function fallingDraw() {
    if (!b.drop) return;
    game.draw.circle(b.drop.x, TRAY_Y - b.pile.length * LOAF_H, 40, '#000000', 0.3);
    game.draw.sprite(LOAF, LOAF_PAL, b.drop.x, b.drop.y, 15, { anchor: 'center' });
  }

  function leanMeter() {
    var cx = W / 2, y = H * 0.9;
    game.draw.rect(cx - 300, y - 10, 600, 20, '#000000', 0.5);
    game.draw.rect(cx - 300 * 0.7, y - 10, 600 * 0.7, 20, STYLE.accent[1], 0.25);
    var k = Math.max(-1, Math.min(1, leanNow() / TOPPLE));
    game.draw.rect(cx + k * 300 - 8, y - 22, 16, 44, Math.abs(k) > 0.7 ? '#ff3b2f' : STYLE.main[2]);
  }

  function engrave(s, x, y, size, color) {
    game.draw.text(s, x + 3, y + 4, { size: size, color: '#000000', bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function whole() {
    backdrop();
    cueMark();
    pileDraw(b.pause > 0 && b.fail === 'topple');
    fallingDraw();
    if (b.pause > 0 && b.fail === 'drop') game.draw.sprite(LOAF, LOAF_HOT, b.hot.x, b.hot.y, 19, { anchor: 'center' });
    leanMeter();
  }

  // ── ATTRACT: 本物の bake() をボットの指で動かす ─────────
  var demo = { t: 0, gx: W / 2, gy: H * 0.86, press: false, jerk: 0 };
  function demoTick(dt) {
    demo.t += dt;
    var cyc = demo.t % 7;
    if (cyc < dt || demo.t <= dt) { b = newBake(); b.lead = 0; b.gap = 0.1; demo.jerk = 0; demo.told = false; }
    if (b.fail || b.done) {
      if (b.fail && !demo.told) { demo.told = true; game.feedback.bad(b.hot.x, b.hot.y, { text: 'MISS', size: 50 }); }
      b.pause -= dt; demo.press = false; return;
    }
    bake(dt);
    var target = b.trayX;
    if (b.drop) target = b.trayX + (b.drop.x - pileTopX());
    else if (b.cue) target = b.trayX + (b.cue.x - pileTopX());
    if (b.pile.length >= 3 && cyc > 4.8) { demo.jerk += dt; target = demo.jerk % 1.3 < 0.65 ? W * 0.1 : W * 0.9; }
    demo.gx += (target - demo.gx) * Math.min(1, dt * (demo.jerk > 0 ? 30 : 5));
    demo.press = true;
    b.aimX = demo.gx;
  }

  function steer(x) { b.aimX = Math.max(W * 0.12, Math.min(W * 0.88, x)); }

  game.onTap(function (x, y) {
    if (stage.now === 'ATTRACT') { game.audio.play('se_coin', 0.5); b = newBake(); stage.now = 'PLAYING'; return; }
    if (stage.now === 'RESULT') { game.audio.play('se_tap', 0.3); stage.now = 'ATTRACT'; b = newBake(); demo.t = 0; return; }
  });
  game.onPress(function (x, y) {
    if (stage.now !== 'PLAYING' || b.lead > 0 || b.pause > 0) return;
    game.audio.play('se_tap', 0.2);
    b.spark = 0.15;
    steer(x);
  });
  game.onMove(function (x, y) {
    if (stage.now !== 'PLAYING' || b.lead > 0 || b.pause > 0) return;
    steer(x);
    if (Math.abs(b.prevV) > 2600) game.fx.shake(3, 0.05);
  });

  game.onUpdate(function (dt) {
    if (!b) b = newBake();
    if (stage.now === 'ATTRACT') {
      demoTick(dt);
      whole();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      engrave('LOAF TOWER', W / 2, 90, 66, STYLE.main[2]);
      engrave('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, 165, 34, STYLE.accent[0]);
      if (Math.floor(game.time.elapsed * 1.6) % 2 === 0) engrave('► 100円 投入 ◄', W / 2, H * 0.965, 42, STYLE.accent[0]);
      else engrave('INSERT COIN', W / 2, H * 0.965, 36, STYLE.main[2]);
      return;
    }
    if (stage.now === 'RESULT') {
      whole();
      game.draw.rect(0, H * 0.3, W, H * 0.28, '#000000', 0.72);
      engrave(b.done ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.36, 86, b.done ? STYLE.accent[0] : '#ff5a4a');
      engrave(b.pile.length + ' / ' + GOAL, W / 2, H * 0.43, 52, STYLE.main[2]);
      engrave('PERFECT ' + b.cores, W / 2, H * 0.475, 38, STYLE.accent[1]);
      var sc = b.pile.length * 100 + b.cores * 50;
      if (!b.done) engrave('あと' + (GOAL - b.pile.length) + '個!', W / 2, H * 0.525, 46, STYLE.main[0]);
      else engrave(sc > game.best ? 'NEW RECORD' : 'BEST ' + game.best, W / 2, H * 0.525, 44, STYLE.main[0]);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) engrave('TAP TO CONTINUE', W / 2, H * 0.965, 36, STYLE.main[2]);
      return;
    }
    if (b.lead > 0) {
      b.lead -= dt;
      if (b.lead <= 0) game.audio.play('se_tap', 0.3);
    } else if (b.pause > 0) {
      b.pause -= dt;
      if (b.pause <= 0) { closeOut(); return; }
    } else {
      bake(dt);
    }
    whole();
    engrave(b.pile.length + ' / ' + GOAL, W * 0.22, 70, 46, STYLE.main[2]);
    engrave('PERFECT ' + b.cores, W * 0.72, 70, 36, STYLE.accent[0]);
    game.draw.rect(60, 150, W - 120, 18, '#000000', 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, b.clock / TIME_LIMIT), 18, b.clock < 4 ? '#ff5a4a' : STYLE.main[0]);
    if (b.lead > 0) engrave(b.lead > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 92, STYLE.accent[0]);
  });

  game.onStart(function () {
    game.audio.melody([['A3', 0.75], ['C4', 0.25], ['E4', 0.5], ['D4', 0.5], ['C4', 0.75], ['B3', 0.25], ['A3', 1]], { tempo: 104, wave: 'triangle', volume: 0.05, loop: true, bass: true });
    stage.now = 'ATTRACT';
    b = newBake();
    demo.t = 0;
  });
})(game);
