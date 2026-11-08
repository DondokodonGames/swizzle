// I-DS-0007v2-diner-candle-lean-sweep.js
// なびく炎の払い消し — ケーキのロウソクの炎がなびく向きを見て、その向きへ手で払って風を送り、同じ向きの炎をまとめて消す
// 操作: 炎の先が向いている方向(上下左右)へ画面を払う。1回の払いで、その向きになびいている炎がまとめて消える。どれもその向きでなければ炎が燃え上がる。炎はときどき揺らいで向きを変える(揺らいでいる間は消えない)
// 終わり: 3つのケーキ(3本→5本→7本。向きの変わりが速くなる)のロウソクを14秒以内に全部消せばCLEAR。燃え上がりが3回/時間切れでGAME OVER
// @mechanic: swipe_direction
// @theme: diner_birthday_candle_draft
// 世界観: 閉店後の商店街の洋食屋で、店の息子が自分の誕生日ケーキに並んだロウソクを、勝手口と換気扇の風でなびく炎の向きに合わせて手で払い、ひと吹きずつ消していく
// 残るもの: 正誤(CLEAR/GAME OVER) + 消したロウソクの数・最大まとめ消し・スコア
// スタイル: 90s HANDHELD COLOR

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s HANDHELD COLOR: 低彩度・少色。太く単純な形、日焼けした液晶の色味
  var STYLE = { bg: ['#d6cdaa', '#a99a74'], main: ['#c46e5c', '#f0e6c8', '#5c6c8c'], accent: ['#eaa84a', '#3a3428'] };
  var PAPER = STYLE.bg[0], KHAKI = STYLE.bg[1], BERRY = STYLE.main[0], CREAM = STYLE.main[1], SLATE = STYLE.main[2], FLAME = STYLE.accent[0], INK = STYLE.accent[1];
  var GLOW = '#f4d88a', SMOKE = '#8a8678';

  var TITLE = 'CANDLE SWEEP';
  var TIME_LIMIT = 14;
  var CAKES = [3, 5, 7];
  var STRIKES = 3;
  var WOB = 0.5;
  var CAKE_Y = H * 0.53;
  var DIRS = ['left', 'right', 'up', 'down'];
  var VEC = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var BOY = [
    ['...hhhhhh...', '..hhhhhhhh..', '..hpppppph..', '.hffffffffh.', '.ffeeffeeff.', '.ffkeffkeff.', '.ffffffffff.', '.fccffffccf.', '..ffmmmmff..', '...ffffff...', '..ssssssss..', '.ssssssssss.'],
    ['...hhhhhh...', '..hhhhhhhh..', '..hpppppph..', '.hffffffffh.', '.ffeeffeeff.', '.ffkeffkeff.', '.ffffffffff.', 'fccffffffccf', '..fffmmfff..', '...ffffff...', '..ssssssss..', '.ssssssssss.'],
    ['f..hhhhhh..f', 'f.hhhhhhhh.f', '.fhpppppphf.', '.hffffffffh.', '.ffkkffkkff.', '.ffffffffff.', '.ffffffffff.', '.fccffffccf.', '..fmmmmmmf..', '...ffffff...', '..ssssssss..', '.ssssssssss.'],
    ['............', '...hhhhhh...', '..hhhhhhhh..', '..hpppppph..', '.hffffffffh.', '.ffkkffkkff.', '.ffffffffff.', '.ffffffffff.', '..ffmmmmff..', '...ffffff...', '..ssssssss..', '.ssssssssss.'],
  ];
  var FAN = [['k...k', '.k.k.', '..k..', '.k.k.', 'k...k'], ['..k..', '..k..', 'kkkkk', '..k..', '..k..']];

  function label(s, x, y, sz, col) {
    game.draw.text(s, x + 4, y + 4, { size: sz, color: INK, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  // ── ロウソク(プレイ・デモ共通) ──
  function makeCandles(n, fixedDirs) {
    var list = [];
    var span = Math.min(760, 150 * (n - 1));
    for (var i = 0; i < n; i++) {
      var d = fixedDirs ? fixedDirs[i] : DIRS[Math.floor(game.random(0, 4))];
      if (!fixedDirs && i > 0 && game.random(0, 1) < 0.4) d = list[i - 1].dir;
      list.push({ x: W / 2 + (n > 1 ? (i / (n - 1) - 0.5) * span : 0), dir: d, nd: d, lit: true, wob: 0, next: game.random(1.2, 2.4), out: 0, flare: 0, col: [BERRY, SLATE, CREAM][i % 3] });
    }
    return list;
  }

  function stepCandles(list, dt, pace, scripted) {
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c.out > 0) c.out += dt;
      if (c.flare > 0) c.flare = Math.max(0, c.flare - dt);
      if (!c.lit) continue;
      if (c.wob > 0) {
        c.wob -= dt;
        if (c.wob <= 0) { c.wob = 0; c.dir = c.nd; }
        continue;
      }
      if (scripted) continue;
      c.next -= dt * pace;
      if (c.next <= 0) {
        // 風向きの変わり目: 0.5秒揺らいでから新しい向きに落ち着く(予告)
        var nb = list[i - 1] || list[i + 1];
        var nd = nb && nb.lit && game.random(0, 1) < 0.5 ? nb.dir : DIRS[Math.floor(game.random(0, 4))];
        if (nd === c.dir) nd = DIRS[(DIRS.indexOf(c.dir) + 1 + Math.floor(game.random(0, 3))) % 4];
        c.nd = nd; c.wob = WOB; c.next = game.random(1.2, 2.4);
      }
    }
  }

  function applySwipe(list, dir) {
    var hit = [];
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c.lit && c.wob <= 0 && c.dir === dir) { c.lit = false; c.out = 0.001; hit.push(c); }
    }
    if (hit.length === 0) for (var j = 0; j < list.length; j++) if (list[j].lit) list[j].flare = 0.35;
    return hit;
  }

  function litCount(list) { var n = 0; for (var i = 0; i < list.length; i++) if (list[i].lit) n++; return n; }

  // ── 描画 ──
  function drawDiner() {
    var tt = game.time.elapsed;
    game.draw.gradient(0, H, [[0, PAPER], [0.45, KHAKI], [0.46, '#8a6a4a'], [1, '#6a5038']]);
    // 換気扇と勝手口(風の出どころ)
    game.draw.rect(60, H * 0.15, 220, 220, INK);
    game.draw.rect(72, H * 0.15 + 12, 196, 196, SLATE);
    game.draw.sprite(FAN[Math.floor(tt * 10) % 2], { k: CREAM }, 170, H * 0.15 + 110, 30, { anchor: 'center' });
    game.draw.rect(W - 250, H * 0.13, 200, 330, INK);
    game.draw.rect(W - 238, H * 0.13 + 12, 176, 306, '#8a7a5a');
    game.draw.rect(W - 232 + Math.sin(tt * 2) * 10, H * 0.13 + 20, 80, 290, '#6a5a3a');
    game.draw.circle(W - 90, H * 0.13 + 170, 10, FLAME);
    // 壁の献立札(文字なしの札)
    for (var m = 0; m < 4; m++) { game.draw.rect(340 + m * 110, H * 0.15, 90, 150, CREAM); game.draw.rect(352 + m * 110, H * 0.15 + 20, 66, 8, BERRY); game.draw.rect(352 + m * 110, H * 0.15 + 40, 50, 8, KHAKI); }
    // テーブル
    game.draw.rect(0, H * 0.62, W, 30, '#7a5a3a');
    game.draw.rect(0, H * 0.652, W, H * 0.35, '#5a4230');
    for (var k = 0; k < 6; k++) game.draw.rect(k * 200 + 40, H * 0.62 + 8, 120, 6, '#9a7a52');
  }

  function drawCake(list, flashK) {
    var w = Math.max(420, (list.length > 1 ? Math.abs(list[list.length - 1].x - list[0].x) : 0) + 200);
    game.draw.rect(W / 2 - w / 2 - 30, CAKE_Y + 150, w + 60, 26, CREAM);
    game.draw.rect(W / 2 - w / 2, CAKE_Y + 20, w, 140, CREAM);
    game.draw.rect(W / 2 - w / 2, CAKE_Y + 80, w, 30, BERRY);
    for (var d = 0; d < w; d += 60) game.draw.circle(W / 2 - w / 2 + 30 + d, CAKE_Y + 22, 24, CREAM);
    for (var s = 0; s < w - 60; s += 120) game.draw.circle(W / 2 - w / 2 + 60 + s, CAKE_Y + 20, 18, BERRY);
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      var sc = 1 + (flashK && c.lit ? flashK * 0.5 : 0);
      game.draw.rect(c.x - 14, CAKE_Y - 110, 28, 130, c.col);
      game.draw.rect(c.x - 14, CAKE_Y - 110, 8, 130, '#ffffff', 0.25);
      game.draw.rect(c.x - 3, CAKE_Y - 132, 6, 22, INK);
      if (c.lit) drawFlame(c, c.x, CAKE_Y - 140, sc, flashK);
      else if (c.out > 0 && c.out < 1.2) {
        for (var p = 0; p < 3; p++) game.draw.circle(c.x + Math.sin(c.out * 4 + p) * 14, CAKE_Y - 150 - c.out * 160 - p * 30, 14 + p * 4, SMOKE, Math.max(0, 0.6 - c.out * 0.5));
      }
    }
  }

  function drawFlame(c, bx, by, sc, flashK) {
    var d = c.dir;
    if (c.wob > 0) d = Math.floor(c.wob * 14) % 2 ? c.dir : c.nd;
    var v = VEC[d];
    var big = (c.flare > 0 ? 1.8 : 1) * sc * 1.7;
    var jit = c.wob > 0 ? Math.sin(game.time.elapsed * 40) * 10 : Math.sin(game.time.elapsed * 9 + bx) * 3;
    var col = flashK ? '#ffffff' : FLAME;
    var lift = v[1] === 0 ? -1 : 0;
    var cx = bx + v[0] * 8 * big, cy = by - 12 * big + v[1] * 4 * big;
    game.draw.circle(cx + v[0] * 14 * big, cy + v[1] * 14 * big, 34 * big, GLOW, 0.22);
    game.draw.circle(cx, cy, 18 * big, col);
    game.draw.circle(cx + v[0] * 16 * big + jit * 0.3, cy + v[1] * 16 * big + lift * 5 * big, 13 * big, col);
    game.draw.circle(cx + v[0] * 29 * big + jit * 0.5, cy + v[1] * 29 * big + lift * 8 * big, 9 * big, col);
    game.draw.circle(cx + v[0] * 39 * big + jit, cy + v[1] * 39 * big + lift * 10 * big, 5 * big, col);
    game.draw.circle(cx, cy + 2, 8 * big, flashK ? '#ffffff' : '#fff4c8');
    if (c.wob > 0) game.draw.circle(cx, cy, 70, '#ffffff', 0.18 + 0.15 * Math.sin(game.time.elapsed * 30));
  }

  function drawPlates() {
    for (var i = 0; i < 2; i++) {
      var px = i ? W * 0.82 : W * 0.18;
      game.draw.circle(px, H * 0.86, 120, CREAM);
      game.draw.circle(px, H * 0.86, 90, PAPER);
      game.draw.rect(px + (i ? -150 : 130), H * 0.80, 14, 130, SLATE);
    }
  }

  function drawBoy(pose) {
    var fr = pose === 'cheer' ? 2 : pose === 'sad' ? 3 : pose === 'blow' ? 1 : 0;
    var bob = Math.sin(game.time.elapsed * 3) * 5 - (pose === 'cheer' ? Math.abs(Math.sin(game.time.elapsed * 9)) * 28 : 0);
    game.draw.sprite(BOY[fr], { h: INK, p: BERRY, f: '#f0c8a0', e: CREAM, k: INK, c: BERRY, m: '#8a3a2a', s: SLATE }, W / 2, H * 0.82 + bob, 22, { anchor: 'center' });
    // 主役のとんがり帽子
    game.draw.rect(W / 2 - 30, H * 0.82 + bob - 190, 60, 50, FLAME);
    game.draw.rect(W / 2 - 16, H * 0.82 + bob - 220, 32, 34, FLAME);
    game.draw.circle(W / 2, H * 0.82 + bob - 226, 12, CREAM);
  }

  function drawTrail(tr) {
    for (var i = 1; i < tr.length; i++) game.draw.line(tr[i - 1].x, tr[i - 1].y, tr[i].x, tr[i].y, CREAM, 14 - i * 0.3);
  }

  // ── 状態 ──
  var cake, candles, outN, totalN, strikes, score, bestMulti, timeLeft, sw, trail, ready, halt, over, won, endT, prevBest, pose, poseT, sparkT, betweenT, milestoneDone;

  function initGame() {
    cake = 0; outN = 0; strikes = 0; score = 0; bestMulti = 0; timeLeft = TIME_LIMIT;
    totalN = 0; for (var i = 0; i < CAKES.length; i++) totalN += CAKES[i];
    sw = null; trail = []; ready = 0.8; halt = null; over = false; won = false; endT = 0;
    prevBest = game.best || 0; pose = 'idle'; poseT = 0; sparkT = 0; betweenT = 0; milestoneDone = false;
    candles = makeCandles(CAKES[0]);
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.8; pose = ok ? 'cheer' : 'sad';
    if (ok) score += Math.round(timeLeft * 30) + (STRIKES - strikes) * 50;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
  }

  function doSwipe(dir, x, y) {
    var hit = applySwipe(candles, dir);
    pose = 'blow'; poseT = 0.3;
    if (hit.length > 0) {
      outN += hit.length;
      bestMulti = Math.max(bestMulti, hit.length);
      score += hit.length * 100 * hit.length;
      var cx = 0;
      for (var i = 0; i < hit.length; i++) { cx += hit[i].x; game.fx.burst(hit[i].x, CAKE_Y - 150, { color: SMOKE, count: 6, speed: 120, gravity: -200 }); }
      cx /= hit.length;
      game.feedback.good(cx, CAKE_Y - 230, { text: hit.length > 1 ? 'NICE x' + hit.length : 'GOOD', color: FLAME, count: 10 + hit.length * 4 });
      if (outN >= 8 && !milestoneDone) {
        milestoneDone = true;
        game.fx.popup(outN + ' / ' + totalN, W / 2, H * 0.13, { color: BERRY, size: 62 });
        game.audio.play('se_milestone', 0.45);
      }
      if (litCount(candles) === 0) betweenT = 0.55;
    } else {
      strikes++;
      if (strikes >= STRIKES) halt = { t: 0.5, max: 0.5 };
      else game.feedback.bad(x, y, { text: 'MISS' });
    }
  }

  function canPlay() { return state === S.PLAYING && !over && !halt && ready <= 0 && betweenT <= 0; }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (!canPlay()) game.fx.burst(x, y, { color: CREAM, count: 3, speed: 60 });
  });

  game.onPress(function (x, y) {
    if (canPlay()) { sw = { x0: x, y0: y, t0: game.time.elapsed }; trail = [{ x: x, y: y }]; game.audio.play('se_tap', 0.05); }
    else if (state === S.PLAYING) game.audio.play('se_tap', 0.03);
  });

  game.onMove(function (x, y) {
    if (sw && canPlay()) {
      trail.unshift({ x: x, y: y });
      if (trail.length > 12) trail.pop();
      if (trail.length === 4) game.audio.tone(300, 0.08, { wave: 'triangle', volume: 0.04, slide: 200 });
    }
  });

  game.onRelease(function (x, y) {
    if (!sw || !canPlay()) { sw = null; return; }
    var dx = x - sw.x0, dy = y - sw.y0;
    var dur = game.time.elapsed - sw.t0;
    sw = null;
    if (Math.hypot(dx, dy) < 60 || dur > 0.8) {
      // 払いにならない触れ方: 炎がふわっと揺れるだけ
      game.audio.play('se_tap', 0.08);
      game.fx.burst(x, y, { color: CREAM, count: 4, speed: 80 });
      return;
    }
    var dir = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    game.audio.play('se_jump', 0.2);
    doSwipe(dir, x, y);
  });

  // ── ATTRACT: 右向き2本を右払いでまとめて消す → 揺らいで左になった炎を上へ払って燃え上がらせる → 左へ払って消す ──
  var DEMO_CYCLE = 4.6;
  var DEMO_SWIPES = [
    { at: 0.6, dir: 'right', x0: W * 0.25, y0: H * 0.38, x1: W * 0.75, y1: H * 0.38 },
    { at: 2.0, dir: 'up', x0: W * 0.68, y0: H * 0.48, x1: W * 0.68, y1: H * 0.30 },
    { at: 3.0, dir: 'left', x0: W * 0.78, y0: H * 0.38, x1: W * 0.30, y1: H * 0.38 },
  ];
  var demo = { t: 0, candles: null, step: 0, gx: W / 2, gy: H * 0.5, press: false, trail: [], flash: 0, mood: 'idle' };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt || !demo.candles) { demo.candles = makeCandles(3, ['right', 'right', 'up']); demo.step = 0; demo.trail = []; demo.flash = 0; demo.mood = 'idle'; }
    if (cyc > 1.2 && demo.candles[2].wob === 0 && demo.candles[2].dir === 'up') { demo.candles[2].nd = 'left'; demo.candles[2].wob = WOB; }
    stepCandles(demo.candles, dt, 1, true);
    var sw0 = DEMO_SWIPES[Math.min(demo.step, DEMO_SWIPES.length - 1)];
    var tx = sw0.x0, ty = sw0.y0;
    demo.press = false;
    if (demo.step < DEMO_SWIPES.length && cyc >= sw0.at) {
      var k = Math.min(1, (cyc - sw0.at) / 0.25);
      tx = sw0.x0 + (sw0.x1 - sw0.x0) * k; ty = sw0.y0 + (sw0.y1 - sw0.y0) * k;
      demo.gx = tx; demo.gy = ty;
      demo.press = true;
      demo.trail.unshift({ x: tx, y: ty }); if (demo.trail.length > 10) demo.trail.pop();
      if (k >= 1) {
        var hit = applySwipe(demo.candles, sw0.dir);
        if (hit.length) { demo.mood = 'blow'; game.feedback.good(hit[0].x, CAKE_Y - 230, { text: hit.length > 1 ? 'NICE x' + hit.length : 'GOOD', color: FLAME, count: 8, volume: 0.3 }); }
        else { demo.mood = 'sad'; game.feedback.bad(tx, ty, { text: 'MISS', volume: 0.3 }); }
        demo.step++; demo.trail = [];
        if (litCount(demo.candles) === 0) demo.mood = 'cheer';
      }
    } else {
      demo.gx += (tx - demo.gx) * Math.min(1, dt * 8);
      demo.gy += (ty - demo.gy) * Math.min(1, dt * 8);
    }
    return cyc;
  }

  function drawHud() {
    for (var i = 0; i < CAKES.length; i++) {
      var col = i < cake || (over && won) ? BERRY : i === cake ? CREAM : KHAKI;
      game.draw.rect(40 + i * 100, 60, 80, 44, INK);
      game.draw.rect(46 + i * 100, 66, 68, 32, col);
      game.draw.rect(74 + i * 100, 40, 12, 22, FLAME);
    }
    for (var s = 0; s < STRIKES; s++) {
      var hit = s < strikes;
      game.draw.circle(W - 70 - s * 70, 82, 26, hit ? BERRY : CREAM, hit ? 1 : 0.5);
      game.draw.circle(W - 70 - s * 70, 70, 14, hit ? FLAME : CREAM, hit ? 1 : 0.5);
    }
    label(outN + ' / ' + totalN, W * 0.52, 82, 44, CREAM);
    label(String(score), W * 0.52, 148, 34, FLAME);
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(40, 184, W - 80, 22, INK);
    game.draw.rect(44, 188, (W - 88) * fr, 14, timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0 ? BERRY : SLATE);
  }

  function drawResult() {
    game.draw.rect(80, H * 0.20, W - 160, H * 0.30, INK, 0.85);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.25, 104, won ? FLAME : BERRY);
    label(outN + ' / ' + totalN, W / 2, H * 0.32, 60, CREAM);
    label('SCORE ' + score, W / 2, H * 0.38, 50, CREAM);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.44, 54, FLAME);
    else label('BEST ' + Math.max(prevBest, game.best || 0), W / 2, H * 0.44, 42, KHAKI);
    if (!won && outN < totalN) label('あと' + (totalN - outN) + '本!', W / 2, H * 0.485, 46, FLAME);
  }

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawDiner();
      drawCake(demo.candles, 0);
      drawTrail(demo.trail);
      drawPlates();
      drawBoy(demo.mood);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      label(TITLE, W / 2, H * 0.065, 88, BERRY);
      label('HI-SCORE ' + (game.best || 0), W / 2, H * 0.115, 38, SLATE);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.965, 44, FLAME);
      else label('TAP TO START', W / 2, H * 0.965, 40, CREAM);
      return;
    }

    if (state === S.PLAYING) {
      if (poseT > 0) { poseT -= dt; if (poseT <= 0 && !over) pose = 'idle'; }
      if (trail.length && !sw) trail.pop();
      if (over) {
        endT -= dt;
        stepCandles(candles, dt, 0, true);
        if (won) {
          sparkT -= dt;
          if (sparkT <= 0) { sparkT = 0.18; game.fx.burst(game.random(120, W - 120), game.random(H * 0.18, H * 0.5), { color: [FLAME, BERRY, CREAM, SLATE][Math.floor(game.random(0, 4))], count: 16, speed: 360 }); }
        }
        if (endT <= 0) state = S.RESULT;
      } else if (halt) {
        halt.t -= dt;
        if (halt.t <= 0) {
          halt = null;
          game.feedback.bad(W / 2, CAKE_Y - 200, { text: 'MISS' });
          finish(false);
        }
      } else if (ready > 0) {
        ready -= dt;
        if (ready <= 0) game.audio.play('se_tap', 0.3);
      } else if (betweenT > 0) {
        betweenT -= dt;
        stepCandles(candles, dt, 0, true);
        if (betweenT <= 0) {
          if (cake + 1 >= CAKES.length) finish(true);
          else { cake++; candles = makeCandles(CAKES[cake]); game.audio.play('se_coin', 0.3); }
        }
      } else {
        timeLeft -= dt;
        stepCandles(candles, dt, 1 + cake * 0.45, false);
        if (timeLeft <= 0 && !over) {
          timeLeft = 0;
          game.feedback.bad(W / 2, H * 0.4, { text: 'TIME UP' });
          finish(false);
        }
      }
    }

    drawDiner();
    drawCake(candles, halt ? 1 - halt.t / halt.max : 0);
    drawTrail(trail);
    drawPlates();
    drawBoy(pose);
    drawHud();
    if (ready > 0) label(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 120, BERRY);
    if (over || state === S.RESULT) drawResult();

    if (state === S.RESULT) {
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.965, 40, CREAM);
      var stats = { out: outN, total: totalN, bestMulti: bestMulti, strikes: strikes };
      if (won) game.end.success(score, stats);
      else game.end.failure(stats);
    }
  });

  game.onStart(function () {
    game.audio.melody([
      ['A4', 0.5], ['C5', 0.5], ['F5', 1], ['E5', 0.5], ['D5', 0.5], ['C5', 1],
      ['D5', 0.5], ['E5', 0.5], ['F5', 0.5], ['A5', 0.5], ['G5', 2],
      ['F5', 0.5], ['E5', 0.5], ['D5', 1], ['C5', 0.5], ['A4', 0.5], ['Bb4', 1],
      ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['G5', 0.5], ['F5', 2],
    ], {
      tempo: 126, wave: 'triangle', volume: 0.05, loop: true,
      bass: [['F2', 1], ['C3', 1], ['F2', 1], ['C3', 1], ['Bb2', 1], ['F3', 1], ['C3', 1], ['G2', 1],
        ['D3', 1], ['A2', 1], ['Bb2', 1], ['F2', 1], ['C3', 1], ['G2', 1], ['F2', 2]],
    });
    state = S.ATTRACT;
    initGame();
  });
})(game);
