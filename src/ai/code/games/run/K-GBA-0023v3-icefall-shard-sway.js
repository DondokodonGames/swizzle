// K-GBA-0023v3-icefall-shard-sway.js
// 氷瀑スイング登攀 — 跳ねる8分の拍で一段ずつ登りながら、拍の頭に落ちてくる氷片を左右へ体を振ってかわす
// 操作: 登るのは自動(拍ごとに一段)。氷壁にヒビが走った列には、ヒビの1拍後の頭に氷片が落ちる(ヒビの拍の跳ねた裏で剥がれる)。落ちる拍の頭に画面下の左右パッドのどちらかを押し、体をその側へ振る。中央だけのヒビはどちらでもよく、左寄り(左+中央)の大きなヒビは右へ、右寄りは左へ。拍の頭ちょうどでPERFECT、少しずれるとGOOD。早すぎ・遅すぎ・ヒビの側へ振る・振らないと氷片が当たる
// 終わり: 8小節(32拍)を登りきって滝の上に出ればCLEAR(よけた点+コンボ)。氷片に3回当たるとGAME OVER
// @mechanic: dodge
// @theme: icefall_shard_sway
// 世界観: 凍った滝の氷壁で、氷壁登攀者が跳ねるリズムで一段ずつ登りながら、上から剥がれ落ちる氷片を体を振ってよける
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD数・被弾数・最大コンボ・登った段数
// スタイル: MODERN AD-GAME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var STYLE = { bg: ['#28b8ff', '#c8f6ff'], main: ['#ff6a1f', '#ffd21f', '#1f4fb8'], accent: ['#ff2e63', '#ffffff'] };
  // MODERN AD-GAME: 高彩度・高コントラスト、太い縁取り、大きいアイコン、飛ぶ数字。3秒で何をするか伝わる画面
  var C = {
    sky: STYLE.bg[0], ice: STYLE.bg[1], ice2: '#8ee6ff', ice3: '#5ccfff', line: '#0b2a5a',
    suit: STYLE.main[0], helm: STYLE.main[1], pack: STYLE.main[2],
    red: STYLE.accent[0], white: STYLE.accent[1], green: '#2ee87a', gold: '#ffe14a', snow: '#f4fbff', rock: '#4a5a8a',
  };

  var GAME_TITLE = 'ICEFALL SWAY';
  var BPM = 96;
  var SPB = 60 / BPM;            // 1拍 0.625秒
  var SWING = 2 / 3;             // 跳ねる8分: 裏は拍の 2/3 の位置
  var BAR = 4;
  var TOTAL = 32;                // 8小節
  var TIME_LIMIT = 20;           // 32拍 × 0.625秒
  var MAX_HIT = 3;
  var PERFECT_W = 0.08;
  var GOOD_W = 0.16;
  var SWAY_HOLD = 0.24;          // 体を振っていられる時間
  var STEP = 74;                 // 1拍で登る高さ(px)
  var COL_X = [W * 0.22, W * 0.5, W * 0.78];
  var HANG_Y = H * 0.25;         // ヒビ(氷片が下がる位置)
  var HEAD_Y = H * 0.53;         // 登攀者の頭
  var BODY_Y = HEAD_Y + 120;
  var PADS = [{ x: W * 0.25, y: H * 0.865 }, { x: W * 0.75, y: H * 0.865 }];

  // 氷片の型: 0=中央だけ / 1=左寄り(左+中央 → 右へ) / 2=右寄り(中央+右 → 左へ)
  var COVER = [[1], [0, 1], [1, 2]];
  var PLAY_SHARDS = [[5, 0], [7, 0], [9, 1], [11, 2], [12, 0], [14, 1], [15, 2], [17, 2], [18, 0], [19, 1],
                     [20, 1], [21, 2], [23, 0], [24, 2], [25, 1], [26, 2], [27, 0], [28, 1], [29, 0], [30, 2], [31, 1]];
  var DEMO_SHARDS = [[3, 0], [5, 1], [6, 2], [8, 0], [10, 2], [11, 1], [12, 0]];
  var DEMO_BEATS = 14;
  var DEMO_WRONG = 10;           // ATTRACT: ここだけわざとヒビの側へ振って当たって見せる

  // 跳ねる伴奏(オリジナル)。[長, 短] = [2/3, 1/3] 拍の組で跳ねる。4小節 = 16拍で1周
  var TUNE = [
    ['E5', 2 / 3], ['G5', 1 / 3], ['A5', 2 / 3], ['G5', 1 / 3], ['E5', 1], ['D5', 2 / 3], ['E5', 1 / 3],
    ['C5', 2 / 3], ['D5', 1 / 3], ['E5', 2 / 3], ['G5', 1 / 3], ['A5', 2],
    ['G5', 2 / 3], ['E5', 1 / 3], ['D5', 2 / 3], ['C5', 1 / 3], ['D5', 1], ['R', 2 / 3], ['E5', 1 / 3],
    ['D5', 2 / 3], ['C5', 1 / 3], ['A4', 2 / 3], ['C5', 1 / 3], ['D5', 1], ['C5', 1],
  ];
  var TUNE_BASS = [['A2', 1], ['C3', 1], ['E3', 1], ['G3', 1], ['F2', 1], ['A2', 1], ['C3', 1], ['A2', 1],
                   ['D3', 1], ['F3', 1], ['A3', 1], ['F3', 1], ['E2', 1], ['G2', 1], ['B2', 1], ['E3', 1]];
  function startSong(quiet) {
    game.audio.melody(TUNE, { tempo: BPM, wave: 'square', volume: quiet ? 0.02 : 0.045, loop: true, bass: TUNE_BASS, bassWave: 'triangle', bassVolume: quiet ? 0.04 : 0.08 });
  }

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, running, beatN, beatT, songT, readyT, andDone;
  var shards, sway, swayFx, dispStep, hitStop, hitShard, padFlash, beatFlash, andFlash, axeSide;
  var score, combo, maxCombo, perfects, goods, hits, dodged, over, won, outroT, prevBest, halfShown;

  function initGame(isDemo) {
    demoMode = !!isDemo;
    running = false; beatN = 0; beatT = 0; songT = 0; andDone = false;
    readyT = isDemo ? 0 : 0.8;
    var src = isDemo ? DEMO_SHARDS : PLAY_SHARDS;
    shards = [];
    for (var i = 0; i < src.length; i++) shards.push({ b: src[i][0], type: src[i][1], phase: 'wait', y: HANG_Y, out: 0, hitT: 0 });
    sway = { side: -1, t: -9 }; swayFx = 0; dispStep = 0; hitStop = 0; hitShard = null;
    padFlash = [0, 0]; beatFlash = 0; andFlash = 0; axeSide = 0;
    score = 0; combo = 0; maxCombo = 0; perfects = 0; goods = 0; hits = 0; dodged = 0;
    over = false; won = false; outroT = 0; prevBest = game.best; halfShown = false;
    if (isDemo) { startClock(); startSong(true); }
  }

  // ---- 拍クロック(1本だけ)。頭と、跳ねた裏(2/3)で刻む ----
  function startClock() {
    running = true; beatN = 0; beatT = 0; songT = 0; andDone = false;
    onBeat(0);
  }

  function onBeat(b) {
    var v = demoMode ? 0.4 : 1;
    beatFlash = 1; axeSide = b % 2; andDone = false;
    if (b % 2 === 0) game.audio.tone(82, 0.12, { wave: 'sine', volume: 0.24 * v });
    else game.audio.tone(220, 0.05, { wave: 'square', volume: 0.06 * v, slide: -120 });
    game.audio.tone(1760, 0.03, { wave: 'triangle', volume: 0.05 * v });
    for (var i = 0; i < shards.length; i++) {
      var s = shards[i];
      if (s.phase === 'wait' && b === s.b - 1) {
        s.phase = 'crack';
        game.audio.tone(988, 0.06, { wave: 'square', volume: 0.07 * v });
        game.audio.tone(740, 0.08, { wave: 'square', volume: 0.06 * v });
      }
    }
    if (!demoMode && b === TOTAL / 2 && !halfShown) {
      halfShown = true;
      game.fx.popup('NICE!', W / 2, H * 0.36, { color: C.gold, size: 90 });
      game.audio.play('se_milestone', 0.45);
    }
  }

  function onAnd(b) {
    var v = demoMode ? 0.4 : 1;
    andFlash = 1;
    game.audio.tone(1320, 0.025, { wave: 'triangle', volume: 0.035 * v });
    for (var i = 0; i < shards.length; i++) {
      var s = shards[i];
      if (s.phase === 'crack' && b === s.b - 1) {
        s.phase = 'fall';
        game.audio.tone(2093, 0.05, { wave: 'triangle', volume: 0.08 * v, slide: -900 });
      }
    }
  }

  function stepClock(dt) {
    if (!running) return;
    beatT += dt;
    while (beatT >= SPB) { beatT -= SPB; beatN++; onBeat(beatN); }
    if (!andDone && beatT >= SPB * SWING) { andDone = true; onAnd(beatN); }
    songT = beatN * SPB + beatT;
    for (var i = 0; i < shards.length; i++) stepShard(shards[i], dt);
    if (!demoMode && !over && songT >= TIME_LIMIT) finish(true);
  }

  function stepShard(s, dt) {
    var tb = s.b * SPB;
    if (s.phase === 'fall') {
      var t0 = (s.b - 1 + SWING) * SPB;
      var k = Math.max(0, (songT - t0) / (tb - t0));
      s.y = HANG_Y + (HEAD_Y - HANG_Y) * k * k;
      if (songT >= tb + GOOD_W) resolve(s);
    } else if (s.phase === 'gone') {
      if (hitStop <= 0 || s !== hitShard) s.y += dt * 2600;
      s.out += dt;
      if (s.out > 0.5) s.phase = 'done';
    }
  }

  function safeSide(type, side) {
    var col = side === 0 ? 0 : 2;
    return COVER[type].indexOf(col) < 0;
  }

  function resolve(s) {
    var tb = s.b * SPB;
    var off = sway.t - tb;
    var a = Math.abs(off);
    s.phase = 'gone'; s.out = 0;
    if (sway.side >= 0 && a <= GOOD_W && safeSide(s.type, sway.side)) {
      var x = COL_X[sway.side === 0 ? 2 : 0];
      dodged++; combo++;
      if (combo > maxCombo) maxCombo = combo;
      var pts;
      if (a <= PERFECT_W) {
        perfects++; pts = 100 + Math.min(combo, 10) * 10;
        game.feedback.good(x, HEAD_Y - 120, { text: 'PERFECT', color: C.gold, size: 60, count: 12, volume: demoMode ? 0.12 : 0.25 });
      } else {
        goods++; pts = 60 + Math.min(combo, 10) * 5;
        game.feedback.good(x, HEAD_Y - 120, { text: 'GOOD', color: C.green, size: 52, count: 8, volume: demoMode ? 0.1 : 0.2 });
      }
      score += pts;
      if (!demoMode) game.fx.popup('+' + pts, x, HEAD_Y - 220, { color: C.white, size: 54 });
      if (!demoMode && combo >= 3 && combo % 3 === 0) game.fx.popup('COMBO x' + combo, W / 2, H * 0.42, { color: C.red, size: 72 });
      game.fx.burst(COL_X[1], HEAD_Y + 260, { color: C.ice2, count: 10, speed: 360 });
    } else {
      hits++; combo = 0;
      hitStop = 0.45; hitShard = s;
      game.feedback.bad(COL_X[bodyCol()], HEAD_Y - 60, { text: 'MISS', shake: demoMode ? 5 : 14, volume: demoMode ? 0.15 : 0.5 });
      game.audio.play('se_break', demoMode ? 0.15 : 0.4);
      if (!demoMode && hits >= MAX_HIT) finish(false);
    }
  }

  function bodyCol() {
    if (sway.side < 0) return 1;
    var since = songT - sway.t;
    if (since < 0 || since > SWAY_HOLD) return 1;
    return sway.side === 0 ? 0 : 2;
  }

  function doSway(side) {
    sway = { side: side, t: songT };
    swayFx = 1; padFlash[side] = 0.16;
    game.audio.tone(side ? 587 : 494, 0.06, { wave: 'square', volume: demoMode ? 0.03 : 0.07, slide: side ? 160 : -160 });
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.6; running = false;
    game.audio.stopBgm();
    if (ok) {
      score += dodged * 20 + maxCombo * 15 + (MAX_HIT - hits) * 100;
      game.audio.play('se_success', 0.6);
      for (var i = 0; i < 6; i++) game.fx.burst(game.random(140, 940), game.random(300, 900), { color: i % 2 ? C.gold : C.red, count: 22, speed: 480 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over) return;
    var side = x < W / 2 ? 0 : 1;
    if (readyT > 0 || !running) { padFlash[side] = 0.12; game.audio.tone(330, 0.03, { wave: 'triangle', volume: 0.04 }); return; }
    doSway(side);
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画ヘルパー(太縁取り) ----
  function fillPoly(p, col, al) {
    var n = p.length / 2, top = 1e9, bot = -1e9, i;
    for (i = 0; i < n; i++) { top = Math.min(top, p[i * 2 + 1]); bot = Math.max(bot, p[i * 2 + 1]); }
    for (var y = Math.max(-4, top); y < Math.min(H + 4, bot); y += 4) {
      var mid = y + 2, lo = 1e9, hi = -1e9;
      for (i = 0; i < n; i++) {
        var j = (i + 1) % n, y0 = p[i * 2 + 1], y1 = p[j * 2 + 1];
        if ((y0 <= mid) !== (y1 <= mid)) {
          var xx = p[i * 2] + (mid - y0) / (y1 - y0) * (p[j * 2] - p[i * 2]);
          lo = Math.min(lo, xx); hi = Math.max(hi, xx);
        }
      }
      if (hi > lo) game.draw.rect(lo, y, hi - lo, 4.6, col, al);
    }
  }
  function strokePoly(p, col, w) {
    var n = p.length / 2;
    for (var i = 0; i < n; i++) {
      var j = (i + 1) % n;
      game.draw.line(p[i * 2], p[i * 2 + 1], p[j * 2], p[j * 2 + 1], col, w);
      game.draw.circle(p[i * 2], p[i * 2 + 1], w / 2, col);
    }
  }
  function chunk(p, fill, al) { fillPoly(p, fill, al); strokePoly(p, C.line, 8); }
  function pill(x, y, w, h, fill) {
    var r = h / 2;
    game.draw.circle(x + r, y + r, r + 8, C.line); game.draw.circle(x + w - r, y + r, r + 8, C.line);
    game.draw.rect(x + r, y - 8, w - 2 * r, h + 16, C.line);
    game.draw.circle(x + r, y + r, r, fill); game.draw.circle(x + w - r, y + r, r, fill);
    game.draw.rect(x + r, y, w - 2 * r, h, fill);
    game.draw.rect(x + r, y + 10, w - 2 * r, h * 0.22, C.white, 0.35);
  }
  function label(str, x, y, sz, col, align) {
    var o = Math.max(3, sz * 0.07);
    game.draw.text(str, x - o, y, { size: sz, color: C.line, bold: true, align: align || 'center' });
    game.draw.text(str, x + o, y, { size: sz, color: C.line, bold: true, align: align || 'center' });
    game.draw.text(str, x, y + o, { size: sz, color: C.line, bold: true, align: align || 'center' });
    game.draw.text(str, x, y - o, { size: sz, color: C.line, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  // ---- 氷壁(上へ流れる世界) ----
  var BULGES = [];
  for (var bi = 0; bi < 46; bi++) BULGES.push({ w: bi * 70 - 300, x: (bi * 263) % 900 + 90, r: 40 + (bi * 37) % 60 });
  var TOP_W = TOTAL * STEP + 260;
  function cam() { return dispStep * STEP; }
  function wy(w) { return BODY_Y - (w - cam()); }

  function drawWall() {
    game.draw.gradient(0, H, [[0, C.sky], [0.35, C.ice3], [1, C.ice]]);
    var lip = wy(TOP_W);
    // 滝の上(空と雪庇)
    if (lip > -200) {
      game.draw.rect(0, 0, W, Math.max(0, lip), C.sky);
      for (var c = 0; c < 6; c++) game.draw.circle(c * 220 + 60, lip - 40 - (c % 2) * 30, 110, C.white, 0.9);
      chunk([0, lip - 30, W, lip - 30, W, lip + 60, 0, lip + 60], C.snow, 1);
    }
    // 凍った流れの筋
    for (var k = 0; k < 9; k++) {
      var x = 70 + k * 118 + Math.sin(k * 1.7) * 20;
      game.draw.line(x, Math.max(lip + 60, 230), x + Math.sin(k) * 30, H * 0.76, C.ice2, 10);
      game.draw.line(x + 8, Math.max(lip + 60, 230), x + 8 + Math.sin(k) * 30, H * 0.76, C.white, 3);
    }
    // 氷のふくらみ
    for (var i = 0; i < BULGES.length; i++) {
      var b = BULGES[i], y = wy(b.w);
      if (y < lip + 60 || y < 200 || y > H * 0.78) continue;
      var r = b.r, f = [b.x - r * 1.3, y, b.x - r * 0.5, y - r, b.x + r * 0.9, y - r * 0.8, b.x + r * 1.4, y + r * 0.1, b.x + r * 0.4, y + r, b.x - r * 0.8, y + r * 0.7];
      fillPoly(f, C.ice2, 0.9);
      strokePoly(f, C.ice3, 5);
      game.draw.line(b.x - r * 0.6, y - r * 0.5, b.x + r * 0.5, y - r * 0.45, C.white, 6);
    }
    // 3つの列(体を振る先)
    for (var cI = 0; cI < 3; cI++) {
      game.draw.rect(COL_X[cI] - 100, 236, 200, H * 0.76 - 236, C.white, cI === 1 ? 0.10 : 0.06);
    }
  }

  function drawShard(s) {
    var x0 = COL_X[COVER[s.type][0]], x1 = COL_X[COVER[s.type][COVER[s.type].length - 1]];
    var cx = (x0 + x1) / 2, half = (x1 - x0) / 2 + 95;
    var t = game.time.elapsed;
    if (s.phase === 'crack') {
      // 予告: 危険な列が赤く点滅 + ヒビ
      var blink = Math.floor(t * 12) % 2 === 0;
      game.draw.rect(cx - half, HANG_Y, half * 2, HEAD_Y + 140 - HANG_Y, C.red, blink ? 0.22 : 0.1);
      for (var z = 0; z < 6; z++) {
        var zx = cx - half + 20 + z * (half * 2 - 40) / 6;
        game.draw.line(zx, HANG_Y - 120 + (z % 2) * 22, zx + (half * 2 - 40) / 6, HANG_Y - 120 + ((z + 1) % 2) * 22, C.red, 8);
      }
      var shake = Math.sin(t * 60) * 4;
      drawIce(s, cx + shake, HANG_Y - 60, half, 1);
    } else if (s.phase === 'fall' || s.phase === 'gone') {
      var big = (s === hitShard && hitStop > 0) ? 1.25 : 1;
      drawIce(s, cx, s.y - 60, half * big, big, s === hitShard && hitStop > 0);
    }
  }

  function drawIce(s, cx, y, half, k, white) {
    var body = white ? C.white : C.ice2;
    if (s.type === 0) {
      chunk([cx - 80 * k, y - 70 * k, cx + 80 * k, y - 70 * k, cx, y + 150 * k], body, 1);
      game.draw.line(cx - 30 * k, y - 50 * k, cx - 6 * k, y + 80 * k, C.white, 8);
    } else {
      chunk([cx - half, y - 70 * k, cx + half, y - 70 * k, cx + half - 40, y + 30 * k, cx - half + 40, y + 30 * k], body, 1);
      for (var i = 0; i < 4; i++) {
        var tx = cx - half + 60 + i * (half * 2 - 120) / 3;
        chunk([tx - 44, y + 26 * k, tx + 44, y + 26 * k, tx, y + 130 * k], body, 1);
      }
      game.draw.line(cx - half + 30, y - 46 * k, cx + half - 60, y - 46 * k, C.white, 8);
    }
  }

  // 登攀者(背中向き)。体は sprite、腕とアイスアックスは line
  var BODY_TOP = ['...oooooo...', '..oyyyyyyo..', '.oyyyyyyyyo.', '.oyywyyyyyo.', '..oooooooo..', '.ooqqqqqqoo.',
                  'oqqnnnnnnqqo', 'oqqnnnnnnqqo', 'oqqnnnnnnqqo', '.oqqqqqqqqo.', '.oqqqooqqqo.'];
  var LEGS = [
    ['.oppo..oppo.', '.obbo..oppo.', '..oo...obbo.', '........oo..'],
    ['.oppo..oppo.', '.oppo..obbo.', '.obbo...oo..', '..oo........'],
  ];
  var CLIMBER = [BODY_TOP.concat(LEGS[0]), BODY_TOP.concat(LEGS[1])];
  var PAL = { o: '#0b2a5a', y: '#ffd21f', w: '#ffffff', q: '#ff6a1f', n: '#1f4fb8', p: '#2a2f6a', b: '#111833' };

  function drawClimber() {
    var t = game.time.elapsed;
    var target = COL_X[bodyCol()];
    if (hitStop <= 0) swayX += (target - swayX) * Math.min(1, game.time.delta * 22);
    var bx = swayX, by = BODY_Y;
    var ph = running ? beatT / SPB : (t * 1.6) % 1;
    var hop = ph < SWING ? Math.sin(ph / SWING * Math.PI) * 10 : Math.sin((ph - SWING) / (1 - SWING) * Math.PI) * 5;
    by -= hop;
    var hurt = hitStop > 0;
    // 打ち込んだアックス(壁に刺さったまま)と腕
    var anchor = [{ x: COL_X[1] - 110, y: by - (axeSide === 0 ? 210 : 120) }, { x: COL_X[1] + 110, y: by - (axeSide === 1 ? 210 : 120) }];
    for (var s = 0; s < 2; s++) {
      var hx = anchor[s].x + (bx - COL_X[1]) * 0.35, hy = anchor[s].y;
      var shx = bx + (s ? 54 : -54), shy = by - 50;
      game.draw.line(shx, shy, hx, hy, C.line, 32);
      game.draw.line(shx, shy, hx, hy, C.suit, 20);
      game.draw.line(hx, hy + 20, hx, hy - 90, C.line, 16);
      game.draw.line(hx, hy + 20, hx, hy - 90, '#b0b8c8', 8);
      chunk([hx - (s ? -6 : 6), hy - 96, hx + (s ? 60 : -60), hy - 76, hx - (s ? -6 : 6), hy - 66], '#d8e0ec', 1);
      game.draw.circle(hx, hy, 16, C.line); game.draw.circle(hx, hy, 10, '#ffe0c0');
    }
    game.draw.circle(bx, by + 110, 80, C.line, 0.18);
    game.draw.sprite(CLIMBER[axeSide], PAL, bx, by, 12, { anchor: 'center', alpha: hurt && Math.floor(t * 20) % 2 ? 0.5 : 1 });
    if (hurt) {
      for (var k = 0; k < 3; k++) {
        var a = t * 8 + k * 2.1;
        game.draw.circle(bx + Math.cos(a) * 70, by - 120 + Math.sin(a) * 18, 10, C.gold);
      }
    }
  }
  var swayX = W * 0.5;

  // ---- 跳ねる拍の表示(頭=大、裏=小、ボールが長短で跳ねる)と親指パッド ----
  function drawSwingMeter() {
    var y = H * 0.755, x0 = 150, step = 260;
    game.draw.rect(0, y - 90, W, 150, C.line, 0.85);
    for (var i = 0; i < BAR; i++) {
      var hx = x0 + i * step, ax = hx + step * SWING;
      var on = running && (beatN % BAR) === i;
      game.draw.circle(hx, y, 26, C.white, on ? 1 : 0.35);
      game.draw.circle(ax, y, 13, C.helm, on && andDone ? 1 : 0.35);
    }
    var ph = running ? beatT / SPB : (game.time.elapsed * 1.6) % 1;
    var pos = running ? (beatN % BAR) : Math.floor(game.time.elapsed * 1.6) % BAR;
    var bxp, hgt;
    if (ph < SWING) { bxp = x0 + pos * step + (ph / SWING) * step * SWING; hgt = Math.sin(ph / SWING * Math.PI) * 64; }
    else { bxp = x0 + pos * step + step * SWING + ((ph - SWING) / (1 - SWING)) * step * (1 - SWING); hgt = Math.sin((ph - SWING) / (1 - SWING) * Math.PI) * 30; }
    game.draw.circle(bxp, y - 30 - hgt, 18, C.red);
    game.draw.circle(bxp - 5, y - 35 - hgt, 6, C.white);
  }

  function drawPads() {
    for (var s = 0; s < 2; s++) {
      var p = PADS[s], lit = padFlash[s] > 0;
      var dy = lit ? 10 : 0;
      game.draw.rect(p.x - 200, p.y - 120 + 22, 400, 240, C.line);
      pill(p.x - 200, p.y - 120 + dy, 400, 220, lit ? C.gold : (s ? C.red : C.pack));
      var d = s ? 1 : -1, ax = p.x, ay = p.y - 10 + dy;
      chunk([ax + d * 90, ay, ax - d * 30, ay - 70, ax - d * 30, ay + 70], C.white, 1);
      chunk([ax - d * 40, ay - 26, ax - d * 100, ay - 26, ax - d * 100, ay + 26, ax - d * 40, ay + 26], C.white, 1);
    }
  }

  function drawScene() {
    drawWall();
    for (var i = 0; i < shards.length; i++) if (shards[i].phase === 'crack') drawShard(shards[i]);
    drawClimber();
    for (var j = 0; j < shards.length; j++) if (shards[j].phase === 'fall' || shards[j].phase === 'gone') drawShard(shards[j]);
    drawSwingMeter();
    drawPads();
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.line, 0.92);
    label('SCORE ' + score, 50, 96, 58, C.white, 'left');
    label('BEST ' + prevBest, 50, 176, 34, C.gold, 'left');
    var climbed = Math.min(TOTAL, beatN);
    label(climbed + ' / ' + TOTAL, W - 50, 96, 58, C.helm, 'right');
    for (var i = 0; i < MAX_HIT; i++) {
      var x = W - 220 + i * 74, y = 168;
      game.draw.circle(x, y, 26, C.white);
      game.draw.circle(x, y, 20, i < hits ? C.red : C.helm);
    }
    var progress = Math.min(1, songT / TIME_LIMIT);
    game.draw.rect(0, 222, W, 10, C.line);
    game.draw.rect(0, 222, W * progress, 10, C.red);
  }

  // ---- ATTRACT: 実ロジックで氷片を左右によけ、1回だけヒビの側へ振って当たる ----
  var demo = { t: 0, x: PADS[0].x, y: PADS[0].y, press: 0 };
  function demoSide(sh) {
    if (sh.b === DEMO_WRONG) return sh.type === 2 ? 1 : 0;
    return sh.type === 1 ? 1 : 0;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (DEMO_BEATS * SPB + 0.6);
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.press = 0; }
    var prev = songT;
    stepClock(dt);
    var next = null;
    for (var i = 0; i < shards.length; i++) if (shards[i].b * SPB > songT - 0.01 && (!next || shards[i].b < next.b)) next = shards[i];
    if (next) {
      var p = PADS[demoSide(next)];
      demo.x += (p.x - demo.x) * Math.min(1, dt * 9);
      demo.y += (p.y - 20 - demo.y) * Math.min(1, dt * 9);
    }
    for (var j = 0; j < shards.length; j++) {
      var tb = shards[j].b * SPB;
      if (prev < tb && songT >= tb) { doSway(demoSide(shards[j])); demo.press = 0.15; }
    }
    if (demo.press > 0) demo.press -= dt;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    for (var s = 0; s < 2; s++) if (padFlash[s] > 0) padFlash[s] -= dt;
    if (hitStop > 0) hitStop -= dt;
    if (beatFlash > 0) beatFlash -= dt * 3;
    if (andFlash > 0) andFlash -= dt * 4;
    if (hitStop <= 0) dispStep += (Math.min(TOTAL, beatN + (running ? Math.min(1, beatT / (SPB * SWING)) : 0)) - dispStep) * Math.min(1, dt * 10);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.x, demo.y, { press: demo.press > 0, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.line, 0.92);
      label(GAME_TITLE, W / 2, 116, 92 + Math.sin(t * 4) * 4, C.helm);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 198, 38, C.white);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.68, 60, C.gold);
      else label('TAP TO START', W / 2, H * 0.68, 54, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.22, W, H * 0.38, C.line, 0.9);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 110, won ? C.gold : C.red);
      label('SCORE ' + score, W / 2, H * 0.365, 64, C.white);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + hits, W / 2, H * 0.41, 38, C.ice);
      label('COMBO ' + maxCombo + '   ' + Math.min(TOTAL, beatN) + ' / ' + TOTAL, W / 2, H * 0.45, 38, C.helm);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.505, 60, C.gold);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.505, 44, C.white);
      if (!won) label('あと' + Math.max(1, TOTAL - beatN) + '段!', W / 2, H * 0.185, 70, C.gold);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.57, 40, C.white);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      for (var i = 0; i < shards.length; i++) if (shards[i].phase === 'gone') stepShard(shards[i], dt);
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, dodged: dodged, perfect: perfects, good: goods, hits: hits, maxCombo: maxCombo, steps: Math.min(TOTAL, beatN) };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) { startClock(); startSong(false); }
    } else {
      stepClock(dt);
    }

    drawScene();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 130, C.gold);
    if (over && won) label('FINISH', W / 2, H * 0.4, 120, C.gold);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
