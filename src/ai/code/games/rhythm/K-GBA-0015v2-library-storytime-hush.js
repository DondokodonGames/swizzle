// K-GBA-0015v2-library-storytime-hush.js
// 読み聞かせの挙手待ち — 表拍で光る出題ランプの間は指を膝パッドに置いたまま動かさず、裏拍に食い込んだ問いかけの合図の瞬間だけ指を離して手を挙げる
// 操作: 下の膝パッドを指で押さえ続ける(押さえている間、子どもは手を膝に置く)。ランプ列の小さな裏拍ランプが1拍前から点滅したら、その裏拍ちょうどに指を離して手を挙げ、すぐ押さえ直す。合図の裏拍からのずれでPERFECT/GOOD。表拍で指が離れている・ページめくりの強い拍につられて離す・合図に遅れるとMISS
// 終わり: 6小節(9回の合図)を通して MISS 2回以内ならCLEAR(判定の点+連続ボーナス)。MISS 3回でGAME OVER
// @mechanic: freeze
// @theme: library_storytime_hush
// 世界観: 図書館の読み聞かせ会で、最前列の子が表拍で灯る出題ランプの間は手を膝に置いて身じろぎせず、裏拍に食い込む問いかけの合図が来た瞬間だけ手を挙げる
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・挙げられた合図の数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var STYLE = { bg: ['#fdeef4', '#eaf1fd', '#f4effd'], main: ['#f7a8c4', '#9fd3ef', '#bfe3a8'], accent: ['#ffcf5e', '#6f5f9e'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: パステル + 白縁の丸い形。上の画面=読み聞かせ(合図)、下の画面=自分の子と膝パッド
  var C = {
    pink: STYLE.main[0], blue: STYLE.main[1], green: STYLE.main[2],
    gold: STYLE.accent[0], ink: STYLE.accent[1],
    white: '#ffffff', paper: '#fffaf3', blush: '#fff3f8', dim: '#ddd5ec', red: '#f0627e',
    wood: '#e6c39c', wood2: '#d2a77a', skin: '#ffd9bf', hair: '#8a6248', grey: '#c9c3d6',
  };

  var GAME_TITLE = 'HUSH HANDS';
  var BPM = 100;
  var SPB = 60 / BPM;          // 1拍 = 0.6秒
  var BAR = 4;
  var BARS = 6;
  var TOTAL_BEATS = BAR * BARS; // 24拍 = 14.4秒
  var TIME_LIMIT = 15;
  var PERFECT_W = 0.07;         // 合図(裏拍の頭)からのずれ
  var GOOD_W = 0.15;
  var MISS_MAX = 3;
  var HIT_STOP = 0.42;

  // 合図はすべて裏拍(x.5拍)= 次の拍を食う位置。decoys はページめくりの強い表拍(つられて離すとMISS)
  var PLANS = [
    { cues: [3.5, 7.5, 9.5, 11.5, 14.5, 17.5, 19.5, 21.5, 23.5], decoys: [5, 13, 16, 23] },
    { cues: [3.5, 5.5, 9.5, 11.5, 13.5, 17.5, 19.5, 21.5, 23.5], decoys: [1, 7, 15, 23] },
  ];

  // 伴奏(オリジナル)。食い気味のメロディ + 4分のベース。1小節ずつ拍クロックから鳴らす
  var SONG = [
    [['C5', 1.5], ['E5', 0.5], ['G5', 1.5], ['A5', 0.5]],
    [['G5', 1.5], ['F5', 0.5], ['E5', 1], ['D5', 0.5], ['R', 0.5]],
    [['A4', 1.5], ['C5', 0.5], ['E5', 1.5], ['D5', 0.5]],
    [['G5', 1.5], ['F5', 0.5], ['E5', 1], ['D5', 0.5], ['R', 0.5]],
    [['C5', 1.5], ['E5', 0.5], ['G5', 1.5], ['A5', 0.5]],
    [['C5', 1], ['G4', 1], ['C5', 2]],
  ];
  var BASS = [
    [['C3', 1], ['G2', 1], ['C3', 1], ['G2', 1]],
    [['F2', 1], ['C3', 1], ['G2', 1], ['D3', 1]],
    [['A2', 1], ['E3', 1], ['F2', 1], ['G2', 1]],
    [['F2', 1], ['C3', 1], ['G2', 1], ['D3', 1]],
    [['C3', 1], ['G2', 1], ['C3', 1], ['G2', 1]],
    [['C3', 1], ['G2', 1], ['C3', 2]],
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var armed = false; // 最初の入力までデモの音を鳴らさない(音声の解錠前に溜まるのを防ぐ)

  var demoMode, running, beatN, beatT, songT, halfBeat, nextMel, readyT, hitStop, stopUntil;
  var plan, cues, held, touchIds, graceUntil, lampHit, decoyFlash, pageT, askT, raiseT, padT, flashT, flashKind, lateT;
  var score, streak, maxStreak, perfects, goods, misses, raised, over, won, outroT, prevBest, milestone;

  var PADX = W / 2, PADY = H * 0.855;
  var KIDX = W / 2, KIDY = H * 0.63;
  var TELLX = W / 2, TELLY = 670;
  var LAMPY = H * 0.172;

  function initGame(isDemo) {
    demoMode = !!isDemo;
    running = false; beatN = 0; beatT = 0; songT = 0; halfBeat = -1; nextMel = 0;
    readyT = isDemo ? 0 : 0.8;
    hitStop = 0; stopUntil = -1;
    plan = PLANS[isDemo ? 0 : Math.floor(game.random(0, PLANS.length)) % PLANS.length];
    cues = [];
    for (var i = 0; i < plan.cues.length; i++) cues.push({ beat: plan.cues[i], res: '', warned: false, fired: false });
    held = !!isDemo; touchIds = {}; graceUntil = 0;
    lampHit = [0, 0, 0, 0, 0, 0, 0, 0];
    decoyFlash = 0; pageT = 0; askT = 0; raiseT = 0; padT = 0; flashT = 0; flashKind = ''; lateT = 0;
    score = 0; streak = 0; maxStreak = 0; perfects = 0; goods = 0; misses = 0; raised = 0;
    over = false; won = false; outroT = 0; prevBest = game.best; milestone = false;
    if (isDemo) startClock();
  }

  function vol() { return demoMode ? 0.5 : 1; }
  function tone(f, d, o) { if (armed) game.audio.tone(f, d, o); }

  function playBar(b) {
    if (!armed) return;
    game.audio.melody(SONG[b], { tempo: BPM, wave: 'square', volume: demoMode ? 0.02 : 0.035, bass: BASS[b], bassVolume: demoMode ? 0.03 : 0.055 });
  }

  // ---- 拍クロック(1本だけ)----
  function startClock() {
    running = true; beatN = 0; beatT = 0; songT = 0; halfBeat = -1; nextMel = 0;
    onBeat(0);
  }

  function onBeat(k) {
    if (k >= TOTAL_BEATS) return;
    var pos = k % BAR;
    lampHit[pos * 2] = 1;
    if (plan.decoys.indexOf(k) >= 0) {
      // ページめくりの強い表拍(つられやすい音と光)
      decoyFlash = 1; pageT = 0.4;
      tone(560, 0.14, { wave: 'sawtooth', volume: 0.07 * vol(), slide: -380 });
      tone(110, 0.16, { wave: 'triangle', volume: 0.2 * vol() });
    } else {
      tone(pos === 0 ? 1175 : 880, 0.03, { wave: 'triangle', volume: 0.06 * vol() });
    }
    // 表拍で手が膝から離れていたら身じろぎ
    if (!over && hitStop <= 0 && k > graceUntil && !held) slip('still');
  }

  function stepPlay(dt) {
    if (!running) return;
    beatT += dt;
    while (beatT >= SPB) { beatT -= SPB; beatN++; onBeat(beatN); }
    songT = beatN * SPB + beatT;
    if (beatT >= SPB / 2 && halfBeat !== beatN && beatN < TOTAL_BEATS) {
      halfBeat = beatN; lampHit[(beatN % BAR) * 2 + 1] = 0.7;
      tone(2637, 0.012, { wave: 'square', volume: 0.012 * vol() });
    }
    // 伴奏は小節頭の少し前に積む(合成の遅延ぶん)
    while (nextMel < BARS && songT >= nextMel * BAR * SPB - 0.06) { playBar(nextMel); nextMel++; }
    for (var i = 0; i < cues.length; i++) {
      var c = cues[i];
      if (c.res) continue;
      var ct = c.beat * SPB;
      if (!c.warned && songT >= ct - SPB) {
        // 予告: 1拍前から裏拍ランプが点滅し、問いかけの吸う音
        c.warned = true;
        tone(523, 0.2, { wave: 'sine', volume: 0.09 * vol(), slide: 220 });
      }
      if (!c.fired && songT >= ct) {
        c.fired = true; askT = 0.45;
        tone(1319, 0.08, { wave: 'triangle', volume: 0.12 * vol() });
        tone(1760, 0.1, { wave: 'triangle', volume: 0.08 * vol() });
      }
      if (songT > ct + GOOD_W) {
        if (ct - GOOD_W < stopUntil) c.res = 'void';
        else { c.res = 'miss'; lateT = 0.5; slip('late'); }
      }
    }
    if (!demoMode && !over && songT >= TOTAL_BEATS * SPB + 0.1) finish(misses < MISS_MAX);
  }

  function slip(kind) {
    misses++; streak = 0;
    hitStop = HIT_STOP; stopUntil = songT + HIT_STOP; flashT = HIT_STOP; flashKind = kind;
    graceUntil = Math.max(graceUntil, beatN + 1);
    game.feedback.bad(KIDX, KIDY - 150, { text: 'MISS', shake: demoMode ? 4 : 10, volume: armed ? 0.5 : 0.001 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  // 指が離れた = 手を挙げた(入力とデモで共通)
  function release() {
    raiseT = 0.55;
    if (!running || over) return 'none';
    if (hitStop > 0) { graceUntil = Math.max(graceUntil, beatN + 1); return 'none'; }
    var best = null, bd = 1e9;
    for (var i = 0; i < cues.length; i++) {
      if (cues[i].res) continue;
      var d = songT - cues[i].beat * SPB;
      if (Math.abs(d) < Math.abs(bd)) { bd = d; best = cues[i]; }
    }
    if (best && Math.abs(bd) <= GOOD_W) {
      graceUntil = Math.max(graceUntil, Math.floor(best.beat) + 1);
      raised++; streak++;
      if (streak > maxStreak) maxStreak = streak;
      if (Math.abs(bd) <= PERFECT_W) {
        best.res = 'perfect'; perfects++; score += 100 + Math.min(streak, 8) * 10;
        game.feedback.good(KIDX + 150, KIDY - 230, { text: 'PERFECT', color: C.gold, size: 52, count: 12, volume: armed ? 0.25 : 0.001 });
      } else {
        best.res = 'good'; goods++; score += 50;
        game.feedback.good(KIDX + 150, KIDY - 230, { text: 'GOOD', color: C.blue, size: 44, count: 6, volume: armed ? 0.2 : 0.001 });
      }
      if (!demoMode && raised === 5 && !milestone) {
        milestone = true;
        game.audio.play('se_milestone', 0.45);
        game.fx.popup(raised + ' / ' + cues.length, W / 2, 560, { color: C.pink, size: 76 });
      }
      return 'ok';
    }
    slip('early');
    return 'miss';
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.5; running = false;
    game.audio.stopBgm();
    if (ok) {
      score += raised * 20 + maxStreak * 15;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 4; i++) game.fx.burst(game.random(200, 880), game.random(500, 1200), { color: i % 2 ? C.pink : C.gold, count: 20, speed: 420 });
      if (score > prevBest && prevBest > 0) game.fx.popup('NEW RECORD', W / 2, 420, { color: C.pink, size: 70 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function anyTouch() { for (var k in touchIds) { if (touchIds[k]) return true; } return false; }

  // ---- 入力 ----
  game.onPress(function(x, y, id) {
    armed = true;
    if (state !== S.PLAYING || over) return;
    var key = id === undefined ? 'm' : String(id);
    touchIds[key] = true;
    if (!held) {
      held = true; padT = 0.15;
      game.audio.tone(330, 0.05, { wave: 'triangle', volume: 0.09 });
      if (readyT <= 0) game.fx.burst(PADX, PADY - 40, { color: C.pink, count: 5, speed: 140 });
    }
  });
  game.onRelease(function(x, y, id) {
    if (state !== S.PLAYING) return;
    var key = id === undefined ? 'm' : String(id);
    if (!touchIds[key]) return;
    delete touchIds[key];
    if (anyTouch() || !held) return;
    held = false;
    if (over) return;
    var res = release();
    if (res === 'ok') game.audio.tone(1568, 0.06, { wave: 'square', volume: 0.08 });
    else if (res === 'none') game.audio.play('se_tap', 0.2);
  });
  game.onTap(function(x, y) {
    armed = true;
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.white, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function rrect(x, y, w, h, r, col, a) {
    var al = a === undefined ? 1 : a;
    game.draw.rect(x + r, y, w - 2 * r, h, col, al);
    game.draw.rect(x, y + r, r, h - 2 * r, col, al);
    game.draw.rect(x + w - r, y + r, r, h - 2 * r, col, al);
    game.draw.circle(x + r, y + r, r, col, al); game.draw.circle(x + w - r, y + r, r, col, al);
    game.draw.circle(x + r, y + h - r, r, col, al); game.draw.circle(x + w - r, y + h - r, r, col, al);
  }
  // 白縁の丸い画面枠(携帯機の2画面)
  function panel(x, y, w, h, fill) {
    rrect(x - 8, y - 8, w + 16, h + 16, 44, C.white);
    rrect(x, y, w, h, 36, fill);
  }

  var KID = [
    '.....hhhh.....', '...hhhhhhhh...', '..hhhhhhhhhh..', '..hhffffffhh..', '..hfkffffkfh..', '..hfrffffrfh..',
    '...fffmmfff...', '....ffffff....', '...dddddddd...', '..dddddddddd..', '..dddddddddd..', '..fddddddddf..',
    '..ffppppppff..', '..pppppppppp..', '..pp......pp..', '..ss......ss..',
  ];
  function variant(base, rows) { var o = base.slice(); for (var k in rows) o[+k] = rows[k]; return o; }
  var KID_UP = variant(KID, { 6: '...fffoofff...', 11: '..fdddddddd...', 12: '..ffpppppppp..' });
  var KID_BREATH = variant(KID, { 8: '..dddddddddd..' });
  var KPAL = { h: C.hair, f: C.skin, k: C.ink, r: C.pink, m: C.red, o: C.ink, d: C.blue, p: C.ink, s: C.white };
  var NPAL1 = { h: '#c98a5a', f: C.skin, k: C.ink, r: C.pink, m: C.red, o: C.ink, d: C.green, p: C.grey, s: C.white };
  var NPAL2 = { h: '#5a4a6a', f: C.skin, k: C.ink, r: C.pink, m: C.red, o: C.ink, d: C.gold, p: C.grey, s: C.white };
  var WPAL = { h: C.white, f: C.white, k: C.white, r: C.white, m: C.white, o: C.white, d: C.white, p: C.white, s: C.white };

  var TELLER = [
    '......gggg......', '....gggggggg....', '...gggggggggg...', '...gffffffffg...', '...fekeffekef...', '...ffffffffff...',
    '....ffmmmmff....', '.....ffffff.....', '...vvvvvvvvvv...', '..vvvvvvvvvvvv..', '..fbbbbbbbbbbf..', '..vbwwwbbwwwbv..',
    '..vbwwwbbwwwbv..', '..vbbbbbbbbbbv..', '..vvvvvvvvvvvv..', '...nnnnnnnnnn...', '...nnnnnnnnnn...', '....ss....ss....',
  ];
  var TELLER_ASK = variant(TELLER, { 6: '....ffmoomff....', 7: '.....ffffff..f..', 8: '...vvvvvvvvvvf..', 9: '..vvvvvvvvvvvf..', 10: '..fbbbbbbbbbbv..' });
  var TELLER_PAGE = variant(TELLER, { 10: '.fbbbbbbbbbbbbf.', 11: '.bwwwwwwbwwwwwb.', 12: '.bwwwwwwbwwwwwb.', 13: '.bbbbbbbbbbbbbb.' });
  var TPAL = { g: C.grey, f: C.skin, e: C.ink, k: C.blue, m: C.red, o: C.ink, v: C.pink, b: C.ink, w: C.paper, n: C.ink, s: C.wood2 };

  var BOOKS = [];
  (function() {
    var cols = [C.pink, C.blue, C.green, C.gold, '#c9b6ef', '#ffb59e'];
    for (var r = 0; r < 2; r++) {
      for (var side = 0; side < 2; side++) {
        var x = side === 0 ? 84 : 690;
        var end = side === 0 ? 392 : 996;
        var n = 0;
        while (x < end - 30) {
          var w = 30 + ((n * 7 + r * 3 + side * 5) % 4) * 6;
          var h = 78 + ((n * 5 + r + side) % 3) * 14;
          BOOKS.push([x, 572 + r * 150 - h, w - 4, h, cols[(n + r * 2 + side) % cols.length]]);
          x += w; n++;
        }
      }
    }
  })();

  function drawTop(t) {
    panel(40, 250, W - 80, 630, C.paper);
    // 本棚(左右)
    for (var r = 0; r < 2; r++) {
      game.draw.rect(76, 572 + r * 150, 324, 16, C.wood2);
      game.draw.rect(682, 572 + r * 150, 322, 16, C.wood2);
    }
    for (var i = 0; i < BOOKS.length; i++) {
      var b = BOOKS[i];
      game.draw.rect(b[0], b[1], b[2], b[3], b[4]);
      game.draw.rect(b[0] + 4, b[1] + 14, b[2] - 8, 6, C.white, 0.7);
    }
    rrect(56, 800, W - 112, 64, 30, C.green);
    // 出題ランプ列: 大=表拍 / 小=裏拍。この小節の位置を灯す
    rrect(70, LAMPY - 52, W - 140, 104, 52, C.white);
    var bar = Math.floor(Math.min(beatN, TOTAL_BEATS - 1) / BAR);
    for (var s = 0; s < 8; s++) {
      var x = 160 + s * 108;
      var big = s % 2 === 0;
      var r0 = big ? 32 : 19;
      var col = C.dim, a = 1, ring = 0;
      if (running && lampHit[s] > 0) { col = big ? C.blue : C.dim; ring = lampHit[s]; }
      if (big && decoyFlash > 0 && s === (beatN % BAR) * 2) { col = C.pink; ring = decoyFlash; }
      for (var c = 0; c < cues.length; c++) {
        var cu = cues[c];
        if (cu.res === 'void' || !cu.warned) continue;
        if (Math.floor(cu.beat / BAR) !== bar || Math.round((cu.beat - bar * BAR) * 2) !== s) continue;
        if (!cu.fired) { col = Math.floor(t * 12) % 2 === 0 ? C.gold : C.dim; }
        else if (cu.res === 'miss') col = C.red;
        else if (cu.res) col = C.gold;
        else { col = C.gold; ring = 1; }
      }
      if (ring > 0) game.draw.circle(x, LAMPY, r0 + 10 + ring * 14, col, 0.35 * ring);
      game.draw.circle(x, LAMPY, r0 + 5, C.ink, 0.15);
      game.draw.circle(x, LAMPY, r0, col, a);
      game.draw.circle(x - r0 * 0.3, LAMPY - r0 * 0.3, r0 * 0.28, C.white, 0.8);
    }
    // 小節内の現在位置
    if (running) {
      var ph = (beatN % BAR) + beatT / SPB;
      game.draw.rect(160 + ph * 216 - 4, LAMPY + 44, 8, 22, C.ink, 0.6);
    }
    // 読み手
    var frame = askT > 0 ? TELLER_ASK : (pageT > 0 ? TELLER_PAGE : TELLER);
    var bob = hitStop > 0 ? 0 : Math.sin(t * 2.2) * 4;
    game.draw.sprite(frame, TPAL, TELLX, TELLY + bob, 14, { anchor: 'center' });
    if (pageT > 0) game.draw.rect(TELLX - 10, TELLY - 20 - pageT * 120, 96, 60, C.white, 0.9);
    // 吹き出し: 予告は「…」、合図で「?」
    var warnNow = false;
    for (var q = 0; q < cues.length; q++) if (cues[q].warned && !cues[q].fired && !cues[q].res) warnNow = true;
    if (warnNow || askT > 0 || lateT > 0) {
      var bx = TELLX + 230, by = 470;
      game.draw.circle(bx - 70, by + 50, 14, C.white);
      game.draw.circle(bx, by, 64, C.ink, 0.15);
      game.draw.circle(bx, by, 60, lateT > 0 ? C.red : C.white);
      if (askT > 0 || lateT > 0) label('?', bx, by + 26, 84, lateT > 0 ? C.white : C.ink);
      else for (var d = 0; d < 3; d++) game.draw.circle(bx - 30 + d * 30, by, 9, Math.floor(t * 10 + d) % 3 === 0 ? C.gold : C.dim);
    }
  }

  function drawBottom(t) {
    panel(40, 950, W - 80, 920, C.blush);
    // じゅうたん
    rrect(64, 1330, W - 128, 520, 30, '#fcdce8');
    for (var y = 1370; y < 1840; y += 60) for (var x = 100 + ((y / 60) % 2) * 30; x < W - 90; x += 60) game.draw.circle(x, y, 7, C.white, 0.6);
    // となりの子(じっと座っている)
    game.draw.sprite(KID, NPAL1, 190, 1240 + Math.sin(t * 1.7) * 3, 8, { anchor: 'center' });
    game.draw.sprite(KID, NPAL2, 890, 1240 + Math.sin(t * 1.9 + 1) * 3, 8, { anchor: 'center', flipX: true });
    // 自分の子
    var up = !held && (raiseT > 0 || state === S.PLAYING || state === S.ATTRACT);
    var stop = hitStop > 0 && flashT > 0;
    var bob = stop ? 0 : Math.sin(t * 2.6) * 3;
    if (stop) {
      var k = flashT / HIT_STOP;
      game.draw.circle(KIDX, KIDY, 150 + (1 - k) * 90, C.white, 0.6 * k);
      game.draw.sprite(up ? KID_UP : KID, WPAL, KIDX, KIDY, 14, { anchor: 'center' });
    } else {
      var spr = up ? KID_UP : (Math.floor(t * 1.6) % 2 === 0 ? KID : KID_BREATH);
      game.draw.sprite(spr, KPAL, KIDX, KIDY + bob, 12, { anchor: 'center' });
    }
    if (up && !stop) {
      // 挙げた手
      game.draw.rect(KIDX + 48, KIDY - 150 + bob, 26, 156, C.skin);
      game.draw.rect(KIDX + 48, KIDY - 40 + bob, 26, 46, C.blue);
      game.draw.circle(KIDX + 61, KIDY - 160 + bob, 24, C.skin);
    }
    // 膝パッド
    var pr = padT > 0 ? 8 : 0;
    var glow = !held && state === S.PLAYING && !over;
    if (glow) { var gp = 8 + 8 * Math.sin(t * 8); rrect(PADX - 284 - gp, PADY - 104 - gp, 568 + gp * 2, 208 + gp * 2, 60 + gp, C.gold); }
    rrect(PADX - 284 + pr, PADY - 104 + pr, 568 - pr * 2, 208 - pr * 2, 60, C.white);
    rrect(PADX - 270 + pr, PADY - 90 + pr, 540 - pr * 2, 180 - pr * 2, 50, held ? C.blue : C.green);
    if (held) {
      game.draw.circle(PADX - 110, PADY, 44, C.skin);
      game.draw.circle(PADX + 110, PADY, 44, C.skin);
      for (var f = 0; f < 4; f++) { game.draw.circle(PADX - 150 + f * 26, PADY - 46, 12, C.skin); game.draw.circle(PADX + 70 + f * 26, PADY - 46, 12, C.skin); }
    } else {
      game.draw.circle(PADX - 110, PADY, 40, C.white, 0.5);
      game.draw.circle(PADX + 110, PADY, 40, C.white, 0.5);
    }
  }

  function drawScene(t) {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.5, STYLE.bg[2]], [1, STYLE.bg[1]]]);
    for (var y = 20; y < H; y += 90) for (var x = (Math.floor(y / 90) % 2) ? 30 : 75; x < W; x += 90) game.draw.circle(x, y, 5, C.white, 0.6);
    drawTop(t);
    // ちょうつがい
    rrect(90, 890, 120, 46, 23, C.dim); rrect(W - 210, 890, 120, 46, 23, C.dim);
    drawBottom(t);
  }

  function hudFrame() {
    rrect(20, 14, W - 40, 206, 44, C.white);
    rrect(30, 24, W - 60, 186, 36, C.blush);
  }

  function drawHud() {
    hudFrame();
    label('SCORE ' + score, 70, 102, 50, C.ink, 'left');
    label('BEST ' + prevBest, 70, 168, 30, C.pink, 'left');
    label(raised + ' / ' + cues.length, W - 70, 102, 54, C.ink, 'right');
    for (var m = 0; m < MISS_MAX; m++) game.draw.circle(W - 230 + m * 70, 160, 18, m < misses ? C.red : C.dim);
    var progress = Math.min(1, songT / (TOTAL_BEATS * SPB));
    rrect(60, 192, W - 120, 12, 6, C.dim);
    if (progress > 0.02) rrect(60, 192, (W - 120) * progress, 12, 6, C.blue);
  }

  // ---- ATTRACT: 実ロジックで 合図に合わせて離す(PERFECT)→ページめくりにつられて離す(MISS)→合図×3 ----
  var demo = { t: 0, press: true, hx: PADX, hy: PADY };
  var DEMO_LEN = 12 * SPB + 0.6;
  var DEMO_ACTS = [
    [3.5 * SPB, 0], [3.5 * SPB + 0.28, 1],
    [5 * SPB, 0], [5 * SPB + 0.5, 1],
    [7.5 * SPB, 0], [7.5 * SPB + 0.28, 1],
    [9.5 * SPB + 0.1, 0], [9.5 * SPB + 0.4, 1],
    [11.5 * SPB, 0], [11.5 * SPB + 0.28, 1],
  ];
  var demoDone = [];
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demoDone = []; }
    var nt = songT + dt;
    for (var i = 0; i < DEMO_ACTS.length; i++) {
      if (demoDone[i] || nt < DEMO_ACTS[i][0]) continue;
      demoDone[i] = true;
      if (DEMO_ACTS[i][1] === 0) { if (held) { held = false; release(); } }
      else { held = true; padT = 0.15; }
    }
    stepPlay(dt);
    demo.press = held;
    var tx = held ? PADX + 20 : PADX + 120, ty = held ? PADY : PADY - 240;
    demo.hx += (tx - demo.hx) * Math.min(1, dt * 14);
    demo.hy += (ty - demo.hy) * Math.min(1, dt * 14);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (hitStop > 0) hitStop -= dt;
    if (flashT > 0) flashT -= dt;
    if (askT > 0) askT -= dt;
    if (pageT > 0) pageT -= dt;
    if (raiseT > 0) raiseT -= dt;
    if (padT > 0) padT -= dt;
    if (lateT > 0) lateT -= dt;
    if (decoyFlash > 0) decoyFlash -= dt * 3;
    for (var i = 0; i < 8; i++) if (lampHit[i] > 0) lampHit[i] -= dt * 3;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.hx, demo.hy, { press: demo.press, scale: 15 });
      hudFrame();
      label(GAME_TITLE, W / 2, 112, 84 + Math.sin(t * 3) * 3, C.pink);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 186, 34, C.ink);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.955, 46, C.ink);
      else label('TAP TO START', W / 2, H * 0.955, 42, C.pink);
      return;
    }

    if (state === S.RESULT) {
      drawScene(t);
      rrect(72, 292, W - 144, 576, 50, C.white);
      rrect(84, 304, W - 168, 552, 44, C.blush);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, 420, 100, won ? C.blue : C.red);
      label('SCORE ' + score, W / 2, 520, 58, C.ink);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, 598, 34, C.ink);
      if (won && score > prevBest) label('NEW RECORD', W / 2, 690, 54, C.pink);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, 690, 42, C.pink);
      var left = 0;
      for (var c = 0; c < cues.length; c++) if (!cues[c].res) left++;
      if (!won) label('あと' + Math.max(1, left) + '回!', W / 2, 780, 50, C.ink);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.955, 40, C.ink);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, raised: raised, perfect: perfects, good: goods, miss: misses, maxStreak: maxStreak };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) startClock();
    } else {
      stepPlay(dt);
      if (!over && songT > TIME_LIMIT + 1) finish(misses < MISS_MAX);
    }

    drawScene(t);
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.475, 104, C.ink);
    if (over && won) label('FINISH', W / 2, H * 0.475, 100, C.pink);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
