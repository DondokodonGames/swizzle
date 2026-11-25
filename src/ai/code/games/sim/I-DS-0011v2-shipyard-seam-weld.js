// I-DS-0011v2-shipyard-seam-weld.js
// 継ぎ目なぞり溶接 — 途切れ途切れの溝を指でたどって溶接棒を走らせ、はみ出さずに鉄板の端から端までつなぎ直す
// 操作: 溝の始点から指を置いたまま溝に沿ってなぞる。溝の消えた区間も向きを読んで進む。止まると焼けるので動き続ける(社内メモ)
// 終わり: 3枚の鉄板を端まで溶接できれば成功。溝からはみ出す/止まって焼き抜くとゴーグルを1つ失い、3つ失うか時間切れで失敗
// @mechanic: guide_path
// @theme: shipyard_seam_weld
// 世界観: 港の造船所で、溶接見習いが船体用の鉄板の途切れた継ぎ目の溝を、はみ出さずに端までたどって一本の溶接線に接いでいく
// 残るもの: 正誤(CLEAR/GAME OVER) + 溶接した長さ%・残ったゴーグル数
// スタイル: 90s PRE-RENDER

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s PRE-RENDER: 暗め・金属質。動かない1枚絵の背景に粒状ノイズと金属のハイライト、キャラだけドットで動かす
  var STYLE = { bg: ['#1c2128', '#2c333c', '#0e1116'], main: ['#7d8794', '#a9b3bf', '#4b535e'], accent: ['#ff9a2e', '#7fd6ff'] };
  var M = {
    dark: STYLE.bg[0], mid: STYLE.bg[1], abyss: STYLE.bg[2],
    steel: STYLE.main[0], shine: STYLE.main[1], shade: STYLE.main[2],
    hot: STYLE.accent[0], arc: STYLE.accent[1], groove: '#22272e', bevel: '#c3ccd6',
    red: '#ff4a3a', white: '#ffffff', gold: '#ffd25a', ink: '#05070a', rust: '#7a4a32',
  };

  var GAME_TITLE = 'SEAM WELD';
  var TIME_LIMIT = 24;
  var LIVES = 3;
  var PLATE_TOP = H * 0.2, PLATE_BOT = H * 0.69;

  var PLATES = [
    { half: 72, gaps: [[0.42, 0.56]], pts: (function() {
      var a = []; for (var i = 0; i <= 24; i++) { var t = i / 24; a.push({ x: 150 + t * 780, y: H * 0.45 + Math.sin(t * Math.PI * 1.3) * 150 }); } return a;
    })() },
    { half: 60, gaps: [[0.26, 0.38], [0.64, 0.76]], pts: [
      { x: 140, y: H * 0.3 }, { x: 380, y: H * 0.57 }, { x: 620, y: H * 0.3 }, { x: 860, y: H * 0.58 }, { x: 950, y: H * 0.38 },
    ] },
    { half: 52, gaps: [[0.2, 0.29], [0.5, 0.59], [0.8, 0.88]], pts: [
      { x: 150, y: H * 0.27 }, { x: 880, y: H * 0.27 }, { x: 930, y: H * 0.33 }, { x: 880, y: H * 0.43 },
      { x: 200, y: H * 0.43 }, { x: 150, y: H * 0.5 }, { x: 200, y: H * 0.6 }, { x: 930, y: H * 0.6 },
    ] },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var plateIx, path, progress, tracing, still, lives, welded, totalLen, timeLeft, score, warn;
  var start, ending, won, halt, resultT, sent, swap, slipMark, mood, halfDone, sparkT, alarmT;

  var NOISE = [];
  for (var n = 0; n < 160; n++) NOISE.push({ x: (n * 397) % W, y: (n * 733) % H, a: 0.05 + ((n * 13) % 7) * 0.012 });

  var WELDER_A = [
    '..mmmmmm..', '.mmmmmmmm.', '.mvvvvvvm.', '.mmmmmmmm.', '..ffffff..', '.jjjjjjjj.',
    'jjjjjjjjjj', 'jj.jjjj.jj', 'gg.jjjj.tt', '...jjjj..t', '...jj.jj..', '..bbb.bbb.',
  ];
  var WELDER_B = [
    '..mmmmmm..', '.mmmmmmmm.', '.mvVvvVvm.', '.mmmmmmmm.', '..ffffff..', '.jjjjjjjj.',
    'jjjjjjjjjj', 'jj.jjjj.jj', 'gg.jjjj.tt', '...jjjj.t.', '...jj.jj..', '..bbb.bbb.',
  ];
  var WELDER_UP = [
    '..mmmmmm..', '.mvvvvvvm.', '.mmmmmmmm.', '..fefef...', '..ffmff...', 'g.jjjjjj.t',
    'gjjjjjjjjt', '..jjjjjj..', '...jjjj...', '...jjjj...', '...jj.jj..', '..bbb.bbb.',
  ];
  var WELDER_PAL = { m: '#3a4048', v: '#2a6a8a', V: '#7fd6ff', f: '#e0b48a', e: '#1a1a1a', j: '#5a6a7a', g: '#c8a040', t: '#a9b3bf', b: '#2a2018' };
  var GOGGLE = ['.vv.vv.', 'vVvvvVv', '.vv.vv.'];
  var CRANE = ['hhhhhhhhhh', '.h......h.', '.h......h.', '.h......h.', '.hhhhhhhh.'];

  function caption(str, x, y, sz, col) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: M.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  // ---- 経路(折れ線を8px刻みでサンプリング) ----
  function buildPath(def) {
    var samples = [], acc = 0;
    for (var i = 1; i < def.pts.length; i++) {
      var a = def.pts[i - 1], b = def.pts[i];
      var seg = Math.hypot(b.x - a.x, b.y - a.y);
      var steps = Math.max(1, Math.ceil(seg / 8));
      for (var k = 0; k < steps; k++) {
        var t = k / steps;
        samples.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, len: acc + seg * t });
      }
      acc += seg;
    }
    var last = def.pts[def.pts.length - 1];
    samples.push({ x: last.x, y: last.y, len: acc });
    var gaps = [], checkpoints = [0];
    for (var g = 0; g < def.gaps.length; g++) {
      gaps.push([def.gaps[g][0] * acc, def.gaps[g][1] * acc]);
      checkpoints.push(def.gaps[g][1] * acc);
    }
    return { s: samples, total: acc, half: def.half, gaps: gaps, checks: checkpoints };
  }

  function pointAt(len) {
    var s = path.s;
    for (var i = 1; i < s.length; i++) if (s[i].len >= len) return s[i];
    return s[s.length - 1];
  }

  function inGap(len) {
    for (var i = 0; i < path.gaps.length; i++) if (len > path.gaps[i][0] && len < path.gaps[i][1]) return true;
    return false;
  }

  function nearestAhead(x, y) {
    var best = { d: 1e9, len: progress };
    var s = path.s;
    for (var i = 0; i < s.length; i++) {
      if (s[i].len < progress - 120 || s[i].len > progress + 170) continue;
      var d = Math.hypot(x - s[i].x, y - s[i].y);
      if (d < best.d) { best.d = d; best.len = s[i].len; }
    }
    return best;
  }

  function loadPlate(ix) {
    plateIx = ix; path = buildPath(PLATES[ix]);
    progress = 0; tracing = false; still = 0; warn = 0; swap = 0; slipMark = null;
  }

  function initGame() {
    lives = LIVES; welded = 0; timeLeft = TIME_LIMIT; score = 0;
    start = 0.8; ending = false; won = false; halt = 0; resultT = 0; sent = false;
    mood = null; halfDone = false; sparkT = 0; alarmT = 0;
    totalLen = 0;
    for (var i = 0; i < PLATES.length; i++) totalLen += buildPath(PLATES[i]).total;
    loadPlate(0);
  }

  // ---- なぞり(本番もデモもここを通る) ----
  function touchDown(x, y) {
    if (swap > 0) return 'busy';
    var head = pointAt(progress);
    if (Math.hypot(x - head.x, y - head.y) > 120) return 'far';
    tracing = true; still = 0;
    return 'on';
  }

  function slip(x, y, live, why) {
    tracing = false; still = 0; warn = 0;
    var back = 0;
    for (var i = 0; i < path.checks.length; i++) if (path.checks[i] <= progress) back = path.checks[i];
    slipMark = { x: x, y: y, t: 0.45, why: why };
    if (live) {
      lives--;
      halt = 0.42;
      if (lives <= 0) finish(false);
    }
    progress = back;
    game.feedback.bad(x, y, { text: 'MISS', size: 60 });
    game.audio.play('se_break', 0.4);
    mood = { k: 'down', t: 0.7 };
  }

  function traceTo(x, y, live) {
    if (!tracing || swap > 0) return;
    var nb = nearestAhead(x, y);
    if (nb.d > path.half) { slip(x, y, live, 'edge'); return; }
    warn = nb.d > path.half * 0.68 ? 1 : 0;
    if (nb.len > progress + 1) {
      var before = progress;
      progress = Math.min(path.total, nb.len);
      still = 0;
      if (live) welded += progress - before;
      sparkT -= 1;
      if (sparkT <= 0) { sparkT = 3; game.fx.burst(x, y, { color: M.hot, count: 3, speed: 260 }); }
      if (inGap(before) && !inGap(progress)) game.audio.tone('B5', 0.05, { wave: 'square', volume: 0.08 });
      if (live && !halfDone && welded >= totalLen * 0.5) {
        halfDone = true;
        game.fx.popup('NICE', W / 2, H * 0.17, { color: M.gold, size: 80 });
        game.audio.play('se_milestone', 0.5);
      }
    }
    if (progress >= path.total - 10) plateDone(live);
  }

  function plateDone(live) {
    tracing = false; still = 0; warn = 0;
    var end = pointAt(path.total);
    game.feedback.good(end.x, end.y, { text: 'CLEAR', color: M.arc, size: 60 });
    game.audio.play('se_powerup', 0.4);
    mood = { k: 'up', t: 1 };
    if (live) {
      score += 500;
      if (plateIx >= PLATES.length - 1) { finish(true); return; }
    }
    swap = 1.0;
  }

  function finish(win) {
    if (ending) return;
    ending = true; won = win;
    if (!halt) halt = 0.4;
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) score += lives * 300 + Math.round(timeLeft * 30);
  }

  function stepWork(dt, live, holding) {
    if (slipMark) { slipMark.t -= dt; if (slipMark.t <= 0) slipMark = null; }
    if (mood) { mood.t -= dt; if (mood.t <= 0) mood = null; }
    if (swap > 0) {
      swap -= dt;
      if (swap <= 0 && (live || plateIx < PLATES.length - 1)) loadPlate(live ? plateIx + 1 : 0);
      return;
    }
    if (tracing && holding) {
      still += dt;
      if (still > 0.35) {
        alarmT -= dt;
        if (alarmT <= 0) { alarmT = 0.16; game.audio.tone('F#3', 0.05, { wave: 'sawtooth', volume: 0.06 }); }
      }
      if (still >= 1.0) { var h = pointAt(progress); slip(h.x, h.y, live, 'burn'); }
    } else {
      still = 0;
    }
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) {
      if (!sent) return;
      state = S.ATTRACT; initGame(); demo.t = 0; return;
    }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ending || start > 0 || halt > 0) return;
    var r = touchDown(x, y);
    if (r === 'on') { game.audio.play('se_tap', 0.3); game.fx.burst(x, y, { color: M.arc, count: 6, speed: 180 }); }
    else { game.audio.tone('C3', 0.05, { wave: 'square', volume: 0.06 }); game.fx.burst(x, y, { color: M.shade, count: 3, speed: 80 }); }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || ending || start > 0 || halt > 0) return;
    if (tracing) {
      traceTo(x, y, true);
      if (warn) game.audio.tone('E4', 0.02, { wave: 'square', volume: 0.03 });
    }
  });
  game.onRelease(function() {
    if (state !== S.PLAYING) return;
    if (tracing) { tracing = false; still = 0; warn = 0; game.audio.tone('A3', 0.04, { wave: 'triangle', volume: 0.05 }); }
  });

  // ---- 描画 ----
  function yard() {
    game.draw.gradient(0, H, [[0, M.mid], [0.5, M.dark], [1, M.abyss]]);
    // 船体の肋骨(動かない遠景)
    for (var r = 0; r < 7; r++) {
      var x = 40 + r * 170;
      game.draw.rect(x, H * 0.02, 22, H * 0.2, M.shade, 0.35);
      game.draw.rect(x - 8, H * 0.02, 38, 10, M.shine, 0.15);
    }
    game.draw.sprite(CRANE, { h: '#3a4250' }, W * 0.7, H * 0.08, 18, { anchor: 'center', alpha: 0.6 });
    for (var i = 0; i < NOISE.length; i++) game.draw.rect(NOISE[i].x, NOISE[i].y, 3, 3, M.white, NOISE[i].a);
    // 作業床
    game.draw.rect(0, PLATE_BOT + 30, W, H - PLATE_BOT - 30, '#151a20');
    for (var k = 0; k < 6; k++) game.draw.rect(0, PLATE_BOT + 60 + k * 70, W, 4, M.shade, 0.3);
  }

  function plate(offsetX) {
    var top = PLATE_TOP, bot = PLATE_BOT, l = 50 + offsetX, w = W - 100;
    game.draw.rect(l + 14, top + 18, w, bot - top, M.ink, 0.5);
    var bands = 24;
    for (var b = 0; b < bands; b++) {
      var k = b / bands;
      var lum = 0.75 + 0.25 * Math.sin(k * Math.PI * 1.2 + 0.4);
      var col = lum > 0.95 ? M.shine : lum > 0.85 ? M.steel : M.shade;
      game.draw.rect(l, top + k * (bot - top), w, (bot - top) / bands + 1, col);
    }
    game.draw.rect(l, top, w, 6, M.bevel, 0.7);
    for (var rv = 0; rv < 8; rv++) {
      game.draw.circle(l + 30 + rv * (w - 60) / 7, top + 26, 8, M.shade);
      game.draw.circle(l + 30 + rv * (w - 60) / 7, bot - 26, 8, M.shade);
    }
  }

  function groove(offsetX) {
    var s = path.s, hw = path.half;
    for (var i = 0; i < s.length; i++) {
      if (inGap(s[i].len)) {
        if (i % 4 === 0) game.draw.circle(s[i].x + offsetX, s[i].y, 5, M.groove, 0.6);
        continue;
      }
      var edgeCol = warn && Math.abs(s[i].len - progress) < 160 ? M.hot : M.bevel;
      game.draw.circle(s[i].x + offsetX, s[i].y, hw, edgeCol);
    }
    for (var j = 0; j < s.length; j++) {
      if (inGap(s[j].len)) continue;
      game.draw.circle(s[j].x + offsetX, s[j].y, hw - 8, M.groove);
    }
    // 溶接ビード(先端ほど赤熱)
    for (var b = 1; b < s.length && s[b].len <= progress; b++) {
      var age = progress - s[b].len;
      var col = age < 60 ? M.white : age < 180 ? M.hot : age < 420 ? '#c86a2a' : '#8a8f96';
      game.draw.circle(s[b].x + offsetX, s[b].y, 12, col);
    }
    var st = s[0], en = s[s.length - 1];
    game.draw.rect(st.x - 30 + offsetX, st.y - 30, 60, 60, M.arc, 0.25);
    game.draw.rect(en.x - 22 + offsetX, en.y - 46, 8, 92, M.gold);
    game.draw.rect(en.x - 14 + offsetX, en.y - 46, 40, 26, M.gold);
  }

  function torchHead(offsetX) {
    var h = pointAt(progress), t = game.time.elapsed;
    var pulse = 1 + Math.sin(t * 10) * 0.15;
    if (still > 0.35) {
      var heat = Math.min(1, (still - 0.35) / 0.65);
      game.draw.circle(h.x + offsetX, h.y, 30 + heat * 60, M.red, 0.25 + heat * 0.4);
    }
    game.draw.circle(h.x + offsetX, h.y, 46 * pulse, M.arc, tracing ? 0.25 : 0.5);
    game.draw.circle(h.x + offsetX, h.y, 18, M.white);
    if (!tracing && swap <= 0) {
      var ring = (t * 1.6) % 1;
      game.draw.circle(h.x + offsetX, h.y, 30 + ring * 60, M.white, 0.35 * (1 - ring));
    }
  }

  function workshopFloor() {
    var t = game.time.elapsed;
    var fr = Math.floor(t * 8) % 2 === 0 ? WELDER_A : WELDER_B;
    var dy = 0;
    if (mood && mood.k === 'up') { fr = WELDER_UP; dy = -Math.abs(Math.sin(t * 12)) * 20; }
    if ((mood && mood.k === 'down') || (ending && !won)) { fr = WELDER_A; dy = 18; }
    if (ending && won) fr = WELDER_UP;
    game.draw.sprite(fr, WELDER_PAL, W * 0.16, H * 0.82 + dy + Math.sin(t * 2) * 2, 14, { anchor: 'center' });
    if (tracing) game.draw.circle(W * 0.16 + 70, H * 0.82 + 30, 16 + Math.sin(t * 40) * 6, M.arc, 0.5);
    for (var g = 0; g < LIVES; g++) {
      var alive = g < lives;
      game.draw.sprite(GOGGLE, alive ? { v: '#2a6a8a', V: M.arc } : { v: '#3a3f46', V: '#3a3f46' }, W * 0.42 + g * 120, H * 0.79, 12, { anchor: 'center', alpha: alive ? 1 : 0.6 });
    }
    for (var p = 0; p < PLATES.length; p++) {
      var done = p < plateIx || (ending && won);
      var cur = p === plateIx && !done;
      var px = W * 0.42 + p * 150, py = H * 0.87;
      game.draw.rect(px - 60, py, 120, 30, done ? M.hot : cur ? M.steel : M.shade);
      if (cur) game.draw.rect(px - 60, py + 32, 120 * (progress / path.total), 6, M.arc);
    }
  }

  function drawHud() {
    caption(Math.round((welded / totalLen) * 100) + '%', W / 2, 64, 58, M.white);
    game.draw.text('SCORE ' + score, W - 40, 44, { size: 30, color: M.shine, bold: true, align: 'right' });
    var low = timeLeft < 5;
    game.draw.rect(60, 124, W - 120, 22, M.ink, 0.6);
    game.draw.rect(64, 128, (W - 128) * Math.max(0, timeLeft / TIME_LIMIT), 14, low && Math.floor(game.time.elapsed * 8) % 2 ? M.red : M.arc);
  }

  function drawSlip(offsetX) {
    if (!slipMark) return;
    var a = slipMark.t / 0.45;
    var grow = 1 + (1 - a) * 0.6;
    game.draw.circle(slipMark.x + offsetX, slipMark.y, 50 * grow, M.white, 0.7 * a);
    game.draw.circle(slipMark.x + offsetX, slipMark.y, 26 * grow, M.red, 0.8 * a);
  }

  function drawResult() {
    game.draw.rect(0, H * 0.2, W, H * 0.42, M.ink, 0.65);
    caption(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.27, 108, won ? M.gold : M.red);
    caption('SCORE ' + score, W / 2, H * 0.36, 60, M.white);
    caption(Math.round((welded / totalLen) * 100) + '%   x' + lives, W / 2, H * 0.42, 46, M.arc);
    if (won && score > game.best) {
      if (Math.floor(resultT * 4) % 2 === 0) caption('NEW RECORD', W / 2, H * 0.49, 64, M.gold);
    } else {
      caption('BEST ' + Math.max(game.best, won ? score : 0), W / 2, H * 0.49, 42, M.gold);
    }
    if (!won) caption('あと' + Math.max(1, 100 - Math.round((welded / totalLen) * 100)) + '%!', W / 2, H * 0.56, 66, M.hot);
    if (sent && Math.floor(game.time.elapsed * 2) % 2 === 0) caption('TAP TO CONTINUE', W / 2, H * 0.965, 36, M.white);
  }

  // ---- ATTRACT: 1枚目を実際になぞる。溝の消えた区間で一度はみ出し(失敗例)、戻ってやり直し端まで ----
  var demo = { t: 0, gx: 0, gy: 0, press: false, len: 0, phase: 0, wait: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.8;
    if (cyc < dt || demo.t <= dt) {
      initGame(); start = 0; demo.len = 0; demo.phase = 0; demo.wait = 0.4;
      var p0 = pointAt(0); demo.gx = p0.x; demo.gy = p0.y + 80;
    }
    stepWork(dt, false, demo.press);
    if (demo.wait > 0) {
      demo.wait -= dt;
      demo.press = false;
      var hd = pointAt(progress);
      demo.gx += (hd.x - demo.gx) * Math.min(1, dt * 6);
      demo.gy += (hd.y - demo.gy) * Math.min(1, dt * 6);
      if (demo.wait <= 0) { touchDown(hd.x, hd.y); demo.len = progress; }
      return;
    }
    if (demo.phase === 2 || swap > 0) { demo.press = false; return; }
    demo.press = true;
    demo.len += 620 * dt;
    var p = pointAt(demo.len);
    var off = 0;
    if (demo.phase === 0 && demo.len > path.gaps[0][0] + 30) off = (demo.len - path.gaps[0][0] - 30) * 1.6;
    demo.gx = p.x; demo.gy = p.y - off;
    traceTo(demo.gx, demo.gy, false);
    if (!tracing && demo.phase === 0) { demo.phase = 1; demo.wait = 0.7; }
    if (!tracing && swap > 0) demo.phase = 2;
  }

  // ---- メインループ ----
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      yard();
      plate(0);
      groove(0);
      torchHead(0);
      drawSlip(0);
      workshopFloor();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      caption(GAME_TITLE, W / 2, H * 0.07 + Math.sin(game.time.elapsed * 2.2) * 5, 96, M.hot);
      caption('HI-SCORE ' + game.best, W / 2, H * 0.125, 40, M.shine);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) caption('► 100円 投入 ◄', W / 2, H * 0.965, 46, M.gold);
      else caption('INSERT COIN', W / 2, H * 0.965, 40, M.white);
      return;
    }

    var slide = swap > 0 ? -Math.max(0, (1 - swap / 1.0) - 0.4) * W * 1.6 : 0;

    if (state === S.RESULT) {
      resultT += dt;
      yard(); plate(0); groove(0); drawSlip(0); workshopFloor(); drawHud();
      if (won && Math.floor(resultT * 6) !== Math.floor((resultT - dt) * 6)) {
        game.fx.burst(game.random(140, W - 140), game.random(H * 0.25, H * 0.6), { color: [M.hot, M.arc, M.gold][Math.floor(game.random(0, 3)) % 3], count: 16, speed: 440 });
      }
      drawResult();
      if (!sent && resultT >= 1.3) {
        sent = true;
        var stats = { weldedPct: Math.round((welded / totalLen) * 100), lives: lives, plates: won ? PLATES.length : plateIx };
        if (won) game.end.success(score, stats); else game.end.failure(stats);
      }
      return;
    }

    if (halt > 0) {
      halt -= dt;
      if (slipMark) slipMark.t = Math.max(0.05, slipMark.t - dt * 0.3);
      if (halt <= 0 && ending) { state = S.RESULT; resultT = 0; }
    } else if (ending) {
      state = S.RESULT; resultT = 0;
    } else if (start > 0) {
      start -= dt;
      if (start <= 0) game.audio.play('se_tap', 0.4);
    } else {
      timeLeft -= dt;
      stepWork(dt, true, game.input.pressing);
      if (timeLeft <= 0 && !ending) {
        timeLeft = 0;
        var hd = pointAt(progress);
        slipMark = { x: hd.x, y: hd.y, t: 0.45, why: 'time' };
        game.feedback.bad(hd.x, hd.y, { text: 'TIME UP', size: 64 });
        halt = 0.45;
        finish(false);
      }
    }

    yard();
    plate(slide);
    groove(slide);
    if (swap <= 0) torchHead(0);
    drawSlip(0);
    workshopFloor();
    drawHud();
    if (start > 0) caption(start > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.16, 104, M.hot);
  });

  game.onStart(function() {
    game.audio.melody([
      ['A3', 0.5], ['C4', 0.5], ['E4', 0.5], ['A4', 0.5], ['G4', 1], ['E4', 1],
      ['F4', 0.5], ['E4', 0.5], ['D4', 0.5], ['C4', 0.5], ['B3', 1], ['E3', 1],
    ], { tempo: 116, wave: 'sawtooth', volume: 0.04, loop: true, bass: [['A2', 2], ['F2', 2], ['D2', 2], ['E2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
