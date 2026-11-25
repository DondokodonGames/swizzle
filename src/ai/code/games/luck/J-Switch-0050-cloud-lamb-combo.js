// J-Switch-0050-cloud-lamb-combo.js
// 雲の牧場つなぎ受け — 降ってくる綿雲の子羊だけを袋で受け続け、途切れずに受けるほど倍率が上がる
// 操作: 指を置いたまま左右に動かすと牧童が付いてくる。子羊を続けて受けると倍率が上がり、雷の粒を受けたり子羊を落とすと倍率が1に戻る(社内メモ。画面には出さない)
// 終わり: 点数が40に届けばCLEAR。雷の粒を3回受ける/時間切れでGAME OVER
// @mechanic: jackpot_combo
// @theme: cloud_ranch_lamb_streak
// 世界観: 空に浮かぶ雲の牧場で、見習いの牧童が、夕立雲からこぼれ落ちてくる綿雲の子羊たちを大きな羊毛袋で受け止める。雷雲が混ぜて落とす雷の粒を避けながら、群れをひとつも取りこぼさずに受け続けるほど、牧場主から貰える褒美が膨らむ
// 残るもの: 正誤(CLEAR/GAME OVER) + 点数・最高倍率・最長連続・雷を受けた数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い黒輪郭を先に描き、内側を明暗2色だけで塗る
  var STYLE = { bg: ['#6ac8f0', '#b8e8ff', '#ffffff'], main: ['#ffffff', '#c8d4e8', '#101018'], accent: ['#ffd23a', '#ff6a3a'] };
  var T = {
    skyTop: '#4ab0e8', skyBot: '#c8f0ff', line: '#101018', white: '#ffffff', shade: '#c8d4e8', storm: '#5a6078', stormLo: '#3a3e52',
    bolt: '#ffd23a', boltLo: '#e0a010', orange: '#ff6a3a', grass: '#7ad060', grassLo: '#4ea040', skin: '#ffd0a8', blue: '#3a6ad0'
  };

  var GAME_TITLE = 'CLOUD RANCH';
  var TIME_LIMIT = 18;
  var TARGET = 40;
  var MAX_ZAP = 3;
  var CATCH_Y = 1290;
  var TIERS = [0, 3, 6, 10];   // 連続数 → 倍率 x1/x2/x3/x5
  var MULTS = [1, 2, 3, 5];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ph, go, rest, total, streak, bestStreak, bestMult, zaps, drops, dropIn, herderX, aimX, still, endT, cleared, spotlight, tierShown, warned;

  var LAMB = [
    ['.wwwwww.', 'wwwwwwww', 'wwkwwkww', 'wwwwwwww', '.wwppww.', '..w..w..'],
    ['.wwwwww.', 'wwwwwwww', 'wwkwwkww', 'wwwwwwww', '.wwppww.', '.w....w.']
  ];
  var BOLT = ['..yy', '.yy.', 'yyyy', '.yy.', 'yy..'];
  var HERD = [
    ['...hhh...', '..hhhhh..', '..sksks..', '..sssss..', '.bbbbbbb.', 'b.bbbbb.b', '..bb.bb..', '..ll.ll..'],
    ['...hhh...', '..hhhhh..', '..sksks..', '..sssss..', '.bbbbbbb.', '.bbbbbbb.', '..bb.bb..', '.ll...ll.']
  ];

  function out(s, x, y, sz, col, al) {
    for (var dx = -3; dx <= 3; dx += 3) for (var dy = -3; dy <= 3; dy += 3) if (dx || dy) game.draw.text(s, x + dx, y + dy, { size: sz, color: T.line, bold: true, align: al || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: al || 'center' });
  }

  function tier() { var k = 0; for (var i = 0; i < TIERS.length; i++) if (streak >= TIERS[i]) k = i; return k; }

  function fresh() {
    ph = 'ready'; go = 0.8; rest = TIME_LIMIT; total = 0; streak = 0; bestStreak = 0; bestMult = 1; zaps = 0;
    drops = []; dropIn = 0.3; herderX = W / 2; aimX = W / 2; still = 0; endT = 0; cleared = false; spotlight = null; tierShown = 0; warned = [];
  }

  // 雲からこぼす(実プレイ・デモ共用)。雷は0.6秒前に雲が光って予告
  function rain(dt) {
    dropIn -= dt;
    if (dropIn <= 0) {
      var x = game.random(140, W - 140);
      var r = game.random(0, 1);
      if (r < 0.28) warned.push({ x: x, t: 0.6 });
      else drops.push({ x: x, y: 330, vy: game.random(430, 520) + total * 4, kind: r > 0.9 ? 'gold' : 'lamb', wob: game.random(0, 6) });
      dropIn = Math.max(0.42, 0.75 - total * 0.006);
    }
    for (var w = warned.length - 1; w >= 0; w--) {
      warned[w].t -= dt;
      if (warned[w].t <= 0) { drops.push({ x: warned[w].x, y: 330, vy: 620, kind: 'bolt', wob: 0 }); warned.splice(w, 1); game.audio.tone('C3', 0.12, { wave: 'sawtooth', volume: 0.04 }); }
    }
  }

  // 落下と受け(実プレイ・デモ共用)
  function fall(dt, ghost) {
    for (var i = drops.length - 1; i >= 0; i--) {
      var d = drops[i];
      d.y += d.vy * dt; d.wob += dt * 4;
      d.x += Math.sin(d.wob) * (d.kind === 'bolt' ? 0 : 40) * dt;
      if (d.y >= CATCH_Y - 40 && d.y <= CATCH_Y + 30 && Math.abs(d.x - herderX) < 120) {
        drops.splice(i, 1);
        if (d.kind === 'bolt') zapped(d, ghost); else caught(d, ghost);
        continue;
      }
      if (d.y > CATCH_Y + 140) {
        drops.splice(i, 1);
        if (d.kind !== 'bolt') lost(d, ghost);
      }
    }
  }

  function caught(d, ghost) {
    streak++;
    var k = tier();
    var gain = MULTS[k] * (d.kind === 'gold' ? 2 : 1);
    game.fx.burst(d.x, CATCH_Y - 40, { color: d.kind === 'gold' ? T.bolt : T.white, count: 8, speed: 200 });
    game.audio.tone(['C5', 'E5', 'G5', 'C6'][k], 0.07, { wave: 'triangle', volume: 0.05 });
    if (ghost) return;
    total += gain;
    if (streak > bestStreak) bestStreak = streak;
    if (MULTS[k] > bestMult) bestMult = MULTS[k];
    game.fx.popup('+' + gain, d.x, CATCH_Y - 140, { color: k >= 2 ? T.orange : T.blue, size: 40 + k * 8 });
    if (k > tierShown) {
      tierShown = k;
      game.audio.play('se_milestone', 0.5);
      game.feedback.good(W / 2, 520, { text: 'x' + MULTS[k], color: T.orange, size: 90, count: 18 });
    } else if (d.kind === 'gold') game.audio.play('se_coin', 0.4);
    if (total >= TARGET) wrap(true);
  }

  function lost(d, ghost) {
    if (streak === 0) return;
    game.fx.burst(d.x, CATCH_Y + 120, { color: T.shade, count: 6, speed: 120 });
    if (ghost) { streak = 0; return; }
    if (streak >= 3) game.fx.popup('x1', d.x, CATCH_Y - 60, { color: T.stormLo, size: 50 });
    game.audio.tone('A3', 0.1, { wave: 'triangle', volume: 0.04 });
    streak = 0; tierShown = 0;
  }

  function zapped(d, ghost) {
    streak = 0; tierShown = 0;
    if (ghost) { game.fx.burst(d.x, CATCH_Y - 40, { color: T.bolt, count: 12, speed: 260 }); game.fx.shake(6, 0.2); return; }
    zaps++;
    spotlight = { x: d.x, y: CATCH_Y - 40, t: 0.45 };
    game.feedback.bad(d.x, CATCH_Y - 180, { text: 'MISS', color: T.orange, shake: 10 });
    if (zaps >= MAX_ZAP) wrap(false); else still = 0.35;
  }

  function wrap(win) {
    if (ph === 'stop' || ph === 'outro') return;
    cleared = win; ph = 'stop'; still = 0.55;
    game.audio.stopBgm();
    if (win) { game.fx.flash(T.white, 0.25); game.audio.play('se_success', 0.6); }
    else {
      if (rest <= 0) game.feedback.bad(W / 2, H * 0.42, { text: 'TIME UP', color: T.orange });
      game.audio.play('se_failure', 0.6);
    }
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; fresh(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; fresh(); demo.t = 0; return; }
    game.fx.burst(herderX, CATCH_Y + 60, { color: T.grass, count: 3, speed: 80 });
  });
  game.onPress(function(x) {
    if (state !== S.PLAYING) return;
    aimX = x;
    game.audio.play('se_tap', 0.12);
  });
  game.onMove(function(x) {
    if (state !== S.PLAYING) return;
    if (Math.abs(x - aimX) > 90) game.fx.burst(herderX, CATCH_Y + 80, { color: T.grassLo, count: 1, speed: 50 });
    aimX = x;
  });

  // ── demo: 子羊の下へ回り込み、雷は避ける。3回目の雷はわざと受けて倍率が戻る ──
  var demo = { t: 0, gx: W / 2, gy: 1650, n: 0, took: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 9;
    if (cyc < dt || demo.t <= dt) { drops = []; warned = []; streak = 0; demo.n = 0; demo.took = false; }
    rain(dt);
    var best = null;
    for (var i = 0; i < drops.length; i++) {
      var d = drops[i];
      if (d.kind === 'bolt') {
        if (!d.seen) { d.seen = true; demo.n++; d.take = demo.n % 3 === 0; }
        if (d.take && d.y > 700) { best = d; break; }
        continue;
      }
      if (!best || d.y > best.y) best = d;
    }
    var goal = best ? best.x : W / 2;
    for (var j = 0; j < drops.length; j++) if (drops[j].kind === 'bolt' && !drops[j].take && drops[j].y > 900 && Math.abs(drops[j].x - goal) < 150) goal += drops[j].x < goal ? 180 : -180;
    aimX = Math.max(120, Math.min(W - 120, goal));
    herderX += (aimX - herderX) * Math.min(1, dt * 7);
    fall(dt, true);
    demo.gx = herderX; demo.gy = 1650 + Math.sin(demo.t * 3) * 10;
  }

  // ── drawing ──
  function toonCircle(x, y, r, lit, dark) {
    game.draw.circle(x, y, r + 6, T.line);
    game.draw.circle(x, y, r, dark);
    game.draw.circle(x - r * 0.2, y - r * 0.2, r * 0.8, lit);
  }

  function drawSky() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, T.skyTop], [0.7, T.skyBot], [1, T.white]]);
    for (var c = 0; c < 4; c++) toonCircle(((c * 330 + t * 20) % (W + 300)) - 150, 900 + c * 90, 60, T.white, T.shade);
    // 夕立雲(上)
    for (var s = 0; s < 7; s++) toonCircle(s * 170 + 20, 300 + Math.sin(t * 1.5 + s) * 8, 110, T.storm, T.stormLo);
    for (var w = 0; w < warned.length; w++) {
      if (Math.floor(t * 14) % 2 === 0) { game.draw.circle(warned[w].x, 340, 90, T.bolt, 0.6); game.draw.line(warned[w].x, 380, warned[w].x, CATCH_Y, T.bolt, 3); }
    }
    // 牧場の雲の島
    game.draw.rect(0, CATCH_Y + 60, W, 110, T.line);
    game.draw.rect(0, CATCH_Y + 66, W, 100, T.grassLo);
    game.draw.rect(0, CATCH_Y + 66, W, 50, T.grass);
    game.draw.rect(0, 0, W, H, T.white, 0.03 + 0.03 * Math.sin(t * 1.4));
  }

  function drawDrops() {
    var t = game.time.elapsed;
    for (var i = 0; i < drops.length; i++) {
      var d = drops[i];
      if (d.kind === 'bolt') {
        game.draw.sprite(BOLT, { y: T.line }, d.x + 5, d.y + 5, 20, { anchor: 'center' });
        game.draw.sprite(BOLT, { y: T.bolt }, d.x, d.y, 18, { anchor: 'center' });
      } else {
        var fr = LAMB[Math.floor(t * 6 + i) % 2];
        game.draw.sprite(fr, { w: T.line, k: T.line, p: T.line }, d.x + 5, d.y + 5, 17, { anchor: 'center' });
        game.draw.sprite(fr, { w: d.kind === 'gold' ? T.bolt : T.white, k: T.line, p: T.orange }, d.x, d.y, 16, { anchor: 'center' });
      }
    }
  }

  function drawHerder() {
    var t = game.time.elapsed;
    var k = tier();
    var jit = still > 0 && ph === 'play' ? Math.sin(t * 60) * 10 : 0;
    game.draw.rect(herderX - 130, CATCH_Y - 30, 260, 70, T.line);
    game.draw.rect(herderX - 124, CATCH_Y - 24, 248, 58, k >= 2 ? T.bolt : T.shade);
    game.draw.rect(herderX - 124, CATCH_Y - 24, 248, 24, T.white);
    game.draw.sprite(HERD[Math.floor(t * 5) % 2], { h: T.orange, s: T.skin, k: T.line, b: T.blue, l: T.line }, herderX + jit, CATCH_Y + 110 + Math.sin(t * 4) * 4, 14, { anchor: 'center' });
  }

  function drawMeter() {
    var t = game.time.elapsed;
    game.draw.rect(0, 1440, W, H - 1440, T.grassLo);
    var k = tier();
    for (var i = 0; i < 4; i++) {
      var on = i <= k;
      toonCircle(170 + i * 250, 1600 + (on ? Math.sin(t * 6 + i) * 6 : 0), 70, on ? T.bolt : T.shade, on ? T.boltLo : T.stormLo);
      out('x' + MULTS[i], 170 + i * 250, 1625, 54, on ? T.line : T.white);
    }
    var next = k + 1 < TIERS.length ? TIERS[k + 1] : TIERS[k];
    var prog = k + 1 < TIERS.length ? (streak - TIERS[k]) / (next - TIERS[k]) : 1;
    game.draw.rect(100, 1730, W - 200, 26, T.line);
    game.draw.rect(106, 1736, (W - 212) * Math.max(0, Math.min(1, prog)), 14, T.orange);
    for (var z = 0; z < MAX_ZAP; z++) game.draw.sprite(BOLT, { y: z < zaps ? T.orange : T.stormLo }, W / 2 - 90 + z * 90, 1820, 10, { anchor: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 228, T.line, 0.85);
    out(total + ' / ' + TARGET, W / 2, 95, 70, T.white);
    out(String(Math.ceil(rest)), 60, 95, 52, T.bolt, 'left');
    if (streak >= 2) out('x' + MULTS[tier()], W - 60, 95, 52, T.orange, 'right');
    game.draw.rect(60, 165, W - 120, 20, T.stormLo);
    game.draw.rect(60, 165, (W - 120) * Math.min(1, total / TARGET), 20, T.bolt);
    game.draw.rect(60, 195, (W - 120) * Math.max(0, rest / TIME_LIMIT), 10, rest < 4 ? T.orange : T.white);
  }

  function score() { return total * 25 + bestStreak * 20 + (MAX_ZAP - zaps) * 60 + Math.ceil(rest) * 10; }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (ph === undefined) fresh();
      stepDemo(dt);
      drawSky(); drawDrops(); drawHerder(); drawMeter();
      game.draw.hand(demo.gx, demo.gy, { press: true, scale: 13 });
      game.draw.rect(0, 0, W, 228, T.line, 0.85);
      out(GAME_TITLE, W / 2, 95 + Math.sin(t * 2) * 6, 80, T.white);
      out('HI-SCORE ' + game.best, W / 2, 180, 36, T.bolt);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.97, 40, T.bolt);
      else out('INSERT COIN', W / 2, H * 0.97, 34, T.white);
      return;
    }
    if (state === S.RESULT) {
      drawSky(); drawMeter();
      out(cleared ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.42, 92, cleared ? T.bolt : T.orange);
      out('SCORE ' + (cleared ? score() : 0), W / 2, H * 0.48, 44, T.white);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.97, 38, T.white);
      return;
    }

    if (ph === 'ready') {
      go -= dt;
      if (go <= 0) { ph = 'play'; game.audio.play('se_tap', 0.5); }
    } else if (ph === 'play') {
      if (still > 0) still -= dt;
      else {
        rest -= dt;
        herderX += (Math.max(120, Math.min(W - 120, aimX)) - herderX) * Math.min(1, dt * 16);
        rain(dt);
        fall(dt, false);
        if (rest <= 0 && ph === 'play') { rest = 0; wrap(false); }
      }
    } else if (ph === 'stop') {
      still -= dt;
      if (still <= 0) { ph = 'outro'; endT = 1.4; }
    } else if (ph === 'outro') {
      endT -= dt;
      if (endT <= 0) {
        state = S.RESULT;
        var stats = { points: total, bestStreak: bestStreak, bestMult: bestMult, zaps: zaps };
        if (cleared) game.end.success(score(), stats); else game.end.failure(stats);
        return;
      }
    }

    drawSky(); drawDrops(); drawHerder(); drawMeter(); drawHud();
    if (spotlight) {
      spotlight.t -= dt;
      if (Math.floor(t * 16) % 2 === 0) game.draw.circle(spotlight.x, spotlight.y, 150, T.white, 0.5);
      if (spotlight.t <= 0 && ph !== 'stop') spotlight = null;
    }
    if (ph === 'ready') out(go > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 100, T.bolt);
    if (ph === 'outro') {
      game.draw.rect(0, H * 0.35, W, H * 0.17, T.line, 0.88);
      out(cleared ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 92, cleared ? T.bolt : T.orange);
      if (cleared && score() > game.best) out('NEW RECORD', W / 2, H * 0.46, 46, T.bolt);
      else if (cleared) out('BEST ' + game.best, W / 2, H * 0.46, 40, T.white);
      else out('あと' + Math.max(1, TARGET - total) + '点!', W / 2, H * 0.46, 48, T.white);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['C5', 0.5], ['D5', 0.25], ['E5', 0.25], ['G5', 0.5], ['E5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 1],
      ['F5', 0.5], ['E5', 0.25], ['D5', 0.25], ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 1]
    ], { tempo: 140, wave: 'triangle', volume: 0.05, loop: true, bass: [['C3', 1], ['G2', 1], ['F2', 1], ['G2', 1]] });
    state = S.ATTRACT;
    fresh();
  });
})(game);
