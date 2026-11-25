// K-DS-0044v3-gorge-raft-paddle-call.js
// 渓谷ラフトの掛け合い漕ぎ — 舵取りが1小節で打った食い込む漕ぎの型を、次の自分の小節で同じ型の突き(短く押す)と溜め(押したまま次の拍を越えて離す)で打ち返す
// 操作: 画面のどこでも押すと自分の櫂を水に入れる。1往復は2小節: 1小節目は後ろの舵取りの番(上の段に打った位置が並ぶ。この間に漕ぐと割り込みでMISS)、2小節目は自分の番(下の段の印の8分の位置で押す)。四角の印=突き(押した瞬間で判定)、横に長い印=溜め(裏拍で押して拍の頭をまたぎ、印の終わりで離す。押しと離しをそれぞれ判定)。拍のずれでPERFECT/GOOD。印の無い所で押す・押し漏らし・早離し・離し遅れはMISSでその小節はそこまで。番が替わる0.5〜0.75秒前に次の番のランプが点滅して合図音が鳴る
// 終わり: 4往復(3打の食い→溜め入り→4打→溜めと裏の組み合わせ、120BPM・8小節・16秒)を漕ぎ切ってMISS 2回以内ならCLEAR(判定の点+きれいに返した往復のボーナス)。MISS 3回でGAME OVER
// @mechanic: turn_attack
// @theme: gorge_raft_paddle_call
// 世界観: 切り立った渓谷を下るゴムボートの上で、後ろの舵取りが打ってみせた食い込む漕ぎの掛け声を、舳先の漕ぎ手が自分の番の小節で同じ型に打ち返し、交互の掛け合いで急流を下っていく
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・きれいに返した往復の数・PERFECT/GOOD/MISS数
// スタイル: 70s MONO

(function(game) {
  var STYLE = { bg: ['#000000', '#0e0e0e'], main: ['#ffffff', '#ffb43c', '#46e6ff'], accent: ['#6cff7a', '#ff4a3c'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s MONO: 黒地に白ドットだけで描き、画面の帯ごとに色セロハンを貼ったように色が変わる(上=琥珀 / 川=白 / 譜面=水色 / 手元=緑)。音は矩形波の単音、無音の間で緊張を作る
  var C = { black: STYLE.bg[0], dark: STYLE.bg[1], white: STYLE.main[0], amber: STYLE.main[1], cyan: STYLE.main[2], green: STYLE.accent[0], red: STYLE.accent[1], dim: '#3a3a3a', grey: '#8a8a8a' };
  function band(y) { return y < 700 ? C.amber : (y < 1060 ? C.white : (y < 1400 ? C.cyan : C.green)); }

  var GAME_TITLE = 'RAPID CALL';
  var BPM = 120;
  var SPB = 60 / BPM;
  var E = SPB / 2;                     // 8分
  var PERFECT_W = 0.07;
  var GOOD_W = 0.12;
  var MISS_MAX = 3;
  var EX_SLOTS = 16;                   // 1往復 = 舵取り1小節 + 自分1小節 = 8分×16
  // 型: [s] = 突き(8分の位置s) / [s, e] = 溜め(sで押してeで離す)。どれも裏拍の食いを含む
  var TIERS = [
    [[[0], [3], [6]], [[0], [2], [5]], [[0], [3], [4]]],
    [[[0], [3, 6]], [[1, 4], [6]], [[0], [2], [3, 6]]],
    [[[0], [1], [3, 6]], [[1, 4], [5], [6]], [[0], [3], [5], [6]]],
    [[[0], [3, 6], [7]], [[1, 4], [5, 7]], [[0], [2], [3, 6], [7]]]
  ];
  var EXCH = TIERS.length;
  var TIME_LIMIT = 17;                 // 4往復 × 2小節 = 16秒
  var DEMO_PATS = [[[0], [3], [6]], [[0], [3, 6]]];
  var ROW_H_Y = 1140, ROW_P_Y = 1272, CELL_X0 = 200, CELL_W = 100;
  var PAD_Y = Math.round(H * 0.85);
  var RAFT_X = 470, WATER_Y = 880;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, running, beatN, beatT, songT, halfDone, readyT, hitStop, animT, scroll;
  var ex, notes, xs, holding, flash, helmT, padT, bumpT, surgeT, beatPulse;
  var score, perfects, goods, misses, cleans, over, won, outroT, prevBest, milestone;
  animT = 0; scroll = 0;

  function ri(n) { return Math.floor(game.random(0, n)) % n; }

  function buildEx(i) {
    ex = i;
    var pat = demoMode ? DEMO_PATS[i % 2] : TIERS[i][ri(TIERS[i].length)];
    notes = [];
    for (var k = 0; k < pat.length; k++) notes.push({ s: pat[k][0], e: pat[k].length > 1 ? pat[k][1] : -1, shown: false, hit: 0, rel: 0, missed: false });
    xs = { interrupted: false, failed: false, ended: false, cueP: false, cueH: false };
    holding = null;
  }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    running = false; beatN = 0; beatT = 0; songT = 0; halfDone = false;
    readyT = isDemo ? 0 : 0.8;
    hitStop = 0; flash = null; helmT = 0; padT = 0; bumpT = 0; surgeT = 0; beatPulse = 0;
    score = 0; perfects = 0; goods = 0; misses = 0; cleans = 0;
    over = false; won = false; outroT = 0; prevBest = game.best || 0; milestone = false;
    buildEx(0);
    if (isDemo) startClock();
  }

  // ---- 拍クロック(1本だけ。8分の裏は拍の半分で拾う) ----
  function startClock() {
    running = true; beatN = 0; beatT = 0; songT = 0; halfDone = false;
    onSlot(0);
  }
  function stepClock(dt) {
    beatT += dt;
    if (!halfDone && beatT >= E) { halfDone = true; onSlot(beatN * 2 + 1); }
    while (beatT >= SPB) {
      beatT -= SPB; beatN++; halfDone = false;
      onSlot(beatN * 2);
      if (beatT >= E) { halfDone = true; onSlot(beatN * 2 + 1); }
    }
    songT = beatN * SPB + beatT;
  }
  function hStart() { return ex * EX_SLOTS * E; }
  function pStart() { return hStart() + 8 * E; }
  function ts(n) { return pStart() + n.s * E; }
  function te(n) { return pStart() + n.e * E; }
  function slotF() { return (songT - hStart()) / E; }

  function playBar(helm, vol) {
    var mel = helm
      ? [['A2', 0.5], ['R', 0.5], ['A2', 0.5], ['R', 0.5], ['E2', 0.5], ['R', 0.5], ['G2', 0.5], ['R', 0.5]]
      : [['D3', 0.5], ['R', 0.5], ['D3', 0.5], ['R', 0.5], ['A2', 0.5], ['R', 0.5], ['C3', 0.5], ['R', 0.5]];
    game.audio.melody(mel, { tempo: BPM, wave: 'square', volume: 0.06 * vol });
  }

  function onSlot(g) {
    var xi = Math.floor(g / EX_SLOTS);
    if (xi >= (demoMode ? 2 : EXCH)) { if (!demoMode) finish(misses < MISS_MAX); return; }
    if (xi !== ex) { endEx(); buildEx(xi); }
    var sl = g - ex * EX_SLOTS;
    var vol = demoMode ? 0.5 : 1;
    if (sl % 2 === 0) {
      beatPulse = 0.12;
      game.audio.tone(sl % 8 === 0 ? 1760 : 1320, 0.015, { wave: 'square', volume: (sl % 8 === 0 ? 0.05 : 0.03) * vol });
      if (sl === 0 || sl === 8) playBar(sl === 0, vol);
    }
    if (sl < 8) {
      // 舵取りの番: 型どおりに櫂を打ち、上の段に印が残る
      for (var i = 0; i < notes.length; i++) {
        var n = notes[i];
        if (n.s === sl) {
          n.shown = true;
          var dur = n.e > 0 ? (n.e - n.s) * E : 0.1;
          helmT = Math.max(0.14, dur);
          game.audio.tone('E5', dur, { wave: 'square', volume: 0.09 * vol, slide: n.e > 0 ? 0 : -220 });
        }
      }
      // 自分の番の予告(0.75秒前): 下のランプが点滅し、短い2連の合図
      if (sl === 5) { xs.cueP = true; game.audio.tone(1200, 0.05, { wave: 'square', volume: 0.05 * vol }); }
      if (sl === 6) game.audio.tone(1500, 0.05, { wave: 'square', volume: 0.05 * vol });
    } else if (sl === 14) {
      // 舵取りの番の予告(0.5秒前): 上のランプが点滅し、舵取りが櫂を構える
      xs.cueH = true;
      game.audio.tone(600, 0.06, { wave: 'square', volume: 0.04 * vol });
    }
  }

  function endEx() {
    if (xs.ended) return;
    xs.ended = true;
    var all = true;
    for (var i = 0; i < notes.length; i++) if (!notes[i].hit || (notes[i].e > 0 && !notes[i].rel)) all = false;
    if (!xs.failed && all) {
      cleans++;
      score += 200 + ex * 50;
      surgeT = 0.8;
      game.audio.play('se_jump', 0.35);
      game.fx.popup('NICE', RAFT_X + 120, WATER_Y - 230, { color: C.white, size: 64 });
      game.fx.burst(RAFT_X + 200, WATER_Y, { color: C.white, count: 16, speed: 360 });
    }
    if (!demoMode && ex === 1 && !milestone) {
      milestone = true;
      game.audio.play('se_milestone', 0.45);
      game.fx.popup('2 / ' + EXCH, W / 2, H * 0.3, { color: C.amber, size: 80 });
    }
  }

  function stepPlay(dt) {
    if (!running) return;
    stepClock(dt);
    if (helmT > 0) helmT -= dt;
    if (padT > 0) padT -= dt;
    if (surgeT > 0) surgeT -= dt;
    if (beatPulse > 0) beatPulse -= dt;
    if (running && !xs.failed) {
      for (var i = 0; i < notes.length; i++) {
        var n = notes[i];
        if (!n.hit && songT > ts(n) + GOOD_W) { missAt(n, 1, n.s); break; }
      }
      if (holding && !xs.failed && songT > te(holding) + GOOD_W) { var h = holding; holding = null; missAt(h, 1, h.e); }
    }
    if (!demoMode && !over && songT > TIME_LIMIT) finish(misses < MISS_MAX);
  }

  function cellCX(s) { return CELL_X0 + (s + 0.5) * CELL_W; }

  function missAt(n, row, slot) {
    misses++;
    hitStop = 0.4; bumpT = 0.45;
    if (n) n.missed = true;
    if (row === 1) { xs.failed = true; holding = null; }
    flash = { row: row, slot: Math.max(0, Math.min(7, slot)), t: 0.4 };
    game.feedback.bad(cellCX(flash.slot), (row === 0 ? ROW_H_Y : ROW_P_Y) - 100, { text: 'MISS', shake: demoMode ? 4 : 12 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function grade(d, x, y) {
    if (Math.abs(d) <= PERFECT_W) {
      perfects++; score += 100;
      game.feedback.good(x, y, { text: 'PERFECT', color: C.white, size: 50, count: 8, volume: 0.22, sound: 'se_good' });
      return 2;
    }
    goods++; score += 50;
    game.feedback.good(x, y, { text: 'GOOD', color: C.cyan, size: 44, count: 5, volume: 0.18, sound: 'se_good' });
    return 1;
  }

  // 櫂を入れる(入力とデモで共通)
  function pressAt() {
    if (!running || over || hitStop > 0) return 'none';
    var t = songT;
    padT = 0.14;
    var best = null, bd = 1e9;
    for (var i = 0; i < notes.length; i++) {
      if (notes[i].hit) continue;
      var d = Math.abs(t - ts(notes[i]));
      if (d < bd) { bd = d; best = notes[i]; }
    }
    if (best && bd <= GOOD_W && !xs.failed) {
      best.hit = grade(t - ts(best), cellCX(best.s), ROW_P_Y - 100);
      game.audio.tone('A4', best.e > 0 ? (best.e - best.s) * E : 0.08, { wave: 'square', volume: 0.1 });
      game.audio.tone(140, 0.08, { wave: 'sawtooth', volume: 0.05, slide: -60 });
      if (best.e > 0) holding = best;
      return 'ok';
    }
    if (t < pStart() - GOOD_W) {
      // 舵取りの番に漕いだ = 割り込み(1小節に1回だけ数える)
      if (!xs.interrupted) { xs.interrupted = true; missAt(null, 0, Math.floor(slotF())); return 'miss'; }
      game.audio.tone(110, 0.05, { wave: 'square', volume: 0.05 });
      return 'none';
    }
    if (xs.failed) { game.audio.tone(110, 0.05, { wave: 'square', volume: 0.05 }); return 'none'; }
    missAt(null, 1, Math.floor(slotF()) - 8);
    return 'miss';
  }

  // 櫂を抜く(溜めの終わり)
  function releaseAt() {
    if (!holding) return;
    var n = holding;
    holding = null;
    if (xs.failed || over) return;
    var d = songT - te(n);
    if (d < -GOOD_W) { missAt(n, 1, n.e - 1); return; }
    n.rel = grade(d, cellCX(n.e - 1), ROW_P_Y - 100);
    game.audio.tone('E5', 0.06, { wave: 'square', volume: 0.07, slide: 300 });
  }

  function finish(ok) {
    if (over) return;
    endEx();
    over = true; won = ok; outroT = 1.6; running = false; holding = null;
    if (ok) {
      score += (MISS_MAX - 1 - misses) * 100;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 4; i++) game.fx.burst(game.random(200, 880), game.random(780, 1000), { color: C.white, count: 22, speed: 440 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || readyT > 0) return;
    var res = pressAt();
    if (res === 'none') game.audio.play('se_tap', 0.15);
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !holding) return;
    game.audio.tone(300, 0.03, { wave: 'square', volume: 0.04 });
    releaseAt();
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.dim, bold: true, align: align || 'center', font: 'monospace' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center', font: 'monospace' });
  }

  var HELM = [
    ['...www...', '.wwwwwww.', '...wkw...', '...www...', '..wwwww..', '.ww.w.ww.', 'w..www..w', '...www...', '..ww.ww..'],
    ['...www...', '.wwwwwww.', '...wkw...', '...www...', '..wwwww.w', '.ww.w.ww.', '...www...', '...www...', '..ww.ww..']
  ];
  var PADL = [
    ['..wwww...', '.wwwwww..', '.wwwwww..', '..wkww...', '..wwww...', '.wwwwww..', 'w.wwww.w.', '..wwww...', '..ww.ww..'],
    ['..wwww...', '.wwwwww..', '.wwwwww..', '..wkww...', '..wwww...', '.wwwwwwww', '..wwww...', '..wwww...', '..ww.ww..']
  ];
  var RAFT = [
    '..wwwwwwwwwwwwwwwwwwww..',
    '.wwwwwwwwwwwwwwwwwwwwww.',
    'ww.ww.ww.ww.ww.ww.ww.www',
    '.wwwwwwwwwwwwwwwwwwwwww.'
  ];
  var ROCK = ['...ww...', '..wwww..', '.ww.www.', 'wwwwwwww'];

  function hsh(n) { var v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); }

  function drawGorge() {
    game.draw.gradient(0, H, [[0, C.black], [0.5, C.dark], [1, C.black]]);
    // 星(空のすき間)
    for (var s = 0; s < 18; s++) {
      var sx = (s * 197 + 40) % W, sy = 300 + (s * 89) % 200;
      if (Math.floor(animT * 2 + s) % 5) game.draw.rect(sx, sy, 6, 6, C.amber, 0.6);
    }
    // 奥の岩壁(ディザ)と手前の張り出し(白ドット)。左へ流れる
    var col = C.amber;
    var off1 = scroll * 0.35, off2 = scroll;
    for (var c = -1; c < 47; c++) {
      var i1 = Math.floor((c * 24 + off1) / 24);
      var x1 = c * 24 - ((off1 % 24) + 24) % 24;
      var h1 = 70 + Math.floor(hsh(i1) * 7) * 24;
      for (var yy = 700 - h1; yy < 700; yy += 12) game.draw.rect(x1 + ((yy / 12) % 2) * 12, yy, 12, 6, col, 0.45);
      var i2 = Math.floor((c * 24 + off2) / 24);
      var x2 = c * 24 - ((off2 % 24) + 24) % 24;
      var h2 = 48 + Math.floor(hsh(i2 + 50) * 6) * 24;
      game.draw.rect(x2, 230, 24, h2, col);
      game.draw.rect(x2 + 4, 230 + h2, 16, 8, col);
    }
    // 川面と白波
    game.draw.rect(0, WATER_Y + 30, W, 4, C.white);
    for (var w2 = 0; w2 < 34; w2++) {
      var wx = ((w2 * 151 - scroll * 1.6) % (W + 240) + W + 240) % (W + 240) - 120;
      var wy = WATER_Y + 60 + (w2 % 5) * 34;
      game.draw.rect(wx, wy, 36 + (w2 % 3) * 22, 6, C.white, w2 % 2 ? 0.9 : 0.5);
    }
    // 流れてくる岩(往復ごとに1つ)
    var rx = W + 160 - ((songT % (EX_SLOTS * E)) / (EX_SLOTS * E)) * (W + 400);
    game.draw.sprite(ROCK, { w: C.white }, rx, WATER_Y + 150, 14, { anchor: 'center' });
  }

  function drawRaft() {
    var shake = bumpT > 0 ? Math.sin(bumpT * 90) * 14 : 0;
    var surge = surgeT > 0 ? Math.sin((surgeT / 0.8) * Math.PI) * 40 : 0;
    var bob = Math.sin(animT * 5) * 6;
    var x = RAFT_X + shake + surge, y = WATER_Y + bob - (surge * 0.5);
    var fl = hitStop > 0 && bumpT > 0;
    // 舵取り(後ろ)
    var hx = x - 110, hy = y - 70;
    var hDown = helmT > 0;
    var hPal = { w: xs.cueH && !hDown && Math.floor(game.time.elapsed * 10) % 2 === 0 ? C.amber : C.white, k: C.black };
    game.draw.sprite(HELM[hDown ? 1 : 0], hPal, hx, hy, 12, { anchor: 'center' });
    if (hDown) game.draw.line(hx + 40, hy + 10, hx - 40, WATER_Y + 70, C.white, 10);
    else game.draw.line(hx + 50, hy - 10, hx + 10, hy - 110, C.white, 10);
    // 漕ぎ手(舳先・自分)
    var px = x + 130, py = y - 70;
    var pDown = padT > 0 || !!holding;
    game.draw.sprite(PADL[pDown ? 1 : 0], { w: fl ? C.red : C.white, k: C.black }, px, py, 12, { anchor: 'center' });
    if (pDown) game.draw.line(px + 30, py + 10, px + 110, WATER_Y + 80, C.white, 10);
    else game.draw.line(px + 40, py - 10, px + 100, py - 100, C.white, 10);
    // ゴムボート
    game.draw.sprite(RAFT, { w: fl ? C.red : C.white }, x, y + 10, 16, { anchor: 'center' });
    if (pDown && padT > 0.08) game.draw.circle(px + 110, WATER_Y + 60, 40, C.white, 0.5);
  }

  function drawRow(y, isPlayer) {
    var sf = running ? slotF() : -1;
    var active = isPlayer ? (sf >= 8) : (sf >= 0 && sf < 8);
    var col = C.cyan;
    var x0 = CELL_X0, x1 = CELL_X0 + 8 * CELL_W;
    game.draw.line(x0, y - 50, x1, y - 50, active ? col : C.dim, 4);
    game.draw.line(x0, y + 50, x1, y + 50, active ? col : C.dim, 4);
    for (var s = 0; s <= 8; s++) {
      var x = CELL_X0 + s * CELL_W;
      game.draw.line(x, y - (s % 2 === 0 ? 62 : 40), x, y + (s % 2 === 0 ? 62 : 40), s % 2 === 0 ? col : C.dim, s % 2 === 0 ? 5 : 3);
    }
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (!n.shown) continue;
      var nx = CELL_X0 + n.s * CELL_W + 14;
      var nw = n.e > 0 ? (n.e - n.s) * CELL_W - 28 : CELL_W - 28;
      var nh = n.e > 0 ? 40 : 60;
      if (!isPlayer) { game.draw.rect(nx, y - nh / 2, nw, nh, C.cyan); continue; }
      if (n.missed) {
        game.draw.line(nx, y - 30, nx + Math.min(nw, 72), y + 30, C.red, 8);
        game.draw.line(nx, y + 30, nx + Math.min(nw, 72), y - 30, C.red, 8);
      } else if (n.hit) {
        var fillW = nw;
        if (n.e > 0 && holding === n) fillW = Math.max(20, Math.min(nw, ((songT - ts(n)) / ((n.e - n.s) * E)) * nw));
        game.draw.rect(nx, y - nh / 2, nw, nh, C.cyan, 0.25);
        game.draw.rect(nx, y - nh / 2, fillW, nh, n.hit === 2 ? C.white : C.cyan);
      } else {
        var soon = sf >= 8 && !xs.failed && songT > ts(n) - 0.35 && songT < ts(n);
        var oc = soon && Math.floor(game.time.elapsed * 14) % 2 === 0 ? C.white : C.cyan;
        game.draw.line(nx, y - nh / 2, nx + nw, y - nh / 2, oc, 4);
        game.draw.line(nx, y + nh / 2, nx + nw, y + nh / 2, oc, 4);
        game.draw.line(nx, y - nh / 2, nx, y + nh / 2, oc, 4);
        game.draw.line(nx + nw, y - nh / 2, nx + nw, y + nh / 2, oc, 4);
      }
    }
    if (flash && flash.t > 0 && flash.row === (isPlayer ? 1 : 0)) {
      var fx = cellCX(flash.slot);
      game.draw.rect(fx - 60, y - 70, 120, 140, C.white, 0.8 * (flash.t / 0.4));
    }
    if (active) {
      var cx = CELL_X0 + (isPlayer ? sf - 8 : sf) * CELL_W;
      game.draw.rect(cx - 3, y - 70, 6, 140, C.white);
    }
    // 番のランプ(舵取り=上 / 自分=下)
    var lit = active;
    var blink = isPlayer ? (xs.cueP && sf < 8) : (xs.cueH && sf >= 14);
    var on = lit || (blink && Math.floor(game.time.elapsed * 10) % 2 === 0);
    game.draw.circle(110, y, 42, on ? col : C.dim);
    game.draw.circle(110, y, 28, C.black);
    game.draw.sprite(isPlayer ? PADL[0] : HELM[0], { w: on ? col : C.grey, k: C.black }, 110, y, 5, { anchor: 'center' });
  }

  function drawPad() {
    var sf = running ? slotF() : -1;
    var mine = sf >= 8 - (xs.cueP ? 3 : 0);
    var pressing = padT > 0 || !!holding;
    var x0 = 120, x1 = W - 120, y0 = PAD_Y - 170, y1 = PAD_Y + 170;
    game.draw.rect(x0, y0, x1 - x0, y1 - y0, mine ? C.green : '#141414', mine ? (pressing ? 0.45 : 0.16) : 1);
    var lc = mine ? C.green : C.dim;
    game.draw.line(x0, y0, x1, y0, lc, 6); game.draw.line(x0, y1, x1, y1, lc, 6);
    game.draw.line(x0, y0, x0, y1, lc, 6); game.draw.line(x1, y0, x1, y1, lc, 6);
    // 櫂の絵
    var k = pressing ? 30 : 0;
    game.draw.line(W / 2 - 160, PAD_Y - 90 + k, W / 2 + 120, PAD_Y + 60 + k, lc, 14);
    game.draw.rect(W / 2 + 100, PAD_Y + 40 + k, 90, 46, lc);
    // 拍の脈
    if (beatPulse > 0) game.draw.circle(W / 2, PAD_Y, 200 + (0.12 - beatPulse) * 400, lc, 0.18);
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, C.black, 0.18); }

  function drawScene() {
    drawGorge();
    drawRaft();
    drawRow(ROW_H_Y, false);
    drawRow(ROW_P_Y, true);
    drawPad();
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.black);
    label('SCORE ' + score, 60, 90, 50, C.amber, 'left');
    label('BEST ' + prevBest, 60, 165, 32, C.amber, 'left');
    label(Math.min(ex + 1, EXCH) + ' / ' + EXCH, W - 60, 90, 54, C.amber, 'right');
    for (var i = 0; i < MISS_MAX; i++) game.draw.rect(W - 250 + i * 70, 148, 44, 36, i < misses ? C.red : C.dim);
    var prog = Math.min(1, songT / (EXCH * EX_SLOTS * E));
    game.draw.rect(0, 220, W, 10, C.dim);
    game.draw.rect(0, 220, W * prog, 10, C.amber);
  }

  // ---- ATTRACT: 実ロジックで1往復目は型どおり返し、2往復目は溜めを早く離してMISS ----
  var demo = { t: 0, press: false, pressT: 0 };
  var DEMO_LEN = 2 * EX_SLOTS * E + 0.25;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) initGame(true);
    stepPlay(dt);
    if (running && !xs.failed && hitStop <= 0) {
      for (var i = 0; i < notes.length; i++) {
        if (!notes[i].hit && songT >= ts(notes[i])) { pressAt(); demo.pressT = 0.14; break; }
      }
      if (holding) {
        var relT = ex === 1 ? ts(holding) + E : te(holding);
        if (songT >= relT) releaseAt();
      }
    }
    if (demo.pressT > 0) demo.pressT -= dt;
    demo.press = demo.pressT > 0 || !!holding;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (hitStop > 0) hitStop -= dt;
    else { animT += dt; scroll += dt * (240 + (surgeT > 0 ? 420 : 0)); }
    if (bumpT > 0) bumpT -= dt;
    if (flash && flash.t > 0) flash.t -= dt;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(W / 2 + 40, PAD_Y - 10 + (demo.press ? 20 : 0), { press: demo.press, scale: 16 });
      game.draw.rect(0, 0, W, 230, C.black);
      label(GAME_TITLE, W / 2, 104 + Math.sin(t * 3) * 3, 86, C.amber);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 194, 36, C.amber);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.965, 46, C.green);
      else label('TAP TO START', W / 2, H * 0.965, 42, C.white);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(60, H * 0.26, W - 120, H * 0.33, C.black, 0.92);
      game.draw.line(60, H * 0.26, W - 60, H * 0.26, C.amber, 6);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.32, 100, won ? C.white : C.red);
      label('SCORE ' + score, W / 2, H * 0.385, 58, C.white);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.43, 34, C.cyan);
      label(cleans + ' / ' + EXCH, W / 2, H * 0.475, 46, C.white);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.52, 52, C.amber);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.52, 40, C.amber);
      if (!won) label('あと' + Math.max(1, EXCH - Math.min(EXCH, ex)) + '往復!', W / 2, H * 0.225, 60, C.amber);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.565, 36, C.white);
      scanlines();
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, cleanRounds: cleans, perfect: perfects, good: goods, miss: misses };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) startClock();
    } else {
      stepPlay(dt);
    }

    drawScene();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.47, 110, C.white);
    if (over && won) label('FINISH', W / 2, H * 0.47, 100, C.white);
    scanlines();
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
