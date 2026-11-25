// I-GBA-0039v3-spring-fava-pod-split.js
// そら豆さや割り — ぶら下がるさやの両端を2本の指で同時につまみ、左右へ引き離してパカッと割り開く
// 操作: さやの両端(白く光る先っぽ)に2本の指を同時に置き、そのまま指の間を広げて引き割る。片方の指が離れると戻る。細く色の薄い若いさやは割らずに残す
// 終わり: 3株(熟したさや2→3→3本)を14秒以内に割り切ればCLEAR。若いさやを2回割る/時間切れでGAME OVER
// @mechanic: pinch_zone
// @theme: spring_riverbank_fava_harvest
// 世界観: 春の土手の豆畑で、豆摘みの子どもが風に揺れるそら豆のさやを両指でつまんで割り開き、ふくらんだ豆だけを籠へ集めていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 割ったさやの数・取れた豆の数・残り秒のスコア
// スタイル: HYPERCASUAL 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 白〜淡色の背景に単色の丸い塊、真下に柔らかい半透明の影。当たり判定は見た目どおり
  var STYLE = { bg: ['#f6f8f2', '#e4eedc'], main: ['#5cbf4a', '#3e9a34', '#a8e090'], accent: ['#ff8a3c', '#ffffff'] };
  var V = {
    bg: STYLE.bg[0], bg2: STYLE.bg[1], pod: STYLE.main[0], podDk: STYLE.main[1], young: '#cfe8b4', youngDk: '#a8c88e',
    bean: STYLE.main[2], hot: STYLE.accent[0], white: STYLE.accent[1], ink: '#2a3a2a', shadow: '#9aa894', ng: '#ff5a4a', basket: '#d8a050',
  };

  var GAME_TITLE = 'FAVA POP';
  var TIME_LIMIT = 14;
  var PLANTS = [
    { ripe: 2, young: 0, tilt: 0.15, sway: 0, slots: [[300, 0.43], [780, 0.55]] },
    { ripe: 3, young: 1, tilt: 0.5, sway: 0, slots: [[290, 0.40], [790, 0.45], [330, 0.60], [780, 0.64]] },
    { ripe: 3, young: 1, tilt: 0.45, sway: 0.22, slots: [[300, 0.41], [790, 0.43], [320, 0.62], [770, 0.63]] },
  ];
  var NEEDED = 8;
  var MISS_MAX = 2;
  var TIP_R = 95;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var plant, pods, grip, popped, beans, misses, combo, maxCombo, lastPop, score;
  var timeLeft, readyT, plantT, stopT, stopObj, fin, cleared, postT, warnT, pinchT, sadT, cheerT, playT, finalScore, basketN;

  // 豆摘みの子ども(麦わら帽子)
  var KID_A = ['..yyyyyy..', '.yyyyyyyy.', 'yyyyyyyyyy', '..ffffff..', '..fkffkf..', '..ffrrff..', '...ffff...', '..bbbbbb..', '.fbbbbbbf.', '..bbbbbb..', '..ff..ff..'];
  var KID_B = ['..yyyyyy..', '.yyyyyyyy.', 'yyyyyyyyyy', '..ffffff..', '..fkffkf..', '..ffrrff..', '...ffff...', '..bbbbbb..', 'f.bbbbbb.f', '..bbbbbb..', '..ff..ff..'];
  var KID_PULL = ['..yyyyyy..', '.yyyyyyyy.', 'yyyyyyyyyy', '..ffffff..', '..fkffkf..', '..ffkkff..', 'f..ffff..f', '.fbbbbbbf.', '..bbbbbb..', '..bbbbbb..', '..ff..ff..'];
  var KID_SAD = ['..yyyyyy..', '.yyyyyyyy.', 'yyyyyyyyyy', '..ffffff..', '..fkffkf..', '..fkkkkf..', '...ffff...', '..bbbbbb..', '.fbbbbbbf.', '..bbbbbb..', '..ff..ff..'];
  var KID_JOY = ['f.yyyyyy.f', 'fyyyyyyyyf', 'yyyyyyyyyy', '..ffffff..', '..fkffkf..', '..fkrrkf..', '...ffff...', '..bbbbbb..', '..bbbbbb..', '..bbbbbb..', '..ff..ff..'];
  var KID_PAL = { y: '#f2c84a', f: '#f4d0aa', k: '#2a2a2a', r: '#ff8a7a', b: '#4a8ad8' };

  function out(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#00000033', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function setupPlant(i) {
    var cfg = PLANTS[i];
    var n = cfg.ripe + cfg.young;
    var youngIdx = cfg.young > 0 ? Math.floor(game.random(0, n)) % n : -1;
    pods = [];
    for (var k = 0; k < n; k++) {
      var sl = cfg.slots[k];
      var dir = k % 2 === 0 ? 1 : -1;
      var young = k === youngIdx;
      pods.push({
        x: sl[0], y: Math.round(H * sl[1]), a0: dir * game.random(cfg.tilt * 0.4, cfg.tilt), a: 0,
        L: young ? 250 : 330 + game.random(-20, 30), young: young, open: 0, done: false, sway: cfg.sway, ph: game.random(0, 6), flash: 0, hot: [false, false],
      });
    }
    for (var p = 0; p < pods.length; p++) pods[p].a = pods[p].a0;
    grip = null;
  }

  function initGame() {
    plant = 0; popped = 0; beans = 0; misses = 0; combo = 0; maxCombo = 0; lastPop = -9; score = 0;
    timeLeft = TIME_LIMIT; readyT = 0.8; plantT = 0; stopT = 0; stopObj = null; fin = false; cleared = false;
    postT = 0; warnT = 0; pinchT = 0; sadT = 0; cheerT = 0; playT = 0; finalScore = 0; basketN = 0;
    setupPlant(0);
  }

  function tips(p) {
    var ux = Math.cos(p.a), uy = Math.sin(p.a), h = p.L / 2;
    return [{ x: p.x - ux * h, y: p.y - uy * h }, { x: p.x + ux * h, y: p.y + uy * h }];
  }
  function ripeLeft() { var n = 0; for (var i = 0; i < pods.length; i++) if (!pods[i].done && !pods[i].young) n++; return n; }

  function findTouch(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }

  // 2本指のつまみ判定(本番は game.touches、デモは偽の指リストで同じ処理を回す)
  function stepGrip(list, dt) {
    for (var i = 0; i < pods.length; i++) { pods[i].hot[0] = false; pods[i].hot[1] = false; }
    if (grip) {
      var a = findTouch(list, grip.ia), b = findTouch(list, grip.ib);
      if (!a || !b) {
        game.audio.tone('D4', 0.06, { wave: 'triangle', volume: 0.06 });
        grip.pod.open = 0; grip = null; return;
      }
      var d = Math.hypot(a.x - b.x, a.y - b.y);
      var p = grip.pod;
      p.open = Math.max(0, (d - grip.d0) / Math.max(110, p.L * 0.42));
      p.hot[0] = true; p.hot[1] = true;
      if (Math.floor(p.open * 6) > grip.tick) { grip.tick = Math.floor(p.open * 6); game.audio.tone(320 + grip.tick * 90, 0.04, { wave: 'square', volume: 0.06 }); }
      if (p.open >= 1) split(p, (a.x + b.x) / 2, (a.y + b.y) / 2);
      return;
    }
    // 両端それぞれに別の指が乗ったらつまみ成立
    for (var k = 0; k < pods.length; k++) {
      var q = pods[k];
      if (q.done) continue;
      var tp = tips(q), on0 = null, on1 = null;
      for (var t = 0; t < list.length; t++) {
        var f = list[t];
        if (!on0 && Math.hypot(f.x - tp[0].x, f.y - tp[0].y) < TIP_R) on0 = f;
        else if (!on1 && Math.hypot(f.x - tp[1].x, f.y - tp[1].y) < TIP_R) on1 = f;
      }
      q.hot[0] = !!on0; q.hot[1] = !!on1;
      if (on0 && on1 && on0.id !== on1.id) {
        grip = { pod: q, ia: on0.id, ib: on1.id, d0: Math.hypot(on0.x - on1.x, on0.y - on1.y), tick: 0, t0: game.time.elapsed };
        pinchT = 0.3;
        game.audio.play('se_tap', 0.3);
        game.fx.burst(tp[0].x, tp[0].y, { color: V.white, count: 5, speed: 160 });
        game.fx.burst(tp[1].x, tp[1].y, { color: V.white, count: 5, speed: 160 });
        return;
      }
    }
  }

  function split(p, mx, my) {
    var quick = game.time.elapsed - grip.t0 < 0.6;
    grip = null;
    p.done = true; p.flash = 0.5; p.open = 1.6;
    if (p.young) {
      misses++; combo = 0; sadT = 0.8;
      if (mode === S.PLAYING && misses >= MISS_MAX) {
        stopT = 0.45; stopObj = { kind: 'young', p: p, x: mx, y: my };
        game.fx.flash('#ffffff', 0.12);
        game.audio.tone('C3', 0.3, { wave: 'sawtooth', volume: 0.1, slide: -60 });
        return;
      }
      game.feedback.bad(mx, my, { text: 'MISS', color: V.ng, size: 58 });
      checkPlant();
      return;
    }
    popped++;
    var got = 3 + (p.L > 345 ? 1 : 0);
    beans += got; basketN += got;
    var now = game.time.elapsed;
    combo = now - lastPop < 1.8 ? combo + 1 : 1;
    lastPop = now;
    if (combo > maxCombo) maxCombo = combo;
    var pts = (quick ? 150 : 100) * Math.min(3, combo) + got * 10;
    score += pts;
    game.feedback.good(mx, my, { text: quick ? 'PERFECT' : 'GOOD', color: V.podDk, size: 58 });
    game.fx.burst(mx, my, { color: V.bean, count: 14, speed: 380 });
    game.audio.play('se_coin', 0.3);
    game.fx.popup('+' + pts, mx, my - 120, { color: V.hot, size: 42 });
    checkPlant();
  }

  function checkPlant() {
    if (ripeLeft() > 0 || plantT > 0 || mode !== S.PLAYING) return;
    plantT = 0.85; cheerT = 0.85;
    game.audio.play('se_milestone', 0.45);
    game.fx.popup('NICE', W / 2, H * 0.3, { color: V.hot, size: 92 });
  }

  function stepPods(dt) {
    var t = game.time.elapsed;
    for (var i = 0; i < pods.length; i++) {
      var p = pods[i];
      if (!(grip && grip.pod === p) && !p.done) p.a = p.a0 + Math.sin(t * 1.7 + p.ph) * p.sway;
      if (p.flash > 0) p.flash -= dt;
    }
    if (pinchT > 0) pinchT -= dt;
    if (sadT > 0) sadT -= dt;
    if (cheerT > 0) cheerT -= dt;
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = score + (win ? Math.ceil(timeLeft) * 40 : 0);
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 6; i++) game.fx.burst(160 + i * 150, H * 0.45 + (i % 2) * 180, { color: i % 2 ? V.bean : V.hot, count: 18, speed: 520 });
      game.fx.flash(V.white, 0.25);
    }
  }

  function resolveStop() {
    if (!stopObj) return;
    var o = stopObj;
    stopObj = null;
    if (o.kind === 'win') { ending(true); return; }
    game.feedback.bad(o.x, o.y, { text: o.kind === 'time' ? 'TIME UP' : 'MISS', color: V.ng, size: 60 });
    ending(false);
  }

  // ---- 入力 ----
  function canPlay() { return mode === S.PLAYING && !fin && stopT <= 0 && readyT <= 0 && plantT <= 0; }

  game.onPress(function(x, y) {
    if (!canPlay()) return;
    var near = false;
    for (var i = 0; i < pods.length; i++) {
      if (pods[i].done) continue;
      var tp = tips(pods[i]);
      if (Math.hypot(tp[0].x - x, tp[0].y - y) < TIP_R || Math.hypot(tp[1].x - x, tp[1].y - y) < TIP_R) near = true;
    }
    if (near) { game.audio.tone('A5', 0.04, { wave: 'triangle', volume: 0.06 }); game.fx.burst(x, y, { color: V.white, count: 3, speed: 100 }); }
    else game.audio.play('se_tap', 0.05);
  });
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { mode = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function field(t) {
    game.draw.gradient(0, H, [[0, '#dff0fa'], [0.28, V.bg], [0.7, V.bg2], [1, '#d0e2c4']]);
    // 遠い土手と川(柔らかい塊)
    for (var m = 0; m < 6; m++) game.draw.circle(m * 210 + 30, Math.round(H * 0.2), 150, '#cfe6c0');
    game.draw.rect(0, Math.round(H * 0.2), W, 60, '#bfe0f0');
    for (var w = 0; w < 6; w++) game.draw.rect((w * 190 + t * 50) % W, Math.round(H * 0.2) + 20 + (w % 2) * 18, 70, 6, V.white, 0.8);
    // 支柱とつる
    game.draw.rect(0, Math.round(H * 0.25), W, 14, V.podDk);
    game.draw.circle(80, Math.round(H * 0.25) + 7, 26, V.pod);
    game.draw.circle(1000, Math.round(H * 0.25) + 7, 26, V.pod);
    for (var l = 0; l < 7; l++) { game.draw.circle(130 + l * 140, Math.round(H * 0.265), 34, V.pod); game.draw.circle(160 + l * 140, Math.round(H * 0.255), 22, V.bean); }
    // 地面の畝
    for (var r = 0; r < 4; r++) game.draw.circle(160 + r * 260, Math.round(H * 0.78), 160, '#c6dab4');
  }

  function drawPod(p, t) {
    var tp = tips(p);
    var big = stopObj && stopT > 0 && stopObj.p === p;
    var wf = (p.flash > 0 && Math.floor(p.flash * 20) % 2 === 0) || (big && Math.floor(t * 16) % 2 === 0);
    var col = p.young ? V.young : V.pod, dk = p.young ? V.youngDk : V.podDk;
    var grow = big ? 1.35 : 1;
    // 茎
    var top = Math.round(H * 0.26);
    game.draw.line(p.x, top, p.x, p.y - 20, dk, 8);
    // 影
    game.draw.circle(p.x + 20, p.y + 70, p.L * 0.42, V.shadow, 0.18);
    var ux = Math.cos(p.a), uy = Math.sin(p.a);
    var gap = Math.min(1.6, p.open) * 50;
    var n = 7, i, u, cx, cy, r;
    for (var side = 0; side < 2; side++) {
      var sgn = side === 0 ? -1 : 1;
      for (i = 0; i <= n; i++) {
        u = i / n;
        if (sgn < 0 && u > 0.5) continue;
        if (sgn > 0 && u < 0.5) continue;
        var off = (u - 0.5) * p.L * grow + sgn * gap;
        cx = p.x + ux * off; cy = p.y + uy * off;
        r = (p.young ? 32 : 52) * Math.sin(0.25 + u * 2.64) * grow;
        game.draw.circle(cx, cy, r + 6, dk);
        game.draw.circle(cx, cy - 4, r, wf ? V.white : col);
        if (!p.young) game.draw.circle(cx - r * 0.3, cy - r * 0.4, r * 0.3, V.white, 0.5);
      }
    }
    if (p.open > 0.05 && !p.young) {
      for (var b = 0; b < 3; b++) { var bo = (b - 1) * p.L * 0.18; game.draw.circle(p.x + ux * bo, p.y + uy * bo + 4, 22 * Math.min(1, p.open), V.bean); }
      game.draw.line(p.x - uy * 30, p.y + ux * 30, p.x + uy * 30, p.y - ux * 30, V.white, 6);
    }
    if (p.done) return;
    // 先っぽ(つまむ場所)
    for (var k = 0; k < 2; k++) {
      var pulse = 0.5 + Math.sin(t * 8 + k) * 0.3;
      var on = p.hot[k];
      game.draw.circle(tp[k].x, tp[k].y, (on ? 48 : 38) + Math.sin(t * 8) * 4, on ? V.hot : V.white, on ? 0.85 : pulse);
      game.draw.circle(tp[k].x, tp[k].y, 16, dk);
    }
  }

  function drawKid(t) {
    var fr;
    if (sadT > 0) fr = KID_SAD;
    else if (cheerT > 0 || (fin && cleared)) fr = KID_JOY;
    else if (grip || pinchT > 0) fr = KID_PULL;
    else fr = Math.floor(t * 2.5) % 2 ? KID_A : KID_B;
    var hop = cheerT > 0 ? -Math.abs(Math.sin(t * 14)) * 24 : Math.sin(t * 3) * 4;
    game.draw.circle(220, H * 0.905, 90, V.shadow, 0.25);
    game.draw.sprite(fr, KID_PAL, 220, H * 0.84 + hop, 18, { anchor: 'center' });
    // 籠と豆
    game.draw.circle(820, H * 0.9, 120, V.shadow, 0.25);
    game.draw.rect(700, H * 0.83, 240, 110, V.basket);
    game.draw.rect(700, H * 0.83, 240, 18, '#b8803a');
    for (var b = 0; b < Math.min(basketN, 24); b++) game.draw.circle(730 + (b % 8) * 26, H * 0.825 - Math.floor(b / 8) * 22, 16, b % 2 ? V.bean : V.pod);
  }

  function drawHud(t) {
    var lowT = timeLeft < 4 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(70, 34, W - 140, 30, '#d6dcd0');
    game.draw.rect(76, 40, (W - 152) * Math.max(0, timeLeft / TIME_LIMIT), 18, lowT ? V.ng : V.hot);
    out(popped + ' / ' + NEEDED, W / 2, 116, 50, V.podDk);
    for (var p = 0; p < PLANTS.length; p++) {
      var done = p < plant || (p === plant && plantT > 0) || (fin && cleared);
      game.draw.circle(110 + p * 70, 176, 22, done ? V.pod : '#d6dcd0');
    }
    for (var m = 0; m < MISS_MAX; m++) game.draw.circle(W - 110 - m * 64, 176, 22, m < misses ? V.ng : '#d6dcd0');
    out('' + score, W - 240, 116, 34, V.hot);
  }

  function drawScene(t) {
    field(t);
    for (var i = 0; i < pods.length; i++) drawPod(pods[i], t);
    drawKid(t);
    for (var sl = 0; sl < H; sl += 8) game.draw.rect(0, sl, W, 2, '#000000', 0.035);
  }

  // ---- ATTRACT: 偽の2本指リストで本物の stepGrip() を回す。熟したさや2本を割る → 若いさやを割って失敗 ----
  var demo = { t: 0, a: { id: 'da', x: 200, y: H * 0.7 }, b: { id: 'db', x: 880, y: H * 0.7 }, press: false, k: 0, base: null };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.8;
    if (cyc < dt || demo.t <= dt) {
      initGame(); readyT = 0;
      setupDemoPods();
      demo.k = 0;
    }
    stepPods(dt);
    var seg = Math.floor(cyc / 1.25), u = cyc - seg * 1.25;
    demo.press = false;
    var list = [];
    if (seg < 3) {
      var p = pods[seg];
      if (!p.done) {
        var tp = tips(p), ux = Math.cos(p.a), uy = Math.sin(p.a);
        if (u < 0.45) {
          demo.a.x += (tp[0].x - demo.a.x) * Math.min(1, dt * 9); demo.a.y += (tp[0].y - demo.a.y) * Math.min(1, dt * 9);
          demo.b.x += (tp[1].x - demo.b.x) * Math.min(1, dt * 9); demo.b.y += (tp[1].y - demo.b.y) * Math.min(1, dt * 9);
          demo.base = null;
        } else {
          if (!demo.base) demo.base = { ax: tp[0].x, ay: tp[0].y, bx: tp[1].x, by: tp[1].y };
          var pull = Math.min(1, (u - 0.45) / 0.4) * 190;
          demo.a.x = demo.base.ax - ux * pull; demo.a.y = demo.base.ay - uy * pull;
          demo.b.x = demo.base.bx + ux * pull; demo.b.y = demo.base.by + uy * pull;
          demo.press = true;
          list = [demo.a, demo.b];
        }
      }
    } else {
      demo.a.x += (200 - demo.a.x) * dt * 2; demo.a.y += (H * 0.7 - demo.a.y) * dt * 2;
      demo.b.x += (880 - demo.b.x) * dt * 2; demo.b.y += (H * 0.7 - demo.b.y) * dt * 2;
    }
    stepGrip(list, dt);
  }
  function setupDemoPods() {
    pods = [
      { x: 330, y: Math.round(H * 0.42), a0: 0.12, a: 0.12, L: 340, young: false, open: 0, done: false, sway: 0, ph: 0, flash: 0, hot: [false, false] },
      { x: 760, y: Math.round(H * 0.52), a0: -0.35, a: -0.35, L: 330, young: false, open: 0, done: false, sway: 0, ph: 1, flash: 0, hot: [false, false] },
      { x: 520, y: Math.round(H * 0.64), a0: 0.2, a: 0.2, L: 250, young: true, open: 0, done: false, sway: 0, ph: 2, flash: 0, hot: [false, false] },
    ];
    grip = null;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.a.x, demo.a.y, { press: demo.press, scale: 13 });
      game.draw.hand(demo.b.x, demo.b.y, { press: demo.press, scale: 13 });
      out(GAME_TITLE, W / 2, H * 0.055 + Math.sin(t * 2) * 5, 96, V.pod);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.098, 38, V.podDk);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.955, 48, V.hot);
      else out('TAP TO START', W / 2, H * 0.955, 40, V.podDk);
      return;
    }

    if (mode === S.RESULT) {
      stepPods(dt);
      drawScene(t);
      game.draw.rect(90, H * 0.30, W - 180, 500, V.white, 0.92);
      out(cleared ? 'CLEAR' : (timeLeft <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.34, 96, cleared ? V.pod : V.ng);
      out('SCORE ' + finalScore, W / 2, H * 0.40, 60, V.ink);
      out(popped + ' / ' + NEEDED + '   +' + beans, W / 2, H * 0.45, 44, V.podDk);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.50, 56, V.hot);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.50, 42, V.ink);
      if (!cleared) out('あと' + (NEEDED - popped) + '本!', W / 2, H * 0.27, 60, V.hot);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.955, 40, V.podDk);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      stepPods(dt);
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { popped: popped, beans: beans, young: misses, maxCombo: maxCombo, plants: plant + (cleared ? 1 : 0) };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) resolveStop();
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else if (plantT > 0) {
      plantT -= dt;
      stepPods(dt);
      if (plantT <= 0) {
        if (plant >= PLANTS.length - 1) {
          stopT = 0.4; stopObj = { kind: 'win' };
          game.audio.play('se_powerup', 0.4);
        } else {
          plant++;
          setupPlant(plant);
          game.audio.play('se_jump', 0.3);
        }
      }
    } else {
      timeLeft -= dt; playT += dt;
      stepPods(dt);
      stepGrip(game.touches || [], dt);
      if (timeLeft < 4) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.06, { wave: 'square', volume: 0.07 }); }
      }
      if (timeLeft <= 0 && stopT <= 0 && !fin) {
        timeLeft = 0; grip = null;
        var rem = null;
        for (var i = 0; i < pods.length; i++) if (!pods[i].done && !pods[i].young) { rem = pods[i]; break; }
        stopT = 0.45; stopObj = { kind: 'time', p: rem, x: rem ? rem.x : W / 2, y: rem ? rem.y : H / 2 };
        game.audio.tone('C4', 0.3, { wave: 'square', volume: 0.1, slide: -120 });
      }
    }

    drawScene(t);
    if (stopObj && stopObj.kind === 'win' && stopT > 0) game.draw.circle(820, H * 0.86, 120 + (0.4 - stopT) * 900, V.white, 0.35);
    if (!fin && readyT <= 0 && plant === 0 && popped === 0 && playT < 1.6 && !grip) {
      var p0 = pods[0], tp0 = tips(p0), sp = (playT * 1.5) % 1 * 60;
      game.draw.hand(tp0[0].x - sp, tp0[0].y, { press: true, scale: 11, alpha: 0.5 });
      game.draw.hand(tp0[1].x + sp, tp0[1].y, { press: true, scale: 11, alpha: 0.5 });
    }
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 120, V.hot);
  });

  game.onStart(function() {
    game.audio.melody([
      ['E5', 0.5], ['G5', 0.5], ['A5', 1], ['G5', 0.5], ['E5', 0.5], ['D5', 1],
      ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 2],
      ['A5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 1], ['D5', 0.5], ['C5', 1.5],
    ], { tempo: 126, wave: 'triangle', volume: 0.06, loop: true, bass: [['C3', 2], ['A2', 2], ['F2', 2], ['G2', 2], ['C3', 2], ['G2', 2]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);
