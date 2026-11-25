// K-GBA-0026v2-tidepool-crab-wave-hop.js
// 磯ガニの波よけメドレー — 拍ごとに増えていく波の型を拍の頭で見切り、浜から戻る低い引き波は跳んで、沖から巻く高波は岩の割れ目に伏せてくぐる。曲の拍子が4拍子→3拍子→8分の連打へ切り替わる
// 操作: 画面のどこでも指を上へ弾くと跳ぶ、下へ弾くと伏せる(弾いた瞬間が判定)。低い引き波は右から地面を這って、高波は左から頭の高さで巻いてくる。波がカニに届く拍(8分を含む)の頭に合わせて弾けばPERFECT/GOOD。早すぎ・遅すぎ・逆の動き・何もしないと波をかぶる
// 終わり: 4拍子3小節→3拍子4小節→8分連打3小節(18秒)をかわし切って巣穴に戻ればCLEAR(判定点+連続+無傷の区間)。3回波をかぶるとGAME OVER
// @mechanic: dodge
// @theme: tidepool_crab_wave_medley
// 世界観: 潮の満ちてくる磯の岩場で、小さなカニが沖からの高波と浜からの引き波を跳んだり伏せたりしてかわしながら、岩陰の巣穴まで横歩きで帰る
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD数・かぶった回数・最大連続・無傷で抜けた区間数
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var STYLE = { bg: ['#bfe6f2', '#2fa3b8'], main: ['#5b5f73', '#f2603c', '#ffffff'], accent: ['#ffc531', '#8c6cf2'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: 影もグラデも使わないベタ塗り数色、丸角、大きい余白、アイコン的な形。判定はUIの色変化で示す
  var C = {
    sky: STYLE.bg[0], sea: STYLE.bg[1], seaL: '#6ccbd8', rock: STYLE.main[0], rockL: '#7b8096', rockD: '#43465a',
    crab: STYLE.main[1], crabD: '#c8432a', white: STYLE.main[2], yel: STYLE.accent[0], purple: STYLE.accent[1],
    ink: '#1d1f2b', deep: '#2a5fa8', pink: '#ff7a9c', sun: '#ffe08a', isle: '#7fb7c4', pad: '#eef3f6', padD: '#d4dde3'
  };
  var SEC_COL = [STYLE.bg[1], '#ff7a9c', STYLE.accent[1]];   // 4拍子 / 3拍子 / 8分連打

  var GAME_TITLE = 'TIDE CRAB';
  var BPM = 120, SPB = 60 / BPM, EIGHTH = SPB / 2;
  // 小節の並び(拍子が途中で2回切り替わる)
  var BARS = [{ s: 0, n: 4 }, { s: 0, n: 4 }, { s: 0, n: 4 }, { s: 1, n: 3 }, { s: 1, n: 3 }, { s: 1, n: 3 }, { s: 1, n: 3 }, { s: 2, n: 4 }, { s: 2, n: 4 }, { s: 2, n: 4 }];
  var BEAT0 = [];
  (function() { var b = 0; for (var i = 0; i < BARS.length; i++) { BEAT0.push(b); b += BARS[i].n; } BEAT0.push(b); })();
  var BEATS = BEAT0[BARS.length];        // 36拍
  var TIME_LIMIT = 18;                   // 36拍 × 0.5秒
  var READY_T = 0.8;
  var PERFECT_W = 0.05, GOOD_W = 0.11;
  var APPROACH = 1.05, WARN_T = 0.6, JUMP_T = 0.34, DUCK_T = 0.34;
  var LIVES = 3;
  // 波の譜面: [小節, 8分の位置, 'L'=引き波(跳ぶ) / 'H'=高波(伏せる)]。区間が進むほど型が増える
  var CHART = [
    [0, 2, 'L'], [0, 6, 'L'],
    [1, 0, 'L'], [1, 4, 'L'], [1, 6, 'H'],
    [2, 0, 'L'], [2, 2, 'H'], [2, 4, 'L'], [2, 6, 'H'],
    [3, 0, 'H'], [3, 4, 'L'],
    [4, 0, 'L'], [4, 4, 'H'],
    [5, 0, 'H'], [5, 2, 'L'], [5, 4, 'H'],
    [6, 0, 'L'], [6, 2, 'L'], [6, 4, 'H'],
    [7, 0, 'L'], [7, 1, 'H'], [7, 4, 'L'], [7, 5, 'H'],
    [8, 0, 'L'], [8, 2, 'H'], [8, 3, 'L'], [8, 4, 'H'], [8, 6, 'L'],
    [9, 0, 'L'], [9, 1, 'H'], [9, 2, 'L'], [9, 4, 'H'], [9, 5, 'L'], [9, 6, 'H']
  ];
  // ATTRACT: 引き波を跳ぶ → 高波に伏せる → 高波に跳んでしまってかぶる
  var DEMO_CHART = [[1.0, 'L', 'jump'], [2.0, 'H', 'duck'], [3.0, 'H', 'jump']];

  // 伴奏(オリジナル)。区間ごとに拍型が変わる: 行進の4拍子 / ズンチャッチャの3拍子 / 8分で刻む連打
  var LEAD = [
    [[['D5', 1]], [['F#5', 1]], [['A5', 1]], [['F#5', 1]], [['G5', 1]], [['B5', 1]], [['A5', 1]], [['F#5', 1]], [['E5', 1]], [['G5', 1]], [['F#5', 0.5], ['E5', 0.5]], [['D5', 1]]],
    [[['A5', 1]], [['F#5', 1]], [['F#5', 1]], [['G5', 1]], [['E5', 1]], [['E5', 1]], [['B5', 1]], [['A5', 1]], [['G5', 1]], [['F#5', 1]], [['E5', 1]], [['A5', 1]]],
    [[['D5', 0.5], ['A5', 0.5]], [['F#5', 0.5], ['A5', 0.5]], [['D5', 0.5], ['A5', 0.5]], [['B5', 0.5], ['A5', 0.5]], [['G5', 0.5], ['B5', 0.5]], [['D6', 0.5], ['B5', 0.5]], [['A5', 0.5], ['F#5', 0.5]], [['E5', 0.5], ['A5', 0.5]], [['D5', 0.5], ['F#5', 0.5]], [['A5', 0.5], ['D6', 0.5]], [['C#6', 0.5], ['A5', 0.5]], [['D6', 1]]]
  ];
  var LOW = [
    ['D3', 'A2', 'D3', 'A2', 'G2', 'D3', 'G2', 'D3', 'A2', 'E3', 'A2', 'C#3'],
    ['D3', 'A3', 'A3', 'A2', 'C#4', 'C#4', 'G2', 'B3', 'B3', 'A2', 'C#4', 'E4'],
    ['D3', 'D3', 'D3', 'D3', 'G2', 'G2', 'G2', 'G2', 'A2', 'A2', 'A2', 'D3']
  ];

  // ---- スプライト(アイコン的なベタ塗り) ----
  var CRAB = [
    ['..e........e..', '..e........e..', '.cc..cccc..cc.', 'cc.cccccccc.cc', 'c.cccccccccc.c', '..cccccccccc..', '...cccccccc...', '..l.l....l.l..', '.l..l....l..l.'],
    ['..e........e..', '..e........e..', '.cc..cccc..cc.', 'cc.cccccccc.cc', 'c.cccccccccc.c', '..cccccccccc..', '...cccccccc...', '..l..l..l..l..', '..l..l..l..l..']
  ];
  var CRAB_JUMP = ['cc..e....e..cc', 'cc..e....e..cc', '.c..........c.', '.cc.cccccc.cc.', '..cccccccccc..', '..cccccccccc..', '...cccccccc...', '...l.l..l.l...'];
  var CRAB_DUCK = ['.e..........e.', 'cc.cccccccc.cc', 'cccccccccccccc', '.l.l.l..l.l.l.'];
  var CPAL = { c: C.crab, e: C.ink, l: C.crabD };
  var WPAL = { c: C.white, e: C.white, l: C.white };
  var SHELL = ['..ww..', '.wwww.', 'wwwwww', 'w.ww.w', '.wwww.'];

  var GROUND = Math.round(H * 0.62), CRAB_X = W / 2, HORIZON = Math.round(H * 0.38);
  var PAD_Y = Math.round(H * 0.86);
  var SPEED = (W / 2 + 140) / APPROACH;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var clock, waves, lives, score, combo, maxCombo, nPerfect, nGood, nHit, secHits, cleanSecs, demoMode, prevBest;
  var hitStop, over, won, outroT, lastBeat, lastCue, beatPulse, jumpT, duckT, hitWave, flashT, upT, downT, sec, announceT, nextSec;
  var touch = null;

  function initRun(demo) {
    demoMode = !!demo;
    clock = demo ? -0.8 : -READY_T;
    waves = [];
    var i;
    if (demo) {
      for (i = 0; i < DEMO_CHART.length; i++) waves.push({ t: DEMO_CHART[i][0], type: DEMO_CHART[i][1], res: 0, warned: false });
    } else {
      for (i = 0; i < CHART.length; i++) waves.push({ t: BEAT0[CHART[i][0]] * SPB + CHART[i][1] * EIGHTH, type: CHART[i][2], res: 0, warned: false, sec: BARS[CHART[i][0]].s });
    }
    lives = LIVES; score = 0; combo = 0; maxCombo = 0; nPerfect = 0; nGood = 0; nHit = 0; secHits = [0, 0, 0]; cleanSecs = 0;
    prevBest = game.best; hitStop = 0; over = false; won = false; outroT = 0; lastBeat = -99; lastCue = -1; beatPulse = 0;
    jumpT = 0; duckT = 0; hitWave = null; flashT = 0; upT = 0; downT = 0; sec = 0; announceT = 0; nextSec = 0;
    touch = null;
  }

  function barAtBeat(bi) {
    for (var i = BARS.length - 1; i >= 0; i--) if (bi >= BEAT0[i]) return i;
    return 0;
  }

  // ---- 拍クロック(1本)。伴奏は0.06秒先読みで1拍ずつ出す ----
  function playBeat(bi) {
    var bar = barAtBeat(bi), s = BARS[bar].s, k = bi - BEAT0[bar];
    var idx = (bar - (s === 0 ? 0 : s === 1 ? 3 : 7)) * BARS[bar].n + k;
    idx = Math.min(11, idx);
    var low = LOW[s][idx];
    var bass = s === 2 ? [[low, 0.5], [low, 0.5]] : [[low, 1]];
    var bv = s === 1 && k > 0 ? 0.03 : 0.09;
    game.audio.melody(LEAD[s][idx], { tempo: BPM, wave: s === 1 ? 'triangle' : 'square', volume: s === 1 ? 0.07 : 0.035, bass: bass, bassWave: s === 1 && k > 0 ? 'square' : 'triangle', bassVolume: bv });
  }

  function beatClock() {
    var cue = Math.floor((clock + 0.06) / SPB);
    if (cue > lastCue && cue >= 0 && cue < BEATS) { lastCue = cue; if (!demoMode) playBeat(cue); }
    var bi = Math.floor(clock / SPB);
    if (bi === lastBeat) return;
    lastBeat = bi;
    if (clock < 0 || bi >= BEATS) return;
    beatPulse = 1;
    var bar = demoMode ? 0 : barAtBeat(bi), k = demoMode ? bi % 4 : bi - BEAT0[bar];
    if (!demoMode) game.audio.tone(k === 0 ? 1050 : 1560, 0.025, { wave: 'square', volume: k === 0 ? 0.035 : 0.018 });
    if (demoMode) return;
    var s = BARS[bar].s;
    // 区間の最後の小節の頭: 次の拍子を音と画面で予告
    if (k === 0 && bar + 1 < BARS.length && BARS[bar + 1].s !== s) {
      nextSec = BARS[bar + 1].s; announceT = BARS[bar].n * SPB;
      game.audio.melody([['A5', 0.25], ['C#6', 0.25], ['E6', 0.25], ['A6', 0.25]], { tempo: BPM, wave: 'square', volume: 0.05 });
    }
    // 区間の切り替わり
    if (k === 0 && s !== sec) {
      if (secHits[sec] === 0) {
        cleanSecs++; score += 300;
        game.fx.popup('NICE', CRAB_X, GROUND - 330, { color: C.yel, size: 84 });
        game.audio.play('se_milestone', 0.45);
      }
      sec = s; announceT = 0;
      game.fx.flash(SEC_COL[s], 0.18);
      game.fx.popup(s === 1 ? '3/4' : 'x2', W / 2, H * 0.24, { color: SEC_COL[s], size: 96 });
      game.audio.play('se_powerup', 0.35);
    }
  }

  // ---- 判定 ----
  function dodge(wv, grade) {
    wv.res = grade;
    combo++; maxCombo = Math.max(maxCombo, combo);
    if (grade === 1) nPerfect++; else nGood++;
    score += (grade === 1 ? 100 : 60) + Math.min(10, combo) * 10;
    game.feedback.good(CRAB_X, GROUND - 230, { text: grade === 1 ? 'PERFECT' : 'GOOD', color: grade === 1 ? C.yel : C.white, size: grade === 1 ? 52 : 44, count: grade === 1 ? 14 : 8, volume: demoMode ? 0.03 : 0.12 });
    if (!demoMode) game.audio.tone(660 * Math.pow(2, Math.min(12, combo) / 12), 0.06, { wave: 'triangle', volume: 0.06 });
  }

  function soak(wv) {
    wv.res = 3;
    lives--; nHit++; combo = 0;
    if (wv.sec !== undefined) secHits[wv.sec]++;
    hitStop = 0.42; flashT = 0.42; hitWave = wv;
    jumpT = 0; duckT = 0;
    game.feedback.bad(CRAB_X, GROUND - 160, { text: 'MISS', shake: demoMode ? 3 : 12, volume: demoMode ? 0.03 : 0.6 });
    if (!demoMode && lives <= 0) finishRun(false);
  }

  function finishRun(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.6;
    if (demoMode) return;
    game.audio.stopBgm();
    if (ok) {
      if (secHits[2] === 0) { cleanSecs++; score += 300; }
      score += lives * 200;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 5; i++) game.fx.burst(160 + i * 190, GROUND - 120 - (i % 2) * 80, { color: i % 2 ? C.yel : C.pink, count: 18, speed: 400 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = { score: score, perfect: nPerfect, good: nGood, hit: nHit, maxCombo: maxCombo, cleanSections: cleanSecs, lives: Math.max(0, lives) };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // 跳ぶ / 伏せる(本番の指もゴーストも同じ関数)
  function act(kind) {
    if (kind === 'jump') { jumpT = JUMP_T; duckT = 0; upT = 0.18; } else { duckT = DUCK_T; jumpT = 0; downT = 0.18; }
    var best = null, bd = 1e9;
    for (var i = 0; i < waves.length; i++) {
      var wv = waves[i];
      if (wv.res) continue;
      var d = Math.abs(clock - wv.t);
      if (d <= GOOD_W && d < bd) { bd = d; best = wv; }
    }
    if (!best) return 'free';
    if ((best.type === 'L' && kind === 'jump') || (best.type === 'H' && kind === 'duck')) { dodge(best, bd <= PERFECT_W ? 1 : 2); return 'ok'; }
    soak(best);
    return 'wrong';
  }

  function stepRun(dt) {
    clock += dt;
    if (jumpT > 0) jumpT -= dt;
    if (duckT > 0) duckT -= dt;
    if (announceT > 0) announceT -= dt;
    beatClock();
    if (over) return;
    for (var i = 0; i < waves.length; i++) {
      var wv = waves[i];
      if (wv.res) continue;
      // 予告: 届く0.6秒前にマーカー + 予告音
      if (!wv.warned && clock >= wv.t - WARN_T) {
        wv.warned = true;
        if (!demoMode) {
          if (wv.type === 'L') game.audio.tone(330, 0.12, { wave: 'triangle', volume: 0.07, slide: -160 });
          else game.audio.tone(520, 0.14, { wave: 'square', volume: 0.035, slide: 420 });
        }
      }
      if (clock > wv.t + GOOD_W) { soak(wv); if (over || hitStop > 0) return; }
    }
    if (!demoMode && !over && (clock >= BEATS * SPB + GOOD_W || clock > TIME_LIMIT + 0.5)) finishRun(lives > 0);
  }

  // ---- 入力: 上に弾く=跳ぶ / 下に弾く=伏せる ----
  function flick(dir) {
    if (state !== S.PLAYING || over || clock < -0.35 || hitStop > 0) return;
    var r = act(dir);
    if (r === 'free') game.audio.tone(dir === 'jump' ? 780 : 260, 0.06, { wave: 'triangle', volume: 0.05, slide: dir === 'jump' ? 260 : -90 });
    else if (r === 'ok') game.audio.tone(dir === 'jump' ? 990 : 330, 0.08, { wave: 'square', volume: 0.05, slide: dir === 'jump' ? 330 : -120 });
  }
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    touch = { x0: x, y0: y, fired: false };
    game.audio.play('se_tap', 0.08);
  });
  game.onMove(function(x, y) {
    if (!touch || touch.fired) return;
    var dy = y - touch.y0;
    if (dy < -46) { touch.fired = true; flick('jump'); game.fx.burst(x, y, { color: C.yel, count: 5, speed: 160 }); }
    else if (dy > 46) { touch.fired = true; flick('duck'); game.fx.burst(x, y, { color: C.purple, count: 5, speed: 160 }); }
  });
  game.onRelease(function(x, y) {
    if (!touch) return;
    if (!touch.fired) {
      var dy = y - touch.y0;
      if (dy < -26) flick('jump');
      else if (dy > 26) flick('duck');
      else if (state === S.PLAYING) game.fx.burst(x, y, { color: C.padD, count: 4, speed: 80 });
    }
    touch = null;
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; demo.k = 0; return; }
  });

  // ---- 描画(フラット) ----
  function pill(x, y, w, h, col) {
    var r = Math.min(h, w) / 2;
    game.draw.rect(x + r, y, w - 2 * r, h, col);
    game.draw.circle(x + r, y + r, r, col);
    game.draw.circle(x + w - r, y + h - r, r, col);
    if (h > w) game.draw.rect(x, y + r, w, h - 2 * r, col);
  }
  function card(x, y, w, h, r, col) {
    game.draw.rect(x + r, y, w - 2 * r, h, col);
    game.draw.rect(x, y + r, r, h - 2 * r, col);
    game.draw.rect(x + w - r, y + r, r, h - 2 * r, col);
    game.draw.circle(x + r, y + r, r, col); game.draw.circle(x + w - r, y + r, r, col);
    game.draw.circle(x + r, y + h - r, r, col); game.draw.circle(x + w - r, y + h - r, r, col);
  }
  function chevron(cx, cy, up, col, wdt) {
    var d = up ? -1 : 1;
    game.draw.line(cx - 70, cy - d * 34, cx, cy + d * 34, col, wdt);
    game.draw.line(cx, cy + d * 34, cx + 70, cy - d * 34, col, wdt);
  }
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function scroll() { return Math.max(0, clock) * 70; }

  function drawWorld() {
    var t = game.time.elapsed;
    // 空・海・岩の3色帯(グラデではなく境目をはっきり切ったベタ)
    var f1 = (HORIZON - 230) / (H - 230), f2 = (GROUND - 230) / (H - 230);
    game.draw.gradient(230, H, [[0, C.sky], [f1, C.sky], [f1, C.sea], [f2, C.sea], [f2, C.rock], [1, C.rock]]);
    game.draw.circle(860, 360, 70, C.sun);
    for (var c = 0; c < 3; c++) {
      var cx = ((c * 400 + t * (18 + c * 6)) % (W + 300)) - 150;
      pill(cx, 300 + c * 70, 200 - c * 30, 44, C.white);
    }
    pill(120, HORIZON - 30, 260, 60, C.isle);
    pill(700, HORIZON - 20, 180, 40, C.isle);
    // 沖の白波(左から寄せてくる)
    var off = (t * 60) % 180;
    for (var r = 0; r < 5; r++) {
      var y = HORIZON + 50 + r * 88;
      for (var x = -180 + off + r * 40; x < W; x += 180) pill(x, y, 90 - r * 8, 12, C.seaL);
    }
    // 岩場(横歩きで流れる)
    var sc = scroll();
    game.draw.rect(0, GROUND, W, 14, C.rockL);
    for (var b = -1; b < 7; b++) {
      var bx = b * 200 - (sc % 200);
      card(bx + 20, GROUND + 40 + (b % 2) * 50, 140, 70, 30, C.rockL);
      game.draw.circle(bx + 160, GROUND + 190 + (b % 3) * 20, 26, C.rockD);
    }
    // 潮だまり
    for (var p = -1; p < 3; p++) {
      var px = p * 560 + 300 - (sc % 560);
      pill(px, GROUND + 160, 200, 40, C.sea);
    }
    // 巣穴(最後に右から近づいてくる)
    if (!demoMode) {
      var hx = CRAB_X + (TIME_LIMIT - Math.max(0, clock)) * 70 + 40;
      if (hx < W + 120) {
        pill(hx - 90, GROUND - 6, 180, 70, C.rockD);
        pill(hx - 60, GROUND + 6, 120, 46, C.ink);
      }
    }
  }

  function drawBeatDots() {
    var t = game.time.elapsed;
    var bi = Math.floor(clock / SPB);
    var bar = demoMode ? 0 : barAtBeat(Math.max(0, Math.min(BEATS - 1, bi)));
    var n = demoMode ? 4 : BARS[bar].n, k = demoMode ? ((bi % 4) + 4) % 4 : bi - BEAT0[bar];
    var col = SEC_COL[demoMode ? 0 : sec];
    var y = Math.round(H * 0.165);
    card(W / 2 - 300, y - 56, 600, 112, 56, C.white);
    for (var i = 0; i < n; i++) {
      var x = W / 2 - (n - 1) * 70 + i * 140;
      var on = clock >= 0 && clock < BEATS * SPB && i === k;
      var r = (i === 0 ? 30 : 22) + (on ? beatPulse * 10 : 0);
      game.draw.circle(x, y, r, on ? col : C.padD);
      if (!demoMode && sec === 2) { game.draw.circle(x + 70, y, 9, C.padD); }
    }
    // 次の拍子の予告: 帯の色と点の数が点滅で入れ替わる
    if (announceT > 0 && Math.floor(t * 8) % 2 === 0) {
      var m = nextSec === 1 ? 3 : 4;
      card(W / 2 - 300, y + 64, 600, 22, 11, SEC_COL[nextSec]);
      for (var j = 0; j < m; j++) game.draw.circle(W / 2 - (m - 1) * 70 + j * 140, y + 75, 14, C.white);
    }
  }

  function drawWaves() {
    for (var i = 0; i < waves.length; i++) {
      var wv = waves[i];
      var dtv = wv.t - clock;
      if (dtv > APPROACH + 0.2 || dtv < -1.2) continue;
      var hl = hitStop > 0 && wv === hitWave;
      if (wv.type === 'L') {
        // 引き波: 右から地面を這う低い水
        var lx = CRAB_X - 50 + dtv * SPEED;
        var col = hl ? C.white : C.seaL;
        pill(lx, GROUND - (hl ? 70 : 52), hl ? 340 : 300, hl ? 70 : 52, col);
        pill(lx + 10, GROUND - (hl ? 70 : 52), 120, 14, C.white);
      } else {
        // 高波: 左から頭の高さで巻いてくる
        var hx = CRAB_X + 50 - dtv * SPEED;
        var hc = hl ? C.white : C.deep;
        var s = hl ? 1.15 : 1;
        card(hx - 320 * s, GROUND - 330 * s, 320 * s, 200 * s, 60, hc);
        game.draw.circle(hx - 30 * s, GROUND - 260 * s, 80 * s, hc);
        game.draw.circle(hx - 10 * s, GROUND - 200 * s, 30 * s, C.white);
        pill(hx - 300 * s, GROUND - 340 * s, 280 * s, 22, C.white);
        for (var d = 0; d < 4; d++) game.draw.circle(hx - 40 - d * 60, GROUND - 100 + (d % 2) * 20, 9, C.seaL);
      }
      // 予告マーカー(届く0.6秒前から点滅)
      if (!wv.res && dtv <= WARN_T && dtv > -GOOD_W && Math.floor(game.time.elapsed * 12) % 2 === 0) {
        if (wv.type === 'L') { card(CRAB_X + 90, GROUND - 12, 140, 24, 12, C.yel); chevron(CRAB_X + 300, GROUND - 120, true, C.yel, 14); }
        else { card(CRAB_X - 230, GROUND - 230, 140, 24, 12, C.purple); chevron(CRAB_X - 300, GROUND - 120, false, C.purple, 14); }
      }
    }
  }

  function drawCrab() {
    var t = game.time.elapsed;
    var big = flashT > 0 && hitStop > 0;
    var pal = big ? WPAL : CPAL;
    var px = big ? 14 : 11;
    if (duckT > 0) {
      pill(CRAB_X - 100, GROUND - 8, 200, 40, C.ink);
      game.draw.sprite(CRAB_DUCK, pal, CRAB_X, GROUND - 12, px, { anchor: 'center' });
      return;
    }
    if (jumpT > 0) {
      var p = 1 - jumpT / JUMP_T;
      var hgt = Math.sin(p * Math.PI) * 190;
      game.draw.circle(CRAB_X, GROUND + 4, 50 - hgt * 0.15, C.rockD);
      game.draw.sprite(CRAB_JUMP, pal, CRAB_X, GROUND - 50 - hgt, px, { anchor: 'center' });
      return;
    }
    var fr = Math.floor((clock >= 0 ? clock / EIGHTH : t * 4)) % 2;
    var sink = over && won && hitStop <= 0 ? Math.min(1, (1.6 - outroT) / 0.8) * 90 : 0;
    game.draw.sprite(CRAB[fr], pal, CRAB_X, GROUND - 50 - beatPulse * 6 + sink, px, { anchor: 'center', alpha: sink > 0 ? 1 - sink / 120 : 1 });
  }

  function drawPad() {
    var top = Math.round(H * 0.765);
    card(40, top, W - 80, H - top - 40, 48, C.pad);
    var upLit = upT > 0, dnLit = downT > 0;
    card(80, top + 30, W - 160, (H - top - 130) / 2, 36, upLit ? C.yel : C.white);
    card(80, top + 70 + (H - top - 130) / 2, W - 160, (H - top - 130) / 2, 36, dnLit ? C.purple : C.white);
    chevron(W / 2, top + 30 + (H - top - 130) / 4, true, upLit ? C.white : C.yel, 22);
    chevron(W / 2, top + 70 + (H - top - 130) * 0.75, false, dnLit ? C.white : C.purple, 22);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.white);
    label('SCORE ' + score, 50, 72, 44, C.ink, 'left');
    for (var i = 0; i < LIVES; i++) game.draw.sprite(SHELL, { w: i < lives ? C.crab : C.padD }, W - 70 - i * 80, 72, 10, { anchor: 'center' });
    var progress = Math.max(0, Math.min(1, clock / (BEATS * SPB)));
    card(50, 150, W - 100, 30, 15, C.padD);
    if (progress > 0.04) card(50, 150, (W - 100) * progress, 30, 15, SEC_COL[sec]);
    // 区間の境目
    game.draw.rect(50 + (W - 100) * (12 / BEATS) - 3, 144, 6, 42, C.ink);
    game.draw.rect(50 + (W - 100) * (24 / BEATS) - 3, 144, 6, 42, C.ink);
    if (combo >= 2) label('x' + combo, W / 2, 72, 44, SEC_COL[sec]);
  }

  function drawScene() {
    drawWorld();
    drawWaves();
    drawCrab();
    drawBeatDots();
    drawPad();
  }

  function drawResult(showTap) {
    var left = 0;
    for (var i = 0; i < waves.length; i++) if (waves[i].res === 0 || waves[i].res === 3) left++;
    card(70, H * 0.27, W - 140, H * 0.35, 48, C.white);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.325, 96, won ? C.sea : C.crab);
    label('SCORE ' + score, W / 2, H * 0.39, 58, C.ink);
    label('PERFECT ' + nPerfect + '  GOOD ' + nGood + '  MISS ' + nHit, W / 2, H * 0.435, 34, C.rock);
    label('NICE ' + cleanSecs + ' / 3', W / 2, H * 0.475, 40, C.purple);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.52, 54, C.crab);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.52, 42, C.rock);
    if (!won) label('あと' + Math.max(1, left) + '波!', W / 2, H * 0.56, 46, C.crab);
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.6, 36, C.sea);
  }

  // ---- ATTRACT: 実ロジックで3波。引き波を跳ぶ・高波に伏せる・高波に跳んでかぶる ----
  var demo = { t: 0, k: 0, x: W / 2, y: PAD_Y, press: false, pressT: 0, dir: 0 };
  var DEMO_CYC = 5.0;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) { initRun(true); demo.k = 0; demo.pressT = 0; }
    if (hitStop > 0) hitStop -= dt; else stepRun(dt);
    if (flashT > 0) flashT -= dt;
    if (demo.k < DEMO_CHART.length) {
      var plan = DEMO_CHART[demo.k];
      if (clock >= plan[0] - 0.12 && demo.pressT <= 0) { demo.pressT = 0.14; demo.dir = plan[2] === 'jump' ? -1 : 1; }
      if (clock >= plan[0] - 0.01 && hitStop <= 0) { act(plan[2]); demo.k++; }
    }
    if (demo.pressT > 0) demo.pressT -= dt;
    demo.press = demo.pressT > 0;
    var ty = PAD_Y + (demo.press ? demo.dir * 140 * (1 - demo.pressT / 0.14) : 0);
    demo.y += (ty - demo.y) * Math.min(1, dt * 18);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);
    if (upT > 0) upT -= dt;
    if (downT > 0) downT -= dt;

    if (state === S.ATTRACT) {
      if (!waves) initRun(true);
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.white);
      label(GAME_TITLE, W / 2, 92, 90 + Math.sin(t * 3) * 3, C.crab);
      label('HI-SCORE ' + game.best, W / 2, 182, 36, C.rock);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.715, 50, C.yel);
      else label('TAP TO START', W / 2, H * 0.715, 44, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      drawHud();
      drawResult(true);
      return;
    }

    // ---- PLAYING ----
    if (hitStop > 0) {
      hitStop -= dt;
      if (flashT > 0) flashT -= dt;
    } else if (over) {
      outroT -= dt;
      if (outroT <= 0) { state = S.RESULT; endGame(); }
    } else {
      var wasReady = clock < -0.35;
      stepRun(dt);
      if (wasReady && clock >= -0.35) game.audio.play('se_tap', 0.4);
    }

    drawScene();
    drawHud();
    if (clock < 0) {
      card(140, H * 0.45, W - 280, 170, 85, C.white);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.495, 100, C.crab);
    }
    if (over && hitStop <= 0) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0; demo.k = 0;
  });
})(game);
