// J-Switch-0054-cloudsea-haul-beat.js
// 雲海の手繰り網 — 雲の底の大魚が綱を引く拍の「合間」にだけ綱を手繰り、桟橋まで引き寄せる
// 操作: 画面のどこでも押す。下のレーンで光る結び目が輪に重なる瞬間(魚が引く拍と拍のあいだ)に押すと手繰れる。魚の尾が輪に来た瞬間に押すと綱を持っていかれる(社内メモ。画面には出さない)
// 終わり: 大魚を桟橋まで引き上げればCLEAR。綱を全部持っていかれる/時間切れでGAME OVER
// @mechanic: rhythm
// @theme: cloudsea_line_haul
// 世界観: 雲海に浮かぶ空の漁村で、見習いの網子が雲の底から掛かった大きな雲魚を、魚が身をよじって引く拍の合間にだけ綱を手繰り、夜明けの市が開く前に村の桟橋まで引き上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 手繰った回数・PERFECT数・綱を持っていかれた回数
// スタイル: 70s MONO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s MONO: 黒地に白ドット、画面の帯ごとに色セロハン(琥珀/水色/桃)を重ねる
  var STYLE = { bg: ['#040509', '#0b0f1a', '#000000'], main: ['#f4f4ee', '#b8bcc4', '#6a6e78'], accent: ['#ffb43a', '#4ae0ff', '#ff5aa8'] };
  var C = {
    ink: '#000000', bg1: '#070913', bg2: '#01020a', white: '#f4f4ee', grey: '#8a8e98', dim: '#3a3e48',
    amber: '#ffb43a', cyan: '#4ae0ff', pink: '#ff5aa8', bad: '#ff4a4a', gold: '#ffe27a'
  };

  var GAME_TITLE = 'CLOUD HAUL';
  var TIME_LIMIT = 14;
  var BPM = 110;
  var BEAT = 60 / BPM;
  var LANE_Y = H * 0.855;
  var HIT_X = W * 0.2;
  var SPD = 560;
  var WIN_PERF = 0.08, WIN_GOOD = 0.16, WIN_FISH = 0.11;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var phase, ready, songT, timeLeft, dist, notes, nextNote, hauls, perfects, burns, combo, hitStop, outro, ok, jerk, taut, milestone, pressT, focus;

  // ── sprites ───────────────────────────────────────────────────────
  var NETTER = [
    ['...hh...', '..hhhh..', '..wkkw..', '..wwww..', '.aaaaaa.', 'a.aaaa.a', '..a..a..', '..a..a..'],
    ['...hh...', '..hhhh..', '..wkkw..', '..wwww..', 'aaaaaa..', '..aaaa.a', '..a..a..', '.a....a.']
  ];
  var CLOUDFISH = [
    ['....wwww......', '..wwwwwwww...w', '.wkwwwwwwww.ww', 'wwwwwwwwwwwwww', '.wwwwwwwwww.ww', '..wwwwwwww...w', '....ww.ww.....'],
    ['....wwww.....w', '..wwwwwwww..ww', '.wkwwwwwwwwww.', 'wwwwwwwwwwwww.', '.wwwwwwwwwwww.', '..wwwwwwww..ww', '....ww.ww....w']
  ];
  var KNOT = ['.ww.', 'wwww', 'wwww', '.ww.'];
  var TAIL = ['w...w', 'ww.ww', '.www.', '..w..'];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  // 譜面: 魚は表拍で引く。手繰りの結び目は裏拍。後半は裏拍にも魚のひねり(赤い輪で予告)
  function buildChart(beats) {
    var list = [];
    for (var b = 1; b < beats; b++) {
      var bar = Math.floor(b / 4), pos = b % 4;
      list.push({ t: b * BEAT, kind: 'fish', done: false, off: false });
      var late = bar >= 3;
      var haul = pos === 0 || pos === 2 || (late && pos === 1);
      if (late && pos === 3 && bar % 2 === 1) {
        list.push({ t: (b + 0.5) * BEAT, kind: 'fish', done: false, off: true });
      } else if (haul) {
        list.push({ t: (b + 0.5) * BEAT, kind: 'haul', done: false, gold: bar === 5 && pos === 2 });
      }
    }
    list.sort(function(a, c) { return a.t - c.t; });
    return list;
  }

  function initGame() {
    phase = 'ready'; ready = 0.8; songT = -0.2; timeLeft = TIME_LIMIT; dist = 0.3;
    notes = buildChart(Math.ceil(TIME_LIMIT / BEAT) + 2); nextNote = 0;
    hauls = 0; perfects = 0; burns = 0; combo = 0; hitStop = 0; outro = 0; ok = false;
    jerk = 0; taut = 0; milestone = false; pressT = 0; focus = null;
  }

  function fishPos() {
    var d = Math.max(0, Math.min(1, dist));
    var t = game.time.elapsed;
    return { x: W * 0.55 + Math.sin(t * 1.3) * 60 + Math.sin(t * 30) * jerk * 30, y: H * 0.72 - d * H * 0.4, s: 11 + d * 5 };
  }

  // 拍の進行(実プレイ・デモ共用)
  function advance(dt, isDemo) {
    songT += dt;
    if (jerk > 0) jerk = Math.max(0, jerk - dt * 4);
    if (taut > 0) taut = Math.max(0, taut - dt * 3);
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (n.done) continue;
      if (n.kind === 'fish' && songT >= n.t) {
        n.done = true; jerk = 1; taut = 1;
        dist -= n.off ? 0.03 : 0.012;
        game.audio.tone(n.off ? 'D#2' : 'C2', 0.09, { wave: 'square', volume: isDemo ? 0.02 : 0.07, slide: -40 });
      } else if (n.kind === 'haul' && songT > n.t + WIN_GOOD) {
        n.done = true; n.missed = true; combo = 0;
        if (!isDemo) game.fx.burst(HIT_X, LANE_Y, { color: C.dim, count: 4, speed: 90 });
      }
    }
    // 裏拍の手前でかすかな案内音(音が先生)
    for (var k = 0; k < notes.length; k++) {
      var m = notes[k];
      if (m.kind === 'haul' && !m.cued && songT >= m.t - 0.02) {
        m.cued = true;
        if (!isDemo) game.audio.tone(m.gold ? 'E6' : 'G5', 0.04, { wave: 'triangle', volume: 0.025 });
      }
    }
  }

  function nearest(kind) {
    var best = null, bd = 1e9;
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (n.kind !== kind || (n.done && !(kind === 'fish' && Math.abs(songT - n.t) < WIN_FISH))) continue;
      var d = Math.abs(songT - n.t);
      if (d < bd) { bd = d; best = n; }
    }
    return { n: best, d: bd };
  }

  function strike(isDemo) {
    var fp = fishPos();
    var h = nearest('haul');
    if (h.n && !h.n.done && h.d <= WIN_GOOD) {
      h.n.done = true; h.n.hit = true;
      var perf = h.d <= WIN_PERF;
      var gain = (perf ? 0.1 : 0.07) * (h.n.gold ? 2 : 1);
      dist += gain; taut = 0.6;
      if (isDemo) { game.fx.burst(HIT_X, LANE_Y, { color: C.cyan, count: 8, speed: 200 }); return; }
      hauls++; combo++; if (perf) perfects++;
      game.feedback.good(HIT_X, LANE_Y - 90, { text: perf ? 'PERFECT' : 'GOOD', color: h.n.gold ? C.gold : C.cyan, count: perf ? 14 : 8 });
      game.audio.play(h.n.gold ? 'se_coin' : 'se_tap', 0.35);
      if (combo > 0 && combo % 4 === 0) game.fx.popup('x' + combo, fp.x, fp.y - 120, { color: C.amber, size: 48 });
      if (!milestone && dist >= 0.65) {
        milestone = true;
        game.audio.play('se_milestone', 0.5);
        game.fx.popup('NICE', W / 2, H * 0.3, { color: C.amber, size: 72 });
      }
      if (dist >= 1) finish(true);
      return;
    }
    var f = nearest('fish');
    if (f.n && f.d <= WIN_FISH) {
      dist -= 0.08; combo = 0; jerk = 1;
      if (isDemo) { game.fx.burst(fp.x, fp.y, { color: C.bad, count: 10, speed: 240 }); return; }
      burns++; focus = 'rope'; hitStop = 0.3;
      game.feedback.bad(HIT_X, LANE_Y - 90, { text: 'MISS', color: C.bad });
      if (dist <= 0) finish(false);
      return;
    }
    if (isDemo) return;
    combo = 0;
    game.audio.tone('A3', 0.05, { wave: 'triangle', volume: 0.04 });
    game.fx.burst(HIT_X, LANE_Y, { color: C.grey, count: 5, speed: 120 });
  }

  function finish(win) {
    if (phase === 'stop' || phase === 'outro') return;
    ok = win; phase = 'stop'; hitStop = 0.55; focus = win ? 'fish' : 'rope';
    game.audio.stopBgm();
    var fp = fishPos();
    if (win) {
      game.fx.flash(C.white, 0.2);
      game.fx.burst(fp.x, fp.y, { color: C.gold, count: 30, speed: 420 });
      game.audio.play('se_success', 0.6);
    } else {
      game.feedback.bad(fp.x, fp.y - 120, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS', color: C.bad });
      game.audio.play('se_failure', 0.6);
    }
  }

  // ── input ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); game.audio.stopBgm(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; startTheme(); return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    pressT = 0.12;
    if (phase !== 'play' || hitStop > 0) { game.audio.tone('C4', 0.03, { wave: 'triangle', volume: 0.03 }); return; }
    strike(false);
  });

  // ── demo(裏拍で手繰る。2周目のひねりで1回つられて押す)──
  var demo = { t: 0, gx: W * 0.5, gy: H * 0.9, press: 0, n: 0, fooled: false };
  var DEMO_CYC = BEAT * 16;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) {
      notes = buildChart(18); songT = 0; dist = 0.3; jerk = 0; demo.n++; demo.fooled = false;
    }
    advance(dt, true);
    if (demo.press > 0) demo.press -= dt;
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (n.kind === 'haul' && !n.done && songT >= n.t - 0.01) { strike(true); demo.press = 0.14; break; }
      if (n.kind === 'fish' && !demo.fooled && songT > BEAT * 9 && songT >= n.t - 0.02 && songT < n.t) { demo.fooled = true; strike(true); demo.press = 0.14; break; }
    }
    if (dist > 0.95) dist = 0.95;
    if (dist < 0.05) dist = 0.05;
    demo.gx = W * 0.5 + Math.sin(demo.t * 0.9) * 30;
    demo.gy = H * 0.9 - (demo.press > 0 ? 18 : 0);
  }

  // ── drawing ───────────────────────────────────────────────────────
  function drawSky() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg1], [0.5, '#0a1220'], [1, C.bg2]]);
    // 星(白ドット)
    for (var i = 0; i < 40; i++) {
      var sx = (i * 197) % W, sy = 240 + (i * 131) % 260;
      game.draw.rect(sx, sy, 6, 6, C.white, 0.3 + 0.3 * Math.sin(t * 2 + i));
    }
    // 雲海(白ドットの帯。ゆっくり流れる)
    for (var r = 0; r < 7; r++) {
      var cy = H * 0.42 + r * 30;
      for (var c = 0; c < 14; c++) {
        var cx = ((c * 110 + t * (20 + r * 6)) % (W + 200)) - 100;
        game.draw.circle(cx, cy + Math.sin(t + c + r) * 6, 34 - r * 2, C.white, 0.1 + r * 0.02);
      }
    }
    // 桟橋(村の端)
    game.draw.rect(0, H * 0.235, W * 0.72, 22, C.grey);
    for (var p = 0; p < 5; p++) game.draw.rect(40 + p * 150, H * 0.235 + 22, 16, 90, C.dim);
    game.draw.rect(W * 0.08, H * 0.16, 110, 90, C.dim);
    game.draw.rect(W * 0.08 + 30, H * 0.16 + 30, 40, 40, C.amber, 0.4 + 0.2 * Math.sin(t * 1.7));
    // 色セロハン帯 + 周囲の明滅
    game.draw.rect(0, 0, W, 240, C.amber, 0.08);
    game.draw.rect(0, 240, W, H * 0.6, C.cyan, 0.05);
    game.draw.rect(0, H * 0.76, W, H * 0.24, C.pink, 0.07);
    game.draw.rect(0, 0, W, H, C.white, 0.015 + 0.015 * Math.sin(t * 1.4));
  }

  function drawHaul() {
    var t = game.time.elapsed;
    var fp = fishPos();
    var hx = W * 0.5, hy = H * 0.215;
    var sway = Math.sin(t * 2.2) * 4;
    var tight = taut > 0.5;
    var sag = tight ? 0 : 60;
    var mx = (hx + fp.x) / 2 + (tight ? 0 : 30), my = (hy + fp.y) / 2 + sag;
    var ropeCol = focus === 'rope' && Math.floor(t * 14) % 2 === 0 ? C.bad : (tight ? C.white : C.grey);
    game.draw.line(hx, hy, mx, my, ropeCol, tight ? 6 : 4);
    game.draw.line(mx, my, fp.x - 40, fp.y, ropeCol, tight ? 6 : 4);
    game.draw.sprite(NETTER[jerk > 0.3 ? 1 : Math.floor(t * 2) % 2], { h: C.amber, w: C.white, k: C.ink, a: C.grey }, hx + sway, hy - 60 + Math.sin(t * 3) * 3 + jerk * 12, 12, { anchor: 'center' });
    if (focus === 'fish' && Math.floor(t * 12) % 2 === 0) game.draw.circle(fp.x, fp.y, 150, C.gold, 0.35);
    game.draw.sprite(CLOUDFISH[Math.floor(t * (jerk > 0 ? 12 : 3)) % 2], { w: C.white, k: C.pink }, fp.x, fp.y, fp.s, { anchor: 'center', alpha: 0.95 });
    // 雲の前景(魚が雲に隠れる)
    if (dist < 0.45) {
      for (var c = 0; c < 6; c++) game.draw.circle(fp.x - 150 + c * 60, fp.y + 50 + Math.sin(t * 2 + c) * 10, 50, C.white, 0.14);
    }
  }

  function drawLane() {
    var t = game.time.elapsed;
    game.draw.rect(0, LANE_Y - 70, W, 140, C.ink, 0.7);
    game.draw.line(0, LANE_Y, W, LANE_Y, C.dim, 4);
    // 拍の縦線(表拍)
    var b0 = Math.floor(songT / BEAT);
    for (var b = b0; b < b0 + 8; b++) {
      var bx = HIT_X + (b * BEAT - songT) * SPD;
      if (bx > -20 && bx < W + 20) game.draw.rect(bx - 2, LANE_Y - 50, 4, 100, C.dim, 0.8);
    }
    var ringPulse = 1 + 0.08 * Math.sin(t * 8);
    game.draw.circle(HIT_X, LANE_Y, 58 * ringPulse, C.white, 0.18);
    game.draw.circle(HIT_X, LANE_Y, 46, C.ink);
    game.draw.circle(HIT_X, LANE_Y, 40, C.dim, 0.9);
    if (pressT > 0) game.draw.circle(HIT_X, LANE_Y, 64, C.cyan, 0.4);
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (n.done && !(n.kind === 'fish' && songT - n.t < 0.12)) continue;
      var x = HIT_X + (n.t - songT) * SPD;
      if (x < -60 || x > W + 60) continue;
      if (n.kind === 'haul') {
        game.draw.sprite(KNOT, { w: n.gold ? C.gold : C.cyan }, x, LANE_Y, 18, { anchor: 'center' });
      } else {
        if (n.off && x > HIT_X && Math.floor(t * 10) % 2 === 0) game.draw.circle(x, LANE_Y, 44, C.bad, 0.5);
        game.draw.sprite(TAIL, { w: n.off ? C.bad : C.pink }, x, LANE_Y, 12, { anchor: 'center', alpha: 0.9 });
      }
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 228, C.ink, 0.75);
    txt(String(Math.ceil(Math.max(0, timeLeft))), 70, 96, 56, C.white, 'left');
    txt(Math.round(Math.max(0, Math.min(1, dist)) * 100) + '%', W / 2, 96, 64, C.amber);
    if (combo >= 2) txt('x' + combo, W - 70, 96, 48, C.cyan, 'right');
    game.draw.rect(60, 170, W - 120, 18, C.dim);
    game.draw.rect(60, 170, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 18, timeLeft < 4 ? C.bad : C.white);
    // 綱の残り(左の縦目盛り)
    game.draw.rect(24, H * 0.3, 18, H * 0.4, C.dim);
    game.draw.rect(24, H * 0.7 - H * 0.4 * Math.max(0, Math.min(1, dist)), 18, H * 0.4 * Math.max(0, Math.min(1, dist)), C.amber);
  }

  function score() { return hauls * 100 + perfects * 50 + Math.round(Math.max(0, timeLeft) * 20) - burns * 30; }

  // ── main loop ─────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (pressT > 0) pressT -= dt;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      drawSky(); drawHaul(); drawLane();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 13 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.75);
      txt(GAME_TITLE, W / 2 + Math.sin(t * 1.5) * 8, 100 + Math.sin(t * 2) * 6, 84, C.amber);
      txt('HI-SCORE ' + game.best, W / 2, 190, 36, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.985, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.985, 34, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawSky(); drawHaul();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 96, ok ? C.gold : C.bad);
      txt('SCORE ' + (ok ? score() : 0), W / 2, H * 0.36, 48, C.white);
      txt('BEST ' + game.best, W / 2, H * 0.4, 36, C.grey);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.985, 38, C.white);
      return;
    }

    if (phase === 'ready') {
      ready -= dt;
      advance(0, false);
      if (ready <= 0) { phase = 'play'; songT = 0; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'play') {
      if (hitStop > 0) hitStop -= dt;
      else {
        timeLeft -= dt;
        advance(dt, false);
        if (dist <= 0) finish(false);
        else if (timeLeft <= 0) { timeLeft = 0; finish(false); }
      }
    } else if (phase === 'stop') {
      hitStop -= dt;
      if (hitStop <= 0) { phase = 'outro'; outro = 1.4; }
    } else if (phase === 'outro') {
      outro -= dt;
      if (ok) dist = Math.min(1.08, dist + dt * 0.3);
      if (outro <= 0) {
        state = S.RESULT;
        var stats = { hauls: hauls, perfect: perfects, burns: burns, pulled: Math.round(Math.max(0, Math.min(1, dist)) * 100) };
        if (ok) game.end.success(score(), stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawSky(); drawHaul(); drawLane(); drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 100, C.amber);
    if (phase === 'outro') {
      game.draw.rect(0, H * 0.25, W, H * 0.17, C.ink, 0.85);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 96, ok ? C.gold : C.bad);
      txt('SCORE ' + (ok ? score() : 0), W / 2, H * 0.35, 44, C.white);
      if (ok && score() > game.best) txt('NEW RECORD', W / 2, H * 0.395, 42, C.gold);
      else if (!ok) txt('あと' + Math.max(1, Math.round((1 - Math.max(0, dist)) * 100)) + '%!', W / 2, H * 0.395, 44, C.white);
      else txt('BEST ' + game.best, W / 2, H * 0.395, 36, C.grey);
    }
  });

  function startTheme() {
    game.audio.melody([
      ['C5', 0.5], ['E5', 0.5], ['G5', 1], ['A5', 0.5], ['G5', 0.5], ['E5', 1],
      ['D5', 0.5], ['E5', 0.5], ['C5', 1], ['G4', 2]
    ], { tempo: BPM, wave: 'square', volume: 0.04, loop: true, bass: [['C3', 2], ['A2', 2], ['F2', 2], ['G2', 2]] });
  }

  game.onStart(function() {
    startTheme();
    state = S.ATTRACT;
    initGame();
  });
})(game);
