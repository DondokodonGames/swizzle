// J-3DSDSDSTOP10-0001-lighthouse-lens-swipe.js
// 灯台レンズの一拭き — 潮しぶきの筋が付くレンズを、素早い一拭きで横切って消していく
// 操作: 汚れの筋を横切るように素早く指を払う。ゆっくり動かしても落ちない。1回で2本以上横切るとボーナス
// 終わり: 12秒で14本拭き取ればCLEAR。届かなければGAME OVER
// @mechanic: slice
// @theme: lighthouse_lens_wipe
// 世界観: 嵐の近づく岬の灯台守が、日没の点灯までに潮しぶきで白く曇っていく大レンズを布の一拭きで次々と澄ませ、沖の漁船に光を届ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 拭き取った本数・一拭き最大本数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 多色・高彩度、2〜3層の背景で奥行き、表情のあるスプライト
  var STYLE = { bg: ['#ff9e5e', '#b0487a', '#2a2a6a'], main: ['#ffe9a8', '#8fd0ff', '#3a6ea8'], accent: ['#ffd23f', '#ff4f6d'] };
  var C = { sea: '#1f3f7a', sea2: '#2d5a9a', glass: '#bfe8ff', ring: '#8fc4e8', brass: '#d9a441', brassD: '#8a6424', salt: '#f4f1e6', grime: '#b8b39a', good: '#7dff9a', bad: '#ff4f6d', gold: '#ffd23f', ink: '#1b1b3a', white: '#ffffff' };

  var GAME_TITLE = 'LENS SWIPE';
  var TIME_LIMIT = 12;
  var NEEDED = 14;
  var SPEED_MIN = 1300; // px/s 以上の一拭きだけが落とす
  var LX = W / 2, LY = H * 0.45, LR = 380;

  var KEEPER = [
    '...####...', '..######..', '..#o##o#..', '..######..', '...#rr#...',
    '.########.', '##.####.##', '#..####..#', '...#..#...', '..##..##..'
  ];
  var KEEPER2 = [
    '...####...', '..######..', '..#o##o#..', '..######..', '...#rr#...',
    '.########.', '.#.####.##', '.#.####..#', '...#..#...', '..##..##..'
  ];
  var GULL = ['#.....#', '.#...#.', '..###..'];
  var BOAT = ['...#...', '...##..', '...###.', '#######', '.#####.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var streaks, wiped, bestMulti, timeLeft, ready, ended, ok, hitStop, endWait, spawnT, score, milestone;
  var stroke, trail, waveT, lastHit;

  function initGame() {
    streaks = []; wiped = 0; bestMulti = 0; timeLeft = TIME_LIMIT; ready = 0.8;
    ended = false; ok = false; hitStop = 0; endWait = 0; spawnT = 0; score = 0; milestone = false;
    stroke = null; trail = []; waveT = 0; lastHit = null;
    for (var i = 0; i < 4; i++) spawnStreak(true);
  }

  function spawnStreak(instant) {
    var a = game.random(0, Math.PI * 2), d = game.random(0, LR - 150);
    var gold = !instant && Math.random() < 0.12;
    streaks.push({
      x: LX + Math.cos(a) * d, y: LY + Math.sin(a) * d,
      ang: game.random(-1.2, 1.2) + (Math.random() < 0.5 ? 0 : Math.PI / 2),
      len: game.random(180, 280), appear: instant ? 0 : 0.6, gold: gold, gone: 0, seed: game.random(0, 9)
    });
  }

  function ends(s) {
    var dx = Math.cos(s.ang) * s.len / 2, dy = Math.sin(s.ang) * s.len / 2;
    return [s.x - dx, s.y - dy, s.x + dx, s.y + dy];
  }

  function segCross(ax, ay, bx, by, cx, cy, dx, dy) {
    var d1 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    var d2 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
    var d3 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
    var d4 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
    return (d1 * d2 < 0) && (d3 * d4 < 0);
  }

  // 実ロジック: 1フレーム分の布の軌跡。速ければ横切った筋を消す(デモも同じ)
  function wipeSegment(x0, y0, x1, y1, dt, demoMode) {
    var dist = Math.hypot(x1 - x0, y1 - y0);
    if (dist < 1) return;
    var speed = dist / Math.max(dt, 0.001);
    trail.push({ x: x1, y: y1, life: 0.35, fast: speed >= SPEED_MIN });
    if (speed < SPEED_MIN) return;
    for (var i = 0; i < streaks.length; i++) {
      var s = streaks[i];
      if (s.gone > 0 || s.appear > 0) continue;
      var e = ends(s);
      if (segCross(x0, y0, x1, y1, e[0], e[1], e[2], e[3])) {
        s.gone = 0.3;
        stroke.hits++;
        var pts = s.gold ? 3 : 1;
        if (!demoMode) {
          wiped += pts; score += pts * 100 * stroke.hits;
          game.feedback.good(s.x, s.y, { text: s.gold ? 'BONUS' : (stroke.hits >= 2 ? 'x' + stroke.hits : 'GOOD'), color: s.gold ? C.gold : C.good });
          if (stroke.hits === 2) game.audio.play('se_powerup', 0.4);
          if (!milestone && wiped >= NEEDED / 2) {
            milestone = true;
            game.audio.play('se_milestone', 0.6);
            game.fx.popup(wiped + ' / ' + NEEDED, W / 2, H * 0.2, { color: C.gold, size: 70 });
          }
          lastHit = s;
        } else {
          game.fx.burst(s.x, s.y, { color: C.salt, count: 10 });
        }
        bestMulti = Math.max(bestMulti, stroke.hits);
      }
    }
  }

  function startStroke(x, y) { stroke = { x: x, y: y, px: x, py: y, hits: 0, slowCross: false }; }
  function endStroke(demoMode) {
    if (!stroke) return;
    if (stroke.hits === 0 && !demoMode) {
      // 何も落とせなかった一拭き(遅い/外れ)
      var near = null;
      for (var i = 0; i < streaks.length; i++) if (streaks[i].gone <= 0 && Math.hypot(streaks[i].x - stroke.x, streaks[i].y - stroke.y) < 160) near = streaks[i];
      if (near) game.feedback.bad(stroke.x, stroke.y, { text: 'MISS', shake: 3 });
      else game.audio.play('se_tap', 0.2);
    }
    stroke = null;
  }

  function txt(str, x, y, sz, color) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function drawWorld(t) {
    // 3層: 夕空 / 沖の海と船 / 灯室の枠
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.35, STYLE.bg[1]], [0.7, STYLE.bg[2]], [1, '#141433']]);
    game.draw.circle(W * 0.18, H * 0.2, 90, '#ffd98a', 0.6 + 0.1 * Math.sin(t));
    game.draw.gradient(H * 0.62, H * 0.74, [[0, C.sea2], [1, C.sea]]);
    for (var w = 0; w < 6; w++) game.draw.rect(((t * 40 + w * 190) % (W + 200)) - 100, H * 0.64 + w * 18, 120, 4, '#8fd0ff', 0.5);
    game.draw.sprite(BOAT, { '#': '#ffe9a8' }, W * 0.82 + Math.sin(t * 0.7) * 30, H * 0.63 + Math.sin(t * 2) * 4, 7, { anchor: 'center' });
    for (var g = 0; g < 2; g++) game.draw.sprite(GULL, { '#': C.white }, ((t * 70 + g * 500) % (W + 100)) - 50, H * 0.12 + g * 60 + Math.sin(t * 3 + g) * 12, 7, { anchor: 'center' });
    // 灯室の窓枠
    game.draw.rect(0, H * 0.74, W, H * 0.26, '#3a2a4a', 1);
    game.draw.rect(0, H * 0.74, W, 12, C.brass, 1);
    for (var p = 0; p < 5; p++) game.draw.rect(p * (W / 4) - 8, H * 0.24, 16, H * 0.5, C.brassD, 0.8);
    game.draw.rect(0, 0, W, H, '#ffd23f', 0.03 + 0.03 * Math.sin(t * 1.6));
  }

  function drawLens(t) {
    var dirty = 0;
    for (var k = 0; k < streaks.length; k++) if (streaks[k].gone <= 0 && streaks[k].appear <= 0) dirty++;
    var glow = Math.max(0.15, 0.75 - dirty * 0.08);
    game.draw.circle(LX, LY, LR + 30, C.brass, 1);
    game.draw.circle(LX, LY, LR + 12, C.brassD, 1);
    game.draw.circle(LX, LY, LR, C.glass, 1);
    for (var r = 1; r <= 5; r++) game.draw.circle(LX, LY, LR - r * 62, r % 2 ? C.ring : C.glass, 0.6);
    game.draw.circle(LX, LY, 90, '#fff6c0', glow);
    game.draw.circle(LX, LY, 170 + Math.sin(t * 3) * 10, '#fff6c0', glow * 0.35);
    game.draw.circle(LX - 160, LY - 170, 40, C.white, 0.5);
  }

  function drawStreaks(t) {
    for (var i = 0; i < streaks.length; i++) {
      var s = streaks[i];
      var e = ends(s);
      if (s.appear > 0) {
        // 予告: 点線の輪郭が浮かぶ
        var blink = Math.floor(t * 10) % 2 === 0 ? 0.5 : 0.2;
        for (var d = 0; d <= 6; d++) {
          var f = d / 6;
          game.draw.circle(e[0] + (e[2] - e[0]) * f, e[1] + (e[3] - e[1]) * f, 10, s.gold ? C.gold : C.salt, blink);
        }
        continue;
      }
      var a = s.gone > 0 ? s.gone / 0.3 : 1;
      var wob = Math.sin(t * 2 + s.seed) * 3;
      game.draw.line(e[0], e[1] + wob, e[2], e[3] + wob, s.gold ? C.gold : C.grime, 46 * a + 1);
      game.draw.line(e[0], e[1] + wob, e[2], e[3] + wob, s.gold ? '#fff2a0' : C.salt, 26 * a + 1);
      for (var sp = 0; sp < 4; sp++) {
        var ff = (sp + 0.5) / 4;
        game.draw.circle(e[0] + (e[2] - e[0]) * ff + 16, e[1] + (e[3] - e[1]) * ff - 14 + wob, 9 * a, C.white, 0.8 * a);
      }
      if (lastHit === s && ended && hitStop > 0) game.draw.circle(s.x, s.y, 120, C.white, 0.4);
    }
  }

  function drawTrail() {
    for (var i = 1; i < trail.length; i++) {
      var p = trail[i - 1], q = trail[i];
      game.draw.line(p.x, p.y, q.x, q.y, q.fast ? C.white : '#8a8aa0', 30 * Math.min(p.life, q.life) / 0.35 + 2);
    }
  }

  function tick(dt, demoMode) {
    for (var i = streaks.length - 1; i >= 0; i--) {
      var s = streaks[i];
      if (s.appear > 0) s.appear -= dt;
      if (s.gone > 0) { s.gone -= dt; if (s.gone <= 0) streaks.splice(i, 1); }
    }
    for (var k = trail.length - 1; k >= 0; k--) { trail[k].life -= dt; if (trail[k].life <= 0) trail.splice(k, 1); }
    if (waveT > 0) waveT -= dt;
    spawnT -= dt;
    var want = demoMode ? 3 : 4 + Math.floor((TIME_LIMIT - timeLeft) / 4);
    var live = 0;
    for (var j = 0; j < streaks.length; j++) if (streaks[j].gone <= 0) live++;
    if (live < want && spawnT <= 0) {
      spawnStreak(false);
      spawnT = demoMode ? 0.5 : 0.35;
      waveT = 0.5;
      if (!demoMode) game.audio.tone('C3', 0.15, { wave: 'sawtooth', volume: 0.04 });
    }
  }

  // ── 入力(追従は onMove で位置だけ記録し、速度判定は onUpdate で1回だけ行う) ──
  var finger = { down: false, x: 0, y: 0, px: 0, py: 0 };
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || ended) return;
    finger.down = true; finger.x = finger.px = x; finger.y = finger.py = y;
    startStroke(x, y);
    game.audio.play('se_tap', 0.15);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !finger.down) return;
    finger.x = x; finger.y = y;
    if (stroke) { stroke.x = x; stroke.y = y; }
    if (Math.random() < 0.15) game.audio.tone('A6', 0.02, { wave: 'sawtooth', volume: 0.02 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !finger.down) return;
    finger.down = false;
    if (stroke) { stroke.x = x; stroke.y = y; }
    if (ended) { stroke = null; game.audio.play('se_tap', 0.1); return; }
    wipeSegment(finger.px, finger.py, x, y, game.time.delta || 0.016, false);
    endStroke(false);
  });

  // ── ATTRACT ゴースト実演(3.6秒周期: 速い一拭き×2 → ゆっくり撫でて落ちない例) ──
  var demo = { t: 0, gx: LX, gy: LY, press: false, lx: 0, ly: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { streaks = []; trail = []; for (var i = 0; i < 3; i++) spawnStreak(true); stroke = null; }
    var seg = Math.floor(cyc / 1.2), p = (cyc - seg * 1.2) / 1.2;
    var target = null;
    for (var k = 0; k < streaks.length; k++) if (streaks[k].gone <= 0 && streaks[k].appear <= 0) { target = streaks[k]; break; }
    var slow = seg === 2;
    var active = slow ? (p > 0.1 && p < 0.9) : (p > 0.3 && p < 0.45);
    if (!target) { demo.press = false; if (stroke) endStroke(true); tick(dt, true); return; }
    var nx = -Math.sin(target.ang), ny = Math.cos(target.ang);
    var reach = 170;
    var q = slow ? (p - 0.1) / 0.8 : (p - 0.3) / 0.15;
    q = Math.max(0, Math.min(1, q));
    var gx = target.x - nx * reach + nx * reach * 2 * q, gy = target.y - ny * reach + ny * reach * 2 * q;
    if (slow) { gx = target.x - nx * reach * 0.5 + nx * reach * q; gy = target.y - ny * reach * 0.5 + ny * reach * q; }
    if (active && !stroke) { startStroke(gx, gy); demo.lx = gx; demo.ly = gy; }
    if (active && stroke) {
      wipeSegment(demo.lx, demo.ly, gx, gy, dt, true);
      demo.lx = gx; demo.ly = gy;
    }
    if (!active && stroke) endStroke(true);
    demo.gx = gx; demo.gy = gy; demo.press = active;
    tick(dt, true);
  }

  function drawHud(t) {
    txt(wiped + ' / ' + NEEDED, W / 2, H * 0.05, 64, C.white);
    txt('SCORE ' + score, W * 0.2, H * 0.05, 32, C.white);
    game.draw.rect(60, 160, W - 120, 22, C.ink, 0.7);
    var low = timeLeft < 3 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(60, 160, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 22, low ? C.bad : C.gold);
  }

  function drawKeeper(t) {
    var fr = Math.floor(t * 4) % 2 === 0 ? KEEPER : KEEPER2;
    game.draw.sprite(fr, { '#': '#3a6ea8', 'o': C.ink, 'r': '#ff4f6d' }, W * 0.84, H * 0.84 + Math.sin(t * 2.5) * 6, 12, { anchor: 'center' });
  }

  function finish(success) {
    ended = true; ok = success; hitStop = 0.4; endWait = 1.1; stroke = null; finger.down = false;
    game.fx.flash('#ffffff', 0.2);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (streaks === undefined) initGame();
      stepDemo(dt);
      drawWorld(t); drawLens(t); drawStreaks(t); drawTrail(); drawKeeper(t);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08 + Math.sin(t * 2) * 6, 88, C.gold);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.135, 38, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.93, 50, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.93, 44, C.white);
      return;
    }
    if (state === S.RESULT) { drawWorld(t); drawLens(t); drawStreaks(t); drawResult(t); return; }

    if (ended) {
      if (hitStop > 0) {
        hitStop -= dt;
        if (hitStop <= 0) {
          if (ok) { game.audio.play('se_success', 0.7); game.fx.burst(LX, LY, { color: C.gold, count: 40, speed: 600 }); }
          else { game.feedback.bad(LX, LY, { text: 'TIME UP' }); game.audio.play('se_failure', 0.6); }
        }
      } else {
        endWait -= dt;
        if (endWait <= 0) {
          state = S.RESULT;
          var stats = { wiped: wiped, bestMulti: bestMulti, needed: NEEDED };
          drawWorld(t); drawLens(t); drawStreaks(t); drawResult(t);
          if (ok) game.end.success(score, stats); else game.end.failure(stats);
          return;
        }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.5);
    } else {
      timeLeft -= dt;
      if (finger.down && stroke) {
        wipeSegment(finger.px, finger.py, finger.x, finger.y, dt, false);
        finger.px = finger.x; finger.py = finger.y;
        stroke.age = (stroke.age || 0) + dt;
        if (stroke.age > 2.5) { endStroke(false); finger.down = false; }
      }
      tick(dt, false);
      if (wiped >= NEEDED) finish(true);
      else if (timeLeft <= 0) { timeLeft = 0; finish(wiped >= NEEDED); }
    }

    drawWorld(t); drawLens(t);
    if (waveT > 0) game.draw.rect(0, H * 0.7 - waveT * 200, W, 30, C.white, waveT);
    drawStreaks(t); drawTrail(); drawKeeper(t); drawHud(t);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 110, C.gold);
  });

  function drawResult(t) {
    game.draw.rect(60, H * 0.3, W - 120, H * 0.38, C.ink, 0.8);
    if (ok) {
      txt('CLEAR', W / 2, H * 0.37, 130, C.good);
      game.draw.circle(W / 2, H * 0.46, 60 + Math.sin(t * 4) * 8, '#fff6c0', 0.8);
    } else {
      txt('GAME OVER', W / 2, H * 0.37, 108, C.bad);
      txt('あと' + Math.max(0, NEEDED - wiped) + '本!', W / 2, H * 0.46, 64, C.gold);
    }
    txt(wiped + ' / ' + NEEDED, W / 2, H * 0.53, 58, C.white);
    txt('SCORE ' + score, W / 2, H * 0.59, 48, C.white);
    var isNew = ok && score > (game.best || 0);
    txt(isNew ? 'NEW RECORD' : 'BEST ' + (game.best || 0), W / 2, H * 0.645, 44, isNew ? C.gold : C.white);
    if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.93, 46, C.white);
  }

  game.onStart(function() {
    game.audio.melody([
      ['D5', 0.5], ['F5', 0.5], ['A5', 1], ['G5', 0.5], ['F5', 0.5], ['E5', 1],
      ['D5', 0.5], ['E5', 0.5], ['F5', 0.5], ['A5', 0.5], ['D6', 1], ['A5', 1]
    ], { tempo: 160, wave: 'square', volume: 0.045, loop: true, bass: [['D3', 2], ['A2', 2], ['Bb2', 2], ['A2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
