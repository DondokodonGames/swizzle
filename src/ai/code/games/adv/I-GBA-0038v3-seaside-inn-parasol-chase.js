// I-GBA-0038v3-seaside-inn-parasol-chase.js
// 風の傘たたみ — 風にあおられ開いたまま転がって逃げる番傘を連続タップで追いかけ、3回つかんで畳み切る
// 操作: 転がる番傘をタップすると一段畳めて手前へ引き寄せられるが、傘は跳ねて逃げる。3回当てると閉じて傘立てへ。突風の前には白い風の筋が走る
// 終わり: 3回の突風(傘1→2→3本)を20秒以内に全部畳めばCLEAR。傘を3本海へ飛ばす/時間切れでGAME OVER
// @mechanic: chase
// @theme: windy_seaside_inn_umbrellas
// 世界観: 風の強い海辺の民宿の前庭で、女将が風にあおられて開いたまま浜へ転がっていく番傘を追いかけ、海に落ちる前に一本ずつ畳んで傘立てに戻す
// 残るもの: 正誤(CLEAR/GAME OVER) + 畳んだ本数・海へ飛ばした本数・残り秒のスコア
// スタイル: 2000s BILLBOARD 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s BILLBOARD 3D: 板(sprite)のまま距離で px スケールを変え、真下に楕円の接地影。奥ほど彩度を落とす
  var STYLE = { bg: ['#7cc4f0', '#cfeaf6', '#3a86b8'], main: ['#e8d2a0', '#c2463a', '#f4ecd8'], accent: ['#2a5a8a', '#ffd25a'] };
  var B = {
    sky: STYLE.bg[0], skyLo: STYLE.bg[1], sea: STYLE.bg[2], seaDk: '#245a86', sand: STYLE.main[0], sandDk: '#c6ac78',
    red: STYLE.main[1], paper: STYLE.main[2], navy: STYLE.accent[0], gold: STYLE.accent[1], ink: '#1e2026', wood: '#7a4e2e', ng: '#e0402e', ok: '#5ac86a',
  };
  // 傘の色: 近・中・遠(奥ほど彩度を落とす)
  var KASA = [
    [{ c: '#c2463a', h: '#e0705e' }, { c: '#b06a60', h: '#c88a7e' }, { c: '#a08a84', h: '#b8a49c' }],
    [{ c: '#2a5a8a', h: '#4a7cae' }, { c: '#4a6a8a', h: '#6a88a6' }, { c: '#7a8a9c', h: '#96a4b2' }],
    [{ c: '#d49a2a', h: '#eebc4e' }, { c: '#c4a25a', h: '#d8bc7a' }, { c: '#b4a88a', h: '#c8bea4' }],
  ];

  var GAME_TITLE = 'KAZE KASA';
  var TIME_LIMIT = 20;
  var GUSTS = [
    { n: 1, every: 2.6, push: 0.75, side: 0.2 },
    { n: 2, every: 2.2, push: 0.95, side: 0.4 },
    { n: 3, every: 1.9, push: 1.1, side: 0.6 },
  ];
  var NEEDED = 6;
  var LOST_MAX = 3;
  var HOR = Math.round(H * 0.24);
  var SEA_Z = 4.1;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var round, cfg, kasas, gust, folded, lost, taps, combo, maxCombo, lastHit, score;
  var timeLeft, readyT, roundT, stopT, stopObj, fin, cleared, postT, warnT, dangerT, runT, sadT, cheerT, playT, finalScore, stand;

  // 女将(着物+前掛け)。待機・駆け足2コマ・がっかり・万歳
  var OKA_A = ['...kkkk...', '..kkkkkk..', '..kkkkkk..', '..ffffff..', '..fkffkf..', '...ffff...', '..pppppp..', '.ppwwwwpp.', '.ppwwwwpp.', '..pwwwwp..', '..pppppp..', '...f..f...'];
  var OKA_R1 = ['...kkkk...', '..kkkkkk..', '..kkkkkk..', '..ffffff..', '..fkffkf..', '...ffff...', '.fpppppp..', 'f.pwwwwpp.', '..pwwwwppf', '..pwwwwp..', '..pppppp..', '..f....f..'];
  var OKA_R2 = ['...kkkk...', '..kkkkkk..', '..kkkkkk..', '..ffffff..', '..fkffkf..', '...ffff...', '..ppppppf.', '.ppwwwwp.f', 'fppwwwwp..', '..pwwwwp..', '..pppppp..', '...ff.....'];
  var OKA_SAD = ['...kkkk...', '..kkkkkk..', '..kkkkkk..', '..ffffff..', '..fkffkf..', '...fkkf...', '..pppppp..', '.ppwwwwpp.', 'fppwwwwppf', '..pwwwwp..', '..pppppp..', '...f..f...'];
  var OKA_JOY = ['f..kkkk..f', 'f.kkkkkk.f', '.fkkkkkkf.', '..ffffff..', '..fkffkf..', '...frrf...', '..pppppp..', '.ppwwwwpp.', '.ppwwwwpp.', '..pwwwwp..', '..pppppp..', '...f..f...'];
  var OKA_PAL = { k: '#2a2226', f: '#f0d2b0', p: '#6a3a5a', w: '#f4ecd8', r: '#c2463a' };
  var GULL = ['w...w', '.www.', '..k..'];

  function out(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: B.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function proj(x, z) { var s = 1 / z; return { x: 540 + x * 620 * s, y: HOR + 1150 * s, s: s }; }

  function spawnKasa(i, x, z) {
    return { x: x, z: z, vx: game.random(-0.3, 0.3), vz: 0.2, stage: 0, spin: game.random(0, 6), col: i % 3, flash: 0, gone: false, lost: false, fly: 0 };
  }

  function setupRound(i) {
    cfg = GUSTS[i];
    kasas = [];
    for (var k = 0; k < cfg.n; k++) kasas.push(spawnKasa(k + i, -0.5 + k * (1.0 / Math.max(1, cfg.n - 1 || 1)) + game.random(-0.12, 0.12), 1.7 + game.random(0, 0.5) + k * 0.15));
    if (cfg.n === 1) kasas[0].x = game.random(-0.3, 0.3);
    gust = { cd: cfg.every * 0.6, warn: 0, dir: 0 };
  }

  function initGame() {
    round = 0; folded = 0; lost = 0; taps = 0; combo = 0; maxCombo = 0; lastHit = -9; score = 0;
    timeLeft = TIME_LIMIT; readyT = 0.8; roundT = 0; stopT = 0; stopObj = null; fin = false; cleared = false;
    postT = 0; warnT = 0; dangerT = 0; runT = 0; sadT = 0; cheerT = 0; playT = 0; finalScore = 0; stand = 0;
    setupRound(0);
  }

  function activeLeft() { var n = 0; for (var i = 0; i < kasas.length; i++) if (!kasas[i].gone) n++; return n; }

  // 風と傘の動き(本番・デモ共通)
  function stepWorld(dt) {
    if (gust.warn > 0) {
      gust.warn -= dt;
      if (gust.warn <= 0) {
        for (var g = 0; g < kasas.length; g++) { var kk = kasas[g]; if (kk.gone) continue; kk.vz += cfg.push * (0.85 + kk.z * 0.08); kk.vx += gust.dir * cfg.side; }
        game.audio.tone('D3', 0.35, { wave: 'sawtooth', volume: 0.05, slide: 160 });
      }
    } else {
      gust.cd -= dt;
      if (gust.cd <= 0) {
        gust.cd = cfg.every; gust.warn = 0.7; gust.dir = game.random(0, 1) < 0.5 ? -1 : 1;
        game.audio.tone('A6', 0.08, { wave: 'triangle', volume: 0.05, slide: -900 });
      }
    }
    var danger = false;
    for (var i = 0; i < kasas.length; i++) {
      var k = kasas[i];
      if (k.fly > 0) { k.fly -= dt; continue; }
      if (k.gone) continue;
      k.vx += game.random(-1, 1) * dt * 1.6;
      k.vz += 0.16 * dt;
      var damp = Math.max(0, 1 - 1.2 * dt);
      k.vx *= damp; k.vz *= damp;
      k.x += k.vx * dt; k.z += k.vz * dt;
      if (k.x < -0.8) { k.x = -0.8; k.vx = Math.abs(k.vx); }
      if (k.x > 0.8) { k.x = 0.8; k.vx = -Math.abs(k.vx); }
      if (k.z < 1.05) { k.z = 1.05; k.vz = Math.abs(k.vz); }
      k.spin += (Math.abs(k.vx) + Math.abs(k.vz) + 0.3) * dt * 5;
      if (k.flash > 0) k.flash -= dt;
      if (k.z > 3.3) danger = true;
      if (k.z >= SEA_Z) seaLoss(k);
    }
    if (danger) { dangerT -= dt; if (dangerT <= 0) { dangerT = 0.4; game.audio.tone('E5', 0.05, { wave: 'square', volume: 0.06 }); } }
    if (runT > 0) runT -= dt;
    if (sadT > 0) sadT -= dt;
    if (cheerT > 0) cheerT -= dt;
  }

  function seaLoss(k) {
    k.gone = true; k.lost = true; k.fly = 0.6;
    lost++; combo = 0; sadT = 0.8;
    var p = proj(k.x, SEA_Z);
    game.fx.burst(p.x, p.y, { color: B.paper, count: 18, speed: 300 });
    if (mode === S.PLAYING && lost >= LOST_MAX) {
      stopT = 0.45; stopObj = { kind: 'sea', k: k, x: p.x, y: p.y };
      game.fx.flash('#ffffff', 0.12);
      game.audio.tone('C3', 0.3, { wave: 'sawtooth', volume: 0.1, slide: -60 });
      return;
    }
    game.feedback.bad(p.x, p.y, { text: 'MISS', color: B.ng, size: 54 });
    checkRound();
  }

  function checkRound() {
    if (activeLeft() > 0 || roundT > 0 || mode !== S.PLAYING) return;
    roundT = 0.9;
    if (folded > 0) { cheerT = 0.9; game.audio.play('se_milestone', 0.45); game.fx.popup('NICE', W / 2, H * 0.4, { color: B.gold, size: 92 }); }
  }

  function pickKasa(x, y) {
    var best = null, bz = 99;
    for (var i = 0; i < kasas.length; i++) {
      var k = kasas[i];
      if (k.gone) continue;
      var p = proj(k.x, k.z), r = 170 * p.s * (k.stage === 1 ? 0.8 : 1) * 1.2;
      if (Math.hypot(p.x - x, p.y - 60 * p.s - y) < r && k.z < bz) { bz = k.z; best = k; }
    }
    return best;
  }

  // タップ1回の判定(本番・デモ共通)
  function grabAt(x, y) {
    var k = pickKasa(x, y);
    runT = 0.3; taps++;
    if (!k) { game.audio.tone('C5', 0.05, { wave: 'triangle', volume: 0.05, slide: -200 }); return; }
    var p = proj(k.x, k.z);
    k.stage++; k.flash = 0.2;
    if (k.stage >= 2) {
      k.gone = true; k.fly = 0.6; folded++; stand++;
      var now = game.time.elapsed;
      combo = now - lastHit < 1.6 ? combo + 1 : 1;
      lastHit = now;
      if (combo > maxCombo) maxCombo = combo;
      var pts = Math.round(300 * (k.z) * 0.5) * Math.min(3, combo);
      score += pts;
      game.feedback.good(p.x, p.y - 60 * p.s, { text: k.z > 2.6 ? 'NICE' : 'GOOD', color: B.gold, size: 56 });
      game.audio.play('se_coin', 0.3);
      game.fx.popup('+' + pts, p.x, p.y - 200 * p.s - 40, { color: B.paper, size: 40 });
      checkRound();
      return;
    }
    // つかんだ分だけ手前に引き寄せる。傘は跳ねて逃げる
    k.z = Math.max(1.05, k.z - 0.5);
    k.vx = (game.random(0, 1) < 0.5 ? -1 : 1) * game.random(0.5, 0.95);
    k.vz = 0.15;
    game.audio.tone(520 + k.stage * 160, 0.06, { wave: 'square', volume: 0.07 });
    game.fx.burst(p.x, p.y - 60 * p.s, { color: KASA[k.col][0].h, count: 8, speed: 240 });
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = score + (win ? Math.ceil(timeLeft) * 30 : 0);
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 6; i++) game.fx.burst(160 + i * 150, H * 0.5 + (i % 2) * 220, { color: i % 2 ? B.gold : B.red, count: 18, speed: 520 });
      game.fx.flash(B.gold, 0.2);
    }
  }

  function resolveStop() {
    if (!stopObj) return;
    var o = stopObj;
    stopObj = null;
    if (o.kind === 'win') { ending(true); return; }
    game.feedback.bad(o.x, o.y, { text: o.kind === 'time' ? 'TIME UP' : 'MISS', color: B.ng, size: 60 });
    ending(false);
  }

  // ---- 入力 ----
  function canPlay() { return mode === S.PLAYING && !fin && stopT <= 0 && readyT <= 0 && roundT <= 0; }

  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { mode = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (!canPlay()) { game.audio.play('se_tap', 0.05); return; }
    grabAt(x, y);
  });

  // ---- 描画 ----
  function beach(t) {
    game.draw.gradient(0, HOR, [[0, B.sky], [1, B.skyLo]]);
    for (var c = 0; c < 4; c++) { var cx = (c * 300 + t * 14) % (W + 300) - 150; game.draw.circle(cx, 290 + c * 30, 60, '#ffffff', 0.7); game.draw.circle(cx + 60, 300 + c * 30, 44, '#ffffff', 0.7); }
    var sy = proj(0, SEA_Z).y;
    game.draw.gradient(HOR, sy, [[0, B.seaDk], [1, B.sea]]);
    for (var w = 0; w < 14; w++) game.draw.rect((w * 97 + t * 40) % W, HOR + 20 + (w % 5) * ((sy - HOR - 30) / 5), 50, 4, '#ffffff', 0.4 + Math.sin(t * 2 + w) * 0.2);
    game.draw.rect(0, sy - 6, W, 12, '#ffffff', 0.6 + Math.sin(t * 3) * 0.2);
    game.draw.gradient(sy, H, [[0, B.sandDk], [0.3, B.sand], [1, '#f0dcae']]);
    // 奥行きの格子(敷石の目地)
    var zs = [1.2, 1.5, 2, 2.5, 3, 3.5];
    for (var i = 0; i < zs.length; i++) { var y = proj(0, zs[i]).y; game.draw.rect(0, y, W, 3, B.sandDk, 0.6); }
    for (var l = -4; l <= 4; l++) { var a = proj(l * 0.25, 1.0), b = proj(l * 0.25, SEA_Z); game.draw.line(a.x, a.y, b.x, b.y, B.sandDk, 2); }
    game.draw.sprite(GULL, { w: '#ffffff', k: '#e0a030' }, 760 + Math.sin(t * 0.5) * 120, 330 + Math.sin(t * 3) * 10, 8, { anchor: 'center' });
    // 民宿の軒先(手前左)と傘立て(手前右)
    game.draw.rect(0, Math.round(H * 0.73), 150, H, B.wood);
    game.draw.rect(0, Math.round(H * 0.73), 170, 30, '#5a3420');
    game.draw.rect(20, Math.round(H * 0.76), 110, 120, B.navy);
    game.draw.rect(20, Math.round(H * 0.76) + 40, 110, 6, B.paper);
    game.draw.rect(900, Math.round(H * 0.80), 120, 160, B.wood);
    game.draw.rect(890, Math.round(H * 0.80) - 12, 140, 18, '#5a3420');
    for (var s = 0; s < Math.min(stand, 9); s++) game.draw.rect(912 + (s % 5) * 20, Math.round(H * 0.80) - 70 - Math.floor(s / 5) * 14, 12, 80, KASA[s % 3][0].c);
  }

  function drawKasa(k, t) {
    if (k.gone && k.fly <= 0) return;
    var p;
    if (k.gone && !k.lost) {
      var u = 1 - k.fly / 0.6, from = proj(k.x, k.z);
      p = { x: from.x + (960 - from.x) * u, y: from.y + (H * 0.78 - from.y) * u - Math.sin(u * 3.14) * 200, s: from.s };
      game.draw.rect(p.x - 10, p.y - 90 * p.s, 20, 150 * p.s, KASA[k.col][0].c);
      return;
    }
    if (k.lost) {
      var v = 1 - k.fly / 0.6, q = proj(k.x, SEA_Z);
      game.draw.circle(q.x, q.y - v * 30, 40 * (1 - v), KASA[k.col][2].c, 1 - v);
      return;
    }
    p = proj(k.x, k.z);
    var depth = k.z < 1.9 ? 0 : (k.z < 2.9 ? 1 : 2);
    var col = KASA[k.col][depth];
    var big = stopObj && stopT > 0 && stopObj.k === k ? 1.4 : 1;
    var r = 170 * p.s * (k.stage === 1 ? 0.78 : 1) * big;
    var cy = p.y - 60 * p.s;
    game.draw.circle(p.x, p.y + 8 * p.s, r * 0.9, B.ink, 0.22);
    game.draw.rect(p.x - r * 0.7, p.y, r * 1.4, 14 * p.s, B.ink, 0.12);
    var danger = k.z > 3.3 && Math.floor(t * 10) % 2 === 0;
    game.draw.circle(p.x, cy, r + 10 * p.s + Math.sin(t * 8) * 3, danger ? B.ng : '#ffffff', danger ? 0.9 : 0.6);
    var wf = k.flash > 0 || (big > 1 && Math.floor(t * 16) % 2 === 0);
    game.draw.circle(p.x, cy, r, wf ? '#ffffff' : col.c);
    game.draw.circle(p.x, cy, r * 0.62, wf ? '#ffffff' : col.h);
    var spokes = k.stage === 1 ? 12 : 8;
    for (var i = 0; i < spokes; i++) {
      var a = k.spin + i / spokes * Math.PI * 2;
      game.draw.line(p.x, cy, p.x + Math.cos(a) * r, cy + Math.sin(a) * r, B.ink, Math.max(2, 6 * p.s));
    }
    if (k.stage === 1) for (var j = 0; j < 6; j++) { var b = k.spin * 1.2 + j; game.draw.circle(p.x + Math.cos(b) * r * 0.9, cy + Math.sin(b) * r * 0.9, r * 0.18, col.c); }
    game.draw.circle(p.x, cy, r * 0.14, B.paper);
    game.draw.circle(p.x, cy, r * 0.07, B.ink);
    var ha = k.spin * 0.5;
    game.draw.line(p.x, cy, p.x + Math.cos(ha) * r * 0.9, cy + Math.sin(ha) * r * 0.9 + 30 * p.s, B.wood, Math.max(3, 12 * p.s));
    for (var d = 0; d < 2; d++) game.draw.circle(p.x - r * 0.9 + d * r * 1.8, cy + r * 0.2, 6 * p.s + 3, d === k.stage % 2 ? B.paper : col.h, 0.9);
  }

  function drawWind(t) {
    if (gust.warn <= 0) return;
    var k = 1 - gust.warn / 0.7;
    for (var i = 0; i < 9; i++) {
      var y = 560 + i * 120 + Math.sin(i * 2.3) * 40;
      var x = gust.dir > 0 ? -300 + ((k * 1.4 + i * 0.13) % 1.4) * 1300 : W + 300 - ((k * 1.4 + i * 0.13) % 1.4) * 1300;
      game.draw.line(x, y, x - gust.dir * 260, y - 26, '#ffffff', 8);
      game.draw.line(x - gust.dir * 300, y - 30, x - gust.dir * 380, y - 38, '#ffffff', 4);
    }
    game.draw.rect(0, HOR, W, 10, '#ffffff', 0.3 + k * 0.4);
  }

  function drawOkami(t) {
    var fr;
    if (sadT > 0) fr = OKA_SAD;
    else if (cheerT > 0 || (fin && cleared)) fr = OKA_JOY;
    else if (runT > 0) fr = Math.floor(t * 12) % 2 ? OKA_R1 : OKA_R2;
    else fr = Math.floor(t * 2.5) % 2 ? OKA_A : OKA_R1;
    var hop = cheerT > 0 ? -Math.abs(Math.sin(t * 14)) * 24 : Math.sin(t * 3) * 4;
    game.draw.circle(250, H * 0.915, 80, B.ink, 0.2);
    game.draw.sprite(fr, OKA_PAL, 250, H * 0.85 + hop, 18, { anchor: 'center' });
  }

  function drawHud(t) {
    var lowT = timeLeft < 4 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(70, 34, W - 140, 30, B.ink, 0.8);
    game.draw.rect(76, 40, (W - 152) * Math.max(0, timeLeft / TIME_LIMIT), 18, lowT ? B.ng : B.gold);
    out(folded + ' / ' + NEEDED, W / 2, 116, 50, B.paper);
    for (var r = 0; r < GUSTS.length; r++) {
      var done = r < round || (r === round && roundT > 0) || (fin && cleared);
      game.draw.circle(110 + r * 70, 176, 24, B.ink, 0.8);
      game.draw.circle(110 + r * 70, 176, 18, done ? B.gold : (r === round ? B.paper : B.sandDk));
    }
    for (var m = 0; m < LOST_MAX; m++) { game.draw.circle(W - 110 - m * 64, 176, 22, B.ink, 0.8); game.draw.circle(W - 110 - m * 64, 176, 16, m < lost ? B.ng : B.sea); }
    out('' + score, W - 240, 116, 34, B.gold);
  }

  function drawScene(t) {
    beach(t);
    var order = kasas.slice().sort(function(a, b) { return b.z - a.z; });
    for (var i = 0; i < order.length; i++) drawKasa(order[i], t);
    drawWind(t);
    drawOkami(t);
  }

  function scan() { for (var y = 0; y < H; y += 8) game.draw.rect(0, y, W, 2, B.ink, 0.06); }

  // ---- ATTRACT: 本物の grabAt()/stepWorld() で 手前の傘を3回つかんで畳む → 奥の傘は突風で海へ ----
  var demo = { t: 0, gx: W / 2, gy: H * 0.8, press: false, k: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.0;
    if (cyc < dt || demo.t <= dt) {
      initGame(); readyT = 0;
      cfg = { n: 2, every: 2.0, push: 1.1, side: 0.3 };
      kasas = [spawnKasa(0, -0.25, 1.6), spawnKasa(1, 0.45, 2.9)];
      kasas[1].vz = 0.35;
      gust = { cd: 0.3, warn: 0, dir: 1 };
      demo.k = 0;
    }
    stepWorld(dt);
    var plan = [0.55, 1.15, 1.75];
    var a = kasas[0];
    demo.press = false;
    if (demo.k < plan.length && !a.gone) {
      var p = proj(a.x, a.z);
      demo.gx += (p.x - demo.gx) * Math.min(1, dt * 9);
      demo.gy += (p.y - 60 * p.s - demo.gy) * Math.min(1, dt * 9);
      if (Math.abs(cyc - plan[demo.k]) < 0.1) demo.press = true;
      if (cyc > plan[demo.k]) { grabAt(p.x, p.y - 60 * p.s); demo.k++; }
    } else if (!kasas[1].gone) {
      var q = proj(kasas[1].x, kasas[1].z);
      demo.gx += (q.x - demo.gx) * Math.min(1, dt * 2.5);
      demo.gy += (q.y - 60 * q.s - demo.gy) * Math.min(1, dt * 2.5);
    } else {
      demo.gx += (W / 2 - demo.gx) * Math.min(1, dt * 2);
      demo.gy += (H * 0.7 - demo.gy) * Math.min(1, dt * 2);
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      out(GAME_TITLE, W / 2, H * 0.055 + Math.sin(t * 2) * 5, 90, B.paper);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.098, 38, B.navy);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.955, 48, B.red);
      else out('TAP TO START', W / 2, H * 0.955, 40, B.navy);
      scan();
      return;
    }

    if (mode === S.RESULT) {
      drawScene(t);
      game.draw.rect(90, H * 0.30, W - 180, 500, B.ink, 0.8);
      out(cleared ? 'CLEAR' : (timeLeft <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.34, 96, cleared ? B.ok : B.ng);
      out('SCORE ' + finalScore, W / 2, H * 0.40, 60, B.paper);
      out(folded + ' / ' + NEEDED + '   x' + maxCombo, W / 2, H * 0.45, 44, B.gold);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.50, 56, B.gold);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.50, 42, B.paper);
      if (!cleared) out('あと' + Math.max(1, NEEDED - folded - lost) + '本!', W / 2, H * 0.27, 60, B.gold);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.955, 40, B.paper);
      scan();
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { folded: folded, lost: lost, taps: taps, maxCombo: maxCombo, rounds: round + (cleared ? 1 : 0) };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) resolveStop();
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else if (roundT > 0) {
      roundT -= dt;
      for (var f = 0; f < kasas.length; f++) if (kasas[f].fly > 0) kasas[f].fly -= dt;
      if (cheerT > 0) cheerT -= dt;
      if (roundT <= 0) {
        if (round >= GUSTS.length - 1) {
          stopT = 0.4; stopObj = { kind: 'win' };
          game.audio.play('se_powerup', 0.4);
        } else {
          round++;
          setupRound(round);
          game.audio.play('se_jump', 0.3);
        }
      }
    } else {
      timeLeft -= dt; playT += dt;
      stepWorld(dt);
      if (timeLeft < 4) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.06, { wave: 'square', volume: 0.07 }); }
      }
      if (timeLeft <= 0 && stopT <= 0 && !fin) {
        timeLeft = 0;
        var rem = null;
        for (var i = 0; i < kasas.length; i++) if (!kasas[i].gone) { rem = kasas[i]; break; }
        var rp = rem ? proj(rem.x, rem.z) : { x: W / 2, y: H / 2, s: 1 };
        stopT = 0.45; stopObj = { kind: 'time', k: rem, x: rp.x, y: rp.y - 60 * rp.s };
        game.audio.tone('C4', 0.3, { wave: 'square', volume: 0.1, slide: -120 });
      }
    }

    drawScene(t);
    if (stopObj && stopObj.kind === 'win' && stopT > 0) game.draw.circle(960, H * 0.78, 100 + (0.4 - stopT) * 900, '#ffffff', 0.3);
    if (!fin && readyT <= 0 && round === 0 && folded === 0 && playT < 1.3) {
      var k0 = kasas[0];
      if (k0 && !k0.gone) { var p0 = proj(k0.x, k0.z); game.draw.hand(p0.x, p0.y - 60 * p0.s, { press: Math.floor(t * 4) % 2 === 0, scale: 12, alpha: 0.5 }); }
    }
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 120, B.paper);
    scan();
  });

  game.onStart(function() {
    game.audio.melody([
      ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['F5', 0.5], ['A5', 0.5], ['G5', 1],
      ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['C5', 0.5], ['A4', 1],
      ['F4', 0.5], ['A4', 0.5], ['C5', 0.5], ['A4', 0.5], ['G4', 0.5], ['B4', 0.5], ['C5', 1],
    ], { tempo: 150, wave: 'square', volume: 0.05, loop: true, bass: [['C3', 1], ['G2', 1], ['F2', 1], ['G2', 1], ['A2', 1], ['E2', 1], ['F2', 1], ['G2', 1], ['C3', 2], ['G2', 2]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);
