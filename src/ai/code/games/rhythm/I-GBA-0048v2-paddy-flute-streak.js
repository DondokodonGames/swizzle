// I-GBA-0048v2-paddy-flute-streak.js
// 田植え囃子つなぎ笛 — 田んぼの奥から拍に乗って来る苗束に合わせて笛を吹き継ぎ、途切れず決めるほど倍率が上がる
// 操作: 苗束が手前の畦の印に重なる拍でタップ。4回続けるごとに倍率が上がり(最大x5)、外すと倍率が1に戻る
// 終わり: 田植え唄1曲(26拍)を吹き終えたとき、点数が目標の旗に届いていれば成功。届かなければ失敗
// @mechanic: jackpot_combo
// @theme: rice_planting_festival_flute
// 世界観: 田植え祭りの畦道で、囃子方の笛吹きが早乙女たちの植える拍に合わせて田植え唄の音を吹き継ぎ、途切れず続けるほど囃子が盛り上がっていく
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア(倍率込みの点数・最大連続・PERFECT数)
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 地平線から上は空グラデ、下は横1pxストリップ(ここでは6px)を奥ほど圧縮した床。速度感はストリップの流れ
  var STYLE = { bg: ['#ffb36b', '#ffe3a8', '#6ab0d8'], main: ['#3f8a3a', '#7fc45a', '#4a7ab0'], accent: ['#ffd83a', '#e8503a'] };
  var C = {
    dusk: STYLE.bg[0], haze: STYLE.bg[1], skyTop: STYLE.bg[2], rice: STYLE.main[0], riceHi: STYLE.main[1], water: STYLE.main[2],
    gold: STYLE.accent[0], red: STYLE.accent[1], mud: '#6a4a2a', ridge: '#8a6a3a', white: '#fffaf0', ink: '#1c1408', good: '#7dff8a', bad: '#ff4a3a',
  };

  var GAME_TITLE = 'PADDY FLUTE';
  var BPM = 120, SPB = 60 / BPM;
  var LEAD = 1.4;                 // 苗束が見えてから畦の印に届くまで
  var CHART = [4, 5, 6, 7, 8, 9, 10, 11, 12, 12.5, 13, 14, 15, 16, 16.5, 17, 18, 19, 19.5, 20, 21, 22, 22.5, 23, 24, 25];
  var NEEDED = CHART.length;      // 26拍
  var TIME_LIMIT = 14;            // 1曲 = 26拍(120BPM)+余韻
  var QUOTA = 2600;
  var PERFECT_W = 0.07, GOOD_W = 0.15;

  var HORIZON = Math.round(H * 0.3), HIT_Y = Math.round(H * 0.78);

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var notes, songT, streak, bestStreak, perfects, hits, score, mult, countIn, over, won, endT, freeze;
  var beatIdx, beatPulse, ghostNotes, breakT, lastMult, prevBest, playT, judgeWord, judgeT;

  function shout(str, x, y, sz, color) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  // 笛吹き(はちまき・法被)と早乙女(すげ笠)
  var FLUTER = [
    ['..wwww..', '.hhhhhh.', '.hssssh.', '.sksks..', '.ssssffff', '..rrrr..', '.rrrrrr.', '.rrwrrr.', '..r..r..', '..k..k..'],
    ['..wwww..', '.hhhhhh.', '.hssssh.', '.sksks..', '.ssssffff', '..rrrr.n.', '.rrrrrr..', '.rrwrrr.', '..r..r..', '..k..k..'],
    ['w.wwww.w', '.hhhhhh.', '.hssssh.', '.sksks..', 's.ssss.s', 'r.rrrr.r', '.rrrrrr.', '.rrwrrr.', '..r..r..', '.k....k.'],
  ];
  var FLUTER_PAL = { w: '#ffffff', h: '#1c1408', s: '#f2c8a0', k: '#1c1408', f: '#c8a050', r: '#e8503a', n: '#ffd83a' };
  var PLANTER = [
    ['..yyyy..', '.yyyyyy.', '..ssss..', '.bbbbbb.', 'sbbbbbb.', '.bbbbbb.', '..b..b..'],
    ['........', '..yyyy..', '.yyyyyy.', '..ssss..', '.bbbbbbs', '.bbbbbb.', '..b..b..'],
  ];
  var PLANTER_PAL = { y: '#e8c870', s: '#f2c8a0', b: '#4a6ab0' };
  var SEEDLING = ['.g.g.', 'g.g.g', '.ggg.', '..b..', '.bbb.'];

  function buildNotes(list) {
    var out = [];
    for (var i = 0; i < list.length; i++) out.push({ t: list[i] * SPB, judged: false, res: '', flash: 0, fx: 0, fy: 0 });
    return out;
  }

  function initGame() {
    notes = buildNotes(CHART);
    songT = -0.0001; streak = 0; bestStreak = 0; perfects = 0; hits = 0; score = 0; mult = 1; lastMult = 1;
    countIn = 0.8; over = false; won = false; endT = 0; freeze = 0; beatIdx = -1; beatPulse = 0; breakT = 0;
    prevBest = game.best; playT = 0; judgeWord = ''; judgeT = 0;
  }

  function multFor(s) { return Math.min(5, 1 + Math.floor(s / 4)); }

  function laneY(z) {
    var p = 1 / (1 + 3 * Math.max(0, z));
    return { y: HORIZON + (HIT_Y - HORIZON) * (p - 0.25) / 0.75, s: p };
  }

  // 判定(本番・デモ共通)
  function strike(now) {
    var best = null, bestD = 1e9;
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (n.judged) continue;
      var d = Math.abs(n.t - now);
      if (d < bestD) { bestD = d; best = n; }
      if (n.t - now > GOOD_W) break;
    }
    if (best && bestD <= GOOD_W) {
      best.judged = true; best.res = bestD <= PERFECT_W ? 'PERFECT' : 'GOOD';
      streak++; bestStreak = Math.max(bestStreak, streak);
      var m = multFor(streak);
      if (state === S.PLAYING) {
        hits++;
        if (best.res === 'PERFECT') perfects++;
        score += (best.res === 'PERFECT' ? 100 : 50) * m;
      }
      var scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
      game.audio.tone(587.3 * Math.pow(2, scale[Math.min(scale.length - 1, Math.floor(streak / 3))] / 12), 0.12, { wave: 'triangle', volume: 0.12 });
      judgeWord = best.res; judgeT = 0.35;
      game.feedback.good(W / 2, HIT_Y - 120, { text: m > 1 ? best.res + ' x' + m : best.res, color: best.res === 'PERFECT' ? C.gold : C.good, size: 54, count: 6 + m * 3 });
      if (m > lastMult) {
        lastMult = m;
        game.audio.play(m >= 5 ? 'se_powerup' : 'se_milestone', 0.45);
        game.fx.popup('x' + m, W * 0.82, HIT_Y - 300, { color: m >= 5 ? C.red : C.gold, size: 96 + m * 8 });
        if (m >= 5) game.fx.flash(C.gold, 0.15);
      }
      return 'hit';
    }
    breakCombo(null, now);
    return 'stray';
  }

  function breakCombo(note, now) {
    var lost = multFor(streak);
    streak = 0; lastMult = 1;
    judgeWord = 'MISS'; judgeT = 0.35;
    if (note) { note.flash = 1; var p = laneY(0); note.fx = W / 2; note.fy = p.y; }
    if (lost >= 2) {
      breakT = 0.45;
      game.audio.play('se_break', 0.4);
      game.feedback.bad(W * 0.82, HIT_Y - 300, { text: 'x' + lost + ' → x1', color: C.bad });
    } else {
      game.feedback.bad(W / 2, HIT_Y - 60, { text: 'MISS', color: C.bad, shake: 0.08 });
    }
  }

  function stepSong(dt) {
    songT += dt;
    var b = Math.floor(songT / SPB);
    if (b !== beatIdx) { beatIdx = b; beatPulse = 1; }
    if (beatPulse > 0) beatPulse = Math.max(0, beatPulse - dt * 4);
    if (breakT > 0) breakT -= dt;
    if (judgeT > 0) judgeT -= dt;
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (n.flash > 0) n.flash = Math.max(0, n.flash - dt * 2.2);
      if (!n.judged && songT - n.t > GOOD_W) { n.judged = true; n.res = 'MISS'; breakCombo(n, songT); }
    }
    mult = multFor(streak);
  }

  // ── 描画 ──
  function drawField() {
    var t = game.time.elapsed;
    var fever = mult >= 5 && state !== S.ATTRACT;
    game.draw.gradient(0, HORIZON, [[0, C.skyTop], [0.6, C.haze], [1, C.dusk]]);
    // 遠山
    for (var m = 0; m < 5; m++) {
      var mx = m * 260 - 40, mh = 70 + (m % 2) * 40;
      for (var r = 0; r < mh; r += 6) game.draw.rect(mx + 130 * (1 - r / mh), HORIZON - mh + r, 260 * (r / mh), 6, '#8a9a7a');
    }
    // 床: 奥ほど圧縮したストリップ。拍で流れる
    var scroll = (songT > 0 ? songT : t) * 2.2;
    for (var y = HORIZON; y < H; y += 6) {
      var dz = (HIT_Y - HORIZON) / Math.max(4, y - HORIZON + 30);
      var band = Math.floor(dz * 3 + scroll) % 2 === 0;
      var col = band ? (fever ? '#c8b040' : C.rice) : (fever ? '#e8d870' : C.water);
      game.draw.rect(0, y, W, 6, col);
    }
    // 消失点へ収束する畝
    for (var k = -6; k <= 6; k++) {
      game.draw.line(W / 2 + k * 14, HORIZON, W / 2 + k * 260, H, k === 0 ? C.ridge : C.riceHi, k === 0 ? 4 : 3);
    }
    // 手前の畦道と判定の印
    game.draw.rect(0, HIT_Y + 40, W, 120, C.ridge);
    game.draw.rect(0, HIT_Y + 40, W, 10, '#b08a50');
    var pr = 70 + beatPulse * 18;
    game.draw.circle(W / 2, HIT_Y, pr + 10, C.ink, 0.5);
    game.draw.circle(W / 2, HIT_Y, pr, C.white, 0.35 + beatPulse * 0.4);
    game.draw.circle(W / 2, HIT_Y, pr - 16, C.mud);
  }

  function drawNotes() {
    for (var i = notes.length - 1; i >= 0; i--) {
      var n = notes[i];
      var z = (n.t - songT) / LEAD;
      if (n.flash > 0) {
        game.draw.sprite(SEEDLING, { g: '#ffffff', b: '#ffffff' }, n.fx, n.fy, 18 * (1 + n.flash * 0.3), { anchor: 'center' });
        continue;
      }
      if (n.judged || z > 1 || z < -0.2) continue;
      var p = laneY(z);
      game.draw.rect(W / 2 - 40 * p.s, p.y + 36 * p.s, 80 * p.s, 10 * p.s, '#000000', 0.25);
      game.draw.sprite(SEEDLING, { g: '#3fd040', b: '#c8a050' }, W / 2, p.y, 22 * p.s, { anchor: 'center' });
    }
  }

  function drawPeople() {
    var t = game.time.elapsed;
    var onBeat = beatPulse > 0.5 ? 1 : 0;
    // 早乙女たち(拍で植える)
    for (var i = 0; i < 4; i++) {
      var side = i < 2 ? -1 : 1;
      var z = 0.25 + (i % 2) * 0.35;
      var p = laneY(z);
      var x = W / 2 + side * (220 + (i % 2) * -60) * (0.6 + p.s);
      var hop = mult >= 4 && state !== S.ATTRACT ? Math.abs(Math.sin(t * 10 + i)) * 14 : 0;
      game.draw.sprite(PLANTER[onBeat], PLANTER_PAL, x, p.y - hop, 15 * p.s + 5, { anchor: 'center', flipX: side > 0 });
    }
    // 笛吹き
    var f = state === S.RESULT ? (won ? FLUTER[2] : FLUTER[0]) : (breakT > 0 ? FLUTER[0] : (judgeT > 0 && judgeWord !== 'MISS' ? FLUTER[1] : (mult >= 5 ? FLUTER[2] : FLUTER[0])));
    var by = Math.round(H * 0.87) + Math.sin(t * 4) * 4;
    game.draw.sprite(f, FLUTER_PAL, W * 0.2, by, 15, { anchor: 'center' });
  }

  function drawMeter() {
    // 倍率バッジ(大きく)
    var bx = W * 0.82, by = HIT_Y - 300;
    var sh = breakT > 0 ? Math.sin(breakT * 60) * 12 : 0;
    game.draw.circle(bx + sh, by, 96, C.ink);
    game.draw.circle(bx + sh, by, 86, mult >= 5 ? C.red : (mult >= 3 ? C.gold : C.white));
    shout('x' + mult, bx + sh, by, 84, mult >= 3 ? C.white : C.ink);
    // 次の倍率までの連続(4つの玉)
    var into = streak % 4;
    for (var i = 0; i < 4; i++) game.draw.circle(bx - 54 + i * 36, by + 120, 12, mult >= 5 || i < into ? C.gold : '#00000044');
  }

  function hud() {
    shout(String(score), W / 2, 76, 64, C.white);
    shout(hits + ' / ' + NEEDED, W - 150, 76, 40, C.white);
    // 目標の旗までのゲージ
    var gx = 80, gw = W - 160, gy = 160;
    var cap = QUOTA * 1.6;
    game.draw.rect(gx, gy, gw, 26, '#00000055');
    game.draw.rect(gx, gy, gw * Math.min(1, score / cap), 26, score >= QUOTA ? C.gold : C.riceHi);
    var fx = gx + gw * (QUOTA / cap);
    game.draw.rect(fx - 3, gy - 30, 6, 60, C.ink);
    game.draw.rect(fx, gy - 30, 40, 24, C.red);
    // 曲の進み
    var prog = Math.max(0, Math.min(1, songT / (CHART[CHART.length - 1] * SPB)));
    game.draw.rect(gx, 206, gw * prog, 6, C.white, 0.7);
  }

  function drawWorld() { drawField(); drawNotes(); drawPeople(); drawMeter(); }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || countIn > 0) { game.audio.play('se_tap', 0.06); return; }
    if (strike(songT) === 'stray') game.audio.play('se_tap', 0.12);
  });

  // ── ATTRACT: 実判定で6拍続けて倍率を上げ、7拍目をわざと外して倍率が割れる ──
  var DEMO_CHART = [2, 3, 4, 5, 6, 6.5, 7, 8];
  var demo = { t: 0, gx: W / 2, gy: H * 0.9, press: false, k: 0 };
  function demoStep(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.2;
    if (cyc < dt || demo.t <= dt) {
      notes = buildNotes(DEMO_CHART); songT = 0; streak = 4; lastMult = 2; beatIdx = -1; demo.k = 0; breakT = 0;
    }
    stepSong(dt);
    demo.press = false;
    if (demo.k < DEMO_CHART.length) {
      var due = DEMO_CHART[demo.k] * SPB;
      demo.gx += (W / 2 - demo.gx) * Math.min(1, dt * 6); demo.gy += (HIT_Y + 20 - demo.gy) * Math.min(1, dt * 6);
      if (due - songT < 0.1) demo.press = true;
      if (demo.k === 6) { if (songT > due + GOOD_W) demo.k++; }
      else if (songT >= due) { strike(songT); demo.k++; }
    } else {
      demo.gx += (W * 0.2 - demo.gx) * Math.min(1, dt * 2); demo.gy += (H * 0.93 - demo.gy) * Math.min(1, dt * 2);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!notes) initGame();
      demoStep(dt);
      drawWorld();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      shout(GAME_TITLE, W / 2, H * 0.06, 84, C.gold);
      shout('HI-SCORE ' + game.best, W / 2, H * 0.105, 36, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) shout('► 100円 投入 ◄', W / 2, H * 0.975, 42, C.gold);
      else shout('TAP TO START', W / 2, H * 0.975, 40, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawWorld();
      shout(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.2, 96, won ? C.gold : C.bad);
      shout('SCORE ' + score, W / 2, H * 0.26, 56, C.white);
      shout('COMBO ' + bestStreak + '  PERFECT ' + perfects, W / 2, H * 0.305, 38, C.white);
      if (score > prevBest && prevBest > 0) shout('NEW RECORD', W / 2, H * 0.35, 52, C.gold);
      else shout('BEST ' + Math.max(prevBest, score), W / 2, H * 0.35, 42, C.white);
      if (!won) shout('あと' + Math.max(0, QUOTA - score) + '点!', W / 2, H * 0.4, 50, C.red);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) shout('TAP TO CONTINUE', W / 2, H * 0.975, 40, C.white);
      return;
    }

    // ── PLAYING ──
    if (endT > 0) {
      endT -= dt;
      if (endT <= 0) {
        state = S.RESULT;
        var stats = { hits: hits, perfect: perfects, maxCombo: bestStreak, quota: QUOTA };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (freeze > 0) {
      freeze -= dt;
      if (freeze <= 0) finish();
    } else if (countIn > 0) {
      countIn -= dt;
      if (countIn <= 0) {
        // 拍の時計と伴奏をここで揃えて鳴らし始める
        songT = 0; beatIdx = -1;
        game.audio.melody(SONG, SONG_OPTS);
      }
    } else if (!over) {
      playT += dt;
      stepSong(dt);
      var last = notes[notes.length - 1];
      if ((last.judged && songT > last.t + 0.5) || playT >= TIME_LIMIT) {
        over = true; won = score >= QUOTA; freeze = 0.45;
        if (!won) game.feedback.bad(W / 2, 175, { text: 'MISS', color: C.bad });
        else game.fx.burst(W / 2, 175, { color: C.gold, count: 30, speed: 480 });
      }
    }

    drawWorld();
    hud();
    if (countIn > 0) shout(countIn > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.47, 110, C.gold);
  });

  function finish() {
    if (endT > 0) return;
    endT = 1.4;
    game.audio.stopBgm();
    game.audio.play(won ? 'se_success' : 'se_failure', 0.55);
    if (won) for (var i = 0; i < 7; i++) game.fx.burst(game.random(120, 960), game.random(400, 1400), { color: i % 2 ? C.gold : C.red, count: 22, speed: 460 });
  }

  // 田植え唄(オリジナル)16拍ループ
  var SONG = [
    ['E5', 1], ['D5', 0.5], ['E5', 0.5], ['G5', 1], ['E5', 1],
    ['D5', 1], ['C5', 0.5], ['D5', 0.5], ['E5', 2],
    ['A4', 1], ['C5', 1], ['D5', 1], ['E5', 1],
    ['D5', 1], ['C5', 1], ['A4', 2],
  ];
  var SONG_OPTS = { tempo: BPM, wave: 'triangle', volume: 0.06, loop: true, bass: [['A2', 1], ['E3', 1], ['A2', 1], ['E3', 1]] };

  game.onStart(function() {
    game.audio.melody(SONG, SONG_OPTS);
    state = S.ATTRACT;
    initGame();
  });
})(game);
