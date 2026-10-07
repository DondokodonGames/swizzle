// I-GBA-0019v2-garden-mole-squirt.js
// 菜園のモグラ人形みずでっぽう — 畝の穴から不意に顔を出すモグラ人形を、引っ込む前に水鉄砲の水で狙って当てる
// 操作: 狙った所をタップするとその地点へ水が飛ぶ(遠い畝ほど届くまで時間がかかる)。土が揺れた穴は次に顔を出す
// 終わり: 水が切れる前に10回当てれば成功。水切れ/時間切れで失敗
// @mechanic: aim_shoot
// @theme: summer_garden_mole_squirt
// 世界観: 夏の家庭菜園で、畑番の少女が畝の穴からぴょこぴょこ顔を出すモグラ人形に玩具の水鉄砲で水を当て、タンクが空になる前に10回命中させる
// 残るもの: 正誤(CLEAR/GAME OVER) + 命中数と命中率
// スタイル: HYPERCASUAL 3D

(function(game) {
  var STYLE = { bg: ['#f4fbf6', '#dff3e6', '#c6e8d2'], main: ['#7a5a44', '#4bb3fd'], accent: ['#ff8a5c', '#ffd23f'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  var GAME_TITLE = 'MOLE SQUIRT';
  var TIME_LIMIT = 16;
  var NEEDED = 10;
  var TANK = 18;
  var NOZZLE = { x: W * 0.56, y: H * 0.80 };
  var WATER_V = 2600;
  var ROWS = [{ y: H * 0.35, s: 0.68 }, { y: H * 0.48, s: 0.84 }, { y: H * 0.63, s: 1.0 }];
  var COLS = [0.22, 0.5, 0.78];
  var WIGGLE = 0.5;
  var RISE = 0.15;

  var MODE = { ATTRACT: 'ATTRACT', PLAYING: 'PLAYING', RESULT: 'RESULT' };
  var mode = MODE.ATTRACT;

  var holes = [];
  for (var r = 0; r < ROWS.length; r++) {
    for (var c = 0; c < COLS.length; c++) {
      holes.push({ x: W * (COLS[c] + (r - 1) * 0.02 * (c - 1)), y: ROWS[r].y, s: ROWS[r].s, st: 'idle', t: 0, dur: 0, gold: false, wet: 0 });
    }
  }
  var jets = [];
  var hits = 0, shots = 0, score = 0, clock = TIME_LIMIT, spawnT = 0, lead = 0, freezeT = 0, byeT = 0;
  var going = false, clear = false, lastMiss = null;

  var MOLE_A = ['..bbbb..', '.bbbbbb.', 'bbwbbwbb', 'bbbnnbbb', '.bppppb.', '..pppp..'];
  var MOLE_B = ['..bbbb..', '.bbbbbb.', 'bbwbbwbb', 'bbbnnbbb', '.bpooob.', '..pppp..'];
  var MOLE_PAL = { 'b': '#7a5a44', 'w': '#1e1e1e', 'n': '#ff8a9a', 'p': '#c79a78', 'o': '#5a3a2a' };
  var GOLD_PAL = { 'b': '#f2b705', 'w': '#1e1e1e', 'n': '#ff8a9a', 'p': '#ffe38a', 'o': '#8a6a00' };
  var GIRL_A = ['..hhhh..', '.hhhhhh.', 'hhssssh.', '..s.s...', '..ssss..', '.dddddd.', 'dddddddd', '..dddd..', '..s..s..'];
  var GIRL_B = ['..hhhh..', '.hhhhhh.', 'hhssssh.', '..s.s...', '..ssss..', '.dddddds', 'ddddddd.', '..dddd..', '..s..s..'];
  var GIRL_PAL = { 'h': '#4a3020', 's': '#ffd9b8', 'd': '#ff8a5c' };
  var GUN = ['..tt....', 'gggggggn', 'ggggggg.', '.gg.....', '.gg.....'];
  var SPROUT = ['.l.l.', 'lllll', '..l..', '..l..'];

  function tx(str, x, y, size, color) {
    game.draw.text(str, x + 2, y + 5, { size: size, color: '#9ab8a4', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function height(hl) {
    if (hl.st === 'rise') return Math.min(1, hl.t / RISE);
    if (hl.st === 'up') return 1;
    if (hl.st === 'sink') return Math.max(0, 1 - hl.t / RISE);
    return 0;
  }

  function upTime() { return Math.max(0.5, 0.95 - hits * 0.05); }

  function popOne(forceIdx) {
    var free = [];
    for (var i = 0; i < holes.length; i++) if (holes[i].st === 'idle') free.push(i);
    if (!free.length) return;
    var idx = forceIdx !== undefined && holes[forceIdx].st === 'idle' ? forceIdx : free[Math.floor(game.random(0, free.length - 0.001))];
    var hl = holes[idx];
    hl.st = 'wiggle'; hl.t = 0; hl.dur = WIGGLE; hl.gold = hits >= 3 && game.random(0, 1) < 0.18; hl.wet = 0;
  }

  // 実ロジック: 穴の状態遷移 + 出現スケジュール
  function stepHoles(dt, live) {
    spawnT -= dt;
    if (spawnT <= 0) {
      popOne();
      if (hits >= 5 && game.random(0, 1) < 0.4) popOne();
      spawnT = Math.max(0.42, 0.8 - hits * 0.04);
    }
    for (var i = 0; i < holes.length; i++) {
      var hl = holes[i];
      if (hl.wet > 0) hl.wet -= dt;
      if (hl.st === 'idle') continue;
      hl.t += dt;
      if (hl.st === 'wiggle' && hl.t >= hl.dur) { hl.st = 'rise'; hl.t = 0; if (live) game.audio.tone(hl.gold ? 'E6' : 'G5', 0.06, { wave: 'sine', volume: 0.06 }); }
      else if (hl.st === 'rise' && hl.t >= RISE) { hl.st = 'up'; hl.t = 0; hl.dur = hl.gold ? upTime() * 0.6 : upTime(); }
      else if (hl.st === 'up' && hl.t >= hl.dur) { hl.st = 'sink'; hl.t = 0; }
      else if (hl.st === 'sink' && hl.t >= RISE) { hl.st = 'idle'; hl.t = 0; }
    }
  }

  function fire(x, y, loud) {
    if (shots >= TANK) return false;
    shots++;
    var d = Math.hypot(x - NOZZLE.x, y - NOZZLE.y);
    jets.push({ x: x, y: y, t: 0, dur: Math.max(0.12, d / WATER_V) });
    if (loud) game.audio.play('se_jump', 0.25);
    return true;
  }

  // 着弾: 当たった穴(顔が半分以上出ている)を返す
  function landJet(j) {
    var best = null, bd = 1e9;
    for (var i = 0; i < holes.length; i++) {
      var hl = holes[i];
      var d = Math.hypot(j.x - hl.x, j.y - (hl.y - 50 * hl.s));
      if (d < 110 * hl.s && height(hl) >= 0.5 && d < bd) { best = hl; bd = d; }
    }
    return best;
  }

  function stepJets(dt, live) {
    for (var i = jets.length - 1; i >= 0; i--) {
      var j = jets[i];
      j.t += dt;
      if (j.t < j.dur) continue;
      jets.splice(i, 1);
      var hl = landJet(j);
      if (hl) {
        hits += hl.gold ? 2 : 1;
        hl.st = 'sink'; hl.t = 0; hl.wet = 0.6;
        if (live) {
          score += hl.gold ? 300 : 100;
          game.feedback.good(hl.x, hl.y - 90 * hl.s, { text: hl.gold ? 'NICE' : 'GOOD', color: hl.gold ? STYLE.accent[1] : STYLE.main[1], count: hl.gold ? 22 : 12 });
          if (hits >= 5 && hits - (hl.gold ? 2 : 1) < 5) { game.fx.popup('5 / ' + NEEDED, W / 2, H * 0.24, { color: STYLE.accent[0], size: 52 }); game.audio.play('se_milestone', 0.45); }
        }
      } else {
        lastMiss = { x: j.x, y: j.y, t: 0.5 };
        if (live) game.feedback.bad(j.x, j.y, { text: 'MISS', shake: 4, volume: 0.25 });
      }
    }
  }

  function clearGarden() {
    for (var i = 0; i < holes.length; i++) { holes[i].st = 'idle'; holes[i].t = 0; holes[i].wet = 0; }
    jets = []; hits = 0; shots = 0; spawnT = 0.3; lastMiss = null;
  }

  function beginRound() {
    clearGarden();
    score = 0; clock = TIME_LIMIT; lead = 0.8; freezeT = 0; byeT = 0;
    going = false; clear = false;
  }

  function finish(win) {
    going = false; clear = win; freezeT = win ? 0.4 : 0.55;
    game.audio.stopBgm();
    if (win) {
      score += Math.round(clock * 20) + (TANK - shots) * 30;
      game.feedback.good(W / 2, H * 0.45, { text: 'CLEAR', color: STYLE.main[1], count: 30 });
      game.audio.play('se_success', 0.5);
    } else {
      game.feedback.bad(W / 2, H * 0.45, { text: clock <= 0 ? 'TIME UP' : 'MISS', shake: 12 });
      game.audio.play('se_failure', 0.45);
    }
  }

  game.onTap(function(x, y) {
    if (mode === MODE.ATTRACT) { game.audio.play('se_coin', 0.5); mode = MODE.PLAYING; beginRound(); return; }
    if (mode === MODE.RESULT) { mode = MODE.ATTRACT; beginRound(); demo.t = 0; return; }
    if (!going) return;
    if (y > H * 0.72) {
      game.audio.play('se_tap', 0.12);
      game.fx.burst(x, y, { color: STYLE.main[1], count: 3, speed: 70 });
      return;
    }
    if (!fire(x, y, true)) {
      game.audio.play('se_tap', 0.15);
      game.fx.popup('0', NOZZLE.x, NOZZLE.y - 80, { color: STYLE.accent[0], size: 36 });
    }
  });

  // ── ATTRACT ゴースト実演: 残り時間が水の到達時間より長い穴(揺れている穴も含む)を選んで fire()。偶数周の3発目は引っ込みかけを撃って外す ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.5, press: 0, sloppy: false, cool: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8;
    if (cyc < dt || demo.t <= dt) { clearGarden(); demo.sloppy = Math.floor(demo.t / 8) % 2 === 1; demo.cool = 0.4; }
    if (demo.press > 0) demo.press -= dt;
    if (lastMiss) { lastMiss.t -= dt; if (lastMiss.t <= 0) lastMiss = null; }
    stepHoles(dt, false);
    demo.cool -= dt;
    if (demo.cool <= 0) {
      var pick = null;
      for (var i = 0; i < holes.length; i++) {
        var hl = holes[i];
        var travel = Math.hypot(hl.x - NOZZLE.x, hl.y - 50 * hl.s - NOZZLE.y) / WATER_V;
        var sloppyNow = demo.sloppy && shots === 2;
        if (sloppyNow && hl.st === 'up' && hl.dur - hl.t < travel * 0.5) { pick = hl; break; }
        if (!sloppyNow && hl.st === 'up' && hl.dur - hl.t > travel + 0.05) { pick = hl; break; }
        if (!sloppyNow && hl.st === 'wiggle' && hl.dur - hl.t < travel) { pick = hl; break; }
      }
      if (pick) {
        fire(pick.x, pick.y - 50 * pick.s, false);
        demo.gx = pick.x; demo.gy = pick.y - 50 * pick.s; demo.press = 0.22; demo.cool = 0.35;
      }
    }
    stepJets(dt, false);
    if (hits >= NEEDED || shots >= TANK) clearGarden();
  }

  // ── 描画 ──
  function drawGarden() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, '#ffffff'], [0.25, STYLE.bg[0]], [0.7, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    // 遠景の柵とひまわり
    for (var f = 0; f < 9; f++) {
      var sway = Math.sin(t * 1.5 + f) * 4;
      game.draw.rect(40 + f * 125, H * 0.21, 14, 90, '#e8d8c0', 1);
      game.draw.circle(47 + f * 125 + sway, H * 0.20, 26, STYLE.accent[1], 1);
      game.draw.circle(47 + f * 125 + sway, H * 0.20, 11, '#a0703a', 1);
    }
    game.draw.rect(0, H * 0.235, W, 12, '#e8d8c0', 1);
    // 畝(柔らかい楕円の土の帯)
    for (var r = 0; r < ROWS.length; r++) {
      var rw = ROWS[r];
      for (var k = 0; k < 5; k++) {
        var hh = 46 * rw.s;
        game.draw.rect(70, rw.y - hh + k * hh * 0.4, W - 140, hh * 0.4, k < 2 ? '#c8a888' : '#b89474', 1);
      }
      for (var sp = 0; sp < 6; sp++) game.draw.sprite(SPROUT, { 'l': '#5cc27a' }, 120 + sp * 170 + 60, rw.y - 60 * rw.s, 8 * rw.s, { anchor: 'center' });
    }
  }

  function drawHoles(highlight) {
    for (var i = 0; i < holes.length; i++) {
      var hl = holes[i];
      var s = hl.s;
      var wig = hl.st === 'wiggle' ? Math.sin(hl.t * 60) * 8 : 0;
      game.draw.circle(hl.x, hl.y + 6 * s, 70 * s, '#000000', 0.08);
      game.draw.circle(hl.x + wig, hl.y, 62 * s, hl.st === 'wiggle' ? '#8a6444' : '#6a4a34', 1);
      if (hl.st === 'wiggle') {
        game.draw.circle(hl.x - 40 * s + wig, hl.y - 30 * s, 10 * s, '#8a6444', 1);
        game.draw.circle(hl.x + 44 * s - wig, hl.y - 24 * s, 8 * s, '#8a6444', 1);
      }
      var h = height(hl);
      if (h > 0) {
        var fr = Math.floor(game.time.elapsed * 6 + i) % 2 === 0 ? MOLE_A : MOLE_B;
        var py = hl.y - 20 * s - h * 60 * s;
        game.draw.circle(hl.x, py + 10 * s, 52 * s, '#000000', 0.1);
        game.draw.sprite(fr, hl.gold ? GOLD_PAL : MOLE_PAL, hl.x, py, 15 * s, { anchor: 'center' });
        if (hl.gold) game.draw.circle(hl.x, py - 30 * s, 30 * s, '#ffffff', 0.4 + 0.3 * Math.sin(game.time.elapsed * 12));
        // 穴の手前の縁(体を半分隠す)
        game.draw.rect(hl.x - 64 * s, hl.y + 4 * s, 128 * s, 26 * s, '#c8a888', 1);
      }
      if (hl.wet > 0) {
        for (var d = 0; d < 5; d++) game.draw.circle(hl.x - 40 * s + d * 20 * s, hl.y - 90 * s + (0.6 - hl.wet) * 120, 8 * s, STYLE.main[1], hl.wet);
      }
    }
    if (lastMiss) {
      if (highlight) game.draw.circle(lastMiss.x, lastMiss.y, 80, '#ffffff', 0.6);
      game.draw.circle(lastMiss.x, lastMiss.y, 40 * (1.2 - lastMiss.t), STYLE.main[1], lastMiss.t);
    }
  }

  function drawJets() {
    for (var i = 0; i < jets.length; i++) {
      var j = jets[i];
      var k = j.t / j.dur;
      for (var d = 0; d < 6; d++) {
        var kk = Math.max(0, k - d * 0.05);
        var x = NOZZLE.x + (j.x - NOZZLE.x) * kk;
        var y = NOZZLE.y + (j.y - NOZZLE.y) * kk - Math.sin(kk * Math.PI) * 80;
        game.draw.circle(x, y, 16 - d * 2, STYLE.main[1], 1 - d * 0.12);
      }
      game.draw.circle(j.x, j.y, 26, STYLE.main[1], 0.25);
    }
  }

  function drawGirl(firing) {
    var bob = Math.sin(game.time.elapsed * 3) * 4;
    game.draw.circle(W * 0.40, H * 0.90, 90, '#000000', 0.08);
    game.draw.sprite(firing ? GIRL_B : GIRL_A, GIRL_PAL, W * 0.40, H * 0.84 + bob, 18, { anchor: 'center' });
    game.draw.sprite(GUN, { 'g': STYLE.main[1], 't': STYLE.main[1], 'n': STYLE.accent[0] }, NOZZLE.x - 30, NOZZLE.y + 30 + bob, 14, { anchor: 'center' });
    // 水タンク
    var tx0 = W * 0.78, ty0 = H * 0.78, th = 240;
    game.draw.rect(tx0 - 8, ty0 - 8, 96, th + 16, '#ffffff', 1);
    game.draw.rect(tx0, ty0, 80, th, '#d8eef8', 1);
    var fill = Math.max(0, (TANK - shots) / TANK);
    game.draw.rect(tx0, ty0 + th * (1 - fill), 80, th * fill, STYLE.main[1], 1);
    game.draw.rect(tx0 + 10, ty0 + 10, 14, th - 20, '#ffffff', 0.4);
  }

  function drawHud() {
    tx(Math.min(hits, NEEDED) + ' / ' + NEEDED, W / 2, 96, 54, STYLE.main[0]);
    var bw = W - 160;
    var low = clock < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 160, bw, 18, '#e0ece4', 1);
    game.draw.rect(80, 160, bw * Math.max(0, clock / TIME_LIMIT), 18, low ? STYLE.accent[0] : '#5cc27a', 1);
    tx(String(score), W - 120, 96, 32, STYLE.accent[0]);
  }

  game.onUpdate(function(dt) {
    if (mode === MODE.ATTRACT) {
      stepDemo(dt);
      drawGarden();
      drawHoles(!!lastMiss);
      drawJets();
      drawGirl(demo.press > 0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 14 });
      var bob = Math.sin(game.time.elapsed * 2) * 6;
      tx(GAME_TITLE, W / 2, H * 0.07 + bob, 68, STYLE.accent[0]);
      tx('HI-SCORE ' + Math.round(game.best || 0), W / 2, H * 0.115, 30, STYLE.main[0]);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) tx('► 100円 投入 ◄', W / 2, H * 0.97, 38, STYLE.accent[0]);
      else tx('INSERT COIN', W / 2, H * 0.97, 30, STYLE.main[0]);
      return;
    }

    if (mode === MODE.RESULT) {
      drawGarden();
      drawHoles(false);
      drawGirl(false);
      tx(clear ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.075, 68, clear ? STYLE.main[1] : STYLE.accent[0]);
      tx(Math.min(hits, NEEDED) + ' / ' + NEEDED, W / 2, H * 0.12, 40, STYLE.main[0]);
      tx('SCORE ' + score + '  ' + Math.round(shots ? Math.min(hits, shots) / shots * 100 : 0) + '%', W / 2, H * 0.155, 32, STYLE.main[0]);
      if (!clear) tx('あと' + Math.max(1, NEEDED - hits) + '回!', W / 2, H * 0.19, 32, STYLE.accent[0]);
      tx('BEST ' + Math.round(game.best || 0), W / 2, H * 0.72, 28, STYLE.main[0]);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) tx('TAP TO CONTINUE', W / 2, H * 0.97, 30, STYLE.main[0]);
      return;
    }

    // ── PLAYING ──
    if (lastMiss) { lastMiss.t -= dt; if (lastMiss.t <= 0) lastMiss = null; }
    if (byeT > 0) {
      byeT -= dt;
      if (byeT <= 0) {
        mode = MODE.RESULT;
        var stats = { hits: hits, shots: shots };
        if (clear) game.end.success(score, stats); else game.end.failure(stats);
      }
    } else if (freezeT > 0) {
      freezeT -= dt;
      if (freezeT <= 0) byeT = 1.0;
    } else if (lead > 0) {
      lead -= dt;
      if (lead <= 0) { going = true; game.audio.play('se_tap', 0.35); }
    } else if (going) {
      clock -= dt;
      stepHoles(dt, true);
      stepJets(dt, true);
      if (hits >= NEEDED) finish(true);
      else if (shots >= TANK && jets.length === 0) finish(false);
      else if (clock <= 0) { clock = 0; finish(false); }
    }

    drawGarden();
    drawHoles(freezeT > 0 && !clear);
    drawJets();
    drawGirl(jets.length > 0);
    drawHud();
    if (lead > 0) tx(lead > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 88, STYLE.accent[0]);
  });

  game.onStart(function() {
    game.audio.melody([['F5', 0.25], ['A5', 0.25], ['C6', 0.5], ['A5', 0.25], ['G5', 0.25], ['F5', 0.5], ['D5', 0.25], ['E5', 0.25], ['F5', 1]], { tempo: 150, wave: 'triangle', volume: 0.05, loop: true, bass: true });
    mode = MODE.ATTRACT;
    beginRound();
  });
})(game);
