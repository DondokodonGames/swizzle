// J-N6434-0056-firefly-stone-path.js
// ほたる飛び石 — 蛍がとまった順に光る飛び石を、暗くなってから指一本でなぞってつなぐ
// 操作: 蛍が飛び石を順にともす → 消灯後、最初の石から指を離さず光った順に石をなぞる(離しても最後の石から再開可)
// 終わり: 3つの道筋(4・5・6石)をなぞれば成功。違う石に触れる/3秒止まる/時間切れで失敗
// @mechanic: trace
// @theme: firefly_stepping_stones
// 世界観: 月のない夜の庭池で、灯籠守りの見習いが蛍の飛んだ跡を覚え、暗がりの飛び石を正しい順で踏み渡る道筋を指でなぞって示す
// 残るもの: 正誤(CLEAR/GAME OVER) + なぞった石の数・一筆で通せた道筋数
// スタイル: 70s VECTOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s VECTOR: 黒地に発光する線画のみ(塗りは使わず、線の重ねでグロー)
  var STYLE = { bg: ['#02030a', '#07102a'], main: ['#7dffc4', '#c8fff0'], accent: ['#ffe066', '#ff5d8f'] };
  var C = { glow: 'rgba(125,255,196,0.22)', line: '#7dffc4', hot: '#ffe066', hotGlow: 'rgba(255,224,102,0.28)',
    bad: '#ff5d8f', badGlow: 'rgba(255,93,143,0.3)', dim: 'rgba(125,255,196,0.35)', white: '#e8fff8' };

  var GAME_TITLE = 'FIREFLY STONES';
  var TIME_LIMIT = 15;
  var NEEDED = 3;
  var LENS = [4, 5, 6];
  var CELL = 200;
  var GX = 240, GY = H * 0.345;
  var HIT_R = 74;
  var SHOW_STEP = 0.34;
  var IDLE_LIMIT = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var round, path, phase, phT, progress, tracing, fx, fy, idleT, releases, clean, stones;
  var timeLeft, ready, hitStop, finished, ok, done, endWait, score, badTile, flashT;

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x, y, { size: sz, color: C.glow, bold: true, align: align || 'center', font: 'monospace' });
    game.draw.text(s, x, y, { size: sz - 2, color: col, bold: false, align: align || 'center', font: 'monospace' });
  }
  function vline(x1, y1, x2, y2, col, glow) {
    game.draw.line(x1, y1, x2, y2, glow || C.glow, 12);
    game.draw.line(x1, y1, x2, y2, col, 3);
  }
  function square(cx, cy, hs, col, glow) {
    vline(cx - hs, cy - hs, cx + hs, cy - hs, col, glow); vline(cx + hs, cy - hs, cx + hs, cy + hs, col, glow);
    vline(cx + hs, cy + hs, cx - hs, cy + hs, col, glow); vline(cx - hs, cy + hs, cx - hs, cy - hs, col, glow);
  }

  var FLY_A = ['.w.w.', 'w.w.w', '.yyy.', '..y..'];
  var FLY_B = ['w...w', '.w.w.', '.yyy.', '..y..'];
  var FLY_PAL = { w: '#c8fff0', y: '#ffe066' };
  var KEEPER_A = ['..l..', '.lll.', '..k..', '.kkk.', 'k.k.k', '.k.k.'];
  var KEEPER_B = ['..l..', '.lll.', '..k..', 'kkkkk', '..k..', '.k.k.'];
  var KEEPER_PAL = { l: '#ffe066', k: '#7dffc4' };
  var MOTH_A = ['m...m', 'mm.mm', '.mmm.', '..m..'];
  var MOTH_B = ['.....', 'mm.mm', 'mmmmm', '..m..'];

  function tileXY(i) { return { x: GX + (i % 4) * CELL, y: GY + Math.floor(i / 4) * CELL }; }
  function tileAt(x, y) {
    for (var i = 0; i < 16; i++) {
      var p = tileXY(i);
      if (Math.hypot(x - p.x, y - p.y) < HIT_R) return i;
    }
    return -1;
  }

  function makePath(len) {
    for (var tries = 0; tries < 50; tries++) {
      var cur = Math.floor(game.random(0, 15.99));
      var out = [cur];
      while (out.length < len) {
        var c = cur % 4, r = Math.floor(cur / 4), opts = [];
        if (c > 0) opts.push(cur - 1);
        if (c < 3) opts.push(cur + 1);
        if (r > 0) opts.push(cur - 4);
        if (r < 3) opts.push(cur + 4);
        opts = opts.filter(function(o) { return out.indexOf(o) < 0; });
        if (!opts.length) break;
        cur = opts[Math.floor(game.random(0, opts.length - 0.01))];
        out.push(cur);
      }
      if (out.length === len) return out;
    }
    return [0, 1, 2, 3, 7, 11].slice(0, len);
  }

  function startRound() {
    path = makePath(LENS[round]);
    phase = 'show'; phT = 0; progress = 0; tracing = false; idleT = 0; releases = 0;
  }

  function initGame() {
    round = 0; timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0; finished = false; ok = false; done = false;
    endWait = 0; score = 0; badTile = -1; flashT = 0; clean = 0; stones = 0; fx = GX; fy = GY;
    startRound();
  }

  var NOTES = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6'];
  // 次の石に入る — プレイもデモもここを通る
  function enterTile(i, live) {
    if (i === path[progress]) {
      progress++; stones++; idleT = 0; score += 20;
      var p = tileXY(i);
      if (live) {
        game.audio.tone(NOTES[Math.min(5, progress - 1)], 0.12, { wave: 'square', volume: 0.06 });
        game.fx.burst(p.x, p.y, { color: C.line, count: 6, speed: 160 });
      }
      if (progress >= path.length) {
        var perfect = releases === 0;
        if (perfect) clean++;
        score += 100 + (perfect ? 50 : 0);
        phase = 'clear'; phT = 0; tracing = false;
        if (live) {
          game.feedback.good(p.x, p.y, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.hot : C.line });
          if (round === 1) { game.audio.play('se_milestone', 0.5); game.fx.popup((round + 1) + ' / ' + NEEDED, W / 2, H * 0.26, { color: C.hot, size: 60 }); }
        }
      }
      return true;
    }
    if (progress > 0 && path.indexOf(i) >= 0 && path.indexOf(i) < progress) return false;
    // 違う石
    badTile = i; flashT = 0.5; tracing = false;
    if (live) { finished = true; ok = false; hitStop = 0.5; game.audio.play('se_break', 0.4); }
    return false;
  }

  function stepRound(dt, live) {
    phT += dt;
    if (phase === 'show') {
      var k = Math.floor(phT / SHOW_STEP);
      if (k < path.length) {
        var a = tileXY(path[Math.max(0, k - 1)]), b = tileXY(path[k]);
        var f = Math.min(1, (phT - k * SHOW_STEP) / (SHOW_STEP * 0.5));
        fx = a.x + (b.x - a.x) * f; fy = a.y + (b.y - a.y) * f - 40;
        if (live && Math.abs(phT - k * SHOW_STEP - SHOW_STEP * 0.5) < dt / 2 + 0.001) game.audio.tone(NOTES[Math.min(5, k)], 0.08, { wave: 'triangle', volume: 0.04 });
      } else {
        fx += dt * 500; fy -= dt * 700;
        if (phT > path.length * SHOW_STEP + 0.3) { phase = 'trace'; phT = 0; idleT = 0; if (live) game.audio.tone('C4', 0.1, { wave: 'sine', volume: 0.06 }); }
      }
    } else if (phase === 'trace') {
      idleT += dt;
      if (live && idleT > IDLE_LIMIT) {
        badTile = path[progress]; flashT = 0.5; finished = true; ok = false; hitStop = 0.5;
      }
    } else if (phase === 'clear') {
      if (phT > 0.45) {
        round++;
        if (round >= NEEDED) {
          if (live) { finished = true; ok = true; hitStop = 0.4; score += Math.round(timeLeft * 20); }
          round = NEEDED - 1; phase = 'done';
        } else startRound();
      }
    }
    if (flashT > 0) flashT -= dt;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; music(); return; }
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || finished || ready > 0) return;
    if (phase !== 'trace') { game.audio.play('se_tap', 0.08); return; }
    var i = tileAt(x, y);
    fx = x; fy = y;
    if (i < 0) { game.audio.play('se_tap', 0.1); game.fx.burst(x, y, { color: C.dim, count: 3, speed: 80 }); return; }
    game.audio.play('se_tap', 0.25);
    if (progress > 0 && i === path[progress - 1]) { tracing = true; return; }
    if (enterTile(i, true)) tracing = true;
  });

  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !tracing || finished) return;
    fx = x; fy = y;
    var i = tileAt(x, y);
    if (i < 0 || (progress > 0 && i === path[progress - 1])) return;
    if (Math.random() < 0.3) game.fx.burst(x, y, { color: C.hot, count: 2, speed: 60 });
    enterTile(i, true);
  });

  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !tracing) return;
    tracing = false;
    if (phase === 'trace') { releases++; game.audio.tone('E4', 0.05, { wave: 'sine', volume: 0.04 }); }
  });

  // ── ATTRACT: 本物の stepRound/enterTile。1本目は正しく、2本目は3石目で道を外す ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.6, press: false, k: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7.0;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; demo.k = 0; }
    stepRound(dt, false);
    if (phase === 'trace') {
      var goWrong = round === 1 && progress === 2;
      var nextI = path[progress];
      if (goWrong) {
        var last = path[progress - 1];
        var cands = [last - 1, last + 1, last - 4, last + 4].filter(function(o) { return o >= 0 && o < 16 && path.indexOf(o) < 0 && Math.abs((o % 4) - (last % 4)) <= 1; });
        nextI = cands.length ? cands[0] : nextI;
      }
      var from = progress > 0 ? tileXY(path[progress - 1]) : tileXY(path[0]);
      var to = tileXY(nextI);
      var f = Math.min(1, phT / 0.28);
      demo.gx = from.x + (to.x - from.x) * f; demo.gy = from.y + (to.y - from.y) * f;
      demo.press = true;
      fx = demo.gx; fy = demo.gy; tracing = true;
      if (f >= 1) {
        phT = 0;
        enterTile(nextI, false);
        if (goWrong) { phase = 'fail'; }
      }
    } else if (phase === 'fail') {
      demo.press = false;
    } else {
      demo.press = false; tracing = false;
      demo.gx += (W * 0.82 - demo.gx) * Math.min(1, dt * 3); demo.gy += (H * 0.8 - demo.gy) * Math.min(1, dt * 3);
    }
  }

  function drawScene(t) {
    var pulse = 0.5 + 0.5 * Math.sin(t * 1.3);
    game.draw.gradient(0, H, [[0, STYLE.bg[1]], [1, STYLE.bg[0]]]);
    game.draw.rect(0, 0, W, H, '#0d2a3a', 0.12 + pulse * 0.08);
    for (var s = 0; s < 30; s++) {
      var sx = (s * 211) % W, sy = (s * 157) % Math.floor(H * 0.25) + 20;
      game.draw.line(sx, sy, sx + 3, sy, C.white, 2 + (Math.sin(t * 3 + s) > 0.6 ? 2 : 0));
    }
    // 池の縁と葦(揺れる)
    vline(60, H * 0.27, W - 60, H * 0.27, C.dim, 'rgba(125,255,196,0.08)');
    vline(60, H * 0.8, W - 60, H * 0.8, C.dim, 'rgba(125,255,196,0.08)');
    for (var r = 0; r < 7; r++) {
      var rx = 40 + r * 18, sway = Math.sin(t * 1.5 + r) * 16;
      vline(rx, H * 0.8, rx + sway, H * 0.7 - (r % 3) * 30, C.dim);
      var rx2 = W - 40 - r * 18;
      vline(rx2, H * 0.8, rx2 - sway, H * 0.72 - (r % 2) * 40, C.dim);
    }
    // 見物の蛾(演出AI)
    game.draw.sprite(Math.floor(t * 5) % 2 ? MOTH_A : MOTH_B, { m: '#6f8fa0' }, W * 0.85 + Math.sin(t * 0.9) * 40, H * 0.2 + Math.cos(t * 1.1) * 20, 8, { anchor: 'center' });
  }

  function drawStones(t) {
    for (var i = 0; i < 16; i++) {
      var p = tileXY(i);
      var bob = Math.sin(t * 1.6 + i) * 3;
      var lit = false, hot = false;
      if (phase === 'show') {
        var k = Math.floor(phT / SHOW_STEP);
        var idx = path.indexOf(i);
        if (idx >= 0 && idx <= k && k - idx < 2) { lit = true; hot = idx === k; }
      }
      if ((phase === 'trace' || phase === 'clear' || phase === 'done' || phase === 'fail') && path.indexOf(i) >= 0 && path.indexOf(i) < progress) lit = true;
      if (i === badTile && (flashT > 0 || (finished && !ok) || phase === 'fail')) {
        square(p.x, p.y + bob, 76, C.bad, C.badGlow);
        vline(p.x - 40, p.y - 40, p.x + 40, p.y + 40, C.bad, C.badGlow);
        vline(p.x + 40, p.y - 40, p.x - 40, p.y + 40, C.bad, C.badGlow);
        continue;
      }
      square(p.x, p.y + bob, 70, lit ? C.hot : C.dim, lit ? C.hotGlow : 'rgba(125,255,196,0.1)');
      if (lit) square(p.x, p.y + bob, 44, hot ? C.white : C.hot, C.hotGlow);
    }
    // なぞった道筋
    if (phase !== 'show' && progress > 0) {
      for (var j = 1; j < progress; j++) {
        var a = tileXY(path[j - 1]), b = tileXY(path[j]);
        vline(a.x, a.y, b.x, b.y, C.hot, C.hotGlow);
      }
      var last = tileXY(path[progress - 1]);
      if (tracing) vline(last.x, last.y, fx, fy, C.white, C.hotGlow);
      var kf = Math.floor(t * 4) % 2 ? KEEPER_A : KEEPER_B;
      game.draw.sprite(kf, KEEPER_PAL, last.x, last.y - 10 + Math.sin(t * 5) * 4, 9, { anchor: 'center' });
    }
    // 蛍
    if (phase === 'show') {
      game.draw.circle(fx, fy, 26, C.hot, 0.18 + 0.1 * Math.sin(t * 20));
      game.draw.sprite(Math.floor(t * 10) % 2 ? FLY_A : FLY_B, FLY_PAL, fx, fy, 8, { anchor: 'center' });
    } else {
      var hx = W * 0.14 + Math.sin(t * 1.2) * 30, hy = H * 0.22 + Math.cos(t * 1.7) * 18;
      game.draw.sprite(Math.floor(t * 10) % 2 ? FLY_A : FLY_B, FLY_PAL, hx, hy, 7, { anchor: 'center' });
    }
  }

  function drawHud() {
    txt((round + (phase === 'clear' || phase === 'done' ? 1 : 0)) + ' / ' + NEEDED, W / 2, 80, 64, C.line);
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    vline(90, 160, 90 + (W - 180) * Math.max(0, timeLeft / TIME_LIMIT), 160, lowTime ? C.bad : C.line);
    // 親指ゾーン: 今の道筋の石数(順番のヒントは出さない)
    var n = path.length;
    for (var i = 0; i < n; i++) {
      var cx = W / 2 - (n - 1) * 50 + i * 100, cy = H * 0.88;
      square(cx, cy, 22, i < progress ? C.hot : C.dim, i < progress ? C.hotGlow : 'rgba(125,255,196,0.1)');
    }
    if (phase === 'trace' && idleT > IDLE_LIMIT - 1.2 && Math.floor(game.time.elapsed * 8) % 2 === 0) {
      vline(W / 2 - 200, H * 0.93, W / 2 + 200 - 400 * (idleT / IDLE_LIMIT), H * 0.93, C.bad, C.badGlow);
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (path === undefined) initGame();

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      drawStones(t);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.07, 72, C.line);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.115, 34, C.hot);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 46, C.hot);
      else txt('INSERT COIN', W / 2, H * 0.94, 40, C.line);
      return;
    }

    if (state === S.RESULT) {
      drawScene(t);
      drawStones(t);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.12, 96, ok ? C.hot : C.bad);
      txt(stones + '  PERFECT ' + clean, W / 2, H * 0.17, 38, C.line);
      if (ok) {
        txt('SCORE ' + score, W / 2, H * 0.86, 48, C.hot);
        if (score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.9, 44, C.white);
        else txt('BEST ' + (game.best || 0), W / 2, H * 0.9, 36, C.line);
      } else {
        txt('あと' + Math.max(1, path.length - progress) + '石!', W / 2, H * 0.86, 50, C.hot);
        txt('BEST ' + (game.best || 0), W / 2, H * 0.9, 36, C.line);
      }
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 40, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) { game.audio.play('se_success', 0.6); game.end.success(score, { stones: stones, paths: round + 1, perfect: clean }); }
        else { game.audio.play('se_failure', 0.6); game.end.failure({ stones: stones, paths: round, perfect: clean }); }
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) {
        if (ok) game.feedback.good(W / 2, H * 0.5, { text: 'CLEAR', color: C.hot, count: 24 });
        else game.feedback.bad(W / 2, H * 0.5, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS' });
        done = true; endWait = 0.9;
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.4);
    } else if (!finished) {
      timeLeft -= dt;
      stepRound(dt, true);
      if (!finished && timeLeft <= 0) { timeLeft = 0; finished = true; ok = false; hitStop = 0.5; badTile = path[Math.min(progress, path.length - 1)]; flashT = 0.5; }
    }

    drawScene(t);
    drawStones(t);
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.24, 90, C.hot);
  });

  function music() {
    game.audio.melody([['A4', 1], ['C5', 0.5], ['E5', 0.5], ['D5', 1], ['B4', 1], ['A4', 0.5], ['G4', 0.5], ['A4', 2]], { tempo: 96, wave: 'sine', volume: 0.05, loop: true });
  }
  game.onStart(function() {
    music();
    state = S.ATTRACT;
    initGame();
  });
})(game);
