// I-DS-0025v2-tideflat-clam-spot.js
// 干潟のあさり見抜き — 平らな砂地の小さな跡から、あさりの「二つ並んだ呼吸穴」だけを見抜いて掘り当てる
// 操作: 菱形の砂地のマスをタップするとそこを掘る。あさりの跡は小さな穴が2つ寄り添い、ときどき潮を吹く。カニ穴・ゴカイの盛り土・小石・離れた穴を掘ると外れ
// 終わり: 満ち潮が干潟を覆い切る(15秒)前に7個掘ればCLEAR。外れを3回掘る、または潮に覆われるとGAME OVER
// @mechanic: spot
// @theme: spring_tideflat_clamming
// 世界観: 春の大潮の干潟で、潮干狩りの母さんが満ちてくる潮から逃げながら、砂の上のかすかな呼吸穴を見抜いてあさりだけを熊手で掘り出していく(3区画目ほどまぎらわしい跡が増える)
// 残るもの: 正誤(CLEAR/GAME OVER) + 掘ったあさりの数・外れ数・スコア
// スタイル: 80s ISO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s ISO: 菱形グリッドの床、高さは影の距離で示す(奥でも小さくしない)
  var STYLE = { bg: ['#e8d49a', '#c9ad78'], main: ['#e0c890', '#5aa0c8', '#f0e0d0'], accent: ['#e85a3a', '#3a2e24'] };
  var V = {
    sand: STYLE.main[0], sandDk: '#b8986a', wet: '#a8916a', sea: STYLE.main[1], foam: '#d8f0f8', shell: STYLE.main[2],
    hat: STYLE.accent[0], ink: STYLE.accent[1], hole: '#4a3a2a', crab: '#d8402a', ok: '#3a9a5a', stone: '#8a8a84',
  };

  var GAME_TITLE = 'CLAM SPOT';
  var TIME_LIMIT = 15;
  var NEEDED = 7;
  var MISS_MAX = 3;
  var TW = 240, TH = 120, Y0 = Math.round(H * 0.3), NROW = 12;
  var TIDE0 = Y0 + NROW * (TH / 2) + 20, TIDE_RISE = 460;
  var PATCHES = [
    { clams: 2, decoys: ['crab', 'worm', 'stone', 'crab', 'worm', 'stone'] },
    { clams: 2, decoys: ['crab', 'worm', 'stone', 'single', 'single', 'crab', 'worm', 'single'] },
    { clams: 3, decoys: ['crab', 'single', 'far', 'far', 'single', 'stone', 'far', 'single', 'worm'] },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var tiles, patch, left, found, misses, empties, combo, score, finalScore, bucket, pops;
  var timeLeft, readyT, stopT, stopObj, fin, cleared, postT, digT, sadT, warnT, patchT, playT, lastCovered, rowWarnT, rowWarnY;

  // 潮干狩りの母さん(つば広帽子+熊手)
  var MOM_A = ['.hhhhhhhh.', 'hhhhhhhhhh', '..ffffff..', '..fkffkf..', '..ffrrff..', '...ffff...', '.bbbbbbbb.', 'fbbbbbbbbt', '..bbbbbbt.', '..pppppt..', '..pp..pt..'];
  var MOM_B = ['.hhhhhhhh.', 'hhhhhhhhhh', '..ffffff..', '..fkffkf..', '..ffrrff..', '...ffff...', '.bbbbbbbb.', '.bbbbbbbbt', 'fbbbbbbbt.', '..pppppt..', '..pp..pt..'];
  var MOM_DIG = ['..........', '.hhhhhhhh.', 'hhhhhhhhhh', '..ffffff..', '..fkffkf..', '..fkrrkf..', '.bbbbbbbb.', 'fbbbbbbbbf', '..bbbbbb..', '..pppppp.t', '..pp..pptt'];
  var MOM_SAD = ['.hhhhhhhh.', 'hhhhhhhhhh', '..ffffff..', '..fkffkf..', '..fkkkkf..', '...ffff...', '.bbbbbbbb.', 'fbbbbbbbbf', '..bbbbbb..', '..pppppp..', '..pp..pp..'];
  var MOM_PAL = { h: '#f0d070', f: '#f0c8a0', k: '#3a2e24', r: '#e07a6a', b: '#5a7ac8', p: '#4a5a80', t: '#9a7a4a' };
  var CLAM = ['..ssss..', '.swswsws.', 'sswsswss', 'sskssks.', '.ssssss.', '..ssss..'];
  var CRAB_A = ['r......r', 'rr....rr', '.rrrrrr.', 'rrkrrkrr', '.rrrrrr.', 'r.r..r.r'];
  var CRAB_B = ['rr....rr', '.r....r.', '.rrrrrr.', 'rrkrrkrr', '.rrrrrr.', '.r.rr.r.'];

  function out(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#00000040', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function tilePos(r, c) { return { x: 120 + c * TW + (r % 2) * (TW / 2), y: Y0 + r * (TH / 2) }; }

  function makeTiles() {
    tiles = [];
    for (var r = 0; r < NROW; r++) for (var c = 0; c < 4; c++) {
      var p = tilePos(r, c);
      tiles.push({ r: r, c: c, x: p.x, y: p.y, kind: '', dug: 0, ph: game.random(0, 6), flash: 0 });
    }
  }

  function tideAt(tl) { return TIDE0 - (1 - Math.max(0, tl) / TIME_LIMIT) * TIDE_RISE; }
  function tideY() { return tideAt(timeLeft); }
  function coveredRows(ty) { var n = 0; for (var r = 0; r < NROW; r++) if (Y0 + r * (TH / 2) > ty - 10) n++; return n; }
  function underWater(tl) { return tl.y > tideY() - 10; }

  function setupPatch(k) {
    patch = k;
    for (var i = 0; i < tiles.length; i++) { tiles[i].kind = ''; tiles[i].dug = 0; }
    var cfg = PATCHES[k];
    var pool = [];
    var last = k === PATCHES.length - 1;
    var lim = last ? Math.min(tideY() - 160, TIDE0 - TIDE_RISE - 40) : tideY() - 160;
    for (var j = 0; j < tiles.length; j++) if (tiles[j].y < lim) pool.push(tiles[j]);
    var list = [];
    var nc = last ? Math.max(cfg.clams, NEEDED - found) : cfg.clams;
    for (var a = 0; a < nc; a++) list.push('clam');
    for (var b = 0; b < cfg.decoys.length; b++) list.push(cfg.decoys[b]);
    for (var n = 0; n < list.length && pool.length > 0; n++) {
      var pick = Math.floor(game.random(0, pool.length)) % pool.length;
      pool[pick].kind = list[n];
      pool[pick].ph = game.random(0, 6);
      pool.splice(pick, 1);
    }
    left = 0;
    for (var q = 0; q < tiles.length; q++) if (tiles[q].kind === 'clam') left++;
    patchT = 0.5;
  }

  function initGame() {
    makeTiles();
    found = 0; misses = 0; empties = 0; combo = 0; score = 0; finalScore = 0; bucket = 0; pops = [];
    timeLeft = TIME_LIMIT; readyT = 0.8; stopT = 0; stopObj = null; fin = false; cleared = false; postT = 0;
    digT = 0; sadT = 0; warnT = 0; playT = 0; rowWarnT = 0; rowWarnY = 0;
    lastCovered = coveredRows(tideAt(TIME_LIMIT - 0.6));
    setupPatch(0);
  }

  function tileAt(x, y) {
    var best = null, bd = 1.0;
    for (var i = 0; i < tiles.length; i++) {
      var tl = tiles[i];
      var d = Math.abs(x - tl.x) / (TW / 2) + Math.abs(y - tl.y) / (TH / 2);
      if (d < bd) { bd = d; best = tl; }
    }
    return best;
  }

  // 掘る(本番もデモも同じ判定)
  function dig(tl) {
    if (!tl || tl.dug) return;
    if (underWater(tl)) { game.audio.tone('C4', 0.05, { wave: 'triangle', volume: 0.05 }); game.fx.burst(tl.x, tl.y, { color: V.foam, count: 4, speed: 120 }); return; }
    tl.dug = 1; tl.flash = 0.3;
    if (tl.kind === 'clam') {
      found++; left--; combo++; bucket++;
      var pts = 100 * Math.min(3, combo);
      score += pts; digT = 0.5;
      pops.push({ x: tl.x, y: tl.y, t: 0, kind: 'clam' });
      game.feedback.good(tl.x, tl.y - 60, { text: combo >= 3 ? 'PERFECT' : 'GOOD', color: V.ok, size: 56 });
      game.audio.play('se_coin', 0.35);
      game.fx.popup('+' + pts, tl.x, tl.y - 140, { color: V.hat, size: 40 });
      if (mode === S.PLAYING && found >= NEEDED) { stopT = 0.45; stopObj = { kind: 'win', tl: tl }; return; }
      if (left <= 0 && mode === S.PLAYING) {
        game.audio.play('se_milestone', 0.45);
        game.fx.popup('NICE', W / 2, H * 0.27, { color: V.hat, size: 84 });
        if (patch < PATCHES.length - 1) setupPatch(patch + 1);
      }
      return;
    }
    if (tl.kind === '') {
      empties++;
      game.audio.play('se_tap', 0.15);
      game.fx.burst(tl.x, tl.y, { color: V.sandDk, count: 5, speed: 140 });
      return;
    }
    combo = 0; misses++; sadT = 0.8;
    if (tl.kind === 'crab') pops.push({ x: tl.x, y: tl.y, t: 0, kind: 'crab' });
    if (mode === S.PLAYING && misses >= MISS_MAX) {
      stopT = 0.5; stopObj = { kind: 'miss', tl: tl };
      game.fx.flash('#ffffff', 0.15);
      game.audio.tone('C3', 0.3, { wave: 'sawtooth', volume: 0.1, slide: -60 });
      return;
    }
    game.feedback.bad(tl.x, tl.y - 60, { text: 'MISS', color: V.crab, size: 56 });
  }

  function stepWorld(dt) {
    for (var i = 0; i < tiles.length; i++) if (tiles[i].flash > 0) tiles[i].flash -= dt;
    for (var p = pops.length - 1; p >= 0; p--) { pops[p].t += dt; if (pops[p].t > 0.9) pops.splice(p, 1); }
    if (digT > 0) digT -= dt;
    if (sadT > 0) sadT -= dt;
    if (patchT > 0) patchT -= dt;
    if (rowWarnT > 0) rowWarnT -= dt;
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = score + (win ? Math.ceil(timeLeft) * 40 + (misses === 0 ? 200 : 0) : 0);
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 6; i++) game.fx.burst(140 + i * 160, H * 0.5 + (i % 2) * 150, { color: i % 2 ? V.shell : V.hat, count: 18, speed: 520 });
      game.fx.flash(V.foam, 0.22);
    }
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { game.audio.play('se_tap'); mode = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (fin || stopT > 0 || readyT > 0) return;
    var tl = tileAt(x, y);
    if (tl && !tl.dug) { game.audio.tone('G4', 0.04, { wave: 'square', volume: 0.05 }); dig(tl); }
    else game.audio.play('se_tap', 0.08);
  });

  // ---- 描画 ----
  function diamond(x, y, col, w) {
    game.draw.line(x - TW / 2, y, x, y - TH / 2, col, w);
    game.draw.line(x, y - TH / 2, x + TW / 2, y, col, w);
    game.draw.line(x + TW / 2, y, x, y + TH / 2, col, w);
    game.draw.line(x, y + TH / 2, x - TW / 2, y, col, w);
  }

  function drawMark(tl, t) {
    var x = tl.x, y = tl.y;
    var big = stopObj && stopT > 0 && stopObj.tl === tl;
    var sc = big ? 1.6 : 1;
    if (big && Math.floor(t * 16) % 2 === 0) game.draw.circle(x, y, 60, '#ffffff', 0.7);
    if (tl.dug) {
      game.draw.circle(x, y + 4, 34, V.wet);
      game.draw.circle(x, y, 26, V.hole, 0.6);
      return;
    }
    if (tl.kind === 'clam') {
      var br = 1 + Math.sin(t * 3 + tl.ph) * 0.15;
      game.draw.circle(x - 14 * sc, y, 9 * br * sc, V.hole);
      game.draw.circle(x + 14 * sc, y, 9 * br * sc, V.hole);
      var sp = (t * 0.55 + tl.ph) % 1;
      if (sp < 0.16) { var h = sp / 0.16 * 60; game.draw.line(x, y - 4, x + 4, y - 4 - h, V.foam, 6); game.draw.circle(x + 4, y - 4 - h, 8, V.foam); }
    } else if (tl.kind === 'single') {
      game.draw.circle(x, y, 9 * sc, V.hole);
    } else if (tl.kind === 'far') {
      game.draw.circle(x - 40 * sc, y, 9 * sc, V.hole);
      game.draw.circle(x + 40 * sc, y + 8, 9 * sc, V.hole);
    } else if (tl.kind === 'crab') {
      game.draw.circle(x, y, 20 * sc, V.hole);
      for (var k = 0; k < 6; k++) game.draw.circle(x + Math.cos(k + tl.ph) * 34 * sc, y + Math.sin(k + tl.ph) * 17 * sc, 5, V.sandDk);
    } else if (tl.kind === 'worm') {
      for (var w = 0; w < 4; w++) game.draw.circle(x - 22 + w * 15, y - w * 4 + Math.sin(w * 2) * 6, 10 * sc, V.sandDk);
    } else if (tl.kind === 'stone') {
      game.draw.circle(x + 10, y + 8, 16 * sc, '#00000030');
      game.draw.circle(x, y - 4, 16 * sc, V.stone);
      game.draw.circle(x - 5, y - 9, 5 * sc, '#c8c8c0');
    }
  }

  function drawFlat(t) {
    game.draw.gradient(0, H, [[0, '#a8d8f0'], [0.12, '#d8ecf0'], [0.2, STYLE.bg[0]], [0.7, STYLE.bg[1]], [1, '#8a7a5a']]);
    // 遠い堤防と沖の海
    game.draw.rect(0, H * 0.17, W, 40, V.sea, 0.6);
    for (var b = 0; b < 8; b++) game.draw.rect(b * 150 + ((t * 20) % 150), H * 0.17 + 14, 60, 6, V.foam, 0.7);
    // 菱形グリッド
    for (var i = 0; i < tiles.length; i++) diamond(tiles[i].x, tiles[i].y, '#00000022', 3);
    for (var j = 0; j < tiles.length; j++) drawMark(tiles[j], t);
    // 掘り出し演出(高さ=影との距離)
    for (var p = 0; p < pops.length; p++) {
      var o = pops[p], lift = Math.sin(Math.min(1, o.t / 0.6) * Math.PI) * 90;
      game.draw.circle(o.x + lift * 0.3, o.y + 6, 26, '#00000030');
      if (o.kind === 'clam') game.draw.sprite(CLAM, { s: V.shell, w: '#c8a888', k: V.ink }, o.x, o.y - lift, 9, { anchor: 'center' });
      else game.draw.sprite(Math.floor(t * 10) % 2 ? CRAB_A : CRAB_B, { r: V.crab, k: V.ink }, o.x + o.t * 160, o.y - lift * 0.4, 9, { anchor: 'center' });
    }
    // 満ち潮(手前から)
    var ty = tideY();
    if (ty < H * 0.8) {
      game.draw.rect(0, ty, W, H * 0.8 - ty, V.sea, 0.55);
      for (var f = 0; f < 9; f++) game.draw.circle(f * 135 + Math.sin(t * 3 + f) * 20, ty, 26, V.foam, 0.8);
    }
    // 次に沈む列の予告(0.6秒前から点滅)
    if (rowWarnT > 0 && Math.floor(t * 12) % 2 === 0) {
      for (var w = 0; w < tiles.length; w++) if (Math.abs(tiles[w].y - rowWarnY) < 2) diamond(tiles[w].x, tiles[w].y, V.crab, 5);
    }
  }

  function drawMom(t) {
    var fr = sadT > 0 || (fin && !cleared) ? MOM_SAD : (digT > 0 || (fin && cleared)) ? MOM_DIG : (Math.floor(t * 2) % 2 ? MOM_A : MOM_B);
    var hop = fin && cleared ? -Math.abs(Math.sin(t * 12)) * 26 : Math.sin(t * 2.4) * 4;
    game.draw.rect(0, H * 0.8, W, H * 0.2, '#d8c088');
    for (var g = 0; g < 7; g++) diamond(80 + g * 160, H * 0.86 + (g % 2) * 40, '#00000012', 3);
    game.draw.circle(210, H * 0.925, 80, '#00000030');
    game.draw.sprite(fr, MOM_PAL, 190, H * 0.87 + hop, 16, { anchor: 'center' });
    // バケツ(進捗)
    game.draw.rect(560, H * 0.84, 420, 160, '#5aa0c8');
    game.draw.rect(560, H * 0.84, 420, 20, '#3a7aa8');
    for (var i = 0; i < NEEDED; i++) {
      var bx = 610 + i * 54, by = H * 0.84 + 90;
      if (i < bucket) game.draw.sprite(CLAM, { s: V.shell, w: '#c8a888', k: V.ink }, bx, by, 5, { anchor: 'center' });
      else game.draw.circle(bx, by, 14, '#3a7aa8');
    }
  }

  function drawHud(t) {
    var low = timeLeft < 4 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(70, 34, W - 140, 30, '#3a7aa8');
    game.draw.rect(76, 40, (W - 152) * Math.max(0, timeLeft / TIME_LIMIT), 18, low ? V.crab : V.foam);
    out(found + ' / ' + NEEDED, W / 2, 124, 54, V.ink);
    for (var m = 0; m < MISS_MAX; m++) game.draw.circle(W - 110 - m * 64, 180, 22, m < misses ? V.crab : '#ffffff80');
    for (var p = 0; p < PATCHES.length; p++) game.draw.circle(110 + p * 60, 180, 18, p < patch ? V.ok : p === patch ? V.hat : '#ffffff80');
    out('' + score, W - 200, 124, 36, V.hat);
  }

  function drawScene(t) {
    drawFlat(t);
    drawMom(t);
    for (var sl = 0; sl < H; sl += 8) game.draw.rect(0, sl, W, 2, '#000000', 0.04);
  }

  // ---- ATTRACT: 本物の dig() で 二つ穴を掘る → カニ穴を掘って外す → もう一つの二つ穴を掘る ----
  var demo = { t: 0, x: W / 2, y: H * 0.9, press: false, step: 0, seq: [] };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.8;
    if (cyc < dt || demo.t <= dt) {
      initGame(); readyT = 0;
      for (var i = 0; i < tiles.length; i++) tiles[i].kind = '';
      var A = tiles[4 * 2 + 1], B = tiles[4 * 4 + 2], C = tiles[4 * 6 + 1], D = tiles[4 * 3 + 3], E = tiles[4 * 1 + 2], F = tiles[4 * 7 + 0];
      A.kind = 'clam'; B.kind = 'crab'; C.kind = 'clam'; D.kind = 'worm'; E.kind = 'single'; F.kind = 'stone';
      A.ph = 0; C.ph = 0.5; left = 2;
      demo.seq = [A, B, C]; demo.step = 0;
    }
    stepWorld(dt);
    var seg = Math.min(2, Math.floor(cyc / 1.3)), u = cyc - seg * 1.3;
    var tg = demo.seq[seg];
    var tx = cyc < 3.9 ? tg.x : W / 2, ty = cyc < 3.9 ? tg.y + 20 : H * 0.92;
    demo.press = cyc < 3.9 && u > 0.85 && u < 1.05;
    if (cyc < 3.9 && u > 0.9 && demo.step === seg) { demo.step = seg + 1; dig(tg); }
    demo.x += (tx - demo.x) * Math.min(1, dt * 7);
    demo.y += (ty - demo.y) * Math.min(1, dt * 7);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 14 });
      out(GAME_TITLE, W / 2, H * 0.065 + Math.sin(t * 2) * 5, 100, V.hat);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.11, 40, V.ink);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.975, 46, V.ink);
      else out('TAP TO START', W / 2, H * 0.975, 40, V.hat);
      return;
    }

    if (mode === S.RESULT) {
      stepWorld(dt);
      drawScene(t);
      game.draw.rect(90, H * 0.3, W - 180, 480, '#fff8e8', 0.92);
      out(cleared ? 'CLEAR' : (timeLeft <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.35, 96, cleared ? V.ok : V.crab);
      out('SCORE ' + finalScore, W / 2, H * 0.41, 60, V.ink);
      out(found + ' / ' + NEEDED + '   MISS ' + misses, W / 2, H * 0.46, 42, V.sea);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.51, 56, V.hat);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.51, 42, V.ink);
      if (!cleared) out('あと' + (NEEDED - found) + '個!', W / 2, H * 0.27, 64, V.crab);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.975, 40, V.ink);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      stepWorld(dt);
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { clams: found, misses: misses, empties: empties, patches: patch + 1 };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) {
        var o = stopObj; stopObj = null;
        if (o.kind === 'win') ending(true);
        else { game.feedback.bad(o.tl ? o.tl.x : W / 2, o.tl ? o.tl.y - 60 : H * 0.5, { text: o.kind === 'time' ? 'TIME UP' : 'MISS', color: V.crab, size: 62 }); ending(false); }
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else {
      timeLeft -= dt; playT += dt;
      stepWorld(dt);
      // 潮が次の列に届く0.6秒前に予告(点滅+予告音)
      var ahead = coveredRows(tideAt(timeLeft - 0.6));
      if (ahead > lastCovered) {
        lastCovered = ahead; rowWarnT = 0.6; rowWarnY = Y0 + (NROW - ahead) * (TH / 2);
        game.audio.tone('E5', 0.06, { wave: 'square', volume: 0.06 });
      }
      // 潮に呑まれたあさりは次の区画へ
      if (left > 0) {
        var alive = 0;
        for (var i = 0; i < tiles.length; i++) if (tiles[i].kind === 'clam' && !tiles[i].dug && !underWater(tiles[i])) alive++;
        if (alive === 0 && patch < PATCHES.length - 1) { setupPatch(patch + 1); game.audio.play('se_jump', 0.3); }
      }
      if (timeLeft < 4) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.06, { wave: 'square', volume: 0.07 }); }
      }
      if (timeLeft <= 0) {
        timeLeft = 0;
        var rem = null;
        for (var j = 0; j < tiles.length; j++) if (tiles[j].kind === 'clam' && !tiles[j].dug) { rem = tiles[j]; break; }
        stopT = 0.45; stopObj = { kind: 'time', tl: rem };
        game.audio.tone('C4', 0.3, { wave: 'square', volume: 0.1, slide: -120 });
      }
    }

    drawScene(t);
    if (stopObj && stopObj.kind === 'win' && stopT > 0) game.draw.circle(stopObj.tl.x, stopObj.tl.y, 80 + (0.45 - stopT) * 1500, '#ffffff', 0.3);
    // 開始直後のお手本: 二つ穴に白い輪
    if (!fin && readyT <= 0 && found === 0 && playT < 1.4) {
      for (var k = 0; k < tiles.length; k++) if (tiles[k].kind === 'clam' && !tiles[k].dug) {
        game.draw.circle(tiles[k].x, tiles[k].y, 44 + Math.sin(t * 10) * 6, '#ffffff', 0.35);
        game.draw.hand(tiles[k].x, tiles[k].y + 20, { press: false, scale: 11, alpha: 0.5 });
        break;
      }
    }
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.24, 120, V.hat);
  });

  game.onStart(function() {
    game.audio.melody([
      ['G5', 0.5], ['E5', 0.5], ['C5', 0.5], ['E5', 0.5], ['G5', 1], ['A5', 1],
      ['G5', 0.5], ['E5', 0.5], ['D5', 0.5], ['E5', 0.5], ['C5', 2],
      ['D5', 0.5], ['E5', 0.5], ['G5', 0.5], ['A5', 0.5], ['C6', 1], ['A5', 0.5], ['G5', 1.5],
    ], { tempo: 124, wave: 'triangle', volume: 0.06, loop: true, bass: [['C3', 2], ['A2', 2], ['F2', 2], ['G2', 2], ['C3', 2], ['G2', 2]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);
