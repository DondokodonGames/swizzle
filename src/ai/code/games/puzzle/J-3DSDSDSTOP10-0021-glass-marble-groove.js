// J-3DSDSDSTOP10-0021-glass-marble-groove.js
// ガラス玉みぞ描き — 転がり出したガラス玉の先回りをして、指で溝を描き受け皿まで導く
// 操作: 光る出発点から指を離さず、点線の道すじに沿って溝を描く。玉は描いた溝を追って転がってくる
// 終わり: 3個の玉を受け皿まで届ければ成功。道すじを外れる/玉に追いつかれる/時間切れで失敗
// @mechanic: trace
// @theme: glass_marble_groove
// 世界観: 丘の上のガラス玉工房の見習いが、窯から転がり出す玉のために芝の斜面へ指で溝を先回りして描き、谷底の受け皿まで3個届ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 届けた玉の数と残り時間
// スタイル: HYPERCASUAL 3D

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 白に近い地 + 単色の塊、柔らかい落ち影、見た目どおりの当たり
  var STYLE = { bg: ['#f6f4ef', '#e7eef0', '#d9e4e2'], main: ['#3b82f6', '#ff7a45'], accent: ['#1fbf7a', '#ffc93c'] };
  var COL = {
    sky: STYLE.bg[0], ground: STYLE.bg[1], ground2: STYLE.bg[2],
    groove: '#b9c9c6', grooveDone: '#7fa39d', guide: '#9fb4b0',
    marble: STYLE.main[0], hot: STYLE.main[1], good: STYLE.accent[0], gold: STYLE.accent[1],
    ink: '#2d3a3a', shadow: '#000000', white: '#ffffff', bad: '#ff4a5a'
  };

  var GAME_TITLE = 'MARBLE GROOVE';
  var TIME_LIMIT = 15;
  var NEEDED = 3;
  var TOL = 74;
  var START_R = 115;
  var AUTO_ROLL = 2.4;   // 描き始めない時、玉はこの秒数で勝手に転がり出す(ジェスチャー待ちの上限)
  var SPEEDS = [500, 580, 650];

  var COURSES = [
    [[0.22, 0.27], [0.70, 0.31], [0.74, 0.46], [0.30, 0.54], [0.36, 0.69]],
    [[0.80, 0.26], [0.34, 0.30], [0.26, 0.45], [0.72, 0.52], [0.62, 0.69]],
    [[0.20, 0.30], [0.56, 0.25], [0.82, 0.40], [0.44, 0.50], [0.24, 0.62], [0.58, 0.70]]
  ];

  var KILN = ['..rrrr..', '.rrrrrr.', 'rryyyyrr', 'rryooyrr', 'rrrrrrrr', 'kkkkkkkk'];
  var MARBLE_A = ['.bbbb.', 'bwwbbb', 'bwbbbb', 'bbbbbd', 'bbbbdd', '.bddd.'];
  var MARBLE_B = ['.bbbb.', 'bbbwwb', 'bbbbwb', 'dbbbbb', 'ddbbbb', '.dddb.'];
  var CUP = ['g......g', 'gg....gg', '.gggggg.', '..gggg..'];
  var APPRENTICE_A = ['..hhhh..', '.hhhhhh.', '..ssss..', '..s..s..', '.cccccc.', 'cccccccc', '.c.cc.c.', '..pp.pp.'];
  var APPRENTICE_B = ['..hhhh..', '.hhhhhh.', '..ssss..', '..s..s..', '.cccccc.', 'cccccccc', 'c..cc..c', '..pp.pp.'];
  var PAL_KILN = { r: '#e2725b', y: '#ffc93c', o: '#ff7a45', k: '#6b5b53' };
  var PAL_MARBLE = { b: COL.marble, w: '#dbeafe', d: '#1e4fb8' };
  var PAL_CUP = { g: COL.good };
  var PAL_APP = { h: '#5b4636', s: '#f2c9a0', c: COL.hot, p: '#3d3d3d' };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var pts, segLen, total, stage, drawn, drawing, penX, penY, ball, rolling, touchT, waitT;
  var delivered, timeLeft, ready, finished, ok, hitStop, endWait, hl, stagePause, dotsPassed, failWhy;
  var silent = false;

  function say(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: 'rgba(0,0,0,0.18)', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function buildCourse(i) {
    var c = COURSES[i % COURSES.length];
    pts = []; segLen = []; total = 0;
    for (var k = 0; k < c.length; k++) pts.push({ x: c[k][0] * W, y: c[k][1] * H });
    for (var j = 1; j < pts.length; j++) {
      var d = Math.hypot(pts[j].x - pts[j - 1].x, pts[j].y - pts[j - 1].y);
      segLen.push(d); total += d;
    }
  }

  function pointAt(len) {
    var acc = 0;
    for (var j = 1; j < pts.length; j++) {
      if (len <= acc + segLen[j - 1]) {
        var t = segLen[j - 1] > 0 ? (len - acc) / segLen[j - 1] : 0;
        return { x: pts[j - 1].x + (pts[j].x - pts[j - 1].x) * t, y: pts[j - 1].y + (pts[j].y - pts[j - 1].y) * t };
      }
      acc += segLen[j - 1];
    }
    return { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y };
  }

  function project(px, py) {
    var best = 1e9, bestLen = 0, acc = 0;
    for (var j = 1; j < pts.length; j++) {
      var ax = pts[j - 1].x, ay = pts[j - 1].y, vx = pts[j].x - ax, vy = pts[j].y - ay;
      var l2 = vx * vx + vy * vy;
      var t = l2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2)) : 0;
      var d = Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
      if (d < best) { best = d; bestLen = acc + t * segLen[j - 1]; }
      acc += segLen[j - 1];
    }
    return { dist: best, len: bestLen };
  }

  function setupStage(i) {
    stage = i; buildCourse(i);
    drawn = 0; drawing = false; ball = 0; rolling = false; touchT = -1; waitT = 0; dotsPassed = 0;
    penX = pts[0].x; penY = pts[0].y;
  }

  function initGame() {
    delivered = 0; timeLeft = TIME_LIMIT; ready = 0.8; finished = false; ok = false;
    hitStop = 0; endWait = 0; hl = null; stagePause = 0; failWhy = '';
    setupStage(0);
  }

  function finishRound(success, x, y) {
    if (finished) return;
    finished = true; ok = success; hitStop = 0.45; hl = { x: x, y: y, t: 0 };
    drawing = false;
    if (!silent) game.audio.stopBgm();
  }

  function beginPen(x, y) {
    if (finished || stagePause > 0) return false;
    var tip = pointAt(drawn);
    if (Math.hypot(x - tip.x, y - tip.y) <= START_R) {
      drawing = true; penX = x; penY = y;
      if (touchT < 0) touchT = 0;
      game.fx.burst(tip.x, tip.y, { color: COL.gold, count: 6, speed: 160 });
      return true;
    }
    // 出発点から遠い押下: 溝の先端を光らせて居場所を示す(ミスにはしない)
    game.fx.burst(tip.x, tip.y, { color: COL.hot, count: 10, speed: 240 });
    return false;
  }

  function movePen(x, y) {
    if (!drawing || finished) return;
    var r = project(x, y);
    penX = x; penY = y;
    if (r.dist > TOL) { failWhy = 'off'; finishRound(false, x, y); return; }
    if (r.len > drawn && r.len < drawn + 170) {
      drawn = r.len;
      var dots = Math.floor(drawn / 90);
      if (dots > dotsPassed) {
        dotsPassed = dots;
        if (!silent) game.audio.tone(220 + dots * 30, 0.04, { wave: 'sine', volume: 0.05 });
      }
      if (drawn >= total - 16) {
        drawn = total;
        if (!silent) game.audio.play('se_milestone', 0.35);
        game.fx.popup('NICE', pts[pts.length - 1].x, pts[pts.length - 1].y - 90, { color: COL.good, size: 40 });
      }
    }
  }

  function endPen() {
    if (!drawing) return false;
    drawing = false;
    return true;
  }

  function stepWorld(dt) {
    if (finished) return;
    if (stagePause > 0) {
      stagePause -= dt;
      if (stagePause <= 0) setupStage(stage + 1);
      return;
    }
    waitT += dt;
    if (touchT >= 0) touchT += dt;
    if (!rolling && (touchT > 0.35 || waitT >= AUTO_ROLL)) {
      rolling = true;
      if (!silent) game.audio.play('se_jump', 0.3);
    }
    if (rolling) {
      ball += SPEEDS[Math.min(stage, SPEEDS.length - 1)] * dt;
      if (ball >= total) {
        delivered++;
        var cup = pts[pts.length - 1];
        game.feedback.good(cup.x, cup.y, { text: delivered === NEEDED ? 'PERFECT' : 'GOOD', color: COL.good, sound: silent ? 'se_tap' : 'se_coin', volume: silent ? 0 : 0.5 });
        if (delivered === 2) game.fx.popup('2 / 3', cup.x, cup.y - 150, { color: COL.gold, size: 44 });
        if (delivered === 2 && !silent) game.audio.play('se_milestone', 0.4);
        if (delivered >= NEEDED) { finishRound(true, cup.x, cup.y); return; }
        stagePause = 0.45; rolling = false; drawing = false;
        return;
      }
      if (ball >= drawn - 2) {
        var p = pointAt(drawn);
        failWhy = 'caught';
        finishRound(false, p.x, p.y);
      }
    }
  }

  // ── 描画 ─────────────────────────────────────────────
  function drawBackdrop() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, COL.sky], [0.2, COL.ground], [1, COL.ground2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.05 + 0.05 * Math.sin(t * 1.4));
    // 遠景の丸い丘(柔らかい影)
    for (var i = 0; i < 4; i++) {
      var hx = W * (0.1 + i * 0.3) + Math.sin(t * 0.3 + i) * 12;
      game.draw.circle(hx, H * 0.2 + 30, 170, '#cfdcd8', 0.8);
    }
    game.draw.rect(0, H * 0.2 + 20, W, H * 0.8, COL.ground, 1);
    // 芝の点々
    for (var g = 0; g < 26; g++) {
      var gx = (g * 173) % W, gy = H * 0.24 + ((g * 311) % (H * 0.56));
      game.draw.rect(gx, gy, 10, 4, '#c9d8d3', 0.9);
    }
  }

  function drawCourse() {
    var j;
    for (j = 1; j < pts.length; j++) game.draw.line(pts[j - 1].x, pts[j - 1].y, pts[j].x, pts[j].y, '#f1f5f4', 64);
    var blink = 0.6 + 0.3 * Math.sin(game.time.elapsed * 6);
    for (var d = 0; d < total; d += 46) {
      if (d < drawn) continue;
      var p = pointAt(d);
      game.draw.circle(p.x, p.y, 11, COL.grooveDone, blink);
    }
    // 描いた溝(先端まで)
    var acc = 0;
    for (j = 1; j < pts.length; j++) {
      var a = acc, b = acc + segLen[j - 1];
      if (drawn > a) {
        var e = pointAt(Math.min(drawn, b));
        game.draw.line(pts[j - 1].x, pts[j - 1].y + 6, e.x, e.y + 6, '#6f8f89', 44);
        game.draw.line(pts[j - 1].x, pts[j - 1].y, e.x, e.y, COL.groove, 40);
        game.draw.circle(e.x, e.y, 20, COL.groove);
      }
      acc = b;
    }
    // 穴(道すじの外側)
    for (j = 1; j < pts.length - 1; j++) {
      game.draw.circle(pts[j].x + (j % 2 ? 120 : -120), pts[j].y + 40, 36, '#8aa19b', 0.9);
      game.draw.circle(pts[j].x + (j % 2 ? 120 : -120), pts[j].y + 46, 30, '#445a55', 0.9);
    }
    var cup = pts[pts.length - 1];
    game.draw.circle(cup.x, cup.y + 26, 64, COL.shadow, 0.12);
    game.draw.sprite(CUP, PAL_CUP, cup.x, cup.y + 14, 14, { anchor: 'center' });
    var st = pts[0];
    var bob = Math.sin(game.time.elapsed * 3) * 4;
    game.draw.sprite(KILN, PAL_KILN, st.x, st.y - 70 + bob, 12, { anchor: 'center' });
    if (!rolling && drawn === 0 && !finished) {
      var pr = 40 + 20 * ((game.time.elapsed * 2) % 1);
      game.draw.circle(st.x, st.y, pr, COL.gold, 0.35);
    }
    if (drawing) game.draw.circle(penX, penY, 16, COL.hot, 0.8);
  }

  function drawMarble() {
    if (stagePause > 0) return;
    var p = pointAt(Math.min(ball, total));
    var frame = Math.floor(ball / 40) % 2 === 0 ? MARBLE_A : MARBLE_B;
    game.draw.circle(p.x + 8, p.y + 26, 32, COL.shadow, 0.16);
    game.draw.sprite(frame, PAL_MARBLE, p.x, p.y, 10, { anchor: 'center' });
  }

  function drawThumbZone() {
    var t = game.time.elapsed;
    game.draw.rect(0, H * 0.8, W, H * 0.2, '#cddbd6', 1);
    game.draw.circle(W * 0.18, H * 0.9 + 60, 60, COL.shadow, 0.1);
    var fr = Math.floor(t * 3) % 2 === 0 ? APPRENTICE_A : APPRENTICE_B;
    game.draw.sprite(fr, PAL_APP, W * 0.18 + Math.sin(t * 1.2) * 10, H * 0.87 + Math.sin(t * 3) * 6, 14, { anchor: 'center' });
    for (var i = 0; i < NEEDED; i++) {
      var x = W * 0.48 + i * 150;
      game.draw.circle(x, H * 0.9 + 30, 40, COL.shadow, 0.1);
      game.draw.sprite(i < delivered ? MARBLE_A : CUP, i < delivered ? PAL_MARBLE : PAL_CUP, x, H * 0.9 + Math.sin(t * 2 + i) * 5, 10, { anchor: 'center' });
    }
  }

  function drawHud() {
    say(delivered + ' / ' + NEEDED, W / 2, H * 0.05, 56, COL.ink);
    var bw = W - 160, frac = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(80, 160, bw, 22, '#cfd8d6');
    var low = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 160, bw * frac, 22, low ? COL.bad : COL.marble);
  }

  function drawHighlight(dt) {
    if (!hl) return;
    hl.t += dt;
    var r = 40 + hl.t * 180;
    game.draw.circle(hl.x, hl.y, r, COL.white, Math.max(0, 0.7 - hl.t));
    game.draw.circle(hl.x, hl.y, 34, ok ? COL.good : COL.white, 0.9);
    game.draw.sprite(MARBLE_A, PAL_MARBLE, hl.x, hl.y, 14, { anchor: 'center' });
  }

  // ── ATTRACT ゴースト実演(実ロジックを流用) ─────────────
  var demo = { t: 0, gx: 0, gy: 0, press: false, fail: false, cycles: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var CYC = 4.6;
    var cyc = demo.t % CYC;
    if (cyc < dt || demo.t <= dt) {
      initGame(); ready = 0;
      demo.cycles++;
      demo.fail = demo.cycles % 3 === 0;   // 3回に1回は途中で手を止めて追いつかれる失敗例
      setupStage(demo.cycles % 2);
      demo.press = false;
    }
    silent = true;
    var st = pts[0];
    if (cyc < 0.35) {
      demo.gx = st.x; demo.gy = st.y; demo.press = false;
    } else {
      var stopAt = demo.fail ? total * 0.5 : total;
      var len = Math.min(stopAt, (cyc - 0.35) * 820);
      var p = pointAt(len);
      demo.gx = p.x + Math.sin(demo.t * 9) * 10; demo.gy = p.y;
      if (!drawing && len < stopAt && !finished) beginPen(demo.gx, demo.gy);
      if (len < stopAt) { demo.press = true; movePen(demo.gx, demo.gy); }
      else { demo.press = false; endPen(); }
    }
    stepWorld(dt);
    if (finished && hitStop > 0) hitStop -= dt;
    silent = false;
  }

  // ── 入力 ─────────────────────────────────────────────
  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function (x, y) {
    if (state !== S.PLAYING || ready > 0) return;
    if (beginPen(x, y)) game.audio.play('se_tap', 0.4);
    else game.audio.tone('C4', 0.08, { wave: 'triangle', volume: 0.12 });
  });
  game.onMove(function (x, y) {
    if (state !== S.PLAYING || ready > 0) return;
    movePen(x, y);
    if (drawing && Math.random() < 0.2) game.fx.burst(x, y, { color: COL.guide, count: 2, speed: 90 });
  });
  game.onRelease(function () {
    if (state !== S.PLAYING) return;
    if (endPen()) game.audio.tone('G3', 0.05, { wave: 'triangle', volume: 0.08 });
  });

  // ── ループ(このファイルで唯一の onUpdate) ──────────────
  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (pts === undefined) initGame();
      stepDemo(dt);
      drawBackdrop(); drawCourse(); drawMarble(); drawThumbZone();
      if (finished) drawHighlight(dt);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      say(GAME_TITLE, W / 2, H * 0.07, 76, COL.marble);
      say('HI-SCORE ' + (game.best || 0), W / 2, H * 0.12, 34, COL.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) say('► 100円 投入 ◄', W / 2, H * 0.965, 44, COL.hot);
      else say('INSERT COIN', W / 2, H * 0.965, 36, COL.ink);
      return;
    }

    if (state === S.RESULT) {
      drawBackdrop(); drawCourse(); drawThumbZone();
      say(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 92, ok ? COL.good : COL.bad);
      say(delivered + ' / ' + NEEDED, W / 2, H * 0.14, 52, COL.ink);
      var sc = ok ? delivered * 100 + Math.round(timeLeft * 20) : delivered * 100;
      say('SCORE ' + sc, W / 2, H * 0.19, 44, COL.ink);
      if (ok && sc > (game.best || 0)) say('NEW RECORD', W / 2, H * 0.235, 44, COL.gold);
      else say('BEST ' + (game.best || 0), W / 2, H * 0.235, 36, COL.ink);
      if (!ok) say('あと' + (NEEDED - delivered) + '個!', W / 2, H * 0.5, 64, COL.hot);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) say('TAP TO CONTINUE', W / 2, H * 0.965, 38, COL.ink);
      return;
    }

    // PLAYING
    if (finished) {
      if (hitStop > 0) {
        hitStop -= dt;
        if (hitStop <= 0) {
          if (ok) {
            game.feedback.good(hl.x, hl.y, { text: 'CLEAR', color: COL.gold, count: 24 });
            game.audio.play('se_success', 0.6);
          } else {
            game.feedback.bad(hl.x, hl.y, { text: 'MISS' });
            game.audio.play('se_failure', 0.5);
          }
          endWait = 1.1;
        }
      } else {
        endWait -= dt;
        if (endWait <= 0) {
          state = S.RESULT;
          var stats = { delivered: delivered, needed: NEEDED, timeLeft: Math.round(timeLeft * 10) / 10 };
          if (ok) game.end.success(delivered * 100 + Math.round(timeLeft * 20), stats);
          else game.end.failure(stats);
        }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.5);
    } else {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; failWhy = 'time';
        var bp = pointAt(Math.min(ball, total));
        finishRound(false, bp.x, bp.y);
      } else {
        stepWorld(dt);
      }
    }

    drawBackdrop(); drawCourse(); drawMarble(); drawThumbZone(); drawHud();
    if (finished) drawHighlight(dt);
    if (ready > 0) say(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 110, COL.hot);
  });

  game.onStart(function () {
    game.audio.melody([['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 0.5], ['F5', 0.5], ['A5', 1]],
      { tempo: 132, wave: 'triangle', volume: 0.05, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
