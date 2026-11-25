// J-3DSDSDSTOP10-0002-greenhouse-drop-count.js
// 温室の水やり数え — 空き鉢をタップで種まき、芽ごとに決まった滴数ぴったりで水を止めて咲かせる
// 操作: 空き畝をタップで種まき。芽をタップするたび1滴。目盛りの線ちょうどで止めると咲く。1滴でも多いと根腐れ
// 終わり: 20秒で8輪咲かせればCLEAR。届かなければGAME OVER(放置した芽は3秒で枯れる)
// @mechanic: count_exact
// @theme: greenhouse_drop_count
// 世界観: 丘の上のガラス温室で、花市の朝便までに注文の8輪をそろえたい見習い園丁が、芽ごとに違う「ちょうどの水」を数えながら次々に咲かせていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 咲かせた数・根腐れ数・枯らした数
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 3〜4色+黒、8x8タイルの反復背景
  var STYLE = { bg: ['#0f380f', '#1e5a2a', '#306230'], main: ['#e8d8a0', '#8b5a2b', '#48a8e8'], accent: ['#f85898', '#f8d830'] };
  var C = { soil: '#6b3a1a', soil2: '#8b5a2b', water: '#48a8e8', leaf: '#58d048', leafD: '#207020', pink: '#f85898', yel: '#f8d830', ink: '#000000', cream: '#f8f0c8', bad: '#e83820', rot: '#5a4020', glass: '#a8e8f8' };

  var GAME_TITLE = 'DROP GARDEN';
  var TIME_LIMIT = 20;
  var NEEDED = 8;
  var SOAK = 0.55;
  var DRY_LIMIT = 3.0;

  var PX = [W * 0.2, W * 0.5, W * 0.8];
  var PY = [H * 0.43, H * 0.62];
  var SPROUT = ['...##...', '..#..#..', '...##...', '...#....', '..##....', '...#....'];
  var SPROUT2 = ['..#..#..', '...##...', '..###...', '...#....', '...##...', '...#....'];
  var FLOWER = ['..#.#..', '.#####.', '##o#o##', '.#####.', '..#.#..', '...|...', '..||...', '...|...'];
  var SEED = ['.##.', '####', '.##.'];
  var CAN = ['....##..', '.######.', '########', '##.####.', '.######.', '..####..'];
  var GARDENER = ['..###...', '.#####..', '..o.o...', '..###...', '.#####..', '#.###.#.', '..#.#...'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var plots, bloomed, rotted, dried, timeLeft, ready, ended, ok, hitStop, endWait, score, milestone, hiPlot, canX, canY;

  function initGame() {
    plots = [];
    for (var r = 0; r < 2; r++) for (var c = 0; c < 3; c++) plots.push({ x: PX[c], y: PY[r], st: 'empty', need: 0, w: 0, t: 0, dry: 0, gold: false });
    bloomed = 0; rotted = 0; dried = 0; timeLeft = TIME_LIMIT; ready = 0.8;
    ended = false; ok = false; hitStop = 0; endWait = 0; score = 0; milestone = false; hiPlot = null;
    canX = W * 0.5; canY = H * 0.8;
  }

  function plotAt(x, y) {
    for (var i = 0; i < plots.length; i++) if (Math.abs(x - plots[i].x) < 150 && Math.abs(y - plots[i].y) < 120) return plots[i];
    return null;
  }

  // 実ロジック: 1回のタップを畝に与える(デモも同じ関数、forceNeed でデモの滴数を固定)
  function touchPlot(p, demoMode, forceNeed) {
    canX = p.x + 90; canY = p.y - 150;
    if (p.st === 'empty') {
      p.st = 'seed'; p.w = 0; p.dry = 0;
      var hard = Math.min(2, Math.floor(bloomed / 3));
      p.gold = !demoMode && bloomed >= 3 && Math.random() < 0.18;
      p.need = forceNeed || (p.gold ? 6 : 2 + Math.floor(game.random(0, 2 + hard)));
      if (!demoMode) { game.audio.play('se_tap', 0.4); game.fx.burst(p.x, p.y, { color: C.soil2, count: 6, speed: 150 }); }
      return;
    }
    if (p.st === 'seed') {
      p.w++; p.dry = 0;
      if (!demoMode) game.audio.tone(['C5', 'E5', 'G5', 'C6', 'E6', 'G6'][Math.min(5, p.w - 1)], 0.08, { wave: 'square', volume: 0.06 });
      game.fx.burst(p.x, p.y - 40, { color: C.water, count: 4, speed: 120 });
      if (p.w === p.need) { p.st = 'soak'; p.t = SOAK; }
      return;
    }
    if (p.st === 'soak') {
      // 1滴多い = 根腐れ
      p.st = 'rot'; p.t = 1.0; rotted++;
      if (!demoMode) game.feedback.bad(p.x, p.y - 60, { text: 'MISS' });
      else game.fx.burst(p.x, p.y, { color: C.rot, count: 10 });
      return;
    }
    if (!demoMode) game.audio.play('se_tap', 0.1);
  }

  function tickPlots(dt, demoMode) {
    for (var i = 0; i < plots.length; i++) {
      var p = plots[i];
      if (p.st === 'seed') {
        p.dry += dt;
        if (!demoMode && p.dry > DRY_LIMIT) {
          p.st = 'rot'; p.t = 1.0; dried++;
          game.feedback.bad(p.x, p.y - 60, { text: 'MISS', shake: 5 });
        }
      } else if (p.st === 'soak') {
        p.t -= dt;
        if (p.t <= 0) {
          p.st = 'bloom'; p.t = 0.9;
          var pts = p.gold ? 3 : 1;
          if (!demoMode) {
            bloomed += pts; score += (p.gold ? 400 : 100) + p.need * 10;
            game.feedback.good(p.x, p.y - 120, { text: p.gold ? 'BONUS' : (p.need >= 4 ? 'PERFECT' : 'GOOD'), color: C.yel });
            game.audio.play('se_coin', 0.4);
            if (!milestone && bloomed >= NEEDED / 2) {
              milestone = true; game.audio.play('se_milestone', 0.6);
              game.fx.popup(bloomed + ' / ' + NEEDED, W / 2, H * 0.27, { color: C.yel, size: 70 });
            }
          } else {
            game.fx.burst(p.x, p.y - 100, { color: C.pink, count: 12 });
          }
        }
      } else if (p.st === 'bloom' || p.st === 'rot') {
        p.t -= dt;
        if (p.t <= 0) { p.st = 'empty'; p.w = 0; p.gold = false; }
      }
    }
  }

  function txt(str, x, y, sz, color) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: 'center', font: 'monospace' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center', font: 'monospace' });
  }

  function drawHouse(t) {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.5, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    // ガラス温室のタイル格子(8x8 反復)
    for (var gx = 0; gx < W; gx += 120) game.draw.rect(gx, H * 0.14, 6, H * 0.6, C.glass, 0.25);
    for (var gy = H * 0.14; gy < H * 0.74; gy += 120) game.draw.rect(0, gy, W, 6, C.glass, 0.25);
    // 隣の温室の園丁(演出のみ)と奥の鉢花
    for (var f = 0; f < 5; f++) {
      var sway = Math.sin(t * 2 + f) * 4;
      game.draw.sprite(FLOWER, { '#': f % 2 ? C.pink : C.yel, 'o': C.ink, '|': C.leaf }, W * (0.1 + f * 0.2) + sway, H * 0.22 + Math.cos(t * 1.4 + f) * 4, 6, { anchor: 'center', alpha: 0.35 });
    }
    game.draw.sprite(GARDENER, { '#': C.cream, 'o': C.ink }, W * 0.9 + Math.sin(t * 0.8) * 40, H * 0.3 + Math.sin(t * 3) * 5, 8, { anchor: 'center', alpha: 0.4 });
    // 床(親指ゾーン)
    game.draw.rect(0, H * 0.74, W, H * 0.26, '#203818', 1);
    for (var tx = 0; tx < W; tx += 96) game.draw.rect(tx + ((Math.floor(tx / 96) % 2) * 48), H * 0.76, 48, 48, '#2c4a20', 1);
    game.draw.rect(0, 0, W, H, C.yel, 0.025 + 0.025 * Math.sin(t * 1.5));
  }

  function drawPlot(p, t) {
    var bob = Math.sin(t * 2 + p.x * 0.01) * 4;
    game.draw.rect(p.x - 140, p.y + 10, 280, 90, C.soil, 1);
    game.draw.rect(p.x - 140, p.y + 10, 280, 12, C.soil2, 1);
    if (hiPlot === p) game.draw.rect(p.x - 150, p.y - 200, 300, 310, '#ffffff', 0.3 + 0.2 * Math.sin(t * 20));
    if (p.st === 'empty') {
      game.draw.rect(p.x - 40, p.y + 30, 80, 10, C.ink, 0.35 + 0.15 * Math.sin(t * 3 + p.y));
      return;
    }
    if (p.st === 'rot') {
      game.draw.sprite(SPROUT2, { '#': C.rot }, p.x, p.y - 20, 12, { anchor: 'center', alpha: Math.max(0.2, p.t) });
      return;
    }
    if (p.st === 'bloom') {
      var s = 12 + (0.9 - p.t) * 8;
      game.draw.sprite(FLOWER, { '#': p.gold ? C.yel : C.pink, 'o': C.ink, '|': C.leaf }, p.x, p.y - 60, s, { anchor: 'center' });
      return;
    }
    // 芽 + 目盛り管
    var wilt = p.st === 'seed' && p.dry > DRY_LIMIT - 1 ? (Math.floor(t * 8) % 2 === 0) : false;
    var fr = Math.floor(t * 3 + p.x) % 2 === 0 ? SPROUT : SPROUT2;
    if (p.w === 0) game.draw.sprite(SEED, { '#': C.cream }, p.x, p.y + 4 + bob * 0.3, 10, { anchor: 'center' });
    else game.draw.sprite(fr, { '#': wilt ? C.rot : (p.gold ? C.yel : C.leaf) }, p.x, p.y - 40 + bob, 10 + p.w * 1.5, { anchor: 'center' });
    var tx0 = p.x + 105, ty0 = p.y - 150, th = 150, tw = 30;
    game.draw.rect(tx0 - 4, ty0 - 4, tw + 8, th + 8, C.ink, 1);
    game.draw.rect(tx0, ty0, tw, th, C.cream, 1);
    var unit = th / (p.need + 1);
    var fillH = Math.min(th, unit * p.w);
    game.draw.rect(tx0, ty0 + th - fillH, tw, fillH, C.water, 1);
    for (var k = 1; k <= p.need; k++) game.draw.rect(tx0, ty0 + th - unit * k, tw, 3, C.ink, 0.6);
    var lineY = ty0 + th - unit * p.need;
    game.draw.rect(tx0 - 14, lineY - 3, tw + 28, 7, p.gold ? C.yel : C.pink, 1);
    if (p.st === 'soak') game.draw.circle(p.x, p.y + 40, 60 * (p.t / SOAK), C.water, 0.4);
    if (wilt) game.draw.circle(p.x, p.y - 120, 14, C.bad, 1);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (ready > 0 || ended) return;
    var p = plotAt(x, y);
    if (p) touchPlot(p, false, 0);
    else { game.audio.play('se_tap', 0.08); game.fx.burst(x, y, { color: C.water, count: 3, speed: 80 }); }
  });

  // ── ATTRACT ゴースト実演(4.2秒周期: 3滴ぴったりで開花 → 2滴の芽に3滴目を落として根腐れ) ──
  var DEMO_EV = [[0.15, 0, 3], [0.45, 0, 0], [0.75, 0, 0], [1.05, 0, 0], [2.0, 1, 2], [2.3, 1, 0], [2.6, 1, 0], [2.85, 1, 0]];
  var demo = { t: 0, gx: W / 2, gy: H / 2, press: false, idx: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) { initGame(); demo.idx = 0; }
    while (demo.idx < DEMO_EV.length && cyc >= DEMO_EV[demo.idx][0]) {
      var ev = DEMO_EV[demo.idx];
      touchPlot(plots[ev[1]], true, ev[2]);
      demo.idx++;
    }
    var nxt = DEMO_EV[Math.min(demo.idx, DEMO_EV.length - 1)];
    var tp = plots[nxt[1]];
    demo.gx += (tp.x - demo.gx) * Math.min(1, dt * 10);
    demo.gy += (tp.y - demo.gy) * Math.min(1, dt * 10);
    var lastT = demo.idx > 0 ? DEMO_EV[demo.idx - 1][0] : -1;
    demo.press = cyc - lastT < 0.12;
    tickPlots(dt, true);
  }

  function drawCan(t) {
    game.draw.sprite(CAN, { '#': C.water }, canX + Math.sin(t * 4) * 3, canY + Math.cos(t * 3) * 3, 9, { anchor: 'center' });
  }

  function drawHud(t) {
    txt(bloomed + ' / ' + NEEDED, W / 2, H * 0.05, 62, C.cream);
    txt('SCORE ' + score, W * 0.2, H * 0.05, 30, C.cream);
    game.draw.rect(60, 160, W - 120, 22, C.ink, 1);
    var low = timeLeft < 4 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(60, 160, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 22, low ? C.bad : C.yel);
    for (var i = 0; i < NEEDED; i++) game.draw.sprite(FLOWER, { '#': i < bloomed ? C.pink : '#40503a', 'o': C.ink, '|': C.leaf }, W * 0.12 + i * 115, H * 0.87, 6, { anchor: 'center' });
  }

  function finish(success) {
    ended = true; ok = success; hitStop = 0.45; endWait = 1.1;
    if (!success) for (var i = 0; i < plots.length; i++) if (plots[i].st === 'seed' || plots[i].st === 'soak') { hiPlot = plots[i]; break; }
    game.fx.flash('#ffffff', 0.2);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (plots === undefined) initGame();
      stepDemo(dt);
      drawHouse(t);
      for (var a = 0; a < plots.length; a++) drawPlot(plots[a], t);
      drawCan(t);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.07 + Math.sin(t * 2) * 6, 84, C.yel);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.12, 36, C.cream);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 48, C.yel);
      else txt('INSERT COIN', W / 2, H * 0.94, 42, C.cream);
      return;
    }
    if (state === S.RESULT) { drawHouse(t); drawResult(t); return; }

    if (ended) {
      if (hitStop > 0) {
        hitStop -= dt;
        if (hitStop <= 0) {
          if (ok) { game.audio.play('se_success', 0.7); game.fx.burst(W / 2, H * 0.5, { color: C.pink, count: 40, speed: 600 }); }
          else { game.feedback.bad(hiPlot ? hiPlot.x : W / 2, hiPlot ? hiPlot.y : H * 0.5, { text: 'TIME UP' }); game.audio.play('se_failure', 0.6); }
        }
      } else {
        endWait -= dt;
        if (endWait <= 0) {
          state = S.RESULT;
          var stats = { bloomed: bloomed, rotted: rotted, dried: dried, needed: NEEDED };
          drawHouse(t); drawResult(t);
          if (ok) game.end.success(score, stats); else game.end.failure(stats);
          return;
        }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.5);
    } else {
      timeLeft -= dt;
      tickPlots(dt, false);
      if (bloomed >= NEEDED) finish(true);
      else if (timeLeft <= 0) { timeLeft = 0; finish(false); }
    }

    drawHouse(t);
    for (var i = 0; i < plots.length; i++) drawPlot(plots[i], t);
    drawCan(t);
    drawHud(t);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.52, 110, C.yel);
  });

  function drawResult(t) {
    game.draw.rect(60, H * 0.3, W - 120, H * 0.4, C.ink, 0.85);
    if (ok) {
      txt('CLEAR', W / 2, H * 0.37, 130, C.leaf);
      for (var f = 0; f < 3; f++) game.draw.sprite(FLOWER, { '#': f === 1 ? C.yel : C.pink, 'o': C.ink, '|': C.leaf }, W * (0.35 + f * 0.15), H * 0.46 + Math.sin(t * 3 + f) * 10, 10, { anchor: 'center' });
    } else {
      txt('GAME OVER', W / 2, H * 0.37, 104, C.bad);
      txt('あと' + Math.max(0, NEEDED - bloomed) + '輪!', W / 2, H * 0.46, 64, C.yel);
    }
    txt(bloomed + ' / ' + NEEDED, W / 2, H * 0.53, 58, C.cream);
    txt('SCORE ' + score, W / 2, H * 0.59, 46, C.cream);
    var isNew = ok && score > (game.best || 0);
    txt(isNew ? 'NEW RECORD' : 'BEST ' + (game.best || 0), W / 2, H * 0.65, 44, isNew ? C.yel : C.cream);
    if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.93, 44, C.cream);
  }

  game.onStart(function() {
    game.audio.melody([
      ['E5', 0.5], ['G5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 1], ['C5', 1],
      ['D5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 2]
    ], { tempo: 140, wave: 'square', volume: 0.045, loop: true, bass: [['C3', 2], ['A2', 2], ['F2', 2], ['G2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
