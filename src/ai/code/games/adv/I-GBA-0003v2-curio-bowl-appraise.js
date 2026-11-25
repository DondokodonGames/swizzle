// I-GBA-0003v2-curio-bowl-appraise.js
// キュリオボウル — 露店に並ぶそっくりな写しの茶碗から、鑑定札と同じ本物の一碗だけを見つけて取る
// 操作: 上の鑑定札に描かれた本物の柄・欠け・高台を見比べ、並んだ茶碗から同じ1つをタップする。写しに触れたら失敗
// 終わり: 4回続けて本物を当てれば成功。写しに触れる/時間切れで失敗
// @mechanic: spot
// @theme: flea_market_bowl_appraisal
// 世界観: 古道具市の露店で、目利きの古物商が鑑定札の写し絵を手がかりに、並んだ写し物の茶碗から本物の一碗だけを探し当てて買い付ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 見抜いた数と残り時間ボーナス
// スタイル: 70s MONO

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  // 70s MONO: 白ドットの単色画面に、横帯のカラーセロハンを重ねる
  var STYLE = { bg: ['#07090d', '#11151c', '#1a2029'], main: ['#f4f4ee', '#9aa0a6', '#55595e'], accent: ['#ffcf3a', '#3aff9a'] };
  var BANDS = [{ y0: 0, y1: 0.24, c: '#ffcf3a' }, { y0: 0.24, y1: 0.74, c: '#3aff9a' }, { y0: 0.74, y1: 1, c: '#ff5a8a' }];

  var ROUNDS = 4;
  var GRID = [[2, 2], [3, 2], [3, 3], [4, 3]];
  var TIME_LIMIT = 15;
  var FIELD_T = H * 0.30, FIELD_B = H * 0.72;

  var RIMS = ['#########', '.########', '########.'];
  var GLAZE = ['#.#.#.#.#', '##..##..#', '#...#...#', '.#.###.#.'];
  var BODY = ['.#######.', '..#####..'];
  var FEET = ['...###...', '..#...#..', '..#####..'];
  var SELLER = ['..###..', '.#####.', '..#.#..', '.#####.', '#######', '#.###.#', '..#.#..'];

  function bowlArt(k) { return [RIMS[k.rim], GLAZE[k.glaze], BODY[0], BODY[1], FEET[k.foot]]; }
  function sameKey(a, b) { return a.rim === b.rim && a.glaze === b.glaze && a.foot === b.foot; }

  var screen = 'ATTRACT';
  var M;

  function freshMarket() {
    return { round: 0, found: 0, bonus: 0, clock: TIME_LIMIT, intro: 0.8, still: 0, lot: [], real: null, verdict: '', picked: -1, flashIdx: -1, glow: 0 };
  }

  function randKey() { return { rim: Math.floor(game.random(0, 3)), glaze: Math.floor(game.random(0, 4)), foot: Math.floor(game.random(0, 3)) }; }

  function copyOf(real, diffs) {
    for (var tries = 0; tries < 30; tries++) {
      var k = { rim: real.rim, glaze: real.glaze, foot: real.foot };
      var fields = ['rim', 'glaze', 'foot'];
      for (var d = 0; d < diffs; d++) {
        var f = fields.splice(Math.floor(game.random(0, fields.length)), 1)[0];
        var span = f === 'glaze' ? 4 : 3;
        k[f] = (k[f] + 1 + Math.floor(game.random(0, span - 1))) % span;
      }
      if (!sameKey(k, real)) return k;
    }
    return { rim: (real.rim + 1) % 3, glaze: real.glaze, foot: real.foot };
  }

  function layOut(r) {
    var g = GRID[Math.min(r, GRID.length - 1)];
    var cols = g[0], rows = g[1];
    M.real = randKey();
    var realAt = Math.floor(game.random(0, cols * rows));
    M.lot = [];
    for (var i = 0; i < cols * rows; i++) {
      var cx = W * (0.5 + (i % cols - (cols - 1) / 2) * (0.84 / cols));
      var cy = FIELD_T + (FIELD_B - FIELD_T) * ((Math.floor(i / cols) + 0.5) / rows);
      M.lot.push({ x: cx, y: cy, key: i === realAt ? M.real : copyOf(M.real, r < 2 ? 2 : 1), real: i === realAt, pop: 0.25 });
    }
    M.picked = -1;
    game.audio.tone('C5', 0.06, { wave: 'square', volume: 0.05 });
  }

  function nearest(x, y) {
    var best = -1, bd = 1e9;
    for (var i = 0; i < M.lot.length; i++) {
      var d = Math.hypot(M.lot[i].x - x, M.lot[i].y - y);
      if (d < bd) { bd = d; best = i; }
    }
    return bd < 170 ? best : -1;
  }

  function choose(i) {
    var b = M.lot[i];
    M.picked = i;
    if (b.real) {
      M.found++;
      var quick = Math.max(0, Math.round(M.clock * 10));
      M.bonus += quick;
      game.feedback.good(b.x, b.y, { text: M.found === ROUNDS ? 'PERFECT' : 'GOOD', color: STYLE.accent[1], size: 48 });
      game.audio.play('se_coin', 0.35);
      if (M.found === 2) { game.fx.popup(M.found + ' / ' + ROUNDS, W / 2, H * 0.27, { color: STYLE.accent[0], size: 50 }); game.audio.play('se_milestone', 0.4); }
      if (M.found >= ROUNDS) { M.verdict = 'win'; M.still = 0.5; M.flashIdx = i; return; }
      M.round++;
      layOut(M.round);
    } else {
      M.verdict = 'fake'; M.still = 0.5; M.flashIdx = i;
      game.fx.flash('#ffffff', 0.12);
      game.audio.play('se_break', 0.4);
    }
  }

  function tickMarket(dt) {
    M.clock -= dt;
    for (var i = 0; i < M.lot.length; i++) if (M.lot[i].pop > 0) M.lot[i].pop -= dt;
    if (M.glow > 0) M.glow -= dt;
    if (M.clock <= 0) { M.clock = 0; M.verdict = 'time'; M.still = 0.5; M.flashIdx = -1; }
  }

  function settleMarket() {
    var stats = { found: M.found, total: ROUNDS };
    if (M.verdict === 'win') {
      game.feedback.good(W / 2, H * 0.5, { text: 'CLEAR', color: STYLE.accent[0], size: 66 });
      game.audio.play('se_success', 0.6);
      game.end.success(M.found * 100 + M.bonus, stats);
    } else {
      var b = M.flashIdx >= 0 ? M.lot[M.flashIdx] : { x: W / 2, y: H * 0.5 };
      game.feedback.bad(b.x, b.y, { text: M.verdict === 'time' ? 'TIME UP' : 'MISS', size: 58 });
      game.audio.play('se_failure', 0.6);
      game.end.failure(stats);
    }
    screen = 'RESULT';
  }

  // ── 描画 ─────────────────────────
  function stall() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[1]], [0.5, STYLE.bg[2]], [1, STYLE.bg[0]]]);
    // 露店の布(白ドットの格子)
    for (var y = FIELD_T - 80; y < FIELD_B + 90; y += 36) for (var x = 30; x < W; x += 36) game.draw.rect(x, y, 4, 4, STYLE.main[2], 0.6);
    game.draw.rect(40, FIELD_T - 90, W - 80, 6, STYLE.main[0], 0.7);
    game.draw.rect(40, FIELD_B + 90, W - 80, 6, STYLE.main[0], 0.7);
    // 客の行き交う遠景(点の人影がゆっくり流れる)
    for (var p = 0; p < 7; p++) {
      var px = ((t * 40 + p * 170) % (W + 100)) - 50;
      game.draw.sprite(SELLER, { '#': STYLE.main[2] }, px, H * 0.8 + (p % 2) * 30, 6, { anchor: 'center', alpha: 0.6 });
    }
    game.draw.sprite(SELLER, { '#': STYLE.main[0] }, W * 0.12, H * 0.85 + Math.sin(t * 2) * 4, 14, { anchor: 'center' });
  }

  function card() {
    var cx = W / 2, cy = H * 0.19;
    game.draw.rect(cx - 170, cy - 95, 340, 190, STYLE.main[0], 0.1);
    game.draw.line(cx - 170, cy - 95, cx + 170, cy - 95, STYLE.main[0], 4);
    game.draw.line(cx - 170, cy + 95, cx + 170, cy + 95, STYLE.main[0], 4);
    game.draw.line(cx - 170, cy - 95, cx - 170, cy + 95, STYLE.main[0], 4);
    game.draw.line(cx + 170, cy - 95, cx + 170, cy + 95, STYLE.main[0], 4);
    if (M.real) game.draw.sprite(bowlArt(M.real), { '#': STYLE.main[0] }, cx, cy, 26, { anchor: 'center' });
    game.draw.circle(cx + 140, cy - 65, 18 + 3 * Math.sin(game.time.elapsed * 5), STYLE.accent[0], 0.8);
  }

  function lotDraw() {
    var hitStop = M.still > 0;
    for (var i = 0; i < M.lot.length; i++) {
      var b = M.lot[i];
      var s = 18 - Math.max(0, b.pop) * 40;
      var pal = { '#': STYLE.main[0] };
      if (hitStop && i === M.flashIdx) { s = 26; game.draw.circle(b.x, b.y, 130, '#ffffff', 0.35); }
      if (hitStop && M.verdict !== 'win' && b.real) game.draw.circle(b.x, b.y, 110, STYLE.accent[1], 0.25);
      game.draw.rect(b.x - 95, b.y + 50, 190, 10, STYLE.main[2], 0.8);
      game.draw.sprite(bowlArt(b.key), pal, b.x, b.y, s, { anchor: 'center' });
    }
  }

  function cellophane() {
    for (var i = 0; i < BANDS.length; i++) game.draw.rect(0, H * BANDS[i].y0, W, H * (BANDS[i].y1 - BANDS[i].y0), BANDS[i].c, 0.14);
  }

  function stamp(s, x, y, size, color) {
    game.draw.text(s, x, y, { size: size, color: color || STYLE.main[0], bold: true, align: 'center', font: 'monospace' });
  }

  function view() {
    stall();
    card();
    lotDraw();
    cellophane();
  }

  // ── ATTRACT: 本物の choose() をボットが呼ぶ ─────────
  var demo = { t: 0, gx: W / 2, gy: H * 0.9, pressT: 0, stage: 0 };
  function demoLoop(dt) {
    demo.t += dt;
    var cyc = demo.t % 5;
    if (cyc < dt || demo.t <= dt) { M = freshMarket(); M.intro = 0; M.clock = 99; layOut(1); demo.stage = 0; }
    if (demo.pressT > 0) demo.pressT -= dt;
    if (M.still > 0) { M.still -= dt; return; }
    tickMarket(dt);
    var realI = 0, fakeI = 0;
    for (var i = 0; i < M.lot.length; i++) { if (M.lot[i].real) realI = i; else fakeI = i; }
    var tgt = null;
    if (demo.stage === 0) tgt = M.lot[fakeI];
    if (demo.stage === 1) tgt = M.lot[realI];
    if (demo.stage === 2) tgt = M.lot[fakeI];
    if (tgt) { demo.gx += (tgt.x - demo.gx) * Math.min(1, dt * 5); demo.gy += (tgt.y + 30 - demo.gy) * Math.min(1, dt * 5); }
    if (demo.stage === 0 && cyc > 1.1) demo.stage = 1;
    else if (demo.stage === 1 && cyc > 2.0) { demo.pressT = 0.3; choose(realI); demo.stage = 2; }
    else if (demo.stage === 2 && cyc > 3.6) {
      demo.pressT = 0.3;
      for (var j = 0; j < M.lot.length; j++) if (!M.lot[j].real) { choose(j); game.feedback.bad(M.lot[j].x, M.lot[j].y, { text: 'MISS', size: 46 }); break; }
      demo.stage = 3;
    }
  }

  game.onTap(function (x, y) {
    if (screen === 'ATTRACT') { game.audio.play('se_coin', 0.5); M = freshMarket(); layOut(0); screen = 'PLAYING'; return; }
    if (screen === 'RESULT') { game.audio.play('se_tap', 0.3); screen = 'ATTRACT'; M = freshMarket(); demo.t = 0; return; }
    if (M.intro > 0 || M.still > 0) return;
    var i = nearest(x, y);
    if (i < 0) { game.audio.play('se_tap', 0.15); M.glow = 0.2; return; }
    game.audio.play('se_tap', 0.25);
    choose(i);
  });

  game.onUpdate(function (dt) {
    if (!M) { M = freshMarket(); layOut(0); }
    if (screen === 'ATTRACT') {
      demoLoop(dt);
      view();
      game.draw.hand(demo.gx, demo.gy, { press: demo.pressT > 0, scale: 14 });
      stamp('CURIO BOWL', W / 2, 70, 62, STYLE.main[0]);
      stamp('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.76, 34, STYLE.accent[0]);
      if (Math.floor(game.time.elapsed * 1.6) % 2 === 0) stamp('► 100円 投入 ◄', W / 2, H * 0.95, 42, STYLE.accent[0]);
      else stamp('INSERT COIN', W / 2, H * 0.95, 36);
      return;
    }
    if (screen === 'RESULT') {
      view();
      game.draw.rect(0, H * 0.34, W, H * 0.26, STYLE.bg[0], 0.85);
      stamp(M.verdict === 'win' ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 86, M.verdict === 'win' ? STYLE.accent[0] : '#ff5a8a');
      stamp(M.found + ' / ' + ROUNDS, W / 2, H * 0.465, 52);
      var sc = M.found * 100 + M.bonus;
      if (M.verdict !== 'win') stamp('あと' + (ROUNDS - M.found) + '碗!', W / 2, H * 0.52, 46, STYLE.accent[1]);
      else { stamp('SCORE ' + sc, W / 2, H * 0.52, 40, STYLE.accent[1]); stamp(sc > game.best ? 'NEW RECORD' : 'BEST ' + game.best, W / 2, H * 0.565, 40, STYLE.accent[0]); }
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) stamp('TAP TO CONTINUE', W / 2, H * 0.95, 36);
      return;
    }
    if (M.intro > 0) {
      M.intro -= dt;
      if (M.intro <= 0) game.audio.play('se_tap', 0.3);
    } else if (M.still > 0) {
      M.still -= dt;
      if (M.still <= 0) { settleMarket(); return; }
    } else {
      tickMarket(dt);
    }
    view();
    stamp(M.found + ' / ' + ROUNDS, W * 0.18, 60, 44);
    stamp('SCORE ' + (M.found * 100 + M.bonus), W * 0.74, 60, 38, STYLE.accent[0]);
    game.draw.rect(60, H * 0.745, W - 120, 16, STYLE.main[2], 0.6);
    game.draw.rect(60, H * 0.745, (W - 120) * Math.max(0, M.clock / TIME_LIMIT), 16, M.clock < 4 ? '#ff5a8a' : STYLE.main[0]);
    if (M.glow > 0) game.draw.circle(W / 2, H * 0.19, 200, '#ffffff', 0.1);
    if (M.intro > 0) stamp(M.intro > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 92, STYLE.accent[0]);
  });

  game.onStart(function () {
    game.audio.melody([['E4', 1], ['B3', 0.5], ['D4', 0.5], ['E4', 0.5], ['G4', 0.5], ['F#4', 1]], { tempo: 96, wave: 'square', volume: 0.04, loop: true, bass: true });
    screen = 'ATTRACT';
    M = freshMarket();
    layOut(0);
    demo.t = 0;
  });
})(game);
