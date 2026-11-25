// J-GC4-0039-mist-ford-stepstones.js
// 霧渡しの飛び石 — 分かれ道に並ぶ飛び石のうち、ひびも砂こぼれも震えもない無傷の一つを見抜いて跳ぶ
// 操作: 前方に並ぶ飛び石のうち無傷のものをタップして跳び移る。立っている石も時間がたつと崩れ始める
// 終わり: 規定の段数を渡り切って向こう岸に着けばCLEAR。崩れかけの石を選ぶ/足元が崩れる/時間切れでGAME OVER
// @mechanic: spot
// @theme: mist_gorge_stepping_stones
// 世界観: 霧の渓谷に渡し守がいなくなった朝、巻物を背負った飛脚が、崩れかけた古い飛び石の中から無傷の一つだけを見抜き、足元が崩れる前に向こう岸まで跳び渡る
// 残るもの: 正誤(CLEAR/GAME OVER) + 渡った段数・残り時間
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 白黒2値。階調はディザ点で作り、線の太さで語る
  var STYLE = { bg: ['#f4f1e8', '#e9e5d9', '#ffffff'], main: ['#111111', '#555555', '#bbbbbb'], accent: ['#111111', '#f4f1e8'] };
  var C = { paper: '#f4f1e8', paper2: '#e6e1d3', ink: '#111111', gray: '#8a8578', white: '#ffffff', bad: '#111111', mist: '#ffffff' };

  var GAME_TITLE = 'MIST FORD';
  var TIME_LIMIT = 13;
  var NEEDED = 7;
  var CUR_Y = H * 0.74, FORK_Y = H * 0.44;
  var STEP_DY = CUR_Y - FORK_Y;
  var SRX = 112, SRY = 54;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var phase, ready, timeLeft, steps, cur, fork, hop, scrollK, crumble, crumbleMax, warned, hitStop, outro, ok, focus, halfShown, fallY;

  // ── sprites ───────────────────────────────────────────────────────
  var COURIER = [
    ['...kk...', '..kkkk..', '..k..k..', '...kk...', '.kkkkkkk', 'k.kkkk.s', '..k..k.s', '.k....k.'],
    ['...kk...', '..kkkk..', '..k..k..', '...kk...', '.kkkkkkk', 'k.kkkk.s', '..k..k.s', '..k..k..']
  ];
  var COURIER_JUMP = ['...kk...', '..kkkk..', '..k..k..', 'k..kk..k', '.kkkkkk.', '..kkkk.s', '.k....ks', 'k......k'];
  var PINE = ['...k...', '..kkk..', '.kkkkk.', '..kkk..', '.kkkkk.', 'kkkkkkk', '...k...', '...k...'];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 3, { size: sz, color: col === C.ink ? C.white : C.ink, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  // 崩れかけの印を作る。難しくなるほど印が一種類に減り、細くなる
  function makeStone(x, bad, level) {
    var st = { x: x, y: FORK_Y, bad: bad, lines: [], dust: false, tremble: false, seed: game.random(0, 100), broken: false };
    if (!bad) return st;
    var kinds = level < 2 ? ['lines', 'dust', 'tremble'] : [['lines', 'dust', 'tremble'][Math.floor(game.random(0, 3)) % 3]];
    if (level >= 2 && level < 4 && Math.random() < 0.5) kinds.push('lines');
    for (var i = 0; i < kinds.length; i++) {
      if (kinds[i] === 'dust') st.dust = true;
      if (kinds[i] === 'tremble') st.tremble = true;
      if (kinds[i] === 'lines') {
        var n = level < 2 ? 3 : 1;
        for (var k = 0; k < n; k++) {
          var pts = [], px = game.random(-SRX * 0.6, SRX * 0.4), py = game.random(-SRY * 0.5, SRY * 0.2);
          pts.push([px, py]);
          for (var s = 0; s < 3; s++) { px += game.random(12, 30); py += game.random(-14, 14); pts.push([px, py]); }
          st.lines.push({ pts: pts, w: level < 2 ? 6 : 4 });
        }
      }
    }
    return st;
  }

  function makeFork() {
    var level = steps;
    var n = steps >= 3 ? 4 : 3;
    var good = Math.floor(game.random(0, n)) % n;
    var list = [];
    var span = n === 3 ? 300 : 240;
    for (var i = 0; i < n; i++) list.push(makeStone(W / 2 + (i - (n - 1) / 2) * span, i !== good, level));
    return list;
  }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT; steps = 0;
    cur = { x: W / 2, y: CUR_Y, bad: false, lines: [], dust: false, tremble: false, seed: 1, broken: false };
    fork = makeFork(); hop = null; scrollK = 0; crumbleMax = 2.6; crumble = crumbleMax; warned = false;
    hitStop = 0; outro = 0; ok = false; focus = null; halfShown = false; fallY = 0;
  }

  // 石を選んで跳ぶ(実プレイ・デモ共用)
  function choose(st, isDemo) {
    if (hop || !st) return;
    hop = { from: { x: cur.x, y: cur.y }, to: st, t: 0 };
    game.audio.play('se_jump', isDemo ? 0.2 : 0.45);
  }

  function landHop(isDemo) {
    var st = hop.to;
    hop = null;
    if (st.bad) {
      st.broken = true; focus = st; cur = st;
      game.audio.play('se_break', 0.5);
      if (!isDemo) finish(false);
      else { demo.fall = 0.8; }
      return;
    }
    if (!isDemo) {
      steps++;
      game.feedback.good(st.x, st.y - 150, { text: steps >= NEEDED ? 'CLEAR' : 'GOOD', color: C.ink, count: 8 });
      if (!halfShown && steps >= Math.ceil(NEEDED / 2)) {
        halfShown = true;
        game.audio.play('se_milestone', 0.5);
        game.fx.popup(steps + ' / ' + NEEDED, W / 2, H * 0.2, { color: C.ink, size: 64 });
      }
      if (steps >= NEEDED) { cur = st; finish(true); return; }
    } else {
      game.fx.burst(st.x, st.y, { color: C.gray, count: 6, speed: 160 });
      demo.n++;
    }
    scrollK = 0.001;
    cur = st;
    crumbleMax = Math.max(1.9, 2.6 - steps * 0.1);
    crumble = crumbleMax; warned = false;
  }

  function stepScroll(dt) {
    if (scrollK <= 0) return false;
    scrollK += dt / 0.28;
    if (scrollK >= 1) {
      scrollK = 0;
      cur.y = CUR_Y;
      fork = makeFork();
      return false;
    }
    return true;
  }

  function finish(win) {
    if (phase === 'stop' || phase === 'outro') return;
    ok = win; phase = 'stop'; hitStop = 0.55;
    game.audio.stopBgm();
    if (win) { focus = cur; game.fx.flash('#ffffff', 0.3); game.audio.play('se_success', 0.6); }
    else {
      game.feedback.bad(focus ? focus.x : cur.x, (focus ? focus.y : cur.y) - 120, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS', color: C.ink });
      game.audio.play('se_failure', 0.6);
    }
  }

  function stoneAt(x, y) {
    var best = null, bestD = 1;
    for (var i = 0; i < fork.length; i++) {
      var st = fork[i];
      var dx = (x - st.x) / (SRX * 1.25), dy = (y - st.y) / (SRY * 2.2);
      var d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = st; }
    }
    return best;
  }

  // ── input ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (phase !== 'play' || hop || scrollK > 0) return;
    var st = stoneAt(x, y);
    if (st) { game.audio.play('se_tap', 0.3); choose(st, false); }
    else { game.audio.tone('G2', 0.05, { wave: 'triangle', volume: 0.06 }); game.fx.burst(x, y, { color: C.gray, count: 3, speed: 80 }); }
  });

  // ── demo(実データの印を読んで無傷の石へ。3回目はわざと崩れ石を選ぶ)────
  var demo = { t: 0, gx: W / 2, gy: H * 0.86, press: false, n: 0, next: 0.9, fall: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.8;
    if (cyc < dt || demo.t <= dt) {
      steps = 0; cur = { x: W / 2, y: CUR_Y, bad: false, lines: [], dust: false, tremble: false, seed: 1, broken: false };
      fork = makeFork(); hop = null; scrollK = 0; focus = null; demo.n = 0; demo.next = 0.7; demo.fall = 0; fallY = 0;
    }
    if (demo.fall > 0) { demo.fall -= dt; fallY += 500 * dt; return; }
    demo.press = false;
    if (!hop && scrollK <= 0) {
      var want = null;
      for (var i = 0; i < fork.length; i++) {
        if (demo.n >= 2 ? fork[i].bad : !fork[i].bad) { want = fork[i]; break; }
      }
      if (want) { demo.gx = want.x + 20; demo.gy = want.y + 30; }
      demo.next -= dt;
      if (demo.next <= 0 && want) { demo.press = true; choose(want, true); demo.next = 0.7; }
    }
  }

  // ── drawing ───────────────────────────────────────────────────────
  function dither(x, y, w, h, step, alpha) {
    for (var yy = y; yy < y + h; yy += step) {
      var off = (Math.floor(yy / step) % 2) * (step / 2);
      for (var xx = x + off; xx < x + w; xx += step) game.draw.rect(xx, yy, 3, 3, C.ink, alpha);
    }
  }

  function drawWorld(shift) {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.paper], [1, C.paper2]]);
    // 谷底(ディザで暗さ)
    dither(0, H * 0.3, W, H * 0.5, 22, 0.35);
    // 両岸の崖線と松
    game.draw.line(40, H * 0.22, 40, H, C.ink, 8);
    game.draw.line(W - 40, H * 0.22, W - 40, H, C.ink, 8);
    game.draw.sprite(PINE, { k: C.ink }, 20 + Math.sin(t * 1.1) * 4, H * 0.2, 14, {});
    game.draw.sprite(PINE, { k: C.ink }, W - 120 + Math.sin(t * 1.3) * 4, H * 0.26, 12, {});
    // 流れる霧(白い帯)
    for (var i = 0; i < 5; i++) {
      var mx = ((t * (30 + i * 9) + i * 260) % (W + 400)) - 200;
      game.draw.rect(mx, H * (0.3 + i * 0.1) + Math.sin(t + i) * 10, 360, 26, C.mist, 0.55);
    }
    // 向こう岸(残り段数が少ないほど近づく)
    var near = Math.min(1, steps / NEEDED);
    var shoreY = H * 0.15 + near * H * 0.08 + shift;
    game.draw.rect(0, shoreY, W, 36, C.ink);
    dither(0, shoreY - 60, W, 60, 14, 0.5);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(t * 1.2));
  }

  function drawStone(st, yOff, own) {
    if (!st) return;
    var t = game.time.elapsed;
    var x = st.x, y = st.y + yOff;
    if (st.tremble && !st.broken) x += Math.sin(t * 60 + st.seed) * 4;
    if (own && crumble < crumbleMax * 0.45) x += Math.sin(t * 70) * 5;
    var big = focus === st && (phase === 'stop' || demo.fall > 0) ? 1.3 : 1;
    var rx = SRX * big, ry = SRY * big;
    if (st.broken) {
      for (var b = 0; b < 5; b++) game.draw.rect(x - rx + b * rx * 0.4, y + fallY * (0.5 + b * 0.2) + b * 14, rx * 0.3, ry * 0.5, C.ink);
      return;
    }
    // 輪郭(黒)→ 紙色 → 下半分ディザ
    for (var k = -ry - 6; k <= ry + 6; k += 4) {
      var w = (rx + 6) * Math.sqrt(Math.max(0, 1 - (k / (ry + 6)) * (k / (ry + 6))));
      game.draw.rect(x - w, y + k, w * 2, 4, C.ink);
    }
    for (var j = -ry; j <= ry; j += 4) {
      var w2 = rx * Math.sqrt(Math.max(0, 1 - (j / ry) * (j / ry)));
      game.draw.rect(x - w2, y + j, w2 * 2, 4, j > ry * 0.25 ? C.paper2 : C.white);
    }
    game.draw.rect(x - rx * 0.7, y + ry * 0.45, rx * 1.4, 4, C.ink, 0.5);
    for (var i = 0; i < st.lines.length; i++) {
      var ln = st.lines[i];
      for (var p = 1; p < ln.pts.length; p++) {
        game.draw.line(x + ln.pts[p - 1][0] * big, y + ln.pts[p - 1][1] * big, x + ln.pts[p][0] * big, y + ln.pts[p][1] * big, C.ink, ln.w * big);
      }
    }
    if (st.dust) {
      for (var d = 0; d < 3; d++) {
        var ph = (t * 0.9 + d * 0.33 + st.seed) % 1;
        game.draw.rect(x - 30 + d * 30, y + ry + 6 + ph * 90, 5, 5, C.ink, 1 - ph);
      }
    }
    // 自分の足元の崩れ予告(ひびが増えていく)
    if (own && crumble < crumbleMax * 0.6) {
      var prog = 1 - crumble / (crumbleMax * 0.6);
      game.draw.line(x - rx * 0.6, y - 6, x - rx * 0.6 + rx * 1.2 * prog, y + 8, C.ink, 6);
    }
    if (big > 1 && Math.floor(t * 14) % 2 === 0) game.draw.circle(x, y, rx * 1.1, '#ffffff', 0.45);
  }

  function drawCourier(yOff) {
    var t = game.time.elapsed;
    var x = cur.x, y = cur.y + yOff - 100;
    var fr = COURIER[Math.floor(t * 3) % 2];
    if (hop) {
      var k = Math.min(1, hop.t / 0.32);
      x = hop.from.x + (hop.to.x - hop.from.x) * k;
      y = hop.from.y + (hop.to.y - hop.from.y) * k - 100 - Math.sin(k * Math.PI) * 140;
      fr = COURIER_JUMP;
    }
    y += fallY + Math.sin(t * 3) * 4;
    game.draw.sprite(fr, { k: C.ink, s: C.gray }, x, y, 14, { anchor: 'center' });
  }

  function drawScene() {
    var sh = scrollK > 0 ? STEP_DY * scrollK : 0;
    drawWorld(sh * 0.2);
    for (var i = 0; i < fork.length; i++) if (fork[i] !== cur) drawStone(fork[i], sh, false);
    drawStone(cur, sh, true);
    drawCourier(sh);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 225, C.paper);
    game.draw.rect(0, 222, W, 6, C.ink);
    txt(steps + ' / ' + NEEDED, W / 2, 90, 68, C.ink);
    txt(String(Math.ceil(timeLeft)), 80, 90, 52, C.ink, 'left');
    game.draw.rect(60, 170, W - 120, 22, C.ink);
    game.draw.rect(64, 174, (W - 128) * Math.max(0, timeLeft / TIME_LIMIT), 14, C.paper);
    // 足元の猶予(親指ゾーン)
    var y = H * 0.88;
    game.draw.rect(200, y, W - 400, 30, C.ink);
    game.draw.rect(204, y + 4, (W - 408) * Math.max(0, crumble / crumbleMax), 22, crumble < crumbleMax * 0.4 && Math.floor(game.time.elapsed * 8) % 2 ? C.gray : C.white);
  }

  // ── main loop ─────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      if (hop) { hop.t += dt; if (hop.t >= 0.32) landHop(true); }
      if (scrollK > 0) stepScroll(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press || (hop !== null), scale: 14 });
      game.draw.rect(0, 0, W, 230, C.paper, 0.85);
      txt(GAME_TITLE, W / 2, 90 + Math.sin(t * 2) * 6, 80, C.ink);
      txt('HI-SCORE ' + game.best, W / 2, 180, 36, C.ink);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 44, C.ink);
      else txt('INSERT COIN', W / 2, H * 0.95, 36, C.ink);
      return;
    }

    if (state === S.RESULT) {
      drawWorld(0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.5, 90, C.ink);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 40, C.ink);
      return;
    }

    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'play'; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'play') {
      timeLeft -= dt;
      if (hop) { hop.t += dt; if (hop.t >= 0.32) landHop(false); }
      else if (scrollK > 0) stepScroll(dt);
      else {
        crumble -= dt;
        if (!warned && crumble < 0.7) { warned = true; game.audio.tone('C2', 0.3, { wave: 'sawtooth', volume: 0.08 }); game.fx.shake(6, 0.3); }
        if (crumble <= 0) { cur.broken = true; focus = cur; game.audio.play('se_break', 0.5); finish(false); }
      }
      if (phase === 'play' && timeLeft <= 0) { timeLeft = 0; focus = cur; finish(false); }
    } else if (phase === 'stop') {
      hitStop -= dt;
      if (!ok) fallY += 400 * dt;
      if (hitStop <= 0) { phase = 'outro'; outro = 1.4; }
    } else if (phase === 'outro') {
      outro -= dt;
      if (!ok) fallY += 600 * dt;
      if (outro <= 0) {
        state = S.RESULT;
        var score = steps * 100 + (ok ? Math.round(timeLeft * 20) : 0);
        var stats = { steps: steps, timeLeft: Math.round(timeLeft * 10) / 10 };
        if (ok) game.end.success(score, stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawScene(); drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 96, C.ink);
    if (phase === 'outro') {
      game.draw.rect(0, H * 0.25, W, H * 0.17, C.paper, 0.9);
      game.draw.rect(0, H * 0.25, W, 6, C.ink);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 96, C.ink);
      var sc = steps * 100 + (ok ? Math.round(timeLeft * 20) : 0);
      txt('SCORE ' + sc, W / 2, H * 0.36, 44, C.ink);
      if (ok && sc > game.best) txt('NEW RECORD', W / 2, H * 0.4, 40, C.ink);
      else if (!ok) txt('あと' + Math.max(1, NEEDED - steps) + '段!', W / 2, H * 0.4, 44, C.ink);
      else txt('BEST ' + game.best, W / 2, H * 0.4, 36, C.ink);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['D4', 1], ['F4', 0.5], ['G4', 0.5], ['A4', 1], ['C5', 1],
      ['A4', 0.5], ['G4', 0.5], ['F4', 1], ['D4', 1.5], ['R', 0.5]
    ], { tempo: 96, wave: 'triangle', volume: 0.07, loop: true, bass: [['D2', 4], ['A2', 4]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
