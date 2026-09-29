// J-3DSDSDSTOP10-0019-lilypad-leaf-start.js
// 蓮の葉スタート — ひらひら落ちる紅葉が水面に触れた瞬間にタップして飛び出す。早すぎればフライング、遅ければ置いていかれる
// 操作: 紅葉が水面の波紋の輪にぴたりと触れた瞬間にタップ。触れる前に押すとフライング
// 終わり: 5回のスタートのうち3回GOOD以上ならCLEAR。フライング2回で失格(GAME OVER)
// @mechanic: timing_one_shot
// @theme: pond_frog_start_signal
// 世界観: 夕暮れの蓮池で行われるカエルの跳び出し競走で、若いカエルの選手が、審判のカエルが放った紅葉が水面に触れる瞬間を読んで、誰よりもぴたりと蓮の葉を蹴って飛び出す
// 残るもの: 正誤(CLEAR/GAME OVER) + 反応のズレ(ミリ秒)・PERFECT数・フライング数
// スタイル: 90s PRE-RENDER

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s PRE-RENDER: 暗め・金属質、粒状ノイズと擬似奥行き、背景は1枚絵として描く
  var STYLE = {
    bg: ['#0c1a1c', '#17343a', '#2b5a5a'],
    main: ['#5fa88a', '#9fd6b8', '#d7e9df'],
    accent: ['#ff6a2a', '#ffd36a'],
  };
  var DEEP = '#0c1a1c', MID = '#17343a', TEAL = '#2b5a5a', LEAF = '#ff6a2a', GOLD = '#ffd36a';
  var GREEN = '#5fa88a', PALE = '#d7e9df', RED = '#ff3a4a';

  var GAME_TITLE = 'LEAF START';
  var TIME_LIMIT = 14;
  var NEEDED = 3;
  var HEATS = 5;
  var FOULS = 2;
  var WATER_Y = Math.round(H * 0.58);
  var LEAF_X = W / 2;
  var FROG_Y = Math.round(H * 0.7);
  var PERFECT_MS = 50, GOOD_MS = 120, LATE_MS = 300;

  var FROG_SIT = ['..g..g..', '.gwgwgg.', '.gkggkg.', 'gggggggg', 'glllllg.', '.gggggg.', 'gg.gg.gg'];
  var FROG_LEAP = ['..g..g..', '.gwgwgg.', '.gkggkg.', 'gggggggg', '.gllllg.', 'g.gggg.g', 'g......g'];
  var FROG_PAL = { g: GREEN, w: PALE, k: DEEP, l: '#9fd6b8' };
  var MAPLE = ['...r...', 'r..r..r', '.rrrrr.', 'rrrrrrr', '.rrrrr.', '..rrr..', '...b...'];
  var JUDGE = ['.gg.gg.', 'gwggwgg', 'gkggkgg', 'ggggggg', '.gyyyg.', '..ggg..'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var r = null;

  function say(str, x, y, sz, col) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  function initGame() {
    r = {
      heat: 0, good: 0, perfect: 0, fouls: 0, errs: [], phase: 'fall',
      leafY: 0, leafX: LEAF_X, fallT: 0, fallDur: 0, touchAt: 0, clock: 0, pause: 0,
      gust: false, gustDone: false, fly: null, flyT: 0,
      leap: 0, lastMs: null, verdict: '',
      timeLeft: TIME_LIMIT, ready: 0.8, hitStop: 0, hl: false,
      finished: false, done: false, ok: false, endWait: 0,
    };
    newHeat();
  }

  function newHeat() {
    r.phase = 'fall';
    r.fallT = 0;
    r.fallDur = 1.2 + Math.random() * 0.7 + r.heat * 0.05;
    r.gust = r.heat >= 2 && Math.random() < 0.6;
    r.gustDone = false;
    r.fly = r.heat >= 1 && Math.random() < 0.5 ? { at: 0.3 + Math.random() * 0.4 } : null;
    r.leap = 0; r.verdict = ''; r.hl = false;
    game.audio.tone('E6', 0.08, { wave: 'triangle', volume: 0.05 });
  }

  // 紅葉の高さ: 0=放った直後 → 1=水面。突風のある回は途中で一度ふわりと浮く
  function leafProgress(t) {
    var k = Math.min(1, t / r.fallDur);
    var p = k * k * 0.35 + k * 0.65;
    if (r.gust) p -= Math.max(0, Math.sin(Math.min(1, Math.max(0, (k - 0.35) / 0.3)) * Math.PI)) * 0.12;
    return p;
  }

  function tapStart() {
    if (r.finished || r.phase === 'result' || r.hitStop > 0) return;
    var dtMs = Math.round((r.clock - r.touchAt) * 1000);
    if (r.phase === 'fall') {
      // フライング
      r.fouls++;
      r.lastMs = null; r.verdict = 'foul'; r.hl = true;
      r.leap = 0.001; r.hitStop = 0.4;
      game.feedback.bad(W / 2, FROG_Y - 140, { text: 'MISS', color: RED });
      game.fx.flash(RED, 0.2);
      endHeat();
      return;
    }
    // 着水後
    r.lastMs = dtMs;
    r.errs.push(dtMs);
    r.leap = 0.001;
    game.audio.play('se_jump', 0.4);
    if (dtMs <= PERFECT_MS) {
      r.perfect++; r.good++; r.verdict = 'perfect';
      game.feedback.good(W / 2, FROG_Y - 160, { text: 'PERFECT', color: GOLD, count: 20 });
    } else if (dtMs <= GOOD_MS) {
      r.good++; r.verdict = 'good';
      game.feedback.good(W / 2, FROG_Y - 160, { text: 'GOOD', color: GREEN, count: 12 });
    } else {
      r.verdict = 'late';
      game.feedback.bad(W / 2, FROG_Y - 160, { text: 'MISS' });
    }
    game.fx.popup(dtMs + 'ms', W / 2 + 230, FROG_Y - 60, { color: PALE, size: 44 });
    if (r.good === 2 && r.verdict !== 'late') {
      game.audio.play('se_milestone', 0.45);
      game.fx.popup('2 / ' + NEEDED, W / 2, WATER_Y - 300, { color: GOLD, size: 60 });
    }
    endHeat();
  }

  function endHeat() {
    r.phase = 'result';
    r.pause = 0.9;
    r.heat++;
    if (r.good >= NEEDED) { r.finished = true; r.ok = true; finish(); }
    else if (r.fouls >= FOULS) { r.finished = true; r.ok = false; finish(); }
    else if (r.heat >= HEATS) { r.finished = true; r.ok = false; finish(); }
  }

  function finish() {
    if (r.done) return;
    r.done = true; r.endWait = 1.6;
    if (state !== S.PLAYING) return;
    game.audio.stopBgm();
    game.audio.play(r.ok ? 'se_success' : 'se_failure', 0.55);
  }

  function tick(dt) {
    if (r.hitStop > 0) { r.hitStop -= dt; return; }
    r.clock += dt;
    if (r.leap > 0) r.leap = Math.min(1, r.leap + dt * 2.2);
    if (r.phase === 'fall') {
      r.fallT += dt;
      if (r.fly && !r.fly.fired && r.fallT / r.fallDur > r.fly.at) {
        r.fly.fired = true; r.flyT = 0.6;
        game.audio.tone('B5', 0.15, { wave: 'sawtooth', volume: 0.03, slide: 300 });
      }
      if (r.gust && !r.gustDone && r.fallT / r.fallDur > 0.35) {
        r.gustDone = true;
        game.audio.tone('C4', 0.3, { wave: 'triangle', volume: 0.04, slide: 200 });
      }
      if (leafProgress(r.fallT) >= 1 || r.fallT >= r.fallDur) {
        r.phase = 'touch'; r.touchAt = r.clock;
        game.audio.play('se_tap', 0.5);
        game.fx.burst(r.leafX, WATER_Y, { color: PALE, count: 10, speed: 160 });
      }
    } else if (r.phase === 'touch') {
      if ((r.clock - r.touchAt) * 1000 > LATE_MS && !r.finished) {
        // 置いていかれた
        r.verdict = 'late'; r.lastMs = LATE_MS; r.errs.push(LATE_MS); r.hl = true; r.hitStop = 0.35;
        game.feedback.bad(W / 2, FROG_Y - 160, { text: 'MISS' });
        endHeat();
      }
    } else if (r.phase === 'result') {
      r.pause -= dt;
      if (r.pause <= 0 && !r.finished) newHeat();
    }
    if (r.flyT > 0) r.flyT -= dt;
  }

  // ── 描画 ─────────────────────────────────────────
  function drawPond() {
    var t = game.time.elapsed;
    game.draw.gradient(0, WATER_Y, [[0, '#2a1a2e'], [0.5, '#5a3a3a'], [1, '#c26a3a']]);
    game.draw.gradient(WATER_Y, H, [[0, TEAL], [0.3, MID], [1, DEEP]]);
    game.draw.rect(0, 0, W, H, GOLD, 0.02 + 0.02 * Math.sin(t * 1.2));
    // 遠景の葦(擬似奥行き)
    for (var i = 0; i < 16; i++) {
      var rx = i * 72 + 10, sway = Math.sin(t * 1.3 + i) * 6;
      game.draw.line(rx, WATER_Y, rx + sway, WATER_Y - 120 - (i * 37) % 90, '#1c2c24', 6);
    }
    // 金属質の水面ハイライト
    for (var k = 0; k < 7; k++) {
      var wy = WATER_Y + 30 + k * k * 18;
      var wx = ((t * 40 + k * 190) % (W + 300)) - 150;
      game.draw.rect(wx, wy, 180 + k * 20, 4, PALE, 0.18);
    }
    // 審判カエル(左上の杭)
    game.draw.rect(130, WATER_Y - 260, 40, 260, '#3a2a1a');
    game.draw.sprite(JUDGE, { g: GREEN, w: PALE, k: DEEP, y: GOLD }, 150, WATER_Y - 300 + Math.sin(t * 2) * 4, 12, { anchor: 'center' });
    // 粒状ノイズ
    for (var n = 0; n < 50; n++) game.draw.rect(Math.random() * W, Math.random() * H, 3, 3, '#ffffff', 0.06);
  }

  function drawSignal() {
    var t = game.time.elapsed;
    var p = r.phase === 'fall' ? leafProgress(r.fallT) : 1;
    var top = WATER_Y - 700;
    var sway = r.phase === 'fall' ? Math.sin(r.fallT * 7) * 60 * (1 - p) : 0;
    r.leafX = LEAF_X + sway;
    var ly = top + (WATER_Y - 20 - top) * p;
    // 着水点の波紋の輪(縮みきった時が合図)
    if (r.phase === 'fall') {
      var rad = 30 + (1 - p) * 220;
      game.draw.circle(LEAF_X, WATER_Y + 10, rad + 6, p > 0.85 ? GOLD : PALE, 0.35);
      game.draw.circle(LEAF_X, WATER_Y + 10, rad, TEAL);
      game.draw.circle(LEAF_X, WATER_Y + 10, 26, GOLD, 0.8);
    } else {
      var ag = (r.clock - r.touchAt);
      for (var i = 0; i < 3; i++) game.draw.circle(LEAF_X, WATER_Y + 10, 40 + ag * 300 + i * 40, PALE, Math.max(0, 0.4 - ag * 0.5));
    }
    var big = r.hl && r.hitStop > 0;
    game.draw.sprite(MAPLE, { r: big ? '#ffffff' : LEAF, b: '#6a2a10' }, r.leafX, ly, big ? 16 : 12, { anchor: 'center' });
    // トンボ(フェイント)
    if (r.flyT > 0) {
      var fx = W * (1 - r.flyT / 0.6) * 1.2 - 60;
      game.draw.line(fx - 40, WATER_Y - 30, fx + 40, WATER_Y - 30, '#6ad0ff', 6);
      game.draw.line(fx, WATER_Y - 50, fx, WATER_Y - 10, '#9fe8ff', 4);
    }
  }

  function drawFrogs() {
    var t = game.time.elapsed;
    // 横の蓮の葉の他選手(演出のみ)
    for (var i = 0; i < 2; i++) {
      var sx = i === 0 ? W * 0.18 : W * 0.82;
      game.draw.circle(sx, FROG_Y + 60, 90, '#2f6a4a', 0.6);
      var jump = r.phase !== 'fall' ? Math.min(1, (r.clock - r.touchAt) * 2.5 + i * 0.1) : 0;
      game.draw.sprite(jump > 0 ? FROG_LEAP : FROG_SIT, FROG_PAL, sx, FROG_Y + 20 - Math.sin(Math.min(1, jump) * Math.PI) * 120 + Math.sin(t * 2 + i) * 3, 9, { anchor: 'center', alpha: 0.4 });
    }
    // 自分の蓮の葉とカエル
    game.draw.circle(W / 2, FROG_Y + 70, 150, '#3a8a5a');
    game.draw.circle(W / 2 + 30, FROG_Y + 60, 120, '#46a06a');
    var lp = r.leap;
    var art = lp > 0 ? FROG_LEAP : FROG_SIT;
    var fy = FROG_Y - Math.sin(lp * Math.PI) * 260 + Math.cos(t * 3) * 4;
    var fx = W / 2 + Math.sin(t * 1.7) * 5 + lp * 140;
    var sc = r.verdict === 'foul' && r.hitStop > 0 ? 20 : 15;
    game.draw.sprite(art, FROG_PAL, fx, fy, sc, { anchor: 'center' });
    if (r.verdict === 'foul' && r.phase === 'result') game.draw.circle(W / 2 + 60, FROG_Y + 40, 80 * (1 - r.pause), PALE, 0.4);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 225, '#000000', 0.55);
    say(r.good + ' / ' + NEEDED, 190, 80, 60, GOLD);
    for (var h = 0; h < HEATS; h++) {
      game.draw.circle(420 + h * 70, 80, 22, h < r.heat ? GREEN : '#2a3a3a');
    }
    for (var f = 0; f < FOULS; f++) game.draw.rect(W - 170 + f * 70, 58, 44, 44, f < r.fouls ? RED : '#3a2a2a');
    var frac = Math.max(0, r.timeLeft / TIME_LIMIT);
    var low = r.timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 165, W - 120, 20, '#223');
    game.draw.rect(60, 165, (W - 120) * frac, 20, low ? RED : GREEN);
    if (r.lastMs !== null && r.phase === 'result') say(r.lastMs + 'ms', W / 2, H * 0.86, 64, PALE);
  }

  function avgMs() {
    if (!r.errs.length) return 0;
    var s = 0; for (var i = 0; i < r.errs.length; i++) s += r.errs[i];
    return Math.round(s / r.errs.length);
  }
  function scoreOf() { return r.good * 300 + r.perfect * 200 + Math.max(0, 300 - avgMs()) - r.fouls * 150; }

  function drawResult() {
    game.draw.rect(90, 620, W - 180, 520, '#000000', 0.82);
    game.draw.rect(90, 620, W - 180, 8, r.ok ? GOLD : RED);
    say(r.ok ? 'CLEAR' : 'GAME OVER', W / 2, 720, 92, r.ok ? GOLD : RED);
    say(avgMs() + 'ms', W / 2, 840, 70, PALE);
    say('PERFECT ' + r.perfect, W / 2, 930, 44, GREEN);
    var sc = scoreOf();
    if (r.ok && sc > game.best) say('NEW RECORD', W / 2, 1015, 52, GOLD);
    else if (!r.ok) say('あと' + Math.max(1, NEEDED - r.good) + '回!', W / 2, 1015, 52, GOLD);
    say('BEST ' + Math.max(game.best, r.ok ? sc : 0), W / 2, 1090, 36, PALE);
  }

  function drawScene() {
    drawPond();
    drawSignal();
    drawFrogs();
  }

  // ── ATTRACT: AI が同じ tapStart を使う(1回目は着水ぴったり、2回目は落ちる途中で押してフライング)──
  var demo = { t: 0, gx: W / 2, gy: H * 0.82, press: 0, plan: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6;
    if (cyc < dt || demo.t <= dt) { initGame(); r.ready = 0; r.fly = null; r.gust = false; demo.plan = 0; }
    if (demo.press > 0) demo.press -= dt;
    if (r.phase === 'touch' && r.heat === 0 && r.clock - r.touchAt >= 0.03) { tapStart(); demo.press = 0.25; }
    if (r.phase === 'fall' && r.heat === 1 && r.fallT / r.fallDur > 0.55) { tapStart(); demo.press = 0.25; }
    tick(dt);
    r.timeLeft = Math.max(0, TIME_LIMIT - r.clock);
    if (r.done) { r.done = false; }
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING; initGame(); theme();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (r.ready > 0 || r.done || r.phase === 'result') { game.audio.play('se_tap', 0.1); return; }
    tapStart();
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (!r) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 13 });
      game.draw.rect(0, 0, W, 225, '#000000', 0.55);
      say(GAME_TITLE, W / 2, H * 0.045, 82, LEAF);
      say('HI-SCORE ' + game.best, W / 2, 170, 34, PALE);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) say('► 100円 投入 ◄', W / 2, H * 0.93, 48, GOLD);
      else say('INSERT COIN', W / 2, H * 0.93, 42, PALE);
      return;
    }
    if (state === S.RESULT) {
      drawScene(); drawHud(); drawResult();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) say('TAP TO CONTINUE', W / 2, H * 0.95, 38, PALE);
      return;
    }

    if (r.done) {
      r.endWait -= dt;
      if (r.hitStop > 0) r.hitStop -= dt;
      if (r.leap > 0) r.leap = Math.min(1, r.leap + dt * 2.2);
      if (r.endWait <= 0) {
        state = S.RESULT;
        var stats = { good: r.good, perfect: r.perfect, fouls: r.fouls, avgMs: avgMs() };
        if (r.ok) game.end.success(scoreOf(), stats);
        else game.end.failure(stats);
      }
    } else if (r.ready > 0) {
      r.ready -= dt;
      if (r.ready <= 0) game.audio.play('se_tap', 0.4);
    } else {
      if (r.hitStop <= 0) r.timeLeft -= dt;
      if (r.timeLeft <= 0 && !r.finished) {
        r.timeLeft = 0; r.finished = true; r.ok = false; r.hitStop = 0.4;
        game.feedback.bad(W / 2, FROG_Y - 160, { text: 'TIME UP' });
        finish();
      } else {
        tick(dt);
      }
    }

    drawScene();
    drawHud();
    if (r.ready > 0) say(r.ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 110, GOLD);
    if (r.done) drawResult();
  });

  function theme() {
    game.audio.melody(
      [['A3', 1], ['E4', 1], ['D4', 0.5], ['C4', 0.5], ['B3', 1], ['A3', 1], ['G3', 0.5], ['A3', 0.5], ['C4', 1], ['B3', 2]],
      { tempo: 100, wave: 'triangle', volume: 0.06, loop: true, bass: [['A1', 4], ['E2', 4]] }
    );
  }

  game.onStart(function () {
    theme();
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);
