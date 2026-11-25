// K-DS-0015v2-polar-camp-stake-count.js
// 吹雪の杭打ち勘定 — 拍の頭ごとに掛矢を振り下ろして杭を1目盛りずつ沈め、赤い印が雪面にそろう回数ぴったりで手を止める
// 操作: 画面のどこでもタップ(下の大きな掛矢ボタンが反応)で1回打つ。杭は2小節に1本: 1拍目に相棒が新しい杭を立て、2〜8拍目の拍の頭で打つ(ずれでPERFECT/GOOD)。杭の赤い印から雪面までの目盛りの数だけ打ったら止める。打ちすぎ(赤い印が雪に潜る)・拍外れ・同じ拍の二度打ちはその場でMISS、2小節が終わって目盛りが残っていたらMISS。3本目からは杭を立てた直後に地吹雪(0.6秒前に風の筋と口笛のような音で予告)で杭が見えなくなるので、最初に目盛りを数え、自分の打った数を数えて止める
// 終わり: 5本(10小節)を打ち終えればCLEAR(判定点+連続+ぴったり本数+残り)。MISS3回でGAME OVER
// @mechanic: count_exact
// @theme: polar_camp_stake_count
// 世界観: 吹雪の雪原の野営地で、極地探検隊員が相棒の立てたテントの杭を、目盛りの数ぴったりだけ掛矢で打ち込んで張り綱を締める
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・ぴったり打てた杭の本数・PERFECT/GOOD/MISS数・最大連続
// スタイル: MODERN AD-GAME
var STYLE = { bg: ['#1f6fff', '#8fd8ff', '#eaf8ff'], main: ['#ff5a1f', '#ffd400', '#1a1a2e'], accent: ['#00d26a', '#ff2d6f'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 高彩度・太い濃紺の縁取り・大きいボタンと飛ぶ数字
  var OUT = STYLE.main[2], ORANGE = STYLE.main[0], YEL = STYLE.main[1], GREEN = STYLE.accent[0], PINK = STYLE.accent[1];
  var SNOW = '#ffffff', ICE = '#9fdcff', ICE_D = '#4fa8e8';

  var GAME_TITLE = 'STAKE COUNT';
  var BPM = 128, SPB = 60 / BPM, BAR = SPB * 4;
  var UNITS = 5, UNIT = BAR * 2, BEATS = UNITS * 8;
  var TIME_LIMIT = 18.75;              // 10小節 × 1.875秒
  var READY_T = 0.8;
  var PERFECT_W = 0.06, GOOD_W = 0.12;
  var MISS_MAX = 3;
  var WHITE_FROM = 2;                  // 0始まり: 3本目から地吹雪
  var GUST_AT = 2.5;                   // 杭を立ててから何拍目で見えなくなるか

  var STAKE_X = 560, SNOW_Y = Math.round(H * 0.6), NOTCH = 66, HEAD = 92, STAKE_W = 116;
  var MAN_X = 210, MAN_Y = 1020;
  var TENT_X = 880, TENT_Y = 1000;
  var LIGHT_Y = Math.round(H * 0.77);
  var BTN_X = W / 2, BTN_Y = Math.round(H * 0.885), BTN_R = 140;

  var N_POOL = [[2, 3], [3, 4], [4, 5], [4, 5, 6], [5, 6]];

  // 伴奏(オリジナル)。2小節ひと回りの作業歌: 1・3拍目に低音、2・4拍目に小太鼓がわりの短い音
  var MEL = [
    [[['C5', 0.5], ['E5', 0.5]], [['G5', 1]], [['E5', 0.5], ['C5', 0.5]], [['D5', 1]]],
    [[['E5', 0.5], ['D5', 0.5]], [['C5', 1]], [['A4', 0.5], ['B4', 0.5]], [['C5', 1]]]
  ];
  var BASS = [['C3', 'G2', 'C3', 'G2'], ['F2', 'C3', 'G2', 'G2']];

  // ---- スプライト ----
  var MAN = [
    ['....oooooo....', '...oOOOOOOo...', '..oOOffffOOo..', '..oOggggggOo..', '..oOgwggwgOo..', '..oOffffffOo..', '...oOfmmfOo...', '....OOOOOO....', '..OOOOOOOOOO..', '.OOOOOzOOOOOO.', 'hOOOOOzOOOOOOh', 'hOOOOOzOOOOOOh', '.OOOOOzOOOOOO.', '..OOOOzOOOOO..', '..PPPPPPPPPP..', '..PPPP..PPPP..', '..PPPP..PPPP..', '.BBBBB..BBBBB.'],
    ['....oooooo....', '...oOOOOOOo...', '..oOOffffOOo..', '..oOggggggOo..', '..oOgwggwgOo..', '..oOffffffOo..', '...oOfmmfOo...', '.h..OOOOOO..h.', '.hOOOOOOOOOOh.', '.OOOOOzOOOOOO.', '.OOOOOzOOOOOO.', '.OOOOOzOOOOOO.', '.OOOOOzOOOOOO.', '..OOOOzOOOOO..', '..PPPPPPPPPP..', '..PPPP..PPPP..', '..PPPP..PPPP..', '.BBBBB..BBBBB.']
  ];
  var PAL_MAN = { o: '#ffffff', O: ORANGE, f: '#ffd7b0', g: OUT, w: '#8fd8ff', m: PINK, z: OUT, h: '#2f6bff', P: OUT, B: '#2f6bff' };
  var PAL_OUT = { o: OUT, O: OUT, f: OUT, g: OUT, w: OUT, m: OUT, z: OUT, h: OUT, P: OUT, B: OUT };
  var PAL_WHITE = { o: '#ffffff', O: '#ffffff', f: '#ffffff', g: '#ffffff', w: '#ffffff', m: '#ffffff', z: '#ffffff', h: '#ffffff', P: '#ffffff', B: '#ffffff' };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var clock, units, misses, score, combo, maxCombo, nPerfect, nGood, nMiss, nExact;
  var hitStop, over, won, outroT, lastBeat, lastCue, demoMode, prevBest, failX, failY, resultT;
  var swingT, beatPulse, btnT, whiteA, gustWarn, milestoneDone, flakes;

  function buildUnits(demo) {
    var list = [];
    var n = demo ? 1 : UNITS;
    for (var u = 0; u < n; u++) {
      var pool = N_POOL[u];
      var need = demo ? 3 : pool[Math.floor(game.random(0, pool.length)) % pool.length];
      list.push({ u: u, n: need, hits: 0, vis: 0, used: {}, judged: false, ok: false, over: false, white: !demo && u >= WHITE_FROM, warned: false, planted: false });
    }
    return list;
  }

  function initRun(demo) {
    demoMode = !!demo;
    clock = demo ? -0.3 : -READY_T;
    units = buildUnits(demo);
    misses = 0; score = 0; combo = 0; maxCombo = 0; nPerfect = 0; nGood = 0; nMiss = 0; nExact = 0;
    hitStop = 0; over = false; won = false; outroT = 0; lastBeat = -99; lastCue = -1;
    prevBest = game.best; failX = -999; failY = -999; resultT = 0;
    swingT = 0; beatPulse = 0; btnT = 0; whiteA = 0; gustWarn = 0; milestoneDone = false;
    if (!flakes) {
      flakes = [];
      for (var i = 0; i < 46; i++) flakes.push({ x: game.random(0, W), y: game.random(230, H), s: game.random(4, 10), v: game.random(60, 160) });
    }
  }

  function curUnit() {
    if (clock < 0) return null;
    var u = Math.floor(clock / UNIT);
    return u < units.length ? units[u] : null;
  }
  function beatInUnit() { return clock < 0 ? -1 : (clock - Math.floor(clock / UNIT) * UNIT) / SPB; }
  function ringY(un) { return SNOW_Y - (un.n - un.vis) * NOTCH; }

  // ---- 音 ----
  function playBeat(bi) {
    var bar = Math.floor(bi / 4) % 2, k = bi % 4;
    game.audio.melody(MEL[bar][k], { tempo: BPM, wave: 'square', volume: 0.03, bass: [[k % 2 === 0 ? BASS[bar][k] : 'R', 0.5], ['R', 0.5]], bassVolume: 0.1, bassWave: 'triangle' });
    if (k % 2 === 1) game.audio.tone(2400, 0.03, { wave: 'square', volume: 0.025, slide: -1600 });
  }
  function malletThud(perfect) {
    game.audio.tone(180, 0.08, { wave: 'square', volume: 0.1, slide: -70 });
    game.audio.tone(90, 0.14, { wave: 'triangle', volume: 0.12 });
    if (perfect) game.audio.tone(1320, 0.05, { wave: 'square', volume: 0.04 });
  }

  function beatClock() {
    var cue = Math.floor((clock + 0.06) / SPB);
    if (cue > lastCue && cue >= 0 && cue < BEATS) { lastCue = cue; if (!demoMode) playBeat(cue); }
    var bi = Math.floor(clock / SPB);
    if (bi === lastBeat) return;
    lastBeat = bi;
    if (clock < 0 || bi >= BEATS) return;
    beatPulse = 1;
    if (!demoMode) game.audio.tone(bi % 8 === 0 ? 1100 : 1600, 0.02, { wave: 'square', volume: bi % 8 === 0 ? 0.04 : 0.02 });
  }

  // ---- 判定 ----
  function missHit(x, y, kind) {
    misses++; nMiss++; combo = 0;
    hitStop = 0.36; failX = x; failY = y;
    game.feedback.bad(x, y - 60, { text: 'MISS', shake: demoMode ? 3 : 14, volume: demoMode ? 0.03 : 0.6 });
    if (kind === 'over' && !demoMode) game.audio.play('se_break', 0.4);
    if (!demoMode && misses >= MISS_MAX) finishRun(false);
  }

  // 1回打つ(本番の指もATTRACTのゴーストも同じ関数)
  function strike() {
    swingT = 0.22; btnT = 0.12;
    var un = curUnit();
    if (!un) return 'none';
    var bu = beatInUnit();
    var nb = Math.round(bu), d = Math.abs(bu - nb) * SPB;
    var hx = STAKE_X, hy = ringY(un) - HEAD;
    if (un.judged || nb < 1 || nb > 7 || d > GOOD_W || un.used[nb]) {
      // 拍外れ・二度打ち: 掛矢が杭の頭をかすめる
      missHit(hx, hy, 'glance');
      return 'glance';
    }
    un.used[nb] = true;
    if (un.hits >= un.n) {
      // 打ちすぎ: 赤い印が雪に潜る
      un.hits++; un.over = true;
      missHit(hx, SNOW_Y, 'over');
      return 'over';
    }
    un.hits++;
    var grade = d <= PERFECT_W ? 1 : 2;
    combo++; maxCombo = Math.max(maxCombo, combo);
    if (grade === 1) nPerfect++; else nGood++;
    var pts = (grade === 1 ? 100 : 60) + Math.min(10, combo) * 10;
    score += pts;
    game.feedback.good(hx + 120, hy, {
      text: '+' + pts, color: grade === 1 ? YEL : '#ffffff', size: grade === 1 ? 64 : 52,
      count: grade === 1 ? 14 : 8, volume: demoMode ? 0.03 : 0.12
    });
    if (!demoMode) {
      game.fx.popup(grade === 1 ? 'PERFECT' : 'GOOD', hx - 150, hy - 40, { color: grade === 1 ? YEL : '#ffffff', size: 44 });
      if (combo >= 3 && combo % 3 === 0) game.fx.popup('x' + combo, W - 150, 330, { color: PINK, size: 70 });
    }
    if (un.hits === un.n && !un.white) game.fx.burst(STAKE_X, SNOW_Y, { color: GREEN, count: 12, speed: 260 });
    return grade === 1 ? 'perfect' : 'good';
  }

  function judgeUnit(un) {
    un.judged = true;
    if (un.over) return;
    if (un.hits === un.n) {
      un.ok = true; nExact++;
      score += 300 + (un.white ? 200 : 0);
      game.fx.burst(STAKE_X, SNOW_Y - 40, { color: GREEN, count: 18, speed: 340 });
      game.fx.popup('NICE', STAKE_X, SNOW_Y - 420, { color: GREEN, size: 90 });
      if (!demoMode) {
        game.audio.play('se_powerup', 0.4);
        if (!milestoneDone && nExact >= 3) {
          milestoneDone = true;
          game.fx.popup('3 / ' + UNITS, W / 2, 380, { color: YEL, size: 80 });
          game.audio.play('se_milestone', 0.5);
        }
      }
    } else {
      // 目盛りが残った(張り綱がゆるむ)
      missHit(STAKE_X, ringY(un) - HEAD, 'short');
    }
  }

  function finishRun(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.6;
    if (demoMode) return;
    game.audio.stopBgm();
    if (ok) {
      score += (MISS_MAX - misses) * 150;
      for (var i = 0; i < 6; i++) game.fx.burst(120 + i * 170, 420 + (i % 2) * 120, { color: i % 2 ? YEL : PINK, count: 18, speed: 420 });
      game.audio.play('se_success', 0.55);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = { score: score, exactStakes: nExact, total: UNITS, perfect: nPerfect, good: nGood, miss: nMiss, maxCombo: maxCombo };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  function stepRun(dt) {
    clock += dt;
    if (swingT > 0) swingT -= dt;
    if (btnT > 0) btnT -= dt;
    beatClock();
    var un = curUnit();
    var bu = beatInUnit();
    // 地吹雪: 予告(風の筋+口笛)→ 白く覆う → 判定で晴れる
    var wantWhite = 0;
    gustWarn = 0;
    if (un && un.white && !un.judged) {
      if (bu >= GUST_AT) wantWhite = 1;
      else if (bu >= GUST_AT - 0.6 / SPB) {
        gustWarn = 1;
        if (!un.warned) { un.warned = true; if (!demoMode) game.audio.tone(1500, 0.6, { wave: 'triangle', volume: 0.05, slide: -900 }); }
      }
    }
    whiteA += (wantWhite - whiteA) * Math.min(1, dt * (wantWhite ? 9 : 5));
    for (var i = 0; i < units.length; i++) {
      var u = units[i];
      u.vis += (Math.min(u.hits, u.n + 1) - u.vis) * Math.min(1, dt * 22);
    }
    if (over) return;
    if (un && !un.planted) {
      un.planted = true;
      if (!demoMode) { game.audio.tone(140, 0.08, { wave: 'square', volume: 0.08 }); game.audio.play('se_tap', 0.3); }
    }
    for (var j = 0; j < units.length; j++) {
      var uj = units[j];
      if (!uj.judged && clock >= uj.u * UNIT + 7 * SPB + GOOD_W + 0.02) {
        judgeUnit(uj);
        if (over || hitStop > 0) return;
      }
    }
    if (!demoMode && !over && clock >= UNITS * UNIT) finishRun(misses < MISS_MAX);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT && resultT > 0.6) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; demo.cyc = 0; return; }
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || clock < 0 || hitStop > 0 || y < 230) return;
    var res = strike();
    if (res === 'perfect' || res === 'good') malletThud(res === 'perfect');
    else if (res === 'glance') game.audio.tone(900, 0.07, { wave: 'square', volume: 0.05, slide: -500 });
  });

  // ---- 描画ヘルパー ----
  function label(str, x, y, sz, col, align) {
    var a = align || 'center', o = Math.max(3, sz * 0.08);
    game.draw.text(str, x - o, y, { size: sz, color: OUT, bold: true, align: a });
    game.draw.text(str, x + o, y, { size: sz, color: OUT, bold: true, align: a });
    game.draw.text(str, x, y - o, { size: sz, color: OUT, bold: true, align: a });
    game.draw.text(str, x, y + o * 1.6, { size: sz, color: OUT, bold: true, align: a });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: a });
  }
  function box(x, y, w, h, col, th) {
    var t = th || 8;
    game.draw.rect(x - t, y - t, w + t * 2, h + t * 2, OUT);
    game.draw.rect(x, y, w, h, col);
  }
  function disc(x, y, r, col, th) {
    game.draw.circle(x, y, r + (th || 8), OUT);
    game.draw.circle(x, y, r, col);
  }
  function outlined(spr, pal, x, y, px) {
    var o = { anchor: 'center' }, d = px * 0.8;
    game.draw.sprite(spr, PAL_OUT, x - d, y, px, o);
    game.draw.sprite(spr, PAL_OUT, x + d, y, px, o);
    game.draw.sprite(spr, PAL_OUT, x, y - d, px, o);
    game.draw.sprite(spr, PAL_OUT, x, y + d, px, o);
    game.draw.sprite(spr, pal, x, y, px, o);
  }

  // ---- 描画 ----
  function drawWorld() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.42, STYLE.bg[1]], [0.6, STYLE.bg[2]], [1, '#d8f0ff']]);
    // 遠くの雪山(段々の帯で三角を作る)
    var peaks = [[150, 330], [470, 420], [800, 300], [1050, 380]];
    for (var p = 0; p < peaks.length; p++) {
      var px = peaks[p][0], ph = peaks[p][1], base = 860;
      for (var s = 0; s < ph; s += 12) {
        var hw = s * 0.9;
        game.draw.rect(px - hw, base - ph + s, hw * 2, 12, s < 70 ? '#ffffff' : '#bfe6ff');
      }
    }
    // 雪原
    game.draw.rect(0, 860, W, SNOW_Y - 860, '#f2fbff');
    for (var d = 0; d < 6; d++) game.draw.rect(0, 900 + d * 42, W, 6, '#d6f0ff');
    // テント(段々の三角+太い縁)
    for (var s2 = 0; s2 < 230; s2 += 10) {
      var hw2 = s2 * 0.75 + 6;
      game.draw.rect(TENT_X - hw2 - 8, TENT_Y - 230 + s2, hw2 * 2 + 16, 10, OUT);
    }
    for (var s3 = 8; s3 < 222; s3 += 10) {
      var hw3 = s3 * 0.75;
      game.draw.rect(TENT_X - hw3, TENT_Y - 222 + s3, hw3 * 2, 10, ORANGE);
    }
    game.draw.rect(TENT_X - 34, TENT_Y - 110, 68, 110, OUT);
    game.draw.rect(TENT_X - 3, TENT_Y - 236, 6, 30, OUT);
    game.draw.rect(TENT_X, TENT_Y - 236, 46, 24, PINK);
  }

  function drawSnowCut() {
    // 雪面の断面: 雪 → しまり雪 → 氷の層
    box(-10, SNOW_Y, W + 20, 280, SNOW, 6);
    game.draw.rect(0, SNOW_Y + 90, W, 90, '#e2f5ff');
    game.draw.rect(0, SNOW_Y + 180, W, 100, ICE);
    for (var i = 0; i < 9; i++) game.draw.rect(40 + i * 120, SNOW_Y + 210 + (i % 2) * 30, 60, 8, ICE_D);
  }

  function drawStake(un, white) {
    var ry = ringY(un), top = ry - HEAD;
    var shake = hitStop > 0 && failX === STAKE_X ? Math.sin(game.time.elapsed * 80) * 6 : 0;
    var x = STAKE_X + shake;
    var big = hitStop > 0 && failX === STAKE_X;
    var bw = big ? STAKE_W + 24 : STAKE_W;
    // 杭の本体: 印から下は目盛りの縞(オレンジ/白)、先は尖る
    var len = un.n * NOTCH + 120;
    game.draw.rect(x - bw / 2 - 8, top - 8, bw + 16, HEAD + len + 8, OUT);
    game.draw.rect(x - bw / 2, top, bw, HEAD, big ? '#ffffff' : '#c98a4a');
    game.draw.rect(x - bw / 2, top, bw, 14, big ? '#ffffff' : '#e8b070');
    for (var k = 0; k < un.n; k++) {
      game.draw.rect(x - bw / 2, ry + k * NOTCH, bw, NOTCH, big ? '#ffffff' : (k % 2 === 0 ? ORANGE : '#ffffff'));
      game.draw.rect(x - bw / 2, ry + k * NOTCH + NOTCH - 4, bw, 4, OUT);
    }
    game.draw.rect(x - bw / 2, ry + un.n * NOTCH, bw, 120, big ? '#ffffff' : '#c98a4a');
    for (var s = 0; s < 60; s += 8) game.draw.rect(x - (60 - s) * bw / 120, ry + un.n * NOTCH + 120 + s, (60 - s) * bw / 60, 8, OUT);
    // 赤い印
    game.draw.rect(x - bw / 2 - 18, ry - 10, bw + 36, 20, OUT);
    game.draw.rect(x - bw / 2 - 12, ry - 6, bw + 24, 12, PINK);
    if (!white && un.hits === un.n && !un.over) game.draw.circle(x, SNOW_Y, 60 + beatPulse * 14, GREEN, 0.35);
    return top;
  }

  function drawSnowFront(un) {
    // 雪面より下に埋まった部分を雪の断面で薄く覆う(透けて見える)
    game.draw.rect(0, SNOW_Y + 6, W, 274, '#ffffff', 0.45);
    game.draw.rect(0, SNOW_Y - 6, W, 12, OUT);
    if (un && un.over) {
      game.draw.line(STAKE_X - 50, SNOW_Y - 50, STAKE_X + 50, SNOW_Y + 50, PINK, 14);
      game.draw.line(STAKE_X + 50, SNOW_Y - 50, STAKE_X - 50, SNOW_Y + 50, PINK, 14);
    }
  }

  function drawRope(top, un) {
    var tight = un && (un.ok || (un.hits === un.n && !un.white));
    var sx = STAKE_X, sy = top + 20, tx = TENT_X - 60, ty = TENT_Y - 150;
    if (tight) {
      game.draw.line(sx, sy, tx, ty, OUT, 10);
      game.draw.line(sx, sy, tx, ty, YEL, 5);
    } else {
      var mx = (sx + tx) / 2, my = (sy + ty) / 2 + 60 + Math.sin(game.time.elapsed * 6) * 10;
      game.draw.line(sx, sy, mx, my, OUT, 10); game.draw.line(mx, my, tx, ty, OUT, 10);
      game.draw.line(sx, sy, mx, my, YEL, 5); game.draw.line(mx, my, tx, ty, YEL, 5);
    }
  }

  function drawMan(top) {
    var t = game.time.elapsed;
    var striking = swingT > 0.1;
    var fr = striking ? 0 : 1;
    var bob = striking ? 10 : Math.sin(t * 4) * 3 - beatPulse * 8;
    var big = hitStop > 0 && failX !== STAKE_X && failX > -900;
    if (big) {
      game.draw.circle(MAN_X, MAN_Y, 150, '#ffffff', 0.8);
      game.draw.sprite(MAN[0], PAL_WHITE, MAN_X, MAN_Y, 15, { anchor: 'center' });
    } else {
      outlined(MAN[fr], PAL_MAN, MAN_X, MAN_Y + bob, 13);
    }
    // 掛矢: 振り上げ(拍で小さく揺れる)→ 打った瞬間は杭の頭
    var p = swingT > 0 ? Math.min(1, swingT / 0.12) : 0;
    var upX = 300, upY = 600 - beatPulse * 24;
    var dnX = STAKE_X - 10, dnY = top - 40;
    var hx = upX + (dnX - upX) * p, hy = upY + (dnY - upY) * p;
    var handX = MAN_X + 80, handY = MAN_Y - 50 + bob;
    game.draw.line(handX, handY, hx, hy + 24, OUT, 26);
    game.draw.line(handX, handY, hx, hy + 24, '#c98a4a', 14);
    box(hx - 90, hy - 44, 180, 88, '#8a5a30', 9);
    game.draw.rect(hx - 90, hy - 44, 180, 20, '#b07a48');
    if (p > 0.6) {
      for (var i = 0; i < 6; i++) {
        var a = i / 6 * Math.PI * 2;
        game.draw.line(dnX + Math.cos(a) * 70, top - 10 + Math.sin(a) * 40, dnX + Math.cos(a) * 110, top - 10 + Math.sin(a) * 60, YEL, 8);
      }
    }
  }

  function drawApproach(un, top) {
    if (!un || un.judged) return;
    var bu = beatInUnit();
    var next = Math.floor(bu) + 1;
    if (next < 1 || next > 7) return;
    var f = next - bu;
    var r = 50 + f * 140;
    for (var i = 0; i < 14; i++) {
      var a = i / 14 * Math.PI * 2 + game.time.elapsed;
      game.draw.circle(STAKE_X + Math.cos(a) * r, top + Math.sin(a) * r * 0.6, 8, OUT);
      game.draw.circle(STAKE_X + Math.cos(a) * r, top + Math.sin(a) * r * 0.6, 5, YEL);
    }
  }

  function drawWhiteout(un) {
    var t = game.time.elapsed;
    if (gustWarn > 0) {
      // 予告: 横に走る風の筋が増える + 渦の印が点滅
      for (var i = 0; i < 14; i++) {
        var y = 560 + i * 52, x = ((t * 1400 + i * 260) % (W + 400)) - 200;
        game.draw.line(x, y, x + 220, y - 10, '#ffffff', 8);
      }
      if (Math.floor(t * 12) % 2 === 0) {
        disc(W - 120, 420, 56, '#ffffff', 8);
        game.draw.circle(W - 120, 420, 34, ICE_D);
        game.draw.circle(W - 108, 412, 18, '#ffffff');
      }
    }
    if (whiteA > 0.02) {
      game.draw.rect(0, 540, W, SNOW_Y + 290 - 540, '#f4fbff', 0.96 * whiteA);
      for (var k = 0; k < 22; k++) {
        var yy = 560 + (k * 41) % (SNOW_Y + 260 - 560), xx = ((t * (900 + k * 40) + k * 170) % (W + 300)) - 150;
        game.draw.line(xx, yy, xx + 160, yy - 8, '#cfeaff', 6 * whiteA);
      }
    }
  }

  function drawLights(un) {
    var bu = beatInUnit();
    var cur = un && !over ? Math.floor(bu) : -1;
    var hide = un && un.white && !un.judged && whiteA > 0.3;
    box(60, LIGHT_Y - 62, W - 120, 124, '#ffffff', 8);
    for (var i = 0; i < 8; i++) {
      var x = 130 + i * 117, on = i === cur;
      var r = (i === 0 ? 30 : 34) + (on ? beatPulse * 12 : 0);
      if (i === 0) {
        game.draw.rect(x - 12, LIGHT_Y - 34, 24, 68, OUT);
        game.draw.rect(x - 7, LIGHT_Y - 29, 14, 58, on ? ORANGE : '#c98a4a');
        continue;
      }
      var col = '#dfe9f2';
      if (on) col = YEL;
      if (un && !hide && un.used[i]) col = un.over && i === lastUsed(un) ? PINK : GREEN;
      disc(x, LIGHT_Y, r, col, 6);
    }
  }
  function lastUsed(un) { var m = 0; for (var k in un.used) if (+k > m) m = +k; return m; }

  function drawButton() {
    var pr = btnT > 0;
    var r = BTN_R - (pr ? 14 : 0) + (pr ? 0 : beatPulse * 6);
    game.draw.circle(BTN_X, BTN_Y + 18, r + 10, OUT);
    disc(BTN_X, BTN_Y + (pr ? 10 : 0), r, pr ? '#ffe866' : YEL, 10);
    var cy = BTN_Y + (pr ? 10 : 0);
    // 掛矢の印
    game.draw.line(BTN_X - 40, cy + 60, BTN_X + 20, cy - 10, OUT, 22);
    game.draw.line(BTN_X - 40, cy + 60, BTN_X + 20, cy - 10, '#c98a4a', 12);
    box(BTN_X - 10, cy - 70, 100, 56, '#8a5a30', 7);
  }

  function drawFlakes(dt) {
    for (var i = 0; i < flakes.length; i++) {
      var f = flakes[i];
      f.y += f.v * dt; f.x += Math.sin(game.time.elapsed + i) * 30 * dt - 40 * dt;
      if (f.y > H) { f.y = 230; f.x = game.random(0, W); }
      if (f.x < -10) f.x = W + 10;
      game.draw.circle(f.x, f.y, f.s, '#ffffff', 0.85);
    }
  }

  function drawHud() {
    box(16, 16, W - 32, 196, '#ffffff', 8);
    label('SCORE ' + score, 50, 84, 48, ORANGE, 'left');
    for (var i = 0; i < MISS_MAX; i++) {
      var on = i < MISS_MAX - misses;
      disc(W - 70 - i * 74, 70, 24, on ? PINK : '#d8d8e4', 6);
    }
    for (var u = 0; u < UNITS; u++) {
      var x = W / 2 - 220 + u * 110, un = units[u];
      var col = '#e6eef6';
      if (un) { if (un.ok) col = GREEN; else if (un.judged) col = PINK; else if (curUnit() === un) col = YEL; }
      box(x - 14, 118, 28, 52, col, 5);
    }
    var remain = Math.max(0, Math.min(1, 1 - clock / (UNITS * UNIT)));
    game.draw.rect(50, 186, W - 100, 14, '#d8e4f0');
    game.draw.rect(50, 186, (W - 100) * remain, 14, STYLE.bg[0]);
    if (combo >= 2) label('x' + combo, W - 50, 160, 40, PINK, 'right');
  }

  function drawScene(dt) {
    var un = curUnit() || (units.length ? units[Math.min(units.length - 1, Math.max(0, Math.floor(Math.max(0, clock) / UNIT)))] : null);
    if (clock < 0) un = units[0];
    drawWorld();
    var top = un ? ringY(un) - HEAD : SNOW_Y - 200;
    drawRope(top, un);
    drawSnowCut();
    if (un) drawStake(un, un.white);
    drawSnowFront(un);
    drawApproach(un, top);
    drawWhiteout(un);
    drawMan(top);
    drawFlakes(dt);
    drawLights(un);
    drawButton();
  }

  function drawResult(showTap) {
    var y0 = H * 0.27, hh = H * 0.36;
    box(50, y0, W - 100, hh, '#ffffff', 12);
    game.draw.rect(50, y0, W - 100, 30, won ? GREEN : PINK);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.34, 104, won ? YEL : PINK);
    label('SCORE ' + score, W / 2, H * 0.405, 62, '#ffffff');
    label('PERFECT ' + nPerfect + '  GOOD ' + nGood + '  MISS ' + nMiss, W / 2, H * 0.45, 36, '#ffffff');
    label(nExact + ' / ' + UNITS, W / 2, H * 0.495, 50, GREEN);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.545, 60, YEL);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.545, 44, '#ffffff');
    if (!won) {
      var left = 0;
      for (var i = 0; i < units.length; i++) if (!units[i].ok) left++;
      label('あと' + Math.max(1, left) + '本!', W / 2, H * 0.585, 50, ORANGE);
    }
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.618, 36, '#ffffff');
  }

  // ---- ATTRACT: 実ロジックで杭1本(目盛り3つ)。奇数周は3回でぴたりと止めてNICE、偶数周は4回打って打ちすぎMISS ----
  var demo = { t: 0, x: BTN_X + 40, y: BTN_Y + 40, press: false, pressT: 0, cyc: 0, done: 0 };
  var DEMO_CYC = UNIT + 0.5;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) { initRun(true); demo.cyc++; demo.done = 0; }
    if (hitStop > 0) hitStop -= dt; else stepRun(dt);
    var greedy = demo.cyc % 2 === 0;
    var want = greedy ? 4 : 3;
    if (demo.done < want && hitStop <= 0 && clock >= (demo.done + 1) * SPB - 0.01) {
      strike(); demo.done++; demo.pressT = 0.14;
    }
    if (demo.pressT > 0) demo.pressT -= dt;
    demo.press = demo.pressT > 0;
    if (demo.press) btnT = Math.max(btnT, 0.05);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);

    if (state === S.ATTRACT) {
      if (!units) initRun(true);
      stepDemo(dt);
      drawScene(dt);
      game.draw.hand(demo.x, demo.y + (demo.press ? 0 : 30), { press: demo.press, scale: 15 });
      box(16, 16, W - 32, 196, '#ffffff', 8);
      label(GAME_TITLE, W / 2, 108, 96 + Math.sin(t * 4) * 4, ORANGE);
      label('HI-SCORE ' + game.best, W / 2, 186, 38, STYLE.bg[0]);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.71, 50, YEL);
      else label('TAP TO START', W / 2, H * 0.71, 46, '#ffffff');
      return;
    }

    if (state === S.RESULT) {
      resultT += dt;
      drawScene(dt);
      drawHud();
      drawResult(true);
      return;
    }

    // ---- PLAYING ----
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

    drawScene(dt);
    drawHud();
    if (clock < 0) {
      box(60, H * 0.4, W - 120, 170, ORANGE, 10);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4 + 120, 110, '#ffffff');
    }
    // 最初の1打の直前だけ、ボタンの上に手を1回出す
    if (!over && clock > 0 && clock < SPB + 0.2) {
      game.draw.hand(BTN_X + 40, BTN_Y + 40, { press: clock >= SPB - 0.04, scale: 13, alpha: 0.7 });
    }
    if (over && hitStop <= 0 && outroT < 1.0) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0; demo.cyc = 0;
  });
})(game);
