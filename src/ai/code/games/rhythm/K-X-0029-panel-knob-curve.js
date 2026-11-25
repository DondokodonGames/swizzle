// K-X-0029-panel-knob-curve.js
// パネルノブカーブ — 音符に合わせてボタンを押しつつ、曲線部分では指でつまみの溝をなぞって回す
// 操作: 丸い音符はボタンが光った瞬間にタップ。曲線の溝が現れたら始点から終点まで指でなぞる
// 終わり: 全11区間(ボタン6+曲線5)を終え、見逃し3回未満なら成功
// @mechanic: guide_path
// @theme: control_panel_curve
// 世界観: 演奏用制御盤の操作員。音符に合わせてボタンを押す区間と、溝に沿ってつまみを指でなぞり回す曲線区間が交互に現れる一連の演奏を成立させる
// 残るもの: 正誤(CLEAR/GAME OVER) + 通過できた区間数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 金属質のパネル、ベベルのハイライトと影で立体感を出す
  var C = {
    bg: '#3a352f', bg2: '#211d19', panel: '#5c554c', panelHi: '#797063', panelEdge: '#2a2622',
    accent: '#e0a83f', groove: '#171412', good: '#7ed957', bad: '#ff5b4d',
    gold: '#ffd54f', white: '#f5efe6', ink: '#12100d',
  };

  var GAME_TITLE = 'PANEL CURVE';
  var CX = W * 0.5;
  var BTN_Y = H * 0.74, SPAWN_Y = H * 0.28;
  var CY0 = H * 0.50;
  var HALF_C = 92;
  var CURVE_WINDOW = 1.9;
  var MISS_LIMIT = 3;

  var EVENTS = ['tap', 'curve', 'tap', 'tap', 'curve', 'tap', 'curve', 'tap', 'curve', 'tap', 'curve'];
  var TOTAL = EVENTS.length;

  var CURVE_PTS = [{ x: CX - 150, y: CY0 + 60 }, { x: CX, y: CY0 - 70 }, { x: CX + 150, y: CY0 + 60 }];
  var CURVE_SEG = [], CURVE_LEN = 0;
  (function() {
    for (var i = 1; i < CURVE_PTS.length; i++) {
      var d = Math.hypot(CURVE_PTS[i].x - CURVE_PTS[i - 1].x, CURVE_PTS[i].y - CURVE_PTS[i - 1].y);
      CURVE_SEG.push(d); CURVE_LEN += d;
    }
  })();

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var round, hits, misses, score, resolved;
  var tapT, tapDur;
  var curveGrab, curveProg, curveT, curveCursorX, curveCursorY;
  var done, endWait, finished, ready, hitStop, shake, flashHot;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var OPERATOR = ['.##.', '####', '.##.', '####', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(40, H * 0.15, W - 80, H * 0.72, C.panel, 0.35);
    game.draw.rect(40, H * 0.15, W - 80, 6, C.panelHi, 0.4);
  }

  function distToSeg(px, py, ax, ay, bx, by) {
    var vx = bx - ax, vy = by - ay, wx = px - ax, wy = py - ay;
    var len2 = vx * vx + vy * vy;
    var t = len2 > 0 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2)) : 0;
    var cx = ax + vx * t, cy = ay + vy * t;
    return { dist: Math.hypot(px - cx, py - cy), t: t };
  }
  function evalCurve(px, py) {
    var best = 1e9, bestLen = 0, acc = 0;
    for (var i = 1; i < CURVE_PTS.length; i++) {
      var r = distToSeg(px, py, CURVE_PTS[i - 1].x, CURVE_PTS[i - 1].y, CURVE_PTS[i].x, CURVE_PTS[i].y);
      if (r.dist < best) { best = r.dist; bestLen = acc + r.t * CURVE_SEG[i - 1]; }
      acc += CURVE_SEG[i - 1];
    }
    return { dist: best, len: bestLen };
  }

  function drawButton(hot, p) {
    game.draw.circle(CX, BTN_Y, 110, C.panelEdge);
    game.draw.circle(CX, BTN_Y, 90, hot ? C.white : C.accent);
    if (p !== undefined && !finished) {
      var y = SPAWN_Y + (BTN_Y - SPAWN_Y) * Math.min(1.3, p);
      game.draw.circle(CX, y, 34, C.gold);
    }
  }

  function drawCurve(hot, cursorX, cursorY) {
    for (var j = 1; j < CURVE_PTS.length; j++) {
      game.draw.line(CURVE_PTS[j - 1].x, CURVE_PTS[j - 1].y, CURVE_PTS[j].x, CURVE_PTS[j].y, C.groove, HALF_C * 2 + 8);
      game.draw.line(CURVE_PTS[j - 1].x, CURVE_PTS[j - 1].y, CURVE_PTS[j].x, CURVE_PTS[j].y, hot ? '#3a3020' : C.panel, HALF_C * 2 - 10);
    }
    game.draw.circle(CURVE_PTS[0].x, CURVE_PTS[0].y, 30, C.accent);
    game.draw.circle(CURVE_PTS[CURVE_PTS.length - 1].x, CURVE_PTS[CURVE_PTS.length - 1].y, 30, C.gold);
    if (cursorX !== undefined) game.draw.circle(cursorX, cursorY, 20, C.white);
  }

  function drawOperator() {
    game.draw.sprite(OPERATOR, { '#': C.accent }, CX, H * 0.90 + Math.sin(game.time.elapsed * 3) * 6, 20, { anchor: 'center' });
  }

  function initGame() {
    round = 0; hits = 0; misses = 0; score = 0; resolved = false;
    tapT = 0; tapDur = 1.0;
    curveGrab = false; curveProg = 0; curveT = 0; curveCursorX = CURVE_PTS[0].x; curveCursorY = CURVE_PTS[0].y;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; flashHot = 0;
  }

  function checkEnd() {
    if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); return true; }
    if (round >= TOTAL) { ok = true; finished = true; finish(); return true; }
    return false;
  }

  function startRound() {
    resolved = false;
    if (EVENTS[round] === 'tap') { tapT = 0; tapDur = Math.max(0.85, 1.05 - round * 0.02); }
    else { curveGrab = false; curveProg = 0; curveT = 0; curveCursorX = CURVE_PTS[0].x; curveCursorY = CURVE_PTS[0].y; }
  }

  function onSuccessRound(gain, label) {
    hits++; score += gain; flashHot = 0.15; hitStop = 0.08;
    game.feedback.good(CX, EVENTS[round] === 'tap' ? BTN_Y : CY0, { text: label, color: C.gold });
    round++;
    if (round === Math.ceil(TOTAL / 2)) { game.fx.popup('HALFWAY!', CX, H * 0.20, { color: C.gold, size: 32 }); game.audio.play('se_milestone', 0.4); }
    if (!checkEnd()) startRound();
  }
  function onFailRound() {
    misses++; hitStop = 0.25; shake = 0.2;
    game.feedback.bad(CX, EVENTS[round] === 'tap' ? BTN_Y : CY0, { text: 'MISS' });
    round++;
    if (!checkEnd()) startRound();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || ready > 0 || done || finished || resolved) return;
    game.audio.play('se_tap', 0.04);
    if (EVENTS[round] === 'tap') {
      resolved = true;
      var ratio = tapT / tapDur;
      if (ratio >= 0.85 && ratio <= 1.2) onSuccessRound(100, ratio <= 1.05 ? 'PERFECT' : 'GOOD');
      else onFailRound();
    }
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || done || finished || resolved) return;
    if (EVENTS[round] !== 'curve') return;
    if (Math.hypot(x - CURVE_PTS[0].x, y - CURVE_PTS[0].y) <= HALF_C * 1.3) {
      curveGrab = true; game.audio.play('se_tap', 0.03);
    }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || done || finished || resolved) return;
    if (EVENTS[round] !== 'curve' || !curveGrab) return;
    if (Math.random() < 0.06) game.audio.play('se_tap', 0.02);
    var r = evalCurve(x, y);
    if (r.dist > HALF_C) { resolved = true; curveGrab = false; onFailRound(); return; }
    if (r.len > curveProg) curveProg = r.len;
    curveCursorX = x; curveCursorY = y;
    if (curveProg >= CURVE_LEN - 16) { resolved = true; curveGrab = false; onSuccessRound(130, 'NICE'); }
  });
  game.onRelease(function(x, y) { if (state === S.PLAYING) { curveGrab = false; game.audio.play('se_tap', 0.02); } });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: BTN_Y, press: false, mode: 'tap', did: false, ct: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.9;
    if (cyc < dt || demo.t <= dt) { demo.mode = 'tap'; demo.did = false; tapT = 0; }
    if (cyc < 1.2) {
      demo.mode = 'tap'; tapT += dt;
      var ratio = tapT / 1.0;
      demo.gx = CX + Math.sin(game.time.elapsed * 2.4) * 10;
      demo.gy = BTN_Y + Math.cos(game.time.elapsed * 2) * 8;
      demo.press = ratio > 0.8 && ratio < 1.0;
      if (demo.press && !demo.did) { demo.did = true; flashHot = 0.15; game.feedback.good(CX, BTN_Y, { text: 'PERFECT', color: C.gold, sound: 'se_good', volume: 0.2 }); }
    } else {
      demo.mode = 'curve';
      var lp = Math.min(1, (cyc - 1.2) / 1.5);
      var acc = 0, px = CURVE_PTS[0].x, py = CURVE_PTS[0].y;
      var target = lp * CURVE_LEN;
      for (var i = 1; i < CURVE_PTS.length; i++) {
        if (target <= acc + CURVE_SEG[i - 1]) {
          var t = CURVE_SEG[i - 1] > 0 ? (target - acc) / CURVE_SEG[i - 1] : 0;
          px = CURVE_PTS[i - 1].x + (CURVE_PTS[i].x - CURVE_PTS[i - 1].x) * t;
          py = CURVE_PTS[i - 1].y + (CURVE_PTS[i].y - CURVE_PTS[i - 1].y) * t;
          break;
        }
        acc += CURVE_SEG[i - 1];
      }
      demo.gx = px; demo.gy = py;
      demo.press = lp < 1;
      curveCursorX = px; curveCursorY = py; curveProg = target;
      if (lp >= 1 && !demo.did2) { demo.did2 = true; flashHot = 0.15; game.feedback.good(CX, CY0, { text: 'NICE', color: C.gold, sound: 'se_good', volume: 0.2 }); }
      if (lp < 0.05) demo.did2 = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      if (demo.mode === 'tap') { drawButton(flashHot > 0, tapT / 1.0); drawCurve(false); }
      else { drawButton(false); drawCurve(flashHot > 0, curveCursorX, curveCursorY); }
      drawOperator();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.96, 36, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.96, 24, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawButton(false); drawCurve(false);
      drawOperator();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(hits + ' / ' + TOTAL, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + Math.max(0, MISS_LIMIT - misses) + '!', W / 2, H * 0.18, 22, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(score, { hits: hits, total: TOTAL });
        else game.end.failure({ hits: hits, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) { game.audio.play('se_tap'); startRound(); }
    } else if (!finished) {
      if (EVENTS[round] === 'tap') {
        tapT += dt;
        if (tapT / tapDur > 1.35 && !resolved) { resolved = true; onFailRound(); }
      } else {
        curveT += dt;
        if (curveT > CURVE_WINDOW && !resolved) { resolved = true; curveGrab = false; onFailRound(); }
      }
    }
    if (flashHot > 0) flashHot -= dt;
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) {
      if (EVENTS[round] === 'tap') { drawButton(flashHot > 0, tapT / tapDur); drawCurve(false); }
      else { drawButton(false); drawCurve(flashHot > 0, curveCursorX, curveCursorY); }
    } else { drawButton(false); drawCurve(false); }
    drawOperator();

    txt(hits + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (hits / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.60, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.2], ['F4', 0.2], ['A4', 0.2], ['D5', 0.4]], { tempo: 136, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
