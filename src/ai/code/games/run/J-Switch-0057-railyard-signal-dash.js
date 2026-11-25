// J-Switch-0057-railyard-signal-dash.js
// 操車場の障害走 — 迫る障害の形を見て「跳ぶ/くぐる/待つ」の3つから即座に選び、構内を駆け抜けて信号小屋へ
// 操作: 下の3つのボタン。左=跳ぶ(低い車止め)、中=くぐる(頭の高さの腕木)、右=待つ(ランプが点滅して横切る貨車)。障害が近づいた範囲で押す(社内メモ。画面には出さない)
// 終わり: 9つの障害を越えて信号小屋に着けばCLEAR。3回つまずく/時間切れでGAME OVER
// @mechanic: judge
// @theme: railyard_obstacle_dash
// 世界観: 夜明け前の貨物操車場で、見習い信号手のイタチが、始発の貨物列車が出る前に構内の車止め・腕木・横切る貨車をかわして駆け抜け、いちばん端の信号小屋へ出発の旗を届ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 越えた障害数・PERFECT数・到着タイム
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 黄緑寄り4階調、画面枠、動く物に残像
  var STYLE = { bg: ['#9bbc0f', '#8bac0f', '#306230'], main: ['#0f380f', '#306230', '#8bac0f'], accent: ['#9bbc0f', '#0f380f'] };
  var C = { c0: '#0f380f', c1: '#306230', c2: '#8bac0f', c3: '#9bbc0f', frame: '#3a3a2a', frameD: '#1a1a12', lamp: '#c8e04a' };

  var GAME_TITLE = 'YARD DASH';
  var TIME_LIMIT = 15;
  var COURSE = 9;
  var LIVES = 3;
  var RX = W * 0.26;
  var GROUND = H * 0.6;
  var WIN_NEAR = 60, WIN_FAR = 470;
  var ZONE_Y = H * 0.76;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var courseLen, phase, ready, timeLeft, obs, spd, act, cleared, perfects, lives, hitStop, outro, ok, focus, trail, hutX, combo, milestone, runT, pressZone, pressT;

  // ── sprites ───────────────────────────────────────────────────────
  var RUN = [
    ['...aa...', '..aaaa.f', '..akaa.f', '.aaaaaaf', 'aa.aa...', '..aaa...', '.a...a..', 'a.....a.'],
    ['...aa...', '..aaaa.f', '..akaa.f', '.aaaaaaf', '..aaa.a.', '..aaa...', '..a.a...', '..a.a...']
  ];
  var JUMP = ['...aa..f', '..aaaa.f', '..akaaff', '.aaaaa..', 'a.aaa.a.', '..a.a...', '.a...a..', '........'];
  var SLIDE = ['........', '........', '........', '........', '...aa..f', 'aaaaakaf', 'aaaaaaaf', '.a.a.a..'];
  var STAND = ['...aa...', '..aaaa..', '..akaa..', '..aaaa..', '.aaaaaa.', '..aaaaf.', '..a..af.', '..a..a..'];
  var STOPPER = ['x.x.x.x.', 'xxxxxxxx', 'x......x', 'xxxxxxxx', 'x......x'];
  var WAGON = ['..llll....', 'xxxxxxxxxx', 'x.xx.xx.xx', 'xxxxxxxxxx', 'x.xx.xx.xx', 'xxxxxxxxxx', '.oo....oo.'];
  var HUT = ['...xx...', '..xxxx..', '.xxxxxx.', 'xxxxxxxx', 'x.xx.xxx', 'x.xx.xxx', 'xxxxxxxx', 'xxx..xxx'];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 3, { size: sz, color: C.c3, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  var KINDS = ['jump', 'slide', 'wait'];
  function buildCourse(n, demo) {
    var list = [], x = W + 200, prev = -1, waits = 0;
    for (var i = 0; i < n; i++) {
      var k;
      do { k = KINDS[Math.floor(Math.random() * 3)]; } while ((i > 0 && k === KINDS[prev] && Math.random() < 0.6) || (k === 'wait' && waits >= 3));
      if (k === 'wait') waits++;
      prev = KINDS.indexOf(k);
      list.push({ x: x, kind: k, cmd: null, done: false, cross: 0, gone: false });
      var gap = demo ? 620 : Math.max(500, 820 - i * 40);
      if (!demo && i >= 5 && i % 2 === 1) gap = 470;
      x += gap;
    }
    return { list: list, end: x + 200 };
  }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT;
    var c = buildCourse(COURSE, false); obs = c.list; hutX = c.end; courseLen = hutX - RX;
    spd = 700; act = { kind: 'run', t: 0, dur: 0 }; cleared = 0; perfects = 0; lives = LIVES;
    hitStop = 0; outro = 0; ok = false; focus = null; trail = []; combo = 0; milestone = false; runT = 0; pressZone = -1; pressT = 0;
  }

  function nextOpen() {
    for (var i = 0; i < obs.length; i++) if (!obs[i].done && !obs[i].cmd) return obs[i];
    return null;
  }

  function runnerY() {
    if (act.kind === 'jump') return GROUND - Math.sin(Math.PI * Math.min(1, act.t / act.dur)) * 300;
    return GROUND;
  }

  // 選択(実プレイ・デモ共用)
  function choose(kind, isDemo) {
    var o = nextOpen();
    var d = o ? o.x - RX : 9999;
    if (!o || d > WIN_FAR || d < WIN_NEAR - 40) {
      // 何もない所での動作(空振り)
      startAct(kind, 0.5);
      if (!isDemo) { game.audio.tone('F3', 0.05, { wave: 'square', volume: 0.04 }); game.fx.burst(RX, GROUND - 60, { color: C.c1, count: 4, speed: 100 }); }
      return;
    }
    if (o.kind !== kind) { crash(o, isDemo); return; }
    o.cmd = kind;
    var tContact = Math.max(0.1, d / spd);
    if (kind === 'wait') startAct('wait', 0.75);
    else startAct(kind, Math.max(0.55, tContact + 0.3));
    if (isDemo) { game.fx.burst(o.x, GROUND - 80, { color: C.c3, count: 6, speed: 160 }); return; }
    var perf = d < 260;
    combo++; if (perf) perfects++;
    game.feedback.good(RX + 60, GROUND - 330, { text: perf ? 'PERFECT' : 'GOOD', color: C.c0, count: perf ? 12 : 8 });
    if (kind === 'jump') game.audio.play('se_jump', 0.35);
    if (combo >= 3 && combo % 3 === 0) game.fx.popup('x' + combo, RX + 160, GROUND - 420, { color: C.c1, size: 52 });
  }

  function startAct(kind, dur) { act = { kind: kind, t: 0, dur: dur }; }

  function crash(o, isDemo) {
    o.done = true; o.crashed = true; combo = 0;
    startAct('stand', 0.45);
    if (isDemo) { game.fx.burst(RX + 40, GROUND - 80, { color: C.c0, count: 10, speed: 220 }); return; }
    lives--;
    focus = { o: o, t: 0.45 };
    hitStop = 0.4;
    game.feedback.bad(RX + 60, GROUND - 330, { text: 'MISS', color: C.c0, shake: true });
    if (lives <= 0) finish(false);
  }

  function clearOne(o, isDemo) {
    o.done = true;
    if (isDemo) return;
    cleared++;
    game.audio.play('se_coin', 0.3);
    if (!milestone && cleared >= Math.ceil(COURSE / 2)) {
      milestone = true;
      game.audio.play('se_milestone', 0.5);
      game.fx.popup(cleared + ' / ' + COURSE, W / 2, H * 0.3, { color: C.c0, size: 70 });
    }
  }

  function stepRun(dt, isDemo) {
    act.t += dt;
    if (act.kind !== 'run' && act.t >= act.dur) act = { kind: 'run', t: 0, dur: 0 };
    var moving = act.kind !== 'wait' && act.kind !== 'stand';
    var v = moving ? spd : 0;
    if (!isDemo) spd = Math.min(900, spd + dt * 18);
    runT += dt * (moving ? 1 : 0);
    for (var i = 0; i < obs.length; i++) {
      var o = obs[i];
      o.x -= v * dt;
      if (o.kind === 'wait' && !o.done) {
        if (o.cmd === 'wait' && act.kind === 'wait') { o.cross += dt * 2.6; if (o.cross >= 1) { clearOne(o, isDemo); act = { kind: 'run', t: 0, dur: 0 }; } }
      }
      if (!o.done && o.x - RX < 40) {
        if (o.cmd && o.kind !== 'wait') { clearOne(o, isDemo); }
        else if (o.cmd === 'wait') { o.cross = 1; clearOne(o, isDemo); }
        else crash(o, isDemo);
        if (!isDemo && phase !== 'play') return;
      }
    }
    hutX -= v * dt;
    trail.push({ y: runnerY(), k: act.kind });
    if (trail.length > 4) trail.shift();
    if (!isDemo && hutX - RX < 60) finish(true);
  }

  function finish(win) {
    if (phase === 'stop' || phase === 'outro') return;
    ok = win; phase = 'stop'; hitStop = 0.55;
    game.audio.stopBgm();
    if (win) {
      game.fx.flash(C.c3, 0.25);
      game.fx.burst(RX + 80, GROUND - 200, { color: C.c0, count: 30, speed: 420 });
      game.audio.play('se_success', 0.6);
    } else {
      game.feedback.bad(RX + 60, GROUND - 400, { text: timeLeft <= 0 ? 'TIME UP' : 'GAME OVER', color: C.c0 });
      game.audio.play('se_failure', 0.6);
    }
  }

  // ── input ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    if (phase !== 'play' || hitStop > 0 || y < ZONE_Y) { game.audio.tone('C3', 0.03, { wave: 'square', volume: 0.03 }); game.fx.burst(x, y, { color: C.c1, count: 3, speed: 80 }); return; }
    var z = x < W / 3 ? 0 : (x < W * 2 / 3 ? 1 : 2);
    pressZone = z; pressT = 0.15;
    game.audio.play('se_tap', 0.25);
    choose(KINDS[z], false);
  });

  // ── demo(障害の形を見てボタンを押す。1周に1回だけ選び間違える)──
  var demo = { t: 0, gx: W / 2, gy: H * 0.86, press: 0, wrong: false };
  var DEMO_CYC = 8;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) { var c = buildCourse(6, true); obs = c.list; hutX = c.end + 4000; act = { kind: 'run', t: 0, dur: 0 }; demo.wrong = false; spd = 640; }
    stepRun(dt, true);
    var o = nextOpen();
    if (o && act.kind === 'run' && o.x - RX < 330) {
      var k = KINDS.indexOf(o.kind);
      if (!demo.wrong && cyc > 3.5) { demo.wrong = true; k = (k + 1) % 3; }
      demo.gx = W / 6 + k * W / 3; demo.press = 0.2;
      choose(KINDS[k], true);
    }
    if (demo.press > 0) demo.press -= dt;
    else if (o) { var kk = KINDS.indexOf(o.kind); demo.gx += (W / 6 + kk * W / 3 - demo.gx) * Math.min(1, dt * 4); }
    demo.gy = H * 0.87 - (demo.press > 0 ? 16 : 0);
    pressZone = demo.press > 0 ? Math.floor(demo.gx / (W / 3)) : -1;
  }

  // ── drawing ───────────────────────────────────────────────────────
  function drawYard() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.c2], [0.5, C.c3], [0.62, C.c2], [1, C.c1]]);
    // 遠景の給水塔と信号柱(パララックス)
    var par = (runT * 60) % 400;
    for (var i = 0; i < 4; i++) {
      var px = i * 400 - par;
      game.draw.rect(px + 100, H * 0.3, 20, H * 0.26, C.c1, 0.6);
      game.draw.rect(px + 70, H * 0.3, 80, 50, C.c1, 0.6);
      game.draw.circle(px + 110, H * 0.3 + 25, 12, C.c3, 0.4 + 0.3 * Math.sin(t * 3 + i));
    }
    // 線路(枕木がスクロール)
    game.draw.rect(0, GROUND + 60, W, 20, C.c0);
    var sl = (runT * 640) % 120;
    for (var s = 0; s < 11; s++) game.draw.rect(s * 120 - sl, GROUND + 80, 60, 24, C.c1);
    game.draw.rect(0, GROUND + 110, W, H * 0.08, C.c1, 0.6);
    game.draw.rect(0, 0, W, H, C.c3, 0.02 + 0.02 * Math.sin(t * 1.3));
  }

  function drawObstacles() {
    var t = game.time.elapsed;
    for (var i = 0; i < obs.length; i++) {
      var o = obs[i];
      if (o.x < -300 || o.x > W + 300) continue;
      if (o.done && !o.crashed && o.kind === 'wait') continue;
      var hl = focus && focus.o === o && focus.t > 0 && Math.floor(t * 14) % 2 === 0;
      var col = hl ? C.c3 : C.c0;
      var near = !o.done && o.x - RX < WIN_FAR && o.x - RX > WIN_NEAR;
      if (near) game.draw.rect(o.x - 90, GROUND - 440, 180, 520, C.c3, 0.35);
      if (o.kind === 'jump') {
        game.draw.sprite(STOPPER, { x: col }, o.x, GROUND + 25, 16, { anchor: 'center' });
      } else if (o.kind === 'slide') {
        game.draw.rect(o.x - 8, GROUND - 420, 16, 480, C.c1);
        game.draw.rect(o.x - 110, GROUND - 170, 220, 34, col);
        for (var s = 0; s < 4; s++) game.draw.rect(o.x - 100 + s * 56, GROUND - 170, 26, 34, C.c2, 0.8);
      } else {
        var lift = o.cross * 260;
        var lampOn = Math.floor(t * 6) % 2 === 0;
        game.draw.sprite(WAGON, { x: col, l: lampOn ? C.lamp : C.c1, o: C.c1 }, o.x, GROUND - 60 + lift, 18 * (1 - o.cross * 0.4), { anchor: 'center', alpha: 1 - o.cross * 0.7 });
        if (!o.done && lampOn) game.draw.circle(o.x, GROUND - 190 + lift, 30, C.lamp, 0.6);
        if (!o.done && o.x < W + 60 && o.x > RX && Math.floor(t * 6) % 2 === 0 && state === S.PLAYING && o.bell !== Math.floor(t * 3)) { o.bell = Math.floor(t * 3); game.audio.tone('A5', 0.05, { wave: 'square', volume: 0.02 }); }
      }
    }
    // 信号小屋(ゴール)
    if (hutX < W + 300) game.draw.sprite(HUT, { x: C.c0 }, hutX, GROUND - 40, 26, { anchor: 'center' });
  }

  function drawRunner() {
    var t = game.time.elapsed;
    var pal = { a: C.c0, k: C.c3, f: C.c1 };
    for (var i = 0; i < trail.length - 1; i++) game.draw.sprite(RUN[0], pal, RX - (trail.length - i) * 22, trail[i].y - 60, 13, { anchor: 'center', alpha: 0.12 * (i + 1) });
    var sp = act.kind === 'jump' ? JUMP : (act.kind === 'slide' ? SLIDE : (act.kind === 'run' ? RUN[Math.floor(runT * 10) % 2] : STAND));
    var y = runnerY() - 60 + (act.kind === 'run' ? Math.sin(runT * 20) * 4 : Math.sin(t * 2) * 3);
    game.draw.sprite(sp, pal, RX, y, 13, { anchor: 'center' });
  }

  function drawButtons() {
    var t = game.time.elapsed;
    game.draw.rect(0, ZONE_Y, W, H - ZONE_Y, C.frameD);
    for (var z = 0; z < 3; z++) {
      var cx = W / 6 + z * W / 3, cy = H * 0.87;
      var on = pressZone === z && (pressT > 0 || state === S.ATTRACT);
      game.draw.circle(cx, cy + 8, 120, C.frame);
      game.draw.circle(cx, cy + (on ? 8 : 0), 112, on ? C.c3 : C.c2);
      var ic = C.c0, b = Math.sin(t * 3 + z) * 4;
      if (z === 0) { game.draw.line(cx - 50, cy + 20 + b, cx, cy - 40 + b, ic, 16); game.draw.line(cx, cy - 40 + b, cx + 50, cy + 20 + b, ic, 16); game.draw.sprite(STOPPER, { x: ic }, cx, cy + 60, 6, { anchor: 'center' }); }
      else if (z === 1) { game.draw.line(cx - 50, cy - 30 + b, cx, cy + 30 + b, ic, 16); game.draw.line(cx, cy + 30 + b, cx + 50, cy - 30 + b, ic, 16); game.draw.rect(cx - 60, cy - 70, 120, 14, ic); }
      else { game.draw.rect(cx - 12, cy - 50 + b, 24, 60, ic); game.draw.rect(cx - 50, cy - 20 + b, 100, 24, ic); game.draw.circle(cx, cy + 50, 14, C.lamp); }
    }
  }

  function drawFrame() {
    game.draw.rect(0, 228, 24, ZONE_Y - 228, C.frame);
    game.draw.rect(W - 24, 228, 24, ZONE_Y - 228, C.frame);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 228, C.frame);
    game.draw.rect(20, 20, W - 40, 188, C.c1);
    txt(String(Math.ceil(Math.max(0, timeLeft))), 60, 100, 56, C.c3, 'left');
    txt(cleared + ' / ' + COURSE, W / 2, 100, 64, C.c3);
    for (var i = 0; i < LIVES; i++) game.draw.circle(W - 200 + i * 60, 90, 18, i < lives ? C.c3 : C.c0);
    game.draw.rect(60, 165, W - 120, 20, C.c0);
    var remain = Math.max(0, Math.min(1, 1 - (hutX - RX) / courseLen));
    game.draw.rect(60, 165, (W - 120) * remain, 20, C.c3);
  }

  function score() { return cleared * 100 + perfects * 60 + lives * 100 + Math.round(Math.max(0, timeLeft) * 40); }

  // ── main loop ─────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (pressT > 0) pressT -= dt;
    if (focus && focus.t > 0 && phase !== 'stop') focus.t -= dt;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      drawYard(); drawObstacles(); drawRunner(); drawFrame(); drawButtons();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 13 });
      game.draw.rect(0, 0, W, 228, C.frame);
      txt(GAME_TITLE, W / 2 + Math.sin(t * 1.4) * 8, 100 + Math.sin(t * 2) * 6, 84, C.c3);
      txt('HI-SCORE ' + game.best, W / 2, 190, 36, C.c2);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.985, 40, C.c3);
      else txt('INSERT COIN', W / 2, H * 0.985, 34, C.c2);
      return;
    }

    if (state === S.RESULT) {
      drawYard(); drawObstacles(); drawRunner(); drawFrame();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 96, C.c0);
      txt('SCORE ' + (ok ? score() : 0), W / 2, H * 0.36, 48, C.c0);
      txt('BEST ' + game.best, W / 2, H * 0.4, 36, C.c1);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.985, 38, C.c0);
      return;
    }

    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'play'; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'play') {
      if (hitStop > 0) hitStop -= dt;
      else {
        timeLeft -= dt;
        stepRun(dt, false);
        if (phase === 'play' && timeLeft <= 0) { timeLeft = 0; finish(false); }
      }
    } else if (phase === 'stop') {
      hitStop -= dt;
      if (focus) focus.t = 0.3;
      if (hitStop <= 0) { phase = 'outro'; outro = 1.4; }
    } else if (phase === 'outro') {
      outro -= dt;
      if (outro <= 0) {
        state = S.RESULT;
        var stats = { cleared: cleared, perfect: perfects, stumbles: LIVES - lives, time: Math.round((TIME_LIMIT - timeLeft) * 10) / 10 };
        if (ok) game.end.success(score(), stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawYard(); drawObstacles(); drawRunner(); drawFrame(); drawButtons(); drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 100, C.c0);
    if (phase === 'outro') {
      game.draw.rect(0, H * 0.25, W, H * 0.17, C.c2, 0.9);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 96, C.c0);
      txt('SCORE ' + (ok ? score() : 0), W / 2, H * 0.35, 44, C.c0);
      if (ok && score() > game.best) txt('NEW RECORD', W / 2, H * 0.395, 42, C.c0);
      else if (!ok) txt('あと' + Math.max(1, COURSE - cleared) + '個!', W / 2, H * 0.395, 44, C.c0);
      else txt('BEST ' + game.best, W / 2, H * 0.395, 36, C.c1);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['E5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['D5', 1],
      ['C5', 0.5], ['C5', 0.5], ['E5', 0.5], ['C5', 0.5], ['B4', 0.5], ['A4', 0.5], ['B4', 1]
    ], { tempo: 168, wave: 'square', volume: 0.045, loop: true, bass: [['C3', 1], ['G2', 1], ['A2', 1], ['E2', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
