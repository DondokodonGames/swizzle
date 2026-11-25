// J-3DSDSDSTOP10-0005-shadow-screen-snap.js
// 影絵障子の早押し — 灯りが揺れた障子窓に影絵が一瞬だけ顔を出す、その瞬間を叩く
// 操作: 影絵が出ている窓をタップ。灯りが揺れている間(出る前)に押すとお手つき。手のひらの影は押してはいけない
// 終わり: 12回の出番のうち8回当てればCLEAR。届かなければGAME OVER
// @mechanic: reaction_duel
// @theme: shadow_puppet_screen
// 世界観: 夏祭りの影絵小屋で、裏方の人形遣いが障子窓に一瞬だけ出す影を客席の子どもが叩いて当てる「影当て」屋台に、名人の座をかけて挑む
// 残るもの: 正誤(CLEAR/GAME OVER) + 当てた数・最速反応ms・お手つき数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 白黒2値、ディザで階調、線の太さで語る(差し色は朱の判子1色のみ)
  var STYLE = { bg: ['#f2f0e8', '#dedbd0', '#111111'], main: ['#111111', '#f2f0e8', '#777777'], accent: ['#d8341e', '#111111'] };
  var C = { paper: '#f2f0e8', ink: '#111111', gray: '#8a8a84', seal: '#d8341e', lit: '#fffbe8' };

  var GAME_TITLE = 'SHADOW SNAP';
  var TIME_LIMIT = 15;
  var NEEDED = 8;
  var POPS = 12;

  var WX = [W * 0.2, W * 0.5, W * 0.8];
  var WY = [H * 0.36, H * 0.56];
  var WW = 250, WH = 300;

  var PUPPETS = [
    ['.#....#.', '.##..##.', '.######.', '########', '#.####.#', '.######.', '..####..', '...##...'],
    ['...##...', '..####..', '.##..##.', '##....##', '.##..##.', '..####..', '.#.##.#.', '#..##..#'],
    ['..#..#..', '..#..#..', '.######.', '.#.##.#.', '.######.', '..####..', '.######.', '##.##.##']
  ];
  var PALM = ['.#.#.#..', '.#.#.#..', '.#.#.#.#', '.######.', '.######.', '.#####..', '..####..', '..####..'];
  var CHILD = ['..####..', '.######.', '.#.##.#.', '.######.', '..####..', '.######.', '#.####.#', '..#..#..'];
  var CHILD2 = ['..####..', '.######.', '.#.##.#.', '.######.', '..####..', '########', '..####..', '..#..#..'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var pop, popN, hits, falses, bestMs, lastMs, timeLeft, ready, ended, ok, hitStop, endWait, score, milestone, streak, hiWin;

  function newPop(demoMode, forced) {
    var decoy = !demoMode && popN >= 2 && Math.random() < 0.2;
    var win = Math.floor(game.random(0, 6));
    if (forced) { win = forced.win; decoy = forced.decoy; }
    var up = Math.max(0.42, 0.62 - popN * 0.015);
    return { win: win, phase: 'wait', t: forced ? forced.wait : game.random(0.45, 0.95), flick: 0.4, up: up, age: 0, kind: Math.floor(game.random(0, 3)), decoy: decoy, done: false };
  }

  function initGame() {
    popN = 0; hits = 0; falses = 0; bestMs = 0; lastMs = 0; timeLeft = TIME_LIMIT; ready = 0.8;
    ended = false; ok = false; hitStop = 0; endWait = 0; score = 0; milestone = false; streak = 0; hiWin = -1;
    pop = newPop(false);
  }

  function winCenter(i) { return { x: WX[i % 3], y: WY[Math.floor(i / 3)] }; }
  function winAt(x, y) {
    for (var i = 0; i < 6; i++) {
      var c = winCenter(i);
      if (Math.abs(x - c.x) < WW / 2 + 10 && Math.abs(y - c.y) < WH / 2 + 10) return i;
    }
    return -1;
  }

  // 実ロジック: 窓 i を叩く(デモも同じ関数)
  function strike(i, demoMode) {
    var c = i >= 0 ? winCenter(i) : { x: W / 2, y: H * 0.46 };
    if (pop && pop.phase === 'up' && !pop.done && i === pop.win) {
      pop.done = true; pop.phase = 'hit'; pop.t = 0.35;
      if (pop.decoy) {
        streak = 0;
        if (!demoMode) { falses++; game.feedback.bad(c.x, c.y, { text: 'MISS', flashColor: C.seal }); }
        else game.fx.burst(c.x, c.y, { color: C.seal, count: 8 });
        return;
      }
      var ms = Math.round(pop.age * 1000);
      if (!demoMode) {
        hits++; streak++; lastMs = ms; bestMs = bestMs ? Math.min(bestMs, ms) : ms;
        score += Math.max(50, 600 - ms) + streak * 20;
        game.feedback.good(c.x, c.y, { text: ms < 280 ? 'PERFECT' : 'GOOD', color: C.ink });
        if (!milestone && hits >= NEEDED / 2) {
          milestone = true; game.audio.play('se_milestone', 0.6);
          game.fx.popup(hits + ' / ' + NEEDED, W / 2, H * 0.24, { color: C.seal, size: 70 });
        }
      } else {
        lastMs = ms;
        game.fx.burst(c.x, c.y, { color: C.ink, count: 12 });
      }
      return;
    }
    // お手つき(出る前・違う窓・空振り)
    streak = 0;
    if (!demoMode) { falses++; game.feedback.bad(c.x, c.y, { text: 'MISS', flashColor: C.seal }); }
    else game.fx.burst(c.x, c.y, { color: C.seal, count: 8 });
  }

  function stepPop(dt, demoMode) {
    if (!pop) return;
    pop.t -= dt;
    if (pop.phase === 'wait') {
      if (pop.t <= pop.flick && !pop.flicked) { pop.flicked = true; if (!demoMode) game.audio.tone('E5', 0.06, { wave: 'triangle', volume: 0.05 }); }
      if (pop.t <= 0) { pop.phase = 'up'; pop.t = pop.up; pop.age = 0; if (!demoMode) game.audio.play('se_jump', 0.25); }
    } else if (pop.phase === 'up') {
      pop.age += dt;
      if (pop.t <= 0) {
        if (!pop.decoy && !demoMode) { streak = 0; var c = winCenter(pop.win); game.feedback.bad(c.x, c.y, { text: 'MISS', shake: 4, flashColor: C.seal }); }
        pop.phase = 'down'; pop.t = 0.2;
      }
    } else if (pop.t <= 0) {
      if (!demoMode) {
        popN++;
        if (popN >= POPS) { pop = null; return; }
      }
      pop = demoMode ? null : newPop(false);
    }
  }

  function txt(str, x, y, sz, color) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center', font: 'serif' });
  }

  function dither(x, y, w, h, step, color, t) {
    for (var yy = 0; yy < h; yy += step) {
      var off = (Math.floor(yy / step) % 2) * step;
      for (var xx = off; xx < w; xx += step * 2) game.draw.rect(x + xx, y + yy, step * 0.5, step * 0.5, color, 1);
    }
  }

  function drawBooth(t) {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.7, STYLE.bg[1]], [1, STYLE.bg[0]]]);
    game.draw.rect(0, 0, W, H, C.ink, 0.02 + 0.02 * Math.sin(t * 1.4));
    // 小屋の梁(太い墨線)
    game.draw.rect(0, H * 0.21, W, 18, C.ink, 1);
    game.draw.rect(0, H * 0.7, W, 18, C.ink, 1);
    game.draw.rect(20, H * 0.21, 14, H * 0.5, C.ink, 1);
    game.draw.rect(W - 34, H * 0.21, 14, H * 0.5, C.ink, 1);
    // 暖簾の揺れ
    for (var n = 0; n < 6; n++) {
      var sw = Math.sin(t * 1.8 + n) * 8;
      game.draw.rect(n * 180 + 10 + sw, H * 0.19, 160, 24, n % 2 ? C.ink : C.gray, 1);
    }
    // 客席(親指ゾーン): ディザの床と子どもたちの影
    dither(0, H * 0.73, W, H * 0.27, 20, C.gray, t);
    for (var k = 0; k < 4; k++) {
      var fr = Math.floor(t * 2 + k) % 2 === 0 ? CHILD : CHILD2;
      game.draw.sprite(fr, { '#': C.ink }, W * (0.14 + k * 0.24), H * 0.82 + Math.sin(t * 3 + k * 1.3) * 8, 11, { anchor: 'center' });
    }
  }

  function drawWindows(t) {
    for (var i = 0; i < 6; i++) {
      var c = winCenter(i);
      var x0 = c.x - WW / 2, y0 = c.y - WH / 2;
      var active = pop && pop.win === i;
      var flick = active && pop.phase === 'wait' && pop.t <= pop.flick;
      var lit = active && (pop.phase === 'up' || pop.phase === 'hit' || flick);
      game.draw.rect(x0 - 12, y0 - 12, WW + 24, WH + 24, C.ink, 1);
      game.draw.rect(x0, y0, WW, WH, lit ? C.lit : C.paper, 1);
      if (!lit) dither(x0, y0, WW, WH, 24, '#cfcbbf', t);
      if (flick) game.draw.rect(x0, y0, WW, WH, '#ffe8a0', 0.35 + 0.35 * Math.sin(t * 50));
      // 格子
      game.draw.rect(c.x - 4, y0, 8, WH, C.ink, 1);
      game.draw.rect(x0, c.y - 4, WW, 8, C.ink, 1);
      if (active && (pop.phase === 'up' || pop.phase === 'hit')) {
        var rise = pop.phase === 'up' ? Math.min(1, pop.age / 0.08) : 1;
        var art = pop.decoy ? PALM : PUPPETS[pop.kind];
        var sc = (ended && hiWin === i) ? 30 : 24;
        game.draw.sprite(art, { '#': C.ink }, c.x + Math.sin(t * 14) * 3, c.y + (1 - rise) * 120, sc, { anchor: 'center' });
        if (pop.phase === 'hit') game.draw.circle(c.x + 80, c.y - 100, 36, C.seal, 0.9);
      }
      if (hiWin === i && ended) game.draw.rect(x0, y0, WW, WH, '#ffffff', 0.35 + 0.2 * Math.sin(t * 20));
    }
    // 裏の人形遣いの影(演出のみ)
    game.draw.circle(W * 0.5 + Math.sin(t * 0.9) * 300, H * 0.46, 150, C.ink, 0.05);
  }

  function drawHud(t) {
    txt(hits + ' / ' + NEEDED, W / 2, H * 0.05, 64, C.ink);
    txt('SCORE ' + score, W * 0.2, H * 0.05, 30, C.ink);
    if (lastMs) txt(lastMs + 'ms', W * 0.82, H * 0.05, 36, C.seal);
    for (var p = 0; p < POPS; p++) game.draw.circle(W * 0.16 + p * 68, H * 0.1, 16, p < popN ? C.ink : C.gray, p < popN ? 1 : 0.4);
    game.draw.rect(60, H * 0.13, W - 120, 16, C.gray, 0.5);
    game.draw.rect(60, H * 0.13, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 16, timeLeft < 3 && Math.floor(t * 6) % 2 === 0 ? C.seal : C.ink);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (ready > 0 || ended) { game.audio.play('se_tap', 0.05); return; }
    game.audio.play('se_tap', 0.2);
    strike(winAt(x, y), false);
  });

  // ── ATTRACT ゴースト実演(3.2秒周期: 灯りの揺れ→影が出た瞬間に当てる / 手のひらの影は見送る / 出る前に押してお手つき) ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.8, press: 0, stage: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { pop = newPop(true, { win: 1, decoy: false, wait: 0.5 }); demo.stage = 0; }
    if (demo.stage === 0 && pop && pop.phase === 'up' && pop.age > 0.22) { strike(1, true); demo.press = 0.15; demo.stage = 1; }
    if (demo.stage === 1 && cyc > 1.2) { pop = newPop(true, { win: 3, decoy: true, wait: 0.35 }); demo.stage = 2; }
    if (demo.stage === 2 && cyc > 2.2) { pop = newPop(true, { win: 5, decoy: false, wait: 0.6 }); demo.stage = 3; }
    if (demo.stage === 3 && cyc > 2.45) { strike(5, true); demo.press = 0.15; demo.stage = 4; }
    var target = demo.stage <= 1 ? winCenter(1) : (demo.stage === 2 ? { x: W * 0.35, y: H * 0.66 } : winCenter(5));
    demo.gx += (target.x - demo.gx) * Math.min(1, dt * 8);
    demo.gy += (target.y + 40 - demo.gy) * Math.min(1, dt * 8);
    if (demo.press > 0) demo.press -= dt;
    stepPop(dt, true);
  }

  function finish(success) {
    ended = true; ok = success; hitStop = 0.45; endWait = 1.1;
    hiWin = pop ? pop.win : -1;
    game.fx.flash('#ffffff', 0.2);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (popN === undefined) initGame();
      stepDemo(dt);
      drawBooth(t); drawWindows(t);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08 + Math.sin(t * 2) * 6, 92, C.ink);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.14, 38, C.seal);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 48, C.seal);
      else txt('INSERT COIN', W / 2, H * 0.95, 42, C.ink);
      return;
    }
    if (state === S.RESULT) { drawBooth(t); drawWindows(t); drawResult(t); return; }

    if (ended) {
      if (hitStop > 0) {
        hitStop -= dt;
        if (hitStop <= 0) {
          if (ok) { game.audio.play('se_success', 0.7); game.fx.burst(W / 2, H * 0.45, { color: C.seal, count: 40, speed: 600 }); }
          else { game.feedback.bad(W / 2, H * 0.45, { text: popN >= POPS ? 'FINISH' : 'TIME UP', flashColor: C.seal }); game.audio.play('se_failure', 0.6); }
        }
      } else {
        endWait -= dt;
        if (endWait <= 0) {
          state = S.RESULT;
          var stats = { hits: hits, bestMs: bestMs, falseStarts: falses, pops: POPS };
          drawBooth(t); drawWindows(t); drawResult(t);
          if (ok) game.end.success(score, stats); else game.end.failure(stats);
          return;
        }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.5);
    } else {
      timeLeft -= dt;
      stepPop(dt, false);
      if (hits >= NEEDED && !pop) finish(true);
      else if (!pop) finish(hits >= NEEDED);
      else if (timeLeft <= 0) { timeLeft = 0; finish(hits >= NEEDED); }
    }

    drawBooth(t); drawWindows(t); drawHud(t);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 120, C.seal);
  });

  function drawResult(t) {
    game.draw.rect(60, H * 0.28, W - 120, H * 0.42, C.paper, 0.95);
    game.draw.rect(60, H * 0.28, W - 120, 10, C.ink, 1);
    game.draw.rect(60, H * 0.7 - 10, W - 120, 10, C.ink, 1);
    if (ok) {
      txt('CLEAR', W / 2, H * 0.35, 130, C.ink);
      game.draw.circle(W / 2, H * 0.44, 50 + Math.sin(t * 4) * 5, C.seal, 1);
    } else {
      txt('GAME OVER', W / 2, H * 0.35, 104, C.seal);
      txt('あと' + Math.max(0, NEEDED - hits) + '回!', W / 2, H * 0.44, 64, C.ink);
    }
    txt(hits + ' / ' + NEEDED, W / 2, H * 0.51, 58, C.ink);
    txt((bestMs || 0) + 'ms', W / 2, H * 0.56, 44, C.seal);
    txt('SCORE ' + score, W / 2, H * 0.61, 44, C.ink);
    var isNew = ok && score > (game.best || 0);
    txt(isNew ? 'NEW RECORD' : 'BEST ' + (game.best || 0), W / 2, H * 0.66, 42, isNew ? C.seal : C.ink);
    if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 44, C.ink);
  }

  game.onStart(function() {
    game.audio.melody([
      ['D5', 1], ['E5', 0.5], ['G5', 0.5], ['A5', 1], ['G5', 1],
      ['E5', 0.5], ['D5', 0.5], ['E5', 1], ['B4', 1], ['D5', 2]
    ], { tempo: 120, wave: 'triangle', volume: 0.06, loop: true, bass: [['D3', 2], ['A2', 2], ['E3', 2], ['D3', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
