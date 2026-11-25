// K-DS-0025v3-carwash-brush-gap-bot.js
// 洗車トンネルのすき間ロボ — 拍ごとに降りてくるブラシの門にできる穴の形を見て、拍の頭で体を伸ばす・平たくなる・丸まるの形に変えてすり抜ける。途中で4拍子→3拍子→裏打ちの4拍子へ拍型が切り替わる
// 操作: 指を上へはじく=細長く伸びる(縦長の穴)、下へはじく=平たくつぶれる(横長の穴)、その場でタップ=丸まる(小さな四角い穴)。判定は指が触れた瞬間で、門の穴がロボの位置(光る判定線)に来る拍の頭とのずれでPERFECT/GOOD。形違い・遅れ・早すぎはブラシに絡まってMISS。門のない拍の変形は空振り(連続が切れる)。門の上のランプの色と音で穴の形が0.75秒前にわかり、下の3つの絵のうち合う形が光る
// 終わり: 120BPMで 4拍子4小節 → 3拍子4小節 → 裏打ち4拍子2小節(計18秒・21門)を抜けて出口に着けばCLEAR。3回絡まればGAME OVER。拍型が変わる1小節前に拍子板が次の拍子を点滅させ、チャイムと壁の照明の色で予告
// @mechanic: gap_fit
// @theme: carwash_tunnel_shape_bot
// 世界観: 洗車場の洗車機のトンネルの中で、小型の清掃ロボットがコンベアに乗って進み、拍ごとに降りてくる回転ブラシの門の隙間に体の形を合わせてすり抜け、泡まみれにならずに出口を目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・抜けた門の数・PERFECT/GOOD/MISS数・最大連続
// スタイル: 90s 16bit
var STYLE = { bg: ['#1a2a6c', '#3a7bd5'], main: ['#ffffff', '#30c8f0', '#ffd23f'], accent: ['#ff4f8b', '#2a2a40'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 高彩度。トンネル奥の光(グラデ)+壁パネル+泡の近景の3層、暗い輪郭とハイライトのスプライト
  var C = {
    deep: STYLE.bg[0], blue: STYLE.bg[1], white: STYLE.main[0], cyan: STYLE.main[1], yellow: STYLE.main[2],
    pink: STYLE.accent[0], navy: STYLE.accent[1], red: '#e83a5a', ink: '#10101c', grey: '#8890a8'
  };
  var SHAPE_COL = { tall: C.cyan, flat: C.yellow, ball: C.pink };

  var GAME_TITLE = 'SUDS GAP BOT';
  var BPM = 120, SPB = 60 / BPM;
  var TIME_LIMIT = 18;                 // 4/4×4小節(8秒) + 3/4×4小節(6秒) + 4/4×2小節(4秒)
  var READY_T = 0.8;
  var PERFECT_W = 0.05, GOOD_W = 0.11;
  var TELE_T = 0.75;
  var LIVES = 3;
  var RY = 1150, V = 1200;             // 判定線と門の降りる速さ(px/秒)
  var WALL_L = 120, WALL_R = 960, CX = 540;
  var HOLD_T = 0.32, FLICK = 50, TAP_WAIT = 0.25;
  var HOLES = { tall: { w: 170, h: 360 }, flat: { w: 470, h: 150 }, ball: { w: 220, h: 220 } };

  // 小節ごとの拍子と門の拍(小節内の拍番号)
  var SONG = [
    { m: 4, g: [2] }, { m: 4, g: [0, 2] }, { m: 4, g: [0, 1, 2] }, { m: 4, g: [0, 2] },
    { m: 3, g: [0, 2] }, { m: 3, g: [0, 2] }, { m: 3, g: [0, 2] }, { m: 3, g: [0, 2] },
    { m: 4, g: [1, 3], back: true }, { m: 4, g: [1, 2, 3], back: true }
  ];
  var DEMO_SONG = [{ m: 4, g: [2] }, { m: 4, g: [0, 2] }, { m: 3, g: [0, 2] }, { m: 3, g: [0, 2] }];
  var DEMO_SHAPES = ['tall', 'flat', 'ball', 'tall', 'flat', 'ball'];

  // 伴奏(オリジナル)。4拍子=明るい行進、3拍子=ズン・チャッ・チャ、裏打ち=2・4拍に手拍子
  var LEAD4 = ['C5', 'E5', 'G5', 'E5', 'F5', 'A5', 'G5', 'E5', 'D5', 'F5', 'E5', 'C5', 'D5', 'G5', 'B4', 'G4'];
  var LEAD3 = ['E5', 'G5', 'G5', 'F5', 'A5', 'A5', 'E5', 'G5', 'C6', 'D5', 'F5', 'B4'];
  var BASS = ['C3', 'F2', 'G2', 'C3'];

  // ---- スプライト(正面・暗い輪郭+ハイライト) ----
  var BOT = {
    normal: ['....oooooo....', '...owwwwwwo...', '..owccccccwo..', '..occeccecco..', '..occcccccco..', '..owwwwwwwwo..', '.oowwyyyywwoo.', 'bbowwwwwwwwobb', 'bbowwwwwwwwobb', '..owwwwwwwwo..', '..oooooooooo..', '..gg......gg..'],
    tall: ['..oooo..', '.owwwwo.', 'ocecceco', 'occcccco', '.owwwwo.', '.owyywo.', '.owwwwo.', '..owwo..', '..owwo..', '..owwo..', '.owwwwo.', 'bowwwwob', 'bowwwwob', '.owwwwo.', '.owwwwo.', '.oooooo.', '.gg..gg.'],
    flat: ['....oooooooooo....', '..oowccccccccwoo..', '.oowccecccceccwoo.', 'bbowwwwyyyywwwwobb', 'bbowwwwwwwwwwwwobb', '..oooooooooooooo..', '..gg..........gg..'],
    ball: ['...oooo...', '.oowwwwoo.', '.owccccwo.', 'owceccecwo', 'owwwwwwwwo', 'owwyyyywwo', 'owwwwwwwwo', '.owwwwwwo.', '.oowwwwoo.', '...oooo...']
  };
  var BUBBLE = ['.ww.', 'w..w', 'w..w', '.ww.'];
  var SPONGE = ['.yyyy.', 'yyyyyy', 'yoyyoy', 'yyyyyy'];
  function botPal(blink, armA, hit) {
    return {
      o: C.navy, w: hit ? '#d8dce8' : C.white, c: hit ? '#6a7a98' : C.cyan, e: hit ? C.red : (blink ? C.cyan : C.white),
      y: C.yellow, b: armA ? C.pink : '#ff9ac0', g: '#4a4a60'
    };
  }

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var beats, gates, endT, clock, score, combo, maxCombo, nPerfect, nGood, nMiss, hits, passed;
  var hitStop, over, won, outroT, lastCue, lastBeat, demoMode, prevBest, resultT, realT;
  var shape, shapeT, pend, hitGate, beatPulse, announce, section, milestoneDone, foam, sparks, wallShift;

  function build(song, demo) {
    beats = []; gates = [];
    var t = 0;
    for (var b = 0; b < song.length; b++) {
      var bar = song[b];
      for (var k = 0; k < bar.m; k++) {
        beats.push({ t: t, bar: b, k: k, m: bar.m, back: !!bar.back, first: k === 0 });
        for (var j = 0; j < bar.g.length; j++) {
          if (bar.g[j] === k) gates.push({ t: t, bi: beats.length - 1, shape: 'ball', res: 0, teled: false });
        }
        t += SPB;
      }
    }
    endT = t;
    var last = '';
    for (var g = 0; g < gates.length; g++) {
      var sh;
      if (demo) sh = DEMO_SHAPES[g % DEMO_SHAPES.length];
      else {
        var opts = ['tall', 'flat', 'ball'];
        sh = opts[Math.floor(game.random(0, 3)) % 3];
        if (sh === last && game.random(0, 1) < 0.7) sh = opts[(opts.indexOf(sh) + 1 + (Math.floor(game.random(0, 2)) % 2)) % 3];
      }
      gates[g].shape = sh; last = sh;
    }
  }

  function initRun(demo) {
    demoMode = !!demo;
    build(demo ? DEMO_SONG : SONG, demo);
    clock = demo ? -0.6 : -READY_T;
    score = 0; combo = 0; maxCombo = 0; nPerfect = 0; nGood = 0; nMiss = 0; hits = 0; passed = 0;
    hitStop = 0; over = false; won = false; outroT = 0; lastCue = -1; lastBeat = -1;
    prevBest = game.best; resultT = 0; realT = 0;
    shape = 'normal'; shapeT = 0; pend = null; hitGate = null; beatPulse = 0; announce = null; section = 0;
    milestoneDone = false; foam = []; sparks = []; wallShift = 0;
  }

  // ---- 拍クロック ----
  function cueBeats() {
    for (var n = lastCue + 1; n < beats.length; n++) {
      if (clock + 0.06 < beats[n].t) break;
      lastCue = n;
      if (!demoMode) playBeat(n);
    }
  }
  function playBeat(n) {
    var b = beats[n];
    var root = BASS[b.bar % 4];
    if (b.m === 3) {
      // ズン・チャッ・チャ
      game.audio.melody([[LEAD3[(b.bar * 3 + b.k) % 12], 1]], {
        tempo: BPM, wave: 'square', volume: 0.03,
        bass: [[b.k === 0 ? root : (b.k === 1 ? 'E3' : 'G3'), 0.5], ['R', 0.5]], bassWave: 'triangle', bassVolume: b.k === 0 ? 0.13 : 0.06
      });
    } else {
      game.audio.melody([[LEAD4[(b.bar * 4 + b.k) % 16], 0.5], [b.back ? LEAD4[(b.bar * 4 + b.k + 2) % 16] : 'R', 0.5]], {
        tempo: BPM, wave: 'square', volume: 0.03,
        bass: [[b.k % 2 === 0 ? root : 'R', 0.6], ['R', 0.4]], bassWave: 'triangle', bassVolume: 0.12
      });
    }
  }
  function onBeat(n) {
    var b = beats[n];
    beatPulse = 1;
    if (!demoMode) {
      if (b.back && b.k % 2 === 1) { game.audio.tone(1800, 0.04, { wave: 'sawtooth', volume: 0.03 }); game.audio.tone(900, 0.05, { wave: 'square', volume: 0.02 }); }
      else game.audio.tone(b.k === 0 ? 1320 : 990, 0.02, { wave: 'square', volume: 0.018 });
    }
    // 拍型が変わる1小節前の予告
    var nb = n + b.m - b.k;   // 次の小節の頭
    if (b.k === 0 && nb < beats.length) {
      var nxt = beats[nb];
      if (nxt.m !== b.m || nxt.back !== b.back) {
        announce = { m: nxt.m, back: nxt.back };
        if (!demoMode) { game.audio.tone('G5', 0.12, { wave: 'square', volume: 0.05 }); game.audio.tone('C6', 0.2, { wave: 'square', volume: 0.05 }); }
      }
    }
    if (b.k === 0 && n > 0) {
      var prev = beats[n - 1];
      if (prev.m !== b.m || prev.back !== b.back) {
        announce = null; section++;
        for (var i = 0; i < 12; i++) foam.push({ x: game.random(WALL_L, WALL_R), y: game.random(300, 1300), t: 0, r: game.random(14, 34) });
        if (!demoMode) {
          game.audio.play('se_powerup', 0.35);
          game.fx.popup(String(b.m), W - 150, 330, { color: C.yellow, size: 72 });
        }
      }
    }
  }

  function stepRun(dt) {
    clock += dt;
    wallShift += dt * V;
    if (shapeT > 0) { shapeT -= dt; if (shapeT <= 0 && shape !== 'hit') shape = 'normal'; }
    if (shape === 'hit' && shapeT <= 0) shape = 'normal';
    cueBeats();
    var bi = -1;
    for (var i = 0; i < beats.length; i++) { if (beats[i].t <= clock) bi = i; else break; }
    while (lastBeat < bi) { lastBeat++; onBeat(lastBeat); }
    // タップの判定待ち(指が離れないまま)は丸まる扱い
    if (pend && !pend.done && clock - pend.t >= TAP_WAIT) resolveGesture('ball');
    if (over) return;
    for (var j = 0; j < gates.length; j++) {
      var g = gates[j];
      if (!g.teled && clock >= g.t - TELE_T) {
        g.teled = true;
        if (!demoMode) game.audio.tone(g.shape === 'tall' ? 660 : (g.shape === 'flat' ? 220 : 440), 0.12, { wave: 'triangle', volume: 0.05, slide: g.shape === 'tall' ? 200 : (g.shape === 'flat' ? -80 : 0) });
      }
      if (!g.res && clock > g.t + GOOD_W) {
        if (pend && !pend.done && Math.abs(pend.t - g.t) <= GOOD_W) continue;   // はじき途中は結果を待つ
        g.res = 3;
        tangle(g);
        if (over || hitStop > 0) return;
      }
    }
    if (!demoMode && clock >= endT + 0.2) finishRun(true);
  }

  // ---- 判定 ----
  function tangle(g) {
    hits++; nMiss++; combo = 0;
    hitStop = 0.45; hitGate = g; shape = 'hit'; shapeT = 0.8;
    game.feedback.bad(CX, RY - 60, { text: 'MISS', color: C.red, flashColor: C.white, shake: demoMode ? 3 : 12, volume: demoMode ? 0.03 : 0.6 });
    for (var i = 0; i < 10; i++) foam.push({ x: CX + game.random(-160, 160), y: RY + game.random(-120, 100), t: 0, r: game.random(16, 36) });
    if (!demoMode && hits >= LIVES) { game.audio.play('se_break', 0.35); finishRun(false); }
  }

  // 形を変える(本番の指もATTRACTのゴーストも同じ関数)。tp = 指が触れた拍クロック
  function morph(kind, tp) {
    shape = kind; shapeT = HOLD_T;
    var best = null, bd = 1e9;
    for (var i = 0; i < gates.length; i++) {
      var g = gates[i];
      if (g.res) continue;
      var d = Math.abs(tp - g.t);
      if (d <= GOOD_W && d < bd) { bd = d; best = g; }
    }
    if (!best) {
      combo = 0;
      game.feedback.bad(CX, RY - 40, { text: null, color: C.grey, shake: 2, volume: demoMode ? 0.02 : 0.2 });
      return 'whiff';
    }
    if (best.shape !== kind) { best.res = 3; tangle(best); return 'wrong'; }
    var grade = bd <= PERFECT_W ? 1 : 2;
    best.res = grade;
    passed++; combo++; maxCombo = Math.max(maxCombo, combo);
    if (grade === 1) nPerfect++; else nGood++;
    score += (grade === 1 ? 200 : 110) + Math.min(10, combo) * 15 + section * 20;
    sparks.push({ x: CX, y: RY, t: 0, col: SHAPE_COL[kind] });
    game.feedback.good(CX, RY - 250, {
      text: grade === 1 ? 'PERFECT' : 'GOOD', color: grade === 1 ? C.yellow : C.white, size: grade === 1 ? 58 : 46,
      count: grade === 1 ? 14 : 8, flashColor: C.white, volume: demoMode ? 0.03 : 0.15
    });
    if (!demoMode) {
      if (combo > 0 && combo % 5 === 0) game.fx.popup('x' + combo, W - 160, 450, { color: C.cyan, size: 60 });
      if (!milestoneDone && passed >= Math.ceil(gates.length / 2)) {
        milestoneDone = true;
        game.fx.popup('NICE', CX, 560, { color: C.yellow, size: 90 });
        game.audio.play('se_milestone', 0.45);
      }
    }
    return grade === 1 ? 'perfect' : 'good';
  }

  function resolveGesture(kind) {
    if (!pend || pend.done) return;
    pend.done = true;
    if (state !== S.PLAYING || over) return;
    var res = morph(kind, pend.t);
    if (res === 'perfect' || res === 'good') game.audio.play('se_jump', kind === 'flat' ? 0.12 : 0.25);
    else if (res === 'whiff') game.audio.tone(kind === 'tall' ? 520 : (kind === 'flat' ? 200 : 330), 0.07, { wave: 'square', volume: 0.04 });
  }

  function finishRun(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.7;
    if (demoMode) return;
    game.audio.stopBgm();
    if (ok) {
      score += (LIVES - hits) * 300 + 500;
      for (var i = 0; i < 6; i++) game.fx.burst(200 + i * 136, 500 + (i % 2) * 120, { color: i % 2 ? C.cyan : C.yellow, count: 16, speed: 380 });
      game.audio.play('se_success', 0.55);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = { score: score, gates: passed, total: gates.length, perfect: nPerfect, good: nGood, miss: nMiss, maxCombo: maxCombo };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // ---- 入力(はじく方向で形が決まる) ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT && resultT > 0.6) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; demo.cyc = 0; return; }
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || clock < 0 || hitStop > 0 || y < 230) return;
    if (pend && !pend.done) resolveGesture('ball');
    pend = { x0: x, y0: y, t: clock, done: false };
    sparks.push({ x: x, y: y, t: 0, col: C.white, ring: true });
    game.audio.tone(880, 0.03, { wave: 'square', volume: 0.03 });
  });

  game.onMove(function(x, y) {
    if (!pend || pend.done) return;
    var dy = y - pend.y0;
    if (dy < -FLICK) { resolveGesture('tall'); game.fx.burst(x, y, { color: C.cyan, count: 4, speed: 160 }); }
    else if (dy > FLICK) { resolveGesture('flat'); game.fx.burst(x, y, { color: C.yellow, count: 4, speed: 160 }); }
  });

  game.onRelease(function(x, y) {
    if (!pend || pend.done) return;
    var dy = y - pend.y0;
    if (dy < -FLICK) resolveGesture('tall');
    else if (dy > FLICK) resolveGesture('flat');
    else { resolveGesture('ball'); game.audio.tone(660, 0.02, { wave: 'square', volume: 0.02 }); }
  });

  // ---- 描画ヘルパー ----
  function label(str, x, y, sz, col, align) {
    var a = align || 'center';
    game.draw.text(str, x - 3, y, { size: sz, color: C.navy, bold: true, align: a });
    game.draw.text(str, x + 3, y, { size: sz, color: C.navy, bold: true, align: a });
    game.draw.text(str, x, y + 5, { size: sz, color: C.navy, bold: true, align: a });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: a });
  }
  function gateY(g) { return RY - (g.t - clock) * V; }

  // ---- 描画 ----
  function drawTunnel() {
    var t = game.time.elapsed;
    // 遠景: トンネル出口の光
    game.draw.gradient(0, H, [[0, C.deep], [0.25, C.blue], [0.55, '#5aa0e8'], [0.75, C.deep], [1, '#0c1430']]);
    game.draw.circle(CX, 300, 220, '#bfe8ff', 0.18);
    game.draw.circle(CX, 300, 140, '#e8f8ff', 0.25);
    // 中景: 壁パネル(門と同じ速さで流れる)。拍子で照明の色が変わる
    var wallCol = section === 1 ? C.pink : (section === 2 ? C.yellow : C.cyan);
    if (announce && Math.floor(t * 8) % 2 === 0) wallCol = announce.m === 3 ? C.pink : C.yellow;
    var off = wallShift % 160;
    for (var y = 230 - 160 + off; y < 1440; y += 160) {
      game.draw.rect(0, y, WALL_L, 150, '#24346e');
      game.draw.rect(WALL_R, y, W - WALL_R, 150, '#24346e');
      game.draw.rect(WALL_L - 26, y + 10, 18, 130, wallCol, 0.55 + beatPulse * 0.4);
      game.draw.rect(WALL_R + 8, y + 10, 18, 130, wallCol, 0.55 + beatPulse * 0.4);
      game.draw.rect(10, y + 6, WALL_L - 40, 8, '#4a64b0');
      game.draw.rect(WALL_R + 30, y + 6, W - WALL_R - 40, 8, '#4a64b0');
    }
    // 床のコンベア(ローラーの帯が流れ、拍で光る)
    game.draw.rect(WALL_L, 230, WALL_R - WALL_L, 1210, '#2c3c78', 0.55);
    var roff = wallShift % 80;
    for (var ry = 230 - 80 + roff; ry < 1440; ry += 80) {
      game.draw.rect(CX - 210, ry, 420, 10, '#6878b8', 0.6);
      game.draw.rect(CX - 210, ry + 10, 420, 4, '#1a2450', 0.6);
    }
    game.draw.rect(CX - 220, 230, 10, 1210, C.grey, 0.7);
    game.draw.rect(CX + 210, 230, 10, 1210, C.grey, 0.7);
    // 判定線(拍で脈打つ)
    game.draw.rect(WALL_L, RY - 4 - beatPulse * 3, WALL_R - WALL_L, 8 + beatPulse * 6, C.white, 0.35 + beatPulse * 0.4);
    // 近景: 漂う泡
    for (var b = 0; b < 10; b++) {
      var bx = (b * 113 + Math.sin(t * 0.8 + b) * 40) % W;
      var by = 1420 - ((t * (40 + b * 9) + b * 170) % 1190);
      game.draw.sprite(BUBBLE, { w: C.white }, bx, by, 6 + (b % 3) * 2, { anchor: 'center', alpha: 0.5 });
    }
  }

  function drawBrush(x, y, w, h, flash, vertical) {
    var t = game.time.elapsed;
    if (w <= 4 || h <= 4) return;
    game.draw.rect(x, y, w, h, C.navy);
    game.draw.rect(x + 4, y + 4, w - 8, h - 8, flash ? C.white : C.red);
    // 回る毛の縞(トゲの記号)
    var sp = (t * 600) % 36;
    if (vertical) {
      for (var yy = y + sp - 36; yy < y + h; yy += 36) if (yy > y) game.draw.rect(x + 6, yy, w - 12, 10, flash ? '#ffffff' : '#ff8aa0', 0.8);
    } else {
      for (var xx = x + sp - 36; xx < x + w; xx += 36) if (xx > x) game.draw.rect(xx, y + 6, 10, h - 12, flash ? '#ffffff' : '#ff8aa0', 0.8);
    }
    game.draw.rect(x + 4, y + 4, w - 8, 6, '#ffffff', 0.5);
  }

  function drawGate(g) {
    var gy = gateY(g);
    if (gy < 120 || gy > 1700) return;
    var hole = HOLES[g.shape];
    var flash = hitStop > 0 && hitGate === g;
    var passedOk = g.res === 1 || g.res === 2;
    var alpha = gy > RY + 60 ? Math.max(0, 1 - (gy - RY - 60) / 260) : 1;
    if (alpha <= 0) return;
    var top = gy - hole.h / 2, bot = gy + hole.h / 2;
    var bandT = top - 70, bandB = bot + 60;
    // 門のフレーム(左右の縦ブラシ・上下の横ブラシ)
    var hl = CX - hole.w / 2, hr = CX + hole.w / 2;
    if (passedOk) {
      // 抜けた門は上へ開いていく
      var k = Math.min(1, (clock - g.t) / 0.25);
      hl -= k * 120; hr += k * 120;
    }
    drawBrush(WALL_L, bandT, hl - WALL_L, bandB - bandT, flash, true);
    drawBrush(hr, bandT, WALL_R - hr, bandB - bandT, flash, true);
    drawBrush(hl, bandT, hr - hl, top - bandT, flash, false);
    drawBrush(hl, bot, hr - hl, bandB - bot, flash, false);
    // 穴の縁(形の色で光る)
    var col = SHAPE_COL[g.shape];
    var lead = g.t - clock;
    var on = lead > TELE_T || lead < 0 || Math.floor(game.time.elapsed * 12) % 2 === 0;
    game.draw.rect(hl - 6, top - 6, hr - hl + 12, 6, col, on ? 0.95 : 0.4);
    game.draw.rect(hl - 6, bot, hr - hl + 12, 6, col, on ? 0.95 : 0.4);
    game.draw.rect(hl - 6, top, 6, hole.h, col, on ? 0.95 : 0.4);
    game.draw.rect(hr, top, 6, hole.h, col, on ? 0.95 : 0.4);
    // 門の上のランプ(予告で点滅)
    game.draw.circle(CX, bandT - 22, 22, C.navy);
    game.draw.circle(CX, bandT - 22, 16, col, lead <= TELE_T && lead > 0 ? (on ? 1 : 0.3) : 0.6);
    if (alpha < 1) game.draw.rect(WALL_L, bandT, WALL_R - WALL_L, bandB - bandT, C.deep, (1 - alpha) * 0.8);
  }

  function drawBot() {
    var t = game.time.elapsed;
    var spr = BOT[shape === 'hit' ? 'normal' : shape];
    var blink = Math.floor(t * 0.7) % 4 === 0 && Math.floor(t * 6) % 2 === 0;
    var arm = Math.floor(t * 8) % 2 === 0;
    var bob = shape === 'normal' ? -beatPulse * 10 : 0;
    var px = 18;
    var flash = hitStop > 0 && shape === 'hit';
    game.draw.circle(CX, RY + spr.length * px / 2 + 10, spr[0].length * px * 0.4, '#000000', 0.25);
    if (flash) game.draw.circle(CX, RY, 190, C.white, 0.6);
    game.draw.sprite(spr, botPal(blink, arm, shape === 'hit'), CX + (shape === 'hit' ? Math.sin(t * 40) * 6 : 0), RY + bob, flash ? 21 : px, { anchor: 'center' });
  }

  function drawFx() {
    var dt = game.time.delta;
    for (var i = foam.length - 1; i >= 0; i--) {
      var f = foam[i];
      f.t += dt;
      if (f.t > 0.9) { foam.splice(i, 1); continue; }
      game.draw.circle(f.x, f.y - f.t * 40, f.r * (1 + f.t * 0.6), C.white, 0.7 - f.t * 0.7);
      game.draw.circle(f.x - f.r * 0.3, f.y - f.t * 40 - f.r * 0.3, f.r * 0.25, '#ffffff', 0.8 - f.t * 0.8);
    }
    for (var j = sparks.length - 1; j >= 0; j--) {
      var s = sparks[j];
      s.t += dt;
      if (s.t > 0.4) { sparks.splice(j, 1); continue; }
      var r = (s.ring ? 30 : 120) + s.t * (s.ring ? 200 : 600);
      for (var k = 0; k < 12; k++) {
        var a = k / 12 * Math.PI * 2;
        game.draw.rect(s.x + Math.cos(a) * r - 5, s.y + Math.sin(a) * r * (s.ring ? 1 : 0.6) - 5, 10, 10, s.col, 1 - s.t * 2.5);
      }
    }
  }

  // 親指ゾーン: 上=伸びる / 中=丸まる / 下=平たく。次の門に合う形が光る
  function drawHints(hl) {
    var t = game.time.elapsed;
    game.draw.rect(0, 1440, W, H - 1440, '#141c44');
    game.draw.rect(0, 1440, W, 8, C.cyan, 0.5);
    var items = [['tall', 300, 1610], ['ball', 540, 1610], ['flat', 780, 1610]];
    for (var i = 0; i < 3; i++) {
      var kind = items[i][0], x = items[i][1], y = items[i][2];
      var lit = hl === kind;
      var col = SHAPE_COL[kind];
      game.draw.rect(x - 110, y - 130, 220, 260, lit ? '#2a3a80' : '#1c2656');
      game.draw.rect(x - 110, y - 130, 220, 8, col, lit ? 1 : 0.5);
      if (lit) game.draw.rect(x - 110, y - 130, 220, 260, col, 0.12 + Math.sin(t * 12) * 0.06);
      game.draw.sprite(BOT[kind], botPal(false, true, false), x, y + 20, kind === 'flat' ? 8 : 7, { anchor: 'center', alpha: lit ? 1 : 0.6 });
      if (kind === 'tall') { game.draw.line(x - 20, y - 80, x, y - 110, col, 10); game.draw.line(x, y - 110, x + 20, y - 80, col, 10); }
      else if (kind === 'flat') { game.draw.line(x - 20, y - 110, x, y - 80, col, 10); game.draw.line(x, y - 80, x + 20, y - 110, col, 10); }
      else { game.draw.circle(x, y - 95, 18, col, 0.9); game.draw.circle(x, y - 95, 9, '#1c2656'); }
    }
  }

  function nextGateShape() {
    for (var i = 0; i < gates.length; i++) if (!gates[i].res && gates[i].t - clock <= 1.0) return gates[i].shape;
    return null;
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.navy);
    game.draw.rect(0, 222, W, 8, C.cyan, 0.6);
    label('SCORE ' + score, 40, 80, 42, C.white, 'left');
    if (combo >= 2) label('x' + combo, 560, 80, 42, C.yellow);
    // 残りのスポンジ(絡まると減る)
    for (var i = 0; i < LIVES; i++) {
      var on = i < LIVES - hits;
      game.draw.sprite(SPONGE, { y: on ? C.yellow : '#3a3a58', o: on ? '#c89a20' : '#2a2a40' }, 64 + i * 80, 150, 10, { anchor: 'center' });
    }
    // 拍子板: 今の拍子の数字と拍ランプ(予告中は次の拍子を点滅)
    var bi = 0;
    for (var j = 0; j < beats.length; j++) if (beats[j].t <= clock) bi = j;
    var b = beats[bi];
    var blinkNext = announce && Math.floor(game.time.elapsed * 8) % 2 === 0;
    var m = blinkNext ? announce.m : b.m;
    game.draw.rect(820, 24, 230, 130, '#24346e');
    game.draw.rect(820, 24, 230, 6, blinkNext ? C.pink : C.cyan);
    label(String(m), 880, 116, 72, blinkNext ? C.pink : C.yellow);
    for (var k = 0; k < m; k++) {
      var lit = !blinkNext && clock >= 0 && k === b.k;
      var accent = b.back ? k % 2 === 1 : k === 0;
      game.draw.circle(940 + k * 26, 90, lit ? 12 : 9, lit ? C.white : (accent ? C.pink : '#4a64b0'));
    }
    // 進み具合
    var pr = Math.max(0, Math.min(1, clock / endT));
    game.draw.rect(260, 180, 520, 14, '#1a2450');
    game.draw.rect(260, 180, 520 * pr, 14, C.cyan);
  }

  function drawScene() {
    drawTunnel();
    // 奥(上)の門から順に
    for (var i = gates.length - 1; i >= 0; i--) if (gateY(gates[i]) <= RY + 20) continue; else drawGate(gates[i]);
    drawBot();
    for (var j = gates.length - 1; j >= 0; j--) if (gateY(gates[j]) <= RY + 20) drawGate(gates[j]);
    drawFx();
  }

  function scan() {
    for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.1);
  }

  function drawResult(showTap) {
    var y0 = H * 0.27, hh = H * 0.38;
    game.draw.rect(40, y0, W - 80, hh, C.navy, 0.92);
    game.draw.rect(52, y0 + 12, W - 104, 8, C.cyan);
    game.draw.rect(52, y0 + hh - 20, W - 104, 8, C.cyan);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 96, won ? C.yellow : C.pink);
    label('SCORE ' + score, W / 2, H * 0.4, 58, C.white);
    label('PERFECT ' + nPerfect + '  GOOD ' + nGood + '  MISS ' + nMiss, W / 2, H * 0.445, 34, C.white);
    label(passed + ' / ' + gates.length, W / 2, H * 0.49, 46, C.white);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.545, 56, C.yellow);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.545, 42, C.white);
    if (!won) label('あと' + Math.max(1, gates.length - passed) + '門!', W / 2, H * 0.59, 50, C.pink);
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.625, 34, C.white);
  }

  // ---- ATTRACT: 実ロジックで4拍子→3拍子の4小節。奇数周は全部抜ける、偶数周は4つ目の門で形を間違えて絡まる ----
  var demo = { t: 0, x: 540, y: 1600, press: 0, dir: 0, next: 0, cyc: 0 };
  var DEMO_CYC = 2 * 4 * SPB + 2 * 3 * SPB + 1.6;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) { initRun(true); demo.cyc++; demo.next = 0; }
    if (hitStop > 0) hitStop -= dt; else stepRun(dt);
    var g = gates[demo.next];
    if (g && g.t - clock < 0.8) {
      var tx = g.shape === 'tall' ? 300 : (g.shape === 'flat' ? 780 : 540);
      demo.x += (tx - demo.x) * Math.min(1, dt * 10);
    }
    if (g && hitStop <= 0 && clock >= g.t + 0.01) {
      var kind = g.shape;
      if (demo.cyc % 2 === 0 && demo.next === 3) kind = kind === 'tall' ? 'flat' : 'tall';
      morph(kind, clock);
      demo.press = 0.2; demo.dir = kind === 'tall' ? -1 : (kind === 'flat' ? 1 : 0); demo.next++;
    }
    if (demo.press > 0) demo.press -= dt;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);

    if (state === S.ATTRACT) {
      if (!beats) initRun(true);
      stepDemo(dt);
      drawScene();
      drawHints(nextGateShape());
      var k = demo.press > 0 ? 1 - demo.press / 0.2 : 0;
      game.draw.hand(demo.x, demo.y + demo.dir * k * 150, { press: demo.press > 0, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.navy);
      game.draw.rect(0, 222, W, 8, C.cyan, 0.6);
      label(GAME_TITLE, W / 2, 112, 90 + Math.sin(t * 3) * 3, C.yellow);
      label('HI-SCORE ' + game.best, W / 2, 190, 36, C.cyan);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.965, 44, C.yellow);
      else label('TAP TO START', W / 2, H * 0.965, 40, C.white);
      scan();
      return;
    }

    if (state === S.RESULT) {
      resultT += dt;
      drawScene();
      drawHints(null);
      drawHud();
      drawResult(true);
      scan();
      return;
    }

    // ---- PLAYING ----
    realT += dt;
    if (!over && realT >= READY_T + TIME_LIMIT + 2.5) { hitStop = 0; finishRun(hits < LIVES); }
    if (hitStop > 0) {
      hitStop -= dt;
    } else if (over) {
      outroT -= dt;
      if (outroT <= 0) { state = S.RESULT; resultT = 0; endGame(); }
    } else {
      var wasReady = clock < -0.35;
      stepRun(dt);
      if (wasReady && clock >= -0.35) game.audio.play('se_tap', 0.4);
    }

    drawScene();
    drawHints(nextGateShape());
    drawHud();
    if (clock < 0) {
      game.draw.rect(0, H * 0.4, W, 170, C.navy, 0.85);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4 + 115, 100, C.yellow);
    }
    // 最初の門だけ、合う形の絵の上でゴーストの手を薄く動かす
    if (!over && gates.length && !gates[0].res && clock > gates[0].t - 0.9) {
      var g0 = gates[0];
      var hx = g0.shape === 'tall' ? 300 : (g0.shape === 'flat' ? 780 : 540);
      var kk = Math.max(0, Math.min(1, (clock - (g0.t - 0.15)) / 0.15));
      var dir = g0.shape === 'tall' ? -1 : (g0.shape === 'flat' ? 1 : 0);
      game.draw.hand(hx, 1640 + dir * kk * 120, { press: clock >= g0.t - 0.15, scale: 13, alpha: 0.55 });
    }
    if (over && hitStop <= 0 && outroT < 0.9) drawResult(false);
    scan();
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0; demo.cyc = 0;
  });
})(game);
