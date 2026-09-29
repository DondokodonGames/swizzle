// J-Switch-0034-prairie-herd-gap-dash.js
// 大平原の伝令走 — 突進してくるバイソンの列の隙間を見抜き、3本の獣道のうち空いている1本へ飛び込んで丘の鐘まで走り抜ける
// 操作: 画面の左・中・右の3分の1をタップすると、その獣道へ移る。土煙が晴れた列の空き道を選ぶ。頭を下げて横へ土を蹴るバイソンは隣の道へ寄ってくる(社内メモ。画面には出さない)
// 終わり: 9列をくぐり抜けて鐘の柱に着けばCLEAR。空いていない道で列とぶつかると転んで1ミス、3ミスか時間切れでGAME OVER
// @mechanic: judge
// @theme: prairie_courier_herd_gap
// 世界観: 夏の大平原で、伝令の少年が、突進してくるバイソンの群れの列ごとに空いた獣道を見抜いて飛び込み、丘の上の鐘の柱まで知らせを走らせる
// 残るもの: 正誤(CLEAR/GAME OVER) + くぐった列数・即決(PERFECT)数・転んだ回数
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 巨大キャラ、床影、間合いで見せる
  var STYLE = { bg: ['#ffd88a', '#e8a94f', '#7fb24a'], main: ['#5a3620', '#2a1a10'], accent: ['#ffef6a', '#e8402a'] };
  var C = {
    sky1: '#ffe9b0', sky2: STYLE.bg[0], hill: '#c98a3c', grass1: '#9ccc5a', grass2: STYLE.bg[2], grass3: '#4f8a2e',
    bison: STYLE.main[0], bisonDk: STYLE.main[1], horn: '#f4e6c8', dust: '#e8cf9a',
    boy: '#3a6ad8', skin: '#f2b27a', bag: '#b8742e', good: STYLE.accent[0], bad: STYLE.accent[1], ink: '#2a1a10', white: '#ffffff'
  };

  var GAME_TITLE = 'HERD DASH';
  var TIME_LIMIT = 15;
  var NEEDED = 9;
  var MAX_LIVES = 3;
  var HORIZON = H * 0.24;
  var RUN_Y = H * 0.7;
  var LANES = [W * 0.2, W * 0.5, W * 0.8];
  var APPROACH = [1.35, 1.3, 1.2, 1.2, 1.1, 1.05, 1.0, 0.95, 0.95];
  var SWERVE_ROWS = { 3: true, 5: true, 6: true, 8: true };
  var REVEAL = 0.3;
  var GAP = 0.25;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  // ── スプライト ──
  var BISON_A = [
    '....hh........hh....',
    '...h.bbbbbbbbbb.h...',
    '....bbBBBBBBBBbb....',
    '...bBBBBBBBBBBBBb...',
    '..bBBBwBBBBBBwBBBb..',
    '..bBBBBBBBBBBBBBBb..',
    '..bBBBBBnnnnBBBBBb..',
    '...bBBBBnnnnBBBBb...',
    '..bbbBBBBBBBBBBbbb..',
    '.bbbbbbbbbbbbbbbbbb.',
    '.bbbbbbbbbbbbbbbbbb.',
    '..bb..bb....bb..bb..',
    '..bb...bb..bb...bb..',
    '.bbb...bbb.bbb..bbb.'
  ];
  var BISON_B = [
    '....hh........hh....',
    '...h.bbbbbbbbbb.h...',
    '....bbBBBBBBBBbb....',
    '...bBBBBBBBBBBBBb...',
    '..bBBBwBBBBBBwBBBb..',
    '..bBBBBBBBBBBBBBBb..',
    '..bBBBBBnnnnBBBBBb..',
    '...bBBBBnnnnBBBBb...',
    '..bbbBBBBBBBBBBbbb..',
    '.bbbbbbbbbbbbbbbbbb.',
    '.bbbbbbbbbbbbbbbbbb.',
    '...bb.bb....bb.bb...',
    '..bb..bb....bb..bb..',
    '..bbb..bb..bb..bbb..'
  ];
  var BISON_PAL = { b: C.bisonDk, B: C.bison, h: C.horn, w: C.white, n: '#3b2416' };
  var BOY = [
    [
      '...kkkk...',
      '..kkkkkk..',
      '..kssssk..',
      '...ssss...',
      '.gbbbbbbg.',
      'g.bbbbbb.g',
      '..bbbbbb..',
      '...pp.pp..',
      '..pp...pp.',
      '.kk.....kk'
    ],
    [
      '...kkkk...',
      '..kkkkkk..',
      '..kssssk..',
      '...ssss...',
      '..gbbbbbg.',
      '.g.bbbbb.g',
      '...bbbbb..',
      '....ppp...',
      '....pp....',
      '...kkk....'
    ],
    [
      '...kkkk...',
      '..kkkkkk..',
      '..kssssk..',
      '...ssss...',
      '.gbbbbbg..',
      'g.bbbbb.g.',
      '..bbbbb...',
      '...ppp....',
      '....pp....',
      '....kkk...'
    ]
  ];
  var BOY_PAL = { k: '#3a2210', s: C.skin, b: C.boy, g: C.bag, p: '#2a3a6a' };
  var BELL = [
    '...kk...',
    '.kyyyyk.',
    'kyyyyyyk',
    'kyyyyyyk',
    'kkkkkkkk',
    '...kk...',
    '...ww...',
    '...ww...',
    '...ww...',
    '...ww...'
  ];
  var BELL_PAL = { k: '#6a4410', y: '#ffd23a', w: '#8a5a2b' };
  var PAD = ['..kk..', '.kkkk.', 'kk..kk', '.k..k.'];

  // ── 状態 ──
  var lane, laneFrom, slideT, row, rowIdx, gapT, passed, lives, perfects, timeLeft;
  var ready, hitStop, finished, ok, done, endWait, tumble, hitFx, runT, streak;
  var result = { passed: 0, perfects: 0, falls: 0, score: 0 };

  function makeRow(i) {
    var gapLane = Math.floor(Math.random() * 3);
    var r = {
      gap: gapLane, t: 0, T: APPROACH[Math.min(i, APPROACH.length - 1)],
      bison: [], lastPick: -1, pickAt: -1, done: false, swerve: null
    };
    for (var l = 0; l < 3; l++) if (l !== gapLane) r.bison.push({ lane: l, x: l });
    if (SWERVE_ROWS[i]) {
      // 空き道の隣のバイソンが空き道へ寄る → 元の場所が新しい空き道になる
      var cand = [];
      for (var b = 0; b < r.bison.length; b++) if (Math.abs(r.bison[b].lane - gapLane) === 1) cand.push(b);
      var pick = cand[Math.floor(Math.random() * cand.length)];
      r.swerve = { idx: pick, from: r.bison[pick].lane, to: gapLane };
    }
    return r;
  }

  function finalGap(r) { return r.swerve ? r.swerve.from : r.gap; }

  function initGame() {
    lane = 1; laneFrom = 1; slideT = 0; rowIdx = 0; row = makeRow(0); gapT = 0.2;
    passed = 0; lives = MAX_LIVES; perfects = 0; timeLeft = TIME_LIMIT; streak = 0;
    ready = 0.8; hitStop = 0; finished = false; ok = false; done = false; endWait = 0;
    tumble = 0; hitFx = null; runT = 0;
  }

  function depth(k) { return 0.3 + 0.7 * k; }
  function laneX(l, k) { return W / 2 + (LANES[0] + (LANES[2] - LANES[0]) * l / 2 - W / 2) * depth(k); }
  function rowY(k) { return HORIZON + (RUN_Y - HORIZON) * k * k; }

  function moveTo(l, live) {
    if (row) { row.lastPick = l; if (row.pickAt < 0 || l !== lane) row.pickAt = row.t / row.T; }
    if (l === lane) {
      if (live) { game.audio.play('se_tap', 0.3); game.fx.burst(LANES[lane], RUN_Y + 60, { color: C.dust, count: 4, speed: 80 }); }
      return;
    }
    laneFrom = lane; lane = l; slideT = 0.12;
    if (live) { game.audio.play('se_jump', 0.3); game.fx.burst(LANES[laneFrom], RUN_Y + 60, { color: C.dust, count: 8, speed: 160 }); }
  }

  // 列の進行(PLAYING とデモで共用)。到達したら 'pass' / 'hit'
  function stepRow(dt) {
    if (gapT > 0) { gapT -= dt; return null; }
    row.t += dt;
    var k = row.t / row.T;
    if (row.swerve) {
      var b = row.bison[row.swerve.idx];
      var s = Math.max(0, Math.min(1, (k - 0.55) / 0.2));
      b.x = row.swerve.from + (row.swerve.to - row.swerve.from) * s;
      b.lane = s >= 0.5 ? row.swerve.to : row.swerve.from;
    }
    if (k >= 1 && !row.done) {
      row.done = true;
      return lane === finalGap(row) ? 'pass' : 'hit';
    }
    return null;
  }

  function resolve(res, live) {
    passed++;
    if (res === 'pass') {
      if (live) {
        var quick = row.pickAt >= 0 && row.pickAt < 0.8 && row.lastPick === lane;
        if (quick) perfects++;
        streak++;
        game.feedback.good(LANES[lane], RUN_Y - 150, { text: quick ? 'PERFECT' : 'GOOD', color: C.good });
        if (passed === 5) { game.fx.popup(passed + ' / ' + NEEDED, W / 2, H * 0.42, { color: C.good, size: 70 }); game.audio.play('se_milestone', 0.5); }
      }
    } else {
      tumble = live ? 0.55 : 0.5;
      if (live) {
        lives--; streak = 0;
        hitStop = 0.45;
        hitFx = { x: LANES[lane], y: RUN_Y - 40, t: 0.45 };
        game.fx.flash('#ffffff', 0.14);
        game.feedback.bad(LANES[lane], RUN_Y - 60, { text: 'MISS', shake: 16 });
        if (lives <= 0) { finished = true; ok = false; finish(); return; }
      }
    }
    if (live && passed >= NEEDED) {
      finished = true; ok = true;
      game.fx.burst(W / 2, HORIZON + 40, { color: C.good, count: 30, speed: 460 });
      game.feedback.good(W / 2, H * 0.4, { text: 'CLEAR', color: C.good, size: 84 });
      game.audio.play('se_success', 0.6);
      finish();
      return;
    }
    rowIdx++;
    row = makeRow(rowIdx);
    gapT = GAP + (res === 'hit' ? 0.3 : 0);
  }

  function finish() {
    if (done) return;
    done = true; endWait = 1.3;
    game.audio.stopBgm();
    result.passed = passed; result.perfects = perfects; result.falls = MAX_LIVES - lives;
    result.score = ok ? passed * 100 + perfects * 60 + lives * 120 + Math.round(timeLeft * 20) : 0;
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); startMusic(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (finished || ready > 0 || hitStop > 0) { game.audio.tone('C4', 0.04, { wave: 'square', volume: 0.03 }); return; }
    moveTo(x < W / 3 ? 0 : (x < W * 2 / 3 ? 1 : 2), true);
  });

  // ── 描画 ──
  function drawBg() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky1], [0.2, C.sky2], [0.24, C.hill], [0.25, C.grass1], [0.7, C.grass2], [1, C.grass3]]);
    // 遠い丘の稜線
    for (var i = 0; i < 12; i++) {
      var hx = i * 100 - 20, hh = 30 + Math.sin(i * 1.7) * 18;
      game.draw.rect(hx, HORIZON - hh, 104, hh, C.hill, 0.8);
    }
    // 走る草の筋(遠近で速度が上がる)
    for (var g = 0; g < 14; g++) {
      var k = ((t * 0.9 + g / 14) % 1);
      var y = rowY(k);
      game.draw.rect(0, y, W, 2 + k * 6, C.grass3, 0.25);
    }
    // 獣道
    for (var l = 0; l < 3; l++) {
      for (var s = 0; s < 20; s++) {
        var k1 = s / 20;
        game.draw.rect(laneX(l, k1) - 40 * depth(k1), rowY(k1), 80 * depth(k1), 6 + k1 * 14, C.dust, 0.35);
      }
    }
    // 丘の鐘の柱(進むほど大きく)
    var prog = passed / NEEDED;
    var bb = Math.sin(t * 2) * 3;
    game.draw.sprite(BELL, BELL_PAL, W / 2, HORIZON - 30 + bb, 5 + prog * 7, { anchor: 'center' });
    // 奥のライバル伝令(半透明)
    for (var r = 0; r < 2; r++) {
      var rx = r === 0 ? W * 0.05 : W * 0.95;
      game.draw.sprite(BOY[Math.floor(t * 8 + r) % 3], BOY_PAL, rx, HORIZON + 140 + Math.sin(t * 3 + r) * 20, 4, { anchor: 'center', alpha: 0.35 });
    }
    // 親指ゾーンの蹄パッド
    for (var p = 0; p < 3; p++) {
      var px = W * (p + 0.5) / 3;
      var lit = p === lane;
      game.draw.circle(px, H * 0.88, 88, lit ? C.good : C.white, lit ? 0.75 : 0.25);
      game.draw.sprite(PAD, { k: C.ink }, px, H * 0.88, 14, { anchor: 'center', alpha: lit ? 0.9 : 0.4 });
    }
    game.draw.rect(0, 0, W, H, C.good, 0.03 + 0.03 * Math.sin(t * 1.3));
  }

  function drawRow() {
    if (!row || gapT > 0) return;
    var t = game.time.elapsed;
    var k = Math.min(1, row.t / row.T);
    var y = rowY(k);
    var px = 3 + 11 * depth(k);
    // 床影
    for (var i = 0; i < row.bison.length; i++) {
      var b = row.bison[i];
      var bx = laneX(b.x, k);
      game.draw.circle(bx, y + 7 * px, 9 * px, C.ink, 0.25);
    }
    if (k >= REVEAL) {
      for (var j = 0; j < row.bison.length; j++) {
        var bj = row.bison[j];
        var bxj = laneX(bj.x, k);
        var sw = row.swerve && row.swerve.idx === j;
        // 寄ってくる予告:頭を下げ、寄る側へ土を蹴る
        if (sw && k > 0.35 && k < 0.75) {
          var dir = row.swerve.to > row.swerve.from ? 1 : -1;
          var blink = Math.floor(t * 12) % 2 === 0;
          game.draw.circle(bxj + dir * 10 * px, y + 4 * px, 5 * px, C.dust, blink ? 0.9 : 0.5);
          game.draw.circle(bxj + dir * 14 * px, y + 2 * px, 3 * px, C.dust, 0.6);
        }
        game.draw.sprite(Math.floor(t * 10 + j) % 2 ? BISON_A : BISON_B, BISON_PAL, bxj, y + (sw && k > 0.35 && k < 0.75 ? 2 * px : 0), px, { anchor: 'center' });
      }
    }
    // 土煙(列を隠す → 晴れる)
    var dustA = k < REVEAL ? 0.95 : Math.max(0, 0.95 - (k - REVEAL) * 5);
    if (dustA > 0) {
      for (var d = 0; d < 7; d++) {
        var dx = W * 0.08 + d * W * 0.14 + Math.sin(t * 4 + d) * 12;
        game.draw.circle(W / 2 + (dx - W / 2) * depth(k), y, (40 + d % 3 * 12) * depth(k) + 20, C.dust, dustA);
      }
    }
  }

  function drawRunner() {
    var t = game.time.elapsed;
    var x = LANES[lane];
    if (slideT > 0) x = LANES[laneFrom] + (LANES[lane] - LANES[laneFrom]) * (1 - slideT / 0.12);
    var bob = Math.abs(Math.sin(t * 12)) * 12;
    game.draw.circle(x, RUN_Y + 78, 60, C.ink, 0.25);
    if (tumble > 0) {
      game.draw.sprite(BOY[0], BOY_PAL, x + Math.sin(t * 30) * 10, RUN_Y + 30, 12, { anchor: 'center', flipY: true });
      game.fx.burst(x, RUN_Y + 40, { color: C.dust, count: 1, speed: 60 });
    } else {
      game.draw.sprite(BOY[Math.floor(t * 10) % 3], BOY_PAL, x, RUN_Y - bob + Math.sin(t * 2.1) * 2, 12, { anchor: 'center' });
    }
  }

  function drawHitFx(dt) {
    if (!hitFx || hitFx.t <= 0) return;
    hitFx.t -= dt;
    var s = 14 + (0.45 - hitFx.t) * 12;
    game.draw.circle(hitFx.x, hitFx.y, 150 + (0.45 - hitFx.t) * 120, C.white, 0.6);
    game.draw.sprite(BISON_A, { b: C.white, B: C.white, h: C.bad, w: C.bad, n: C.bad }, hitFx.x, hitFx.y - 40, s, { anchor: 'center', alpha: 0.9 });
  }

  function txt(str, x, y, sz, color) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.ink, 0.35);
    txt(passed + ' / ' + NEEDED, W / 2, 72, 62, C.white);
    var bw = W - 200;
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(100, 140, bw, 20, C.white, 0.35);
    game.draw.rect(100, 140, bw * Math.max(0, timeLeft / TIME_LIMIT), 20, low ? C.bad : C.good);
    for (var i = 0; i < MAX_LIVES; i++) {
      game.draw.sprite(BOY[0], BOY_PAL, 90 + i * 70, 200, 3.5, { anchor: 'center', alpha: i < lives ? 1 : 0.25 });
    }
    if (streak >= 3) txt('x' + streak, W - 110, 200, 40, C.good);
  }

  // ── ATTRACT ゴースト実演(実ロジック stepRow/resolve を使う) ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.88, press: false, picked: false, wrong: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) {
      rowIdx = 3; row = makeRow(3); row.T = 1.4; gapT = 0; lane = 1; tumble = 0; passed = 0;
      demo.picked = false;
      demo.wrong = Math.floor(demo.t / 4.4) % 2 === 1;
    }
    if (slideT > 0) slideT -= dt;
    if (tumble > 0) tumble -= dt;
    if (gapT <= 0 && !demo.picked && row.t / row.T > 0.62) {
      demo.picked = true;
      var target = demo.wrong ? (finalGap(row) + 1) % 3 : finalGap(row);
      demo.gx = W * (target + 0.5) / 3; demo.gy = H * 0.88; demo.press = true;
      moveTo(target, false);
    }
    if (demo.press && row.t / row.T > 0.8) demo.press = false;
    var res = stepRow(dt);
    if (res) {
      if (res === 'pass') game.fx.burst(LANES[lane], RUN_Y - 60, { color: C.good, count: 12, speed: 260 });
      else game.fx.flash('#ffffff', 0.08);
      resolve(res, false);
      demo.picked = false; demo.wrong = false;
    }
  }

  // ── メインループ(1回だけ登録) ──
  game.onUpdate(function(dt) {
    if (row === undefined) initGame();
    runT += dt;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawBg();
      drawRow();
      drawRunner();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.35);
      txt(GAME_TITLE, W / 2, 80, 76, C.good);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, 170, 36, C.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 44, C.good);
      else txt('INSERT COIN', W / 2, H * 0.965, 38, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawBg();
      drawRunner();
      game.draw.rect(0, H * 0.28, W, H * 0.34, C.ink, 0.8);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.34, 100, ok ? C.good : C.bad);
      txt(result.passed + ' / ' + NEEDED, W / 2, H * 0.42, 60, C.white);
      if (ok) txt('SCORE ' + result.score, W / 2, H * 0.475, 50, C.good);
      else txt('あと' + (NEEDED - result.passed) + '列!', W / 2, H * 0.475, 50, C.bad);
      txt('PERFECT ' + result.perfects + '   MISS ' + result.falls, W / 2, H * 0.53, 34, C.white);
      var isNew = ok && result.score >= game.best && result.score > 0;
      txt(isNew ? 'NEW RECORD' : 'BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.58, 38, isNew ? C.good : C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.white);
      return;
    }

    // PLAYING
    if (slideT > 0) slideT -= dt;
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { rows: result.passed, perfects: result.perfects, falls: result.falls };
        if (ok) game.end.success(result.score, stats);
        else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.5);
    } else if (!finished) {
      timeLeft -= dt;
      if (tumble > 0) tumble -= dt;
      var before = row.t / row.T;
      var res = stepRow(dt);
      if (gapT <= 0 && before < REVEAL && row.t / row.T >= REVEAL) game.audio.tone('E3', 0.12, { wave: 'sawtooth', volume: 0.05 });
      if (row.swerve && before < 0.35 && row.t / row.T >= 0.35) game.audio.tone('B4', 0.1, { wave: 'square', volume: 0.05, slide: 200 });
      if (res) resolve(res, true);
      if (!finished && timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.4;
        game.feedback.bad(LANES[lane], RUN_Y - 60, { text: 'TIME UP' });
        game.audio.play('se_failure', 0.5);
        finish();
      }
    }

    drawBg();
    if (!(hitStop > 0 && hitFx && hitFx.t > 0)) drawRow();
    drawRunner();
    drawHitFx(dt);
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 110, C.good);
  });

  function startMusic() {
    game.audio.melody([
      ['D5', 0.5], ['D5', 0.25], ['E5', 0.25], ['F#5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 1],
      ['B4', 0.5], ['D5', 0.5], ['E5', 0.5], ['F#5', 0.5], ['E5', 0.5], ['C#5', 0.5], ['D5', 1]
    ], { tempo: 160, wave: 'square', volume: 0.06, loop: true, bass: [['D3', 1], ['A2', 1], ['G2', 1], ['A2', 1]] });
  }

  game.onStart(function() {
    state = S.ATTRACT;
    initGame();
    game.audio.bgm('bgm_tense');
  });
})(game);
