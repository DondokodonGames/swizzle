// K-DS-0044v2-fish-market-beat-cards.js
// 競り場の拍札そろえ — 競り人が鈴で鳴らした1小節の拍の型を聞き、並んだ札から同じ型の二枚を見つけ、返しの小節の1拍目でつまんで3拍目で相方の札に重ねて掲げる
// 操作: 1回は2小節。1小節目は競り人が鈴で節を鳴らす(黒板に 点=1打・点点=2打・横棒=長く鳴らす・空き=休み の4拍が書かれ、鳴っている拍に下線が付く)。並んだ拍札のうち黒板と同じ型の札がちょうど二枚ある。2小節目(返し)の1拍目の頭でその片方を押さえてつまみ、もう一枚の上まで引きずって3拍目の頭で指を離して重ねる(下の青い拍ランプの点と重ね札の印が合図)。つまみと離しはそれぞれ拍の頭からのずれでPERFECT/GOOD。型の違う札をつまむ・違う札に重ねる・拍を外して離す・つまみ逃す・持ちすぎはMISSでその回は終わり。1小節目に札を触っても揺れるだけ
// 終わり: 4回(札6枚→6枚・1拍だけ違う札→8枚・そっくりな偽の対入り→8枚、120BPM・8小節・16秒)を通してMISS 2回以内ならCLEAR(判定の点+そろえた対のボーナス)。MISS 3回でGAME OVER
// @mechanic: pair_match
// @theme: fish_market_beat_cards
// 世界観: 夜明けの魚市場の競り場で、見習いの仲買人が、競り人が鈴で打ち鳴らした拍子と同じ型の拍札を並んだ札の中から二枚探し出し、返しの小節で重ねて高く掲げる
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・そろえた対の数・PERFECT/GOOD/MISS数
// スタイル: SKEUOMORPH

(function(game) {
  var STYLE = { bg: ['#7a5232', '#4a3020', '#2e1c10'], main: ['#f4e7c9', '#2e4a3c', '#c99a3e'], accent: ['#d2462e', '#ffffff'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目の競り台・紙の拍札・黒板・真鍮の鈴。gradient と細線で質感を、上明下暗+白ハイライトで光沢ボタンの厚みを出す
  var C = {
    wood: STYLE.bg[0], woodDk: STYLE.bg[1], woodDeep: STYLE.bg[2],
    paper: STYLE.main[0], board: STYLE.main[1], brass: STYLE.main[2],
    red: STYLE.accent[0], white: STYLE.accent[1],
    ink: '#2a1c12', paperDk: '#cdb88c', chalk: '#eef3e6', blue: '#3a6ea8', blueLt: '#7fb0e6',
    green: '#4aa86a', amber: '#e89a3a', table: '#b07c46'
  };

  var GAME_TITLE = 'BEAT CARDS';
  var BPM = 120;
  var SPB = 60 / BPM;
  var PERFECT_W = 0.08;
  var GOOD_W = 0.16;
  var MISS_MAX = 3;
  var ROUND_BEATS = 8;                 // 呼びかけ1小節 + 返し1小節
  var CFG = [
    { n: 6, near: false, twin: false },
    { n: 6, near: true, twin: false },
    { n: 8, near: true, twin: true },
    { n: 8, near: true, twin: true }
  ];
  var ROUNDS = CFG.length;
  var TIME_LIMIT = 17;                 // 4回 × 2小節 = 16秒
  var CARD_W = 430;
  var CALL_X = 230, CALL_Y = 420;
  var SLATE_X = 730, SLATE_Y = 410, SLATE_W = 520, SLATE_H = 240;
  var LAMP_Y = Math.round(H * 0.695);
  var APP_X = W / 2, APP_Y = Math.round(H * 0.835);

  // 競り場の囃し(オリジナル)。1小節ずつ拍クロックから鳴らす
  var CALL_MEL = [
    [['C4', 0.5], ['R', 0.5], ['E4', 0.5], ['G4', 0.5], ['A4', 1], ['G4', 1]],
    [['A3', 0.5], ['R', 0.5], ['C4', 0.5], ['E4', 0.5], ['D4', 1], ['C4', 1]]
  ];
  var RESP_MEL = [
    [['E4', 1], ['R', 0.5], ['D4', 0.5], ['C4', 1], ['G3', 1]],
    [['G4', 1], ['R', 0.5], ['E4', 0.5], ['D4', 1], ['C4', 1]]
  ];
  var BASS = [
    [['C2', 1], ['G2', 1], ['C2', 1], ['G2', 1]],
    [['A1', 1], ['E2', 1], ['F2', 1], ['G2', 1]]
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, running, beatN, beatT, songT, halfDone, readyT, hitStop, flashIdx, animT;
  var r, rs, cards, cardH, drag, callerT, appT;
  var score, perfects, goods, misses, pairs, over, won, outroT, prevBest, milestone;
  animT = 0;

  function ri(n) { return Math.floor(game.random(0, n)) % n; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = ri(i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function hitsOf(p) { var c = 0; for (var i = 0; i < 4; i++) if (p[i]) c++; return c; }
  function sameP(a, b) { for (var i = 0; i < 4; i++) if (a[i] !== b[i]) return false; return true; }
  function diffP(a, b) { var c = 0; for (var i = 0; i < 4; i++) if (a[i] !== b[i]) c++; return c; }
  function hasP(list, q) { for (var i = 0; i < list.length; i++) if (sameP(list[i], q)) return true; return false; }
  // 型 = 4拍ぶんの記号: 0 休み / 1 点(1打) / 2 点点(8分2打) / 3 横棒(長く鳴らす)
  function randPat() {
    var p, tries = 0;
    do { p = [ri(4), ri(4), ri(4), ri(4)]; tries++; }
    while (tries < 60 && (hitsOf(p) < 3 || (p[0] === p[1] && p[1] === p[2] && p[2] === p[3])));
    return p;
  }
  function nearOf(p) { var q = p.slice(); var i = ri(4); q[i] = (p[i] + 1 + ri(3)) % 4; return q; }
  function farOf(p) { var q, tries = 0; do { q = randPat(); tries++; } while (tries < 60 && diffP(p, q) < 2); return q; }

  function buildRound(i) {
    r = i;
    var cfg = CFG[i];
    var call = randPat();
    var seen = [call];
    function fresh(near) {
      var q, tries = 0;
      do { q = near ? nearOf(call) : farOf(call); tries++; } while (tries < 80 && hasP(seen, q));
      seen.push(q);
      return q;
    }
    var pats = [call.slice(), call.slice()];
    if (cfg.twin) { var d = fresh(true); pats.push(d, d.slice()); }
    while (pats.length < cfg.n) pats.push(fresh(cfg.near));
    shuffle(pats);
    cardH = cfg.n === 6 ? 160 : 140;
    var top = cfg.n === 6 ? 690 : 665, gap = cfg.n === 6 ? 200 : 170;
    cards = [];
    for (var k = 0; k < pats.length; k++) {
      cards.push({ pat: pats[k], x: k % 2 === 0 ? 290 : 790, y: top + Math.floor(k / 2) * gap, twin: sameP(pats[k], call), used: false, wig: 0, inT: 0 });
    }
    rs = { call: call, grabbed: false, done: false, failed: false, doneT: 0, a: -1, b: -1, cue: false };
    drag = null;
  }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    running = false; beatN = 0; beatT = 0; songT = 0; halfDone = false;
    readyT = isDemo ? 0 : 0.8;
    hitStop = 0; flashIdx = -1; callerT = 0; appT = 0;
    score = 0; perfects = 0; goods = 0; misses = 0; pairs = 0;
    over = false; won = false; outroT = 0; prevBest = game.best || 0; milestone = false;
    buildRound(0);
    if (isDemo) startClock();
  }

  // ---- 拍クロック(1本だけ) ----
  function startClock() {
    running = true; beatN = 0; beatT = 0; songT = 0; halfDone = false;
    onBeat(0);
  }
  function stepClock(dt) {
    beatT += dt;
    if (!halfDone && beatT >= SPB / 2) { halfDone = true; onHalf(beatN); }
    while (beatT >= SPB) {
      beatT -= SPB; beatN++; halfDone = false;
      onBeat(beatN);
      if (beatT >= SPB / 2) { halfDone = true; onHalf(beatN); }
    }
    songT = beatN * SPB + beatT;
  }
  function relBeat() { return beatN - r * ROUND_BEATS; }
  function respHead() { return (r * ROUND_BEATS + 4) * SPB; }

  function ring(vol) {
    game.audio.tone('A5', 0.08, { wave: 'square', volume: 0.09 * vol });
    game.audio.tone('E6', 0.05, { wave: 'sine', volume: 0.05 * vol });
  }
  function ringLong(vol) {
    game.audio.tone('A5', 0.42, { wave: 'triangle', volume: 0.14 * vol });
    game.audio.tone('A6', 0.3, { wave: 'sine', volume: 0.03 * vol });
  }
  function playBar(isCall, vol) {
    var k = r % 2;
    game.audio.melody(isCall ? CALL_MEL[k] : RESP_MEL[k], { tempo: BPM, wave: 'square', volume: 0.026 * vol, bass: BASS[k], bassWave: 'triangle', bassVolume: 0.08 * vol });
  }

  function onBeat(b) {
    var rr = Math.floor(b / ROUND_BEATS);
    if (rr >= (demoMode ? 2 : ROUNDS)) { if (!demoMode) finish(misses < MISS_MAX); return; }
    if (rr !== r) buildRound(rr);
    var rel = b - r * ROUND_BEATS;
    var vol = demoMode ? 0.5 : 1;
    game.audio.tone(rel % 4 === 0 ? 1320 : 990, 0.03, { wave: 'triangle', volume: (rel % 4 === 0 ? 0.08 : 0.045) * vol });
    if (rel === 0 || rel === 4) playBar(rel === 0, vol);
    if (rel < 4) {
      var s = rs.call[rel];
      if (s === 1 || s === 2) ring(vol);
      else if (s === 3) ringLong(vol);
      if (s) callerT = 0.22;
    }
    // 返しの番の予告(つまむ拍の0.5秒前): 青いランプが点滅し、上がる合図音
    if (rel === 3) { rs.cue = true; appT = 0.5; game.audio.tone(660, 0.09, { wave: 'sine', volume: 0.07 * vol, slide: 330 }); }
  }
  function onHalf(b) {
    var rel = b - r * ROUND_BEATS;
    if (rel >= 0 && rel < 4 && rs.call[rel] === 2) { ring(demoMode ? 0.5 : 1); callerT = 0.18; }
  }

  function stepPlay(dt) {
    if (!running) return;
    stepClock(dt);
    if (callerT > 0) callerT -= dt;
    if (appT > 0) appT -= dt;
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].wig > 0) cards[i].wig -= dt;
      if (cards[i].inT < 1) cards[i].inT = Math.min(1, cards[i].inT + dt * 4);
    }
    var h = respHead();
    if (!rs.failed && !rs.done) {
      if (!rs.grabbed && songT > h + GOOD_W) missRound(-1);
      else if (drag && songT > h + 2 * SPB + GOOD_W) missRound(drag.idx);
    }
    if (!demoMode && !over && songT > TIME_LIMIT) finish(misses < MISS_MAX);
  }

  function lampX(k) { return 140 + k * 114; }

  function missRound(idx) {
    rs.failed = true;
    misses++;
    drag = null;
    hitStop = 0.42; flashIdx = idx;
    var fx = idx >= 0 ? cards[idx].x : lampX(4);
    var fy = idx >= 0 ? cards[idx].y : LAMP_Y;
    if (idx >= 0) cards[idx].wig = 0.42;
    game.feedback.bad(fx, fy - 90, { text: 'MISS', shake: demoMode ? 4 : 10 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function grade(off, x, y) {
    if (Math.abs(off) <= PERFECT_W) {
      perfects++; score += 100;
      game.feedback.good(x, y, { text: 'PERFECT', color: C.brass, size: 52, count: 10, volume: 0.25, sound: 'se_good' });
    } else {
      goods++; score += 50;
      game.feedback.good(x, y, { text: 'GOOD', color: C.green, size: 46, count: 6, volume: 0.2, sound: 'se_good' });
    }
  }

  function cardAt(x, y, skip, pad) {
    var p = pad || 0;
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      if (i === skip || c.used) continue;
      if (Math.abs(x - c.x) <= CARD_W / 2 + p && Math.abs(y - c.y) <= cardH / 2 + p) return i;
    }
    return -1;
  }

  // つまむ(入力とデモで共通)
  function grab(idx, px, py) {
    if (!running || hitStop > 0) return 'none';
    var c = cards[idx];
    var off = songT - respHead();
    if (rs.done || rs.failed || rs.grabbed) { c.wig = 0.2; return 'none'; }
    if (off < -GOOD_W) { c.wig = 0.25; game.audio.tone(300, 0.03, { wave: 'triangle', volume: 0.05 }); return 'peek'; }
    if (off > GOOD_W || !c.twin) { missRound(idx); return 'miss'; }
    rs.grabbed = true;
    drag = { idx: idx, fx: px, fy: py, ox: c.x - px, oy: c.y - py };
    game.audio.play('se_tap', 0.3);
    grade(off, c.x, c.y - 100);
    return 'ok';
  }

  // 重ねる(入力とデモで共通)
  function drop(px, py) {
    if (!drag) return;
    var d = drag;
    drag = null;
    var off = songT - (respHead() + 2 * SPB);
    var t = cardAt(px + d.ox, py + d.oy, d.idx, 30);
    if (Math.abs(off) > GOOD_W || t < 0 || !cards[t].twin) { missRound(t >= 0 ? t : d.idx); return; }
    grade(off, cards[t].x, cards[t].y - 100);
    rs.done = true; rs.doneT = songT; rs.a = d.idx; rs.b = t;
    cards[d.idx].used = true; cards[t].used = true;
    pairs++;
    score += 150 + r * 50;
    appT = 0.9;
    game.audio.play('se_powerup', 0.35);
    game.fx.burst(cards[t].x, cards[t].y, { color: C.brass, count: 16, speed: 340 });
    if (!demoMode && pairs === 2 && !milestone) {
      milestone = true;
      game.audio.play('se_milestone', 0.45);
      game.fx.popup(pairs + ' / ' + ROUNDS, W / 2, H * 0.3, { color: C.brass, size: 80 });
    }
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.6; running = false; drag = null;
    if (ok) {
      score += (MISS_MAX - 1 - misses) * 100 + pairs * 50;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 5; i++) game.fx.burst(game.random(160, 920), game.random(650, 1250), { color: i % 2 ? C.brass : C.white, count: 22, speed: 440 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || readyT > 0 || !running) return;
    var idx = cardAt(x, y, -1, 0);
    if (idx < 0) { game.audio.tone(160, 0.04, { wave: 'square', volume: 0.04 }); return; }
    grab(idx, x, y);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !drag) return;
    drag.fx = x; drag.fy = y;
    // 持った札がほかの札の上に来たら紙の擦れる音で知らせる
    var over2 = cardAt(x + drag.ox, y + drag.oy, drag.idx, 30);
    if (over2 !== drag.hover) { drag.hover = over2; if (over2 >= 0) game.audio.tone(520, 0.025, { wave: 'triangle', volume: 0.04 }); }
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !drag || over) return;
    game.audio.tone(240, 0.04, { wave: 'triangle', volume: 0.06 });
    drop(x, y);
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.woodDeep, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  var CALLER = [
    [
      '....hhhh....',
      '..wwwwwwww..',
      '...ssssss...',
      '...skssks...',
      '...ssssss...',
      '....smms....',
      '..nnnnnnnn..',
      '.nnnnwwnnnn.',
      '.snnnwwnnnns',
      '.s..nnnn..s.',
      '....nnnn....',
      '....nn.nn...',
      '...bbb.bbb..'
    ],
    [
      '....hhhh....',
      '..wwwwwwww.s',
      '...ssssss..s',
      '...skssks..s',
      '...ssssss.n.',
      '....soos..n.',
      '..nnnnnnnnn.',
      '.nnnnwwnnnn.',
      '.snnnwwnnnn.',
      '.s..nnnn....',
      '....nnnn....',
      '....nn.nn...',
      '...bbb.bbb..'
    ]
  ];
  var CPAL = { h: '#2a1c12', w: '#ffffff', s: '#f0c08a', k: '#2a1c12', m: '#a04030', o: '#a04030', n: '#2e4a7a', b: '#e6e2d8' };
  var APPR = [
    [
      '...cccccc...',
      '..cccccccc..',
      '.cccccccccc.',
      '...ssssss...',
      '...skssks...',
      '...ssssss...',
      '....smms....',
      '..aaaaaaaa..',
      '.saaawwaaas.',
      '.saaawwaaas.',
      '...aaaaaa...',
      '...aa..aa...',
      '...bb..bb...'
    ],
    [
      's..cccccc..s',
      's.cccccccc.s',
      'scccccccccc.',
      '.s.ssssss.s.',
      '.s.skssks.s.',
      '..sssssssss.',
      '..a.soos.a..',
      '..aaaaaaaa..',
      '...aawwaa...',
      '...aawwaa...',
      '...aaaaaa...',
      '...aa..aa...',
      '...bb..bb...'
    ]
  ];
  var APAL = { c: '#3a6ea8', s: '#f0c08a', k: '#2a1c12', m: '#a04030', o: '#a04030', a: '#f4e7c9', w: '#3a6ea8', b: '#2a1c12' };
  var FISH = [
    ['....ffff....', '..fffffffftt', '.fkfffffftt.', '..fffffffftt', '....ffff....'],
    ['....ffff..tt', '..ffffffftt.', '.fkffffffff.', '..ffffffff..', '....ffff....']
  ];

  function glossBtn(x, y, rad, col, lit) {
    game.draw.circle(x, y + 5, rad, '#000000', 0.35);
    game.draw.circle(x, y, rad, col);
    game.draw.circle(x, y + rad * 0.25, rad * 0.8, '#000000', lit ? 0.05 : 0.18);
    game.draw.circle(x, y - rad * 0.35, rad * 0.55, C.white, lit ? 0.55 : 0.3);
  }

  function glyph(sym, cx, cy, sz, col) {
    if (sym === 1) game.draw.circle(cx, cy, sz * 0.2, col);
    else if (sym === 2) { game.draw.circle(cx - sz * 0.22, cy, sz * 0.16, col); game.draw.circle(cx + sz * 0.22, cy, sz * 0.16, col); }
    else if (sym === 3) { game.draw.rect(cx - sz * 0.36, cy - sz * 0.1, sz * 0.72, sz * 0.2, col); game.draw.circle(cx - sz * 0.36, cy, sz * 0.1, col); game.draw.circle(cx + sz * 0.36, cy, sz * 0.1, col); }
    else game.draw.rect(cx - sz * 0.15, cy - 3, sz * 0.3, 6, col, 0.25);
  }

  function drawRoom() {
    game.draw.gradient(0, H, [[0, '#f8d6a0'], [0.12, '#e0a46a'], [0.125, C.wood], [0.6, C.woodDk], [1, C.woodDeep]]);
    // 夜明けの窓と朝日
    game.draw.circle(880, 230, 120, '#fff0c8', 0.5);
    game.draw.circle(880, 230, 80, '#fff6dc', 0.7);
    // 板壁の継ぎ目と木目
    for (var y = 330; y < H; y += 92) {
      game.draw.rect(0, y, W, 3, '#000000', 0.2);
      game.draw.rect(0, y + 3, W, 2, C.white, 0.06);
      for (var g = 0; g < 3; g++) {
        var gx = ((y * 7 + g * 331) % 900) + 40;
        game.draw.line(gx, y + 30 + g * 18, gx + 180, y + 34 + g * 18, '#000000', 2);
      }
    }
    // 競り台(拍札を並べる卓)
    game.draw.gradient(590, 1290, [[0, '#d2a06a'], [0.5, C.table], [1, '#875a30']]);
    game.draw.rect(0, 590, W, 6, C.white, 0.3);
    game.draw.rect(0, 1284, W, 10, '#000000', 0.35);
    for (var k = 0; k < 6; k++) game.draw.line(0, 640 + k * 112, W, 646 + k * 112, '#6a4424', 2);
  }

  function drawCrate(x, y, fishFrame, flop) {
    game.draw.rect(x - 130, y - 50, 260, 110, '#000000', 0.3);
    game.draw.rect(x - 135, y - 60, 260, 110, '#a8784a');
    game.draw.rect(x - 135, y - 60, 260, 16, '#d0a070');
    game.draw.rect(x - 135, y - 8, 260, 8, '#7a522e');
    game.draw.rect(x - 135, y + 40, 260, 10, '#5a3a20');
    game.draw.sprite(FISH[fishFrame], { f: '#9ab4c8', k: '#1a2030', t: '#7a94a8' }, x - 40, y - 75 - flop, 9, { anchor: 'center' });
    game.draw.sprite(FISH[1 - fishFrame], { f: '#c8a0a0', k: '#1a2030', t: '#a88080' }, x + 50, y - 70, 9, { anchor: 'center', flipX: true });
  }

  function drawCaller() {
    var bob = Math.sin(animT * 4) * 4;
    // 足場の木箱
    game.draw.rect(CALL_X - 120, CALL_Y + 95, 250, 120, '#000000', 0.3);
    game.draw.rect(CALL_X - 125, CALL_Y + 85, 250, 120, '#a8784a');
    game.draw.rect(CALL_X - 125, CALL_Y + 85, 250, 14, '#d0a070');
    game.draw.rect(CALL_X - 125, CALL_Y + 140, 250, 8, '#7a522e');
    var up = callerT > 0;
    game.draw.sprite(CALLER[up ? 1 : 0], CPAL, CALL_X, CALL_Y + bob, 13, { anchor: 'center' });
    // 真鍮の鈴
    var bx = CALL_X + (up ? 80 : 74), by = CALL_Y + (up ? -110 : 40) + bob;
    game.draw.rect(bx - 5, by - 46, 10, 30, '#6a4424');
    game.draw.circle(bx, by, 30, '#8a6a28');
    game.draw.circle(bx, by - 3, 27, C.brass);
    game.draw.circle(bx - 8, by - 12, 10, C.white, 0.55);
    if (up) {
      var k = 1 - Math.max(0, callerT) / 0.22;
      game.draw.circle(bx, by, 40 + k * 90, C.white, 0.35 * (1 - k));
    }
  }

  function drawSlate() {
    var x0 = SLATE_X - SLATE_W / 2, y0 = SLATE_Y - SLATE_H / 2;
    game.draw.rect(x0 - 10, y0 - 4, SLATE_W + 32, SLATE_H + 32, '#000000', 0.35);
    game.draw.rect(x0 - 18, y0 - 18, SLATE_W + 36, SLATE_H + 36, '#8a5a30');
    game.draw.rect(x0 - 18, y0 - 18, SLATE_W + 36, 8, '#c08a54');
    game.draw.rect(x0, y0, SLATE_W, SLATE_H, C.board);
    game.draw.rect(x0, y0, SLATE_W, SLATE_H * 0.4, C.white, 0.05);
    game.draw.rect(x0 + 30, y0 + 30, 120, 10, C.chalk, 0.06);
    var rel = relBeat();
    var cw = (SLATE_W - 40) / 4;
    for (var k = 0; k < 4; k++) {
      var cx = x0 + 20 + cw * (k + 0.5);
      if (k > 0) game.draw.line(x0 + 20 + cw * k, y0 + 50, x0 + 20 + cw * k, y0 + SLATE_H - 50, C.chalk, 2);
      var show = cards[0].inT;
      if (show > 0.3) glyph(rs.call[k], cx, SLATE_Y, 120, C.chalk);
      if (running && rel === k) game.draw.rect(cx - 44, SLATE_Y + 62, 88, 10, C.amber);
    }
    // 黒板の受け皿とチョーク
    game.draw.rect(x0 - 10, y0 + SLATE_H + 18, SLATE_W + 20, 14, '#6a4424');
    game.draw.rect(x0 + 40, y0 + SLATE_H + 10, 50, 10, C.chalk);
  }

  function drawCard(c, x, y, sc, flash) {
    var w = CARD_W * sc, h = cardH * sc;
    game.draw.rect(x - w / 2 + 8, y - h / 2 + 10, w, h, '#000000', 0.3);
    game.draw.rect(x - w / 2, y - h / 2, w, h, flash ? C.white : C.paper);
    game.draw.rect(x - w / 2, y - h / 2, w, h * 0.42, C.white, 0.28);
    game.draw.rect(x - w / 2, y + h / 2 - 12, w, 12, '#000000', 0.1);
    game.draw.line(x - w / 2 + 8, y - h / 2 + 5, x + w / 2 - 8, y - h / 2 + 5, C.white, 3);
    game.draw.line(x - w / 2, y + h / 2, x + w / 2, y + h / 2, C.paperDk, 3);
    game.draw.circle(x - w / 2, y, 14 * sc, C.table);
    game.draw.circle(x + w / 2, y, 14 * sc, C.table);
    var cw = (w - 70) / 4;
    for (var k = 0; k < 4; k++) {
      var cx = x - w / 2 + 35 + cw * (k + 0.5);
      if (k > 0) game.draw.line(x - w / 2 + 35 + cw * k, y - h * 0.28, x - w / 2 + 35 + cw * k, y + h * 0.28, C.paperDk, 2);
      glyph(c.pat[k], cx, y, 86 * sc, flash ? C.red : C.ink);
    }
  }

  function drawCards() {
    var rel = relBeat();
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      if (c.used) continue;
      var slide = (1 - c.inT) * 260;
      if (drag && drag.idx === i) {
        game.draw.rect(c.x - CARD_W / 2, c.y - cardH / 2, CARD_W, cardH, '#000000', 0.18);
        game.draw.line(c.x - CARD_W / 2, c.y - cardH / 2, c.x + CARD_W / 2, c.y - cardH / 2, C.paperDk, 3);
        continue;
      }
      var wx = c.wig > 0 ? Math.sin(c.wig * 70) * 10 : 0;
      var fl = hitStop > 0 && flashIdx === i;
      // 重ね先の候補: 持っている間はほかの札がわずかに浮く
      var lift = drag && rel >= 4 && rel < 7 ? 1.02 : 1;
      drawCard(c, c.x + wx, c.y + slide, fl ? 1.12 : lift, fl);
    }
    if (drag) {
      var dc = cards[drag.idx];
      drawCard(dc, drag.fx + drag.ox, drag.fy + drag.oy - 16, 1.08, false);
    }
    if (rs.done && rs.a >= 0) {
      var k = Math.min(1, (songT - rs.doneT) / 0.4);
      var B = cards[rs.b];
      var tx = APP_X, ty = APP_Y - 220;
      var x = B.x + (tx - B.x) * k, y = B.y + (ty - B.y) * k;
      var sc = 1 - 0.45 * k;
      drawCard(B, x + 14, y + 14, sc, false);
      drawCard(cards[rs.a], x, y, sc, false);
    }
  }

  function drawLamps() {
    var rel = relBeat();
    game.draw.rect(60, LAMP_Y - 70, W - 120, 140, '#000000', 0.25);
    game.draw.rect(60, LAMP_Y - 70, W - 120, 8, C.white, 0.08);
    for (var k = 0; k < 8; k++) {
      var x = lampX(k);
      var cur = running && rel === k;
      var resp = k >= 4;
      var col = resp ? (cur ? C.blueLt : C.blue) : (cur ? '#ffd27a' : C.amber);
      var blink = false;
      if (k === 4 && rs.cue && !rs.grabbed && !rs.failed && rel === 3) blink = Math.floor(game.time.elapsed * 12) % 2 === 0;
      if (k === 6 && drag && rel >= 4 && rel < 6) blink = Math.floor(game.time.elapsed * 12) % 2 === 0;
      glossBtn(x, LAMP_Y, cur ? 44 : 38, blink ? C.white : col, cur);
      if (k === 4) game.draw.circle(x, LAMP_Y, 12, C.ink, 0.8);
      if (k === 6) { game.draw.rect(x - 18, LAMP_Y - 14, 26, 18, C.ink, 0.8); game.draw.rect(x - 8, LAMP_Y - 4, 26, 18, C.ink, 0.8); }
      if (rs.failed && k >= 4) game.draw.rect(x - 22, LAMP_Y - 5, 44, 10, C.red, 0.8);
      if (rs.done && k >= 4) game.draw.circle(x, LAMP_Y, 14, C.brass);
    }
  }

  function drawApprentice() {
    var t = animT;
    var raise = rs.done && relBeat() >= 6;
    var y = APP_Y + Math.sin(t * 3.2) * 5 - (appT > 0 ? 8 : 0);
    game.draw.rect(APP_X - 95, APP_Y + 92, 190, 16, '#000000', 0.3);
    game.draw.sprite(APPR[raise ? 1 : 0], APAL, APP_X, y, 15, { anchor: 'center' });
  }

  function drawScene() {
    drawRoom();
    drawCrate(140, 1560, Math.floor(animT * 3) % 2, Math.abs(Math.sin(animT * 6)) * 8);
    drawCrate(940, 1560, Math.floor(animT * 3 + 1) % 2, 0);
    drawCaller();
    drawSlate();
    drawLamps();
    drawApprentice();
    drawCards();
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.woodDeep);
    game.draw.rect(0, 222, W, 8, C.brass, 0.8);
    label('SCORE ' + score, 60, 90, 50, C.paper, 'left');
    label('BEST ' + prevBest, 60, 165, 32, C.brass, 'left');
    label(Math.min(r + 1, ROUNDS) + ' / ' + ROUNDS, W - 60, 90, 54, C.paper, 'right');
    for (var i = 0; i < MISS_MAX; i++) glossBtn(W - 230 + i * 70, 165, 22, i < misses ? C.red : '#5a4030', i < misses);
    var prog = Math.min(1, songT / (ROUNDS * ROUND_BEATS * SPB));
    game.draw.rect(0, 222, W * prog, 8, C.white, 0.6);
  }

  // ---- ATTRACT: 実ロジックで1回目は正しい対をつまんで重ね、2回目は1拍だけ違う札をつまんでMISS ----
  var demo = { t: 0, hx: W / 2, hy: H * 0.75, press: false, plan: -1, a: 0, b: 1 };
  var DEMO_LEN = 2 * ROUND_BEATS * SPB + 0.25;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.plan = -1; demo.hx = W / 2; demo.hy = H * 0.75; }
    stepPlay(dt);
    if (demo.plan !== r) {
      demo.plan = r;
      var tw = [], dec = -1;
      for (var i = 0; i < cards.length; i++) {
        if (cards[i].twin) tw.push(i);
        else if (dec < 0 || diffP(cards[i].pat, rs.call) < diffP(cards[dec].pat, rs.call)) dec = i;
      }
      demo.a = r === 1 ? dec : tw[0];
      demo.b = tw[1];
    }
    var rel = songT / SPB - r * ROUND_BEATS;
    var tx = APP_X + 220, ty = APP_Y + 120;
    demo.press = false;
    if (drag) {
      var k = Math.min(1, Math.max(0, (songT - respHead()) / (2 * SPB - 0.12)));
      var e = k * k * (3 - 2 * k);
      var A = cards[drag.idx], B = cards[demo.b];
      drag.fx = A.x + (B.x - A.x) * e - drag.ox;
      drag.fy = A.y + (B.y - A.y) * e - drag.oy;
      demo.hx = drag.fx; demo.hy = drag.fy; demo.press = true;
      if (songT >= respHead() + 2 * SPB) drop(drag.fx, drag.fy);
      return;
    }
    if (!rs.grabbed && !rs.failed && !rs.done && running) {
      if (rel < 2.2) { var sc = cards[Math.floor(rel * 2.5) % cards.length]; tx = sc.x + 140; ty = sc.y + 40; }
      else { tx = cards[demo.a].x; ty = cards[demo.a].y; }
      if (songT >= respHead() && hitStop <= 0) { grab(demo.a, cards[demo.a].x, cards[demo.a].y); demo.press = true; }
    }
    demo.hx += (tx - demo.hx) * Math.min(1, dt * 7);
    demo.hy += (ty - demo.hy) * Math.min(1, dt * 7);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (hitStop > 0) hitStop -= dt;
    else animT += dt;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.hx, demo.hy, { press: demo.press, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.woodDeep);
      game.draw.rect(0, 222, W, 8, C.brass, 0.8);
      game.draw.rect(W / 2 - 330, 40, 660, 120, C.brass);
      game.draw.rect(W / 2 - 330, 40, 660, 40, C.white, 0.25);
      game.draw.rect(W / 2 - 330, 150, 660, 10, '#000000', 0.25);
      label(GAME_TITLE, W / 2, 102 + Math.sin(t * 3) * 3, 84, C.paper);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 196, 34, C.paper);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.935, 50, C.brass);
      else label('TAP TO START', W / 2, H * 0.935, 44, C.paper);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(60, H * 0.26, W - 120, H * 0.33, C.woodDeep, 0.94);
      game.draw.rect(60, H * 0.26, W - 120, 10, C.brass);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.32, 100, won ? C.brass : C.red);
      label('SCORE ' + score, W / 2, H * 0.385, 58, C.paper);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.43, 36, C.brass);
      label(pairs + ' / ' + ROUNDS, W / 2, H * 0.475, 44, C.paper);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.52, 52, C.brass);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.52, 40, C.paper);
      if (!won) label('あと' + Math.max(1, ROUNDS - pairs) + '対!', W / 2, H * 0.225, 60, C.brass);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.565, 36, C.paper);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, pairs: pairs, perfect: perfects, good: goods, miss: misses };
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
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 110, C.brass);
    if (over && won) label('FINISH', W / 2, H * 0.5, 100, C.brass);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
