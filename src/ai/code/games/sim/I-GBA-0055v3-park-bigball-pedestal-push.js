// I-GBA-0055v3-park-bigball-pedestal-push.js
// 大玉もどし — 芝生に転がった大玉を、押す向きと強さを加減して台座の真ん中で止める。押しすぎると奥の池へ
// 操作: 押した所の反対側へ大玉が転がる(清掃員が指の側から押す)。押している間ずっと力がかかり、長く押すほど速くなる。離すと芝生の上を惰性で転がる。逆側を押せばブレーキ
// 終わり: 3個の大玉を台座の真ん中で止めればCLEAR。池に落とすとその玉は最初の位置からやり直し(時間を失う)。20秒が尽きればGAME OVER
// @mechanic: push_out
// @theme: park_lawn_bigball_return
// 世界観: 公園の芝生広場で、朝番の清掃員が夜のうちに転がり出た飾りの大玉を、奥の池に落とさないよう加減して押し、石の台座の中央へ一つずつ戻していく
// 残るもの: 正誤(CLEAR/GAME OVER) + 戻した玉の数・中心からのずれ・池ポチャ回数・スコア
// スタイル: HYPERCASUAL 3D

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  // HYPERCASUAL 3D: 白〜淡色の背景に単色の丸い塊、真下に柔らかい影。見た目どおりの当たり判定
  var STYLE = { bg: ['#f4fbf0', '#dff2d6'], main: ['#ff7a5c', '#b8c4cc', '#5ab0e8'], accent: ['#ffc83a', '#2a3a4a'] };
  var BALL_C = STYLE.main[0], STONE = STYLE.main[1], WATER = STYLE.main[2], GOLD = STYLE.accent[0], INK = STYLE.accent[1];
  var RED = '#ff3a4a';

  var TITLE = 'BIG BALL HOME';
  var TIME_LIMIT = 20;
  var BALL_R = 74, PED_R = 160;
  var POND = { l: 110, r: W - 110, t: H * 0.15, b: H * 0.25 };
  var ROUNDS = [
    { sx: 540, sy: H * 0.68, px: 540, py: H * 0.43, slope: 0 },
    { sx: 250, sy: H * 0.7, px: 610, py: H * 0.41, slope: 0 },
    { sx: 830, sy: H * 0.71, px: 470, py: H * 0.42, slope: 110 },
  ];
  var ACCEL = 1100, VMAX = 1000;

  var MODE = 'ATTRACT';
  var w = null;

  var MAN_A = ['..cccc..', '.cccccc.', '..ssss..', '..eses..', '..ssss..', '.gggggg.', 'sggyyggs', '.gggggg.', '.gggggg.', '.gg..gg.', '.kk..kk.'];
  var MAN_B = ['..cccc..', '.cccccc.', '..ssss..', '..ssss..', '..ssss..', '.gggggg.', 'sggyyggs', '.gggggg.', '.gggggg.', '..gggg..', '..kkkk..'];
  var MAN_PUSH = ['..cccc..', '.cccccc.', '..ssss..', '..eses..', 'ssssssss', 'sggggggs', '.ggyygg.', '.gggggg.', '.gggggg.', 'gg....gg', 'kk....kk'];
  var MAN_JOY = ['s.cccc.s', 'gccccccg', 'g.ssss.g', 'g.eses.g', 'g.smms.g', '.gggggg.', '.ggyygg.', '.gggggg.', '.gggggg.', '.gg..gg.', '.kk..kk.'];
  var MAN_SAD = ['........', '..cccc..', '.cccccc.', '..ssss..', '..-ss-..', '..smms..', 'sggggggs', '.ggyygg.', '.gggggg.', '.gg..gg.', '.kk..kk.'];
  var PAL_MAN = { c: '#3a8ad8', s: '#ffd0b0', e: INK, '-': INK, m: RED, g: '#4ac08a', y: GOLD, k: INK };
  var STAR = ['...y...', '..yyy..', 'yyyyyyy', '.yyyyy.', '.yy.yy.', 'y.....y'];

  function soft(x, y, rx, ry, a) {
    for (var k = -3; k <= 3; k++) {
      var f = Math.sqrt(1 - (k * k) / 16);
      game.draw.rect(x - rx * f, y + k * ry / 4, rx * 2 * f, ry / 4 + 1, '#000000', a);
    }
  }

  // ── 世界 ───────────────────────────────────────────
  function freshWorld(demo) {
    var w0 = {
      demo: !!demo, r: 0, bx: 0, by: 0, vx: 0, vy: 0, pushing: false, fx: 0, fy: 0, pushT: 0, restT: 0,
      roll: 0, state: 'roll', stateT: 0, warn: false, warnTone: 0,
      clock: TIME_LIMIT, phase: 'ready', readyT: 0.8, stopT: 0, won: false,
      score: 0, homed: 0, splashes: 0, perfects: 0, bestOff: 999, manPose: 0,
    };
    return w0;
  }
  function placeBall() { var R = ROUNDS[w.r]; w.bx = R.sx; w.by = R.sy; w.vx = 0; w.vy = 0; w.state = 'roll'; w.restT = 0; w.pushing = false; }
  function initGame() { w = freshWorld(false); placeBall(); }

  // ── 物理(本番・デモ・池の予告で共通) ───────────────
  function stepBall(b, R, push, dt) {
    if (push) {
      var dx = b.bx - push.x, dy = b.by - push.y, d = Math.hypot(dx, dy) || 1;
      b.vx += dx / d * ACCEL * dt; b.vy += dy / d * ACCEL * dt;
    }
    if (R.slope && Math.hypot(b.bx - R.px, b.by - R.py) > PED_R) b.vy -= R.slope * dt; // 台座の外は池へ向かう緩い下り坂
    var sp = Math.hypot(b.vx, b.vy);
    if (sp > VMAX) { b.vx *= VMAX / sp; b.vy *= VMAX / sp; sp = VMAX; }
    var ns = Math.max(0, sp * Math.exp(-1.4 * dt) - 50 * dt);
    if (sp > 0) { b.vx *= ns / sp; b.vy *= ns / sp; }
    b.bx += b.vx * dt; b.by += b.vy * dt;
    // 左右と手前は植え込み(柔らかく跳ね返る)
    if (b.bx < 60 + BALL_R) { b.bx = 60 + BALL_R; b.vx = Math.abs(b.vx) * 0.5; }
    if (b.bx > W - 60 - BALL_R) { b.bx = W - 60 - BALL_R; b.vx = -Math.abs(b.vx) * 0.5; }
    if (b.by > H * 0.9 - BALL_R) { b.by = H * 0.9 - BALL_R; b.vy = -Math.abs(b.vy) * 0.5; }
    return b.by < POND.b - 10 && b.bx > POND.l && b.bx < POND.r ? 'pond' : '';
  }

  function predictPond() {
    var b = { bx: w.bx, by: w.by, vx: w.vx, vy: w.vy };
    var R = ROUNDS[w.r];
    for (var i = 0; i < 90; i++) {
      if (stepBall(b, R, null, 1 / 30) === 'pond') return true;
      if (Math.hypot(b.vx, b.vy) < 5 && !R.slope) return false;
    }
    return false;
  }
  function predictStop() {
    var b = { bx: w.bx, by: w.by, vx: w.vx, vy: w.vy };
    var R = ROUNDS[w.r];
    for (var i = 0; i < 120; i++) { stepBall(b, R, null, 1 / 30); if (Math.hypot(b.vx, b.vy) < 5) break; }
    return b;
  }

  // ── 押す(本番とデモで共通) ─────────────────────────
  function startPush(x, y) {
    if (w.phase !== 'run' || w.state !== 'roll') return false;
    w.pushing = true; w.fx = x; w.fy = y; w.pushT = 0;
    return true;
  }
  function endPush() {
    if (!w.pushing) return false;
    w.pushing = false;
    return true;
  }

  function home(off) {
    var R = ROUNDS[w.r];
    var perfect = off <= 22;
    var pts = (perfect ? 400 : 250) + (w.r + 1) * 50;
    w.score += pts; w.homed++; w.manPose = 0.6;
    if (perfect) w.perfects++;
    if (off < w.bestOff) w.bestOff = off;
    w.state = 'home'; w.stateT = 0.8; w.pushing = false;
    game.feedback.good(R.px, R.py - 130, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? GOLD : '#4ac08a', size: 54 });
    if (w.homed === 2 && !w.demo) { game.fx.popup('2 / 3', W / 2, H * 0.55, { color: INK, size: 60 }); game.audio.play('se_milestone', 0.4); }
  }

  function splash() {
    w.state = 'splash'; w.stateT = 0.85; w.pushing = false; w.splashes++; w.vx = 0; w.vy = 0;
    game.fx.flash('#ffffff', 0.12);
    game.audio.play('se_break', 0.35);
  }

  function advance(dt) {
    if (!w.demo) w.clock -= dt;
    if (w.manPose > 0) w.manPose -= dt;
    var R = ROUNDS[w.r];
    if (w.state === 'roll') {
      if (w.pushing) w.pushT += dt;
      var res = stepBall(w, R, w.pushing ? { x: w.fx, y: w.fy } : null, dt);
      w.roll += Math.hypot(w.vx, w.vy) * dt / BALL_R;
      if (res === 'pond') { splash(); return; }
      // 池への予告: このまま転がると池に落ちる軌道なら縁が赤く点滅
      var was = w.warn;
      w.warn = !w.pushing && predictPond();
      if (w.warn && !was) game.audio.tone('A5', 0.12, { wave: 'square', volume: 0.07 });
      var off = Math.hypot(w.bx - R.px, w.by - R.py);
      if (!w.pushing && Math.hypot(w.vx, w.vy) < 10 && off <= 46) {
        w.restT += dt;
        if (w.restT > 0.25) home(off);
      } else w.restT = 0;
    } else if (w.state === 'splash') {
      var before = w.stateT;
      w.stateT -= dt;
      if (before > 0.35 && w.stateT <= 0.35) game.feedback.bad(w.bx, POND.b + 40, { text: 'MISS', size: 50 });
      if (w.stateT <= 0) placeBall();
    } else if (w.state === 'home') {
      w.stateT -= dt;
      if (w.stateT <= 0) {
        if (w.demo) { w.state = 'idle'; return; }
        if (w.r >= ROUNDS.length - 1) {
          w.phase = 'stop'; w.stopT = 0.6; w.won = true;
          game.fx.burst(R.px, R.py, { color: GOLD, count: 30, speed: 520 });
        } else { w.r++; placeBall(); game.audio.tone('C5', 0.08, { wave: 'triangle', volume: 0.08 }); }
      }
    }
    if (w.clock <= 0 && w.phase === 'run') { w.clock = 0; w.phase = 'stop'; w.stopT = 0.5; w.won = false; w.pushing = false; game.fx.flash('#ffffff', 0.12); }
  }

  function settle() {
    var stats = { homed: w.homed, total: ROUNDS.length, splashes: w.splashes, perfect: w.perfects };
    if (w.won) {
      w.score += Math.round(w.clock * 40);
      game.feedback.good(W / 2, H * 0.4, { text: 'CLEAR', color: GOLD, size: 70 });
      game.audio.play('se_success', 0.6);
      game.end.success(w.score, stats);
    } else {
      game.feedback.bad(w.bx, w.by - 120, { text: 'TIME UP', size: 56 });
      game.audio.play('se_failure', 0.6);
      game.end.failure(stats);
    }
    MODE = 'RESULT';
  }

  // ── 描画 ───────────────────────────────────────────
  function drawPark() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [STYLE.bg[0], STYLE.bg[1]]);
    // 芝刈りの縞
    for (var y = 0; y < H; y += 120) game.draw.rect(0, y, W, 60, '#ffffff', 0.25);
    // 坂の目印(3個目の玉のときだけ、池の方へ流れる矢羽)
    if (ROUNDS[w.r].slope) {
      for (var k = 0; k < 6; k++) {
        var ay = H * 0.86 - ((t * 120 + k * 230) % (H * 0.6));
        var ax = 180 + (k % 3) * 360;
        game.draw.line(ax, ay, ax - 24, ay + 30, '#9ad08a', 8);
        game.draw.line(ax, ay, ax + 24, ay + 30, '#9ad08a', 8);
      }
    }
    // 両脇と手前の植え込み(丸い塊)
    for (var s = 0; s < 12; s++) {
      var hy = H * 0.27 + s * 115;
      game.draw.circle(30, hy, 64, '#7ac86a');
      game.draw.circle(W - 30, hy + 50, 64, '#7ac86a');
    }
    // 池(奥)
    var blink = w.warn && Math.floor(t * 12) % 2 === 0;
    soft(W / 2, POND.b + 16, (POND.r - POND.l) / 2, 18, 0.05);
    game.draw.rect(POND.l, POND.t, POND.r - POND.l, POND.b - POND.t, WATER);
    game.draw.circle(POND.l, (POND.t + POND.b) / 2, (POND.b - POND.t) / 2, WATER);
    game.draw.circle(POND.r, (POND.t + POND.b) / 2, (POND.b - POND.t) / 2, WATER);
    for (var r = 0; r < 4; r++) game.draw.rect(POND.l + 80 + r * 210 + Math.sin(t * 2 + r) * 20, POND.t + 40 + (r % 2) * 60, 90, 8, '#ffffff', 0.5);
    game.draw.rect(POND.l, POND.b - 10, POND.r - POND.l, 20, blink ? RED : '#3a90c8', blink ? 0.9 : 0.6);
    if (blink) for (var sp = 0; sp < 9; sp++) {
      var sx = POND.l + 40 + sp * 95;
      game.draw.line(sx, POND.b + 10, sx + 20, POND.b + 40, RED, 6);
      game.draw.line(sx + 20, POND.b + 40, sx + 40, POND.b + 10, RED, 6);
    }
  }

  function drawPedestal() {
    var R = ROUNDS[w.r], t = game.time.elapsed;
    soft(R.px + 14, R.py + 26, PED_R + 10, 40, 0.08);
    game.draw.circle(R.px, R.py + 16, PED_R, '#98a4ac');
    game.draw.circle(R.px, R.py, PED_R, STONE);
    game.draw.circle(R.px, R.py, PED_R * 0.62, '#ccd6dc');
    // 中央の印(ゴール): 明滅する輪
    var p = 0.5 + 0.5 * Math.sin(t * 6);
    game.draw.circle(R.px, R.py, 46 + p * 8, '#ffffff', 0.5 + 0.3 * p);
    game.draw.circle(R.px, R.py, 34, GOLD);
    game.draw.sprite(STAR, { y: '#ffffff' }, R.px, R.py, 6, { anchor: 'center' });
  }

  function drawBall() {
    var t = game.time.elapsed;
    var sc = 1, ox = 0, oy = 0;
    if (w.state === 'splash') {
      var k = Math.min(1, (0.85 - w.stateT) / 0.5);
      sc = 1 - k * 0.6;
      if (w.stateT > 0.35) { game.draw.circle(w.bx, w.by, BALL_R * 1.3, '#ffffff', 0.6); }
      for (var d = 0; d < 6; d++) game.draw.circle(w.bx + Math.cos(d + t * 3) * 90 * k, w.by + Math.sin(d) * 40 * k, 16, '#ffffff', 0.8 * (1 - k));
    }
    if (w.state === 'idle') return;
    var hl = w.phase === 'stop' && !w.won;
    var r = BALL_R * sc * (hl ? 1.2 : 1);
    soft(w.bx + 16, w.by + r * 0.8, r * 0.95, 22, 0.12);
    game.draw.circle(w.bx + ox, w.by + oy, r, hl ? '#ffffff' : BALL_C);
    game.draw.circle(w.bx + ox + r * 0.12, w.by + oy + r * 0.12, r * 0.86, hl ? '#ffffff' : '#ff6a4a');
    // 転がると回る帯の模様
    var bandY = Math.sin(w.roll) * r * 0.6;
    if (Math.cos(w.roll) > 0) game.draw.rect(w.bx - r * 0.82, w.by + bandY - 9, r * 1.64, 18, '#ffffff', 0.85);
    game.draw.circle(w.bx - r * 0.35, w.by - r * 0.38, r * 0.22, '#ffffff', 0.7);
    if (w.state === 'roll' && !w.pushing && w.phase === 'run' && Math.hypot(w.vx, w.vy) < 10) {
      game.draw.circle(w.bx, w.by, r + 14 + Math.sin(t * 8) * 6, '#ffffff', 0.35);
    }
    if (w.state === 'home') game.draw.circle(w.bx, w.by, r + 30, GOLD, 0.25 + 0.2 * Math.sin(t * 12));
  }

  function drawMan() {
    var t = game.time.elapsed;
    var art = Math.floor(t * 2) % 4 === 3 ? MAN_B : MAN_A;
    var mx, my;
    if (w.pushing) {
      var dx = w.bx - w.fx, dy = w.by - w.fy, d = Math.hypot(dx, dy) || 1;
      mx = w.bx - dx / d * (BALL_R + 60); my = w.by - dy / d * (BALL_R + 60) + 10;
      art = MAN_PUSH;
    } else { mx = w.bx + BALL_R + 70; my = w.by + 50; }
    if (w.manPose > 0 || (w.phase === 'stop' && w.won)) art = MAN_JOY;
    if (MODE === 'RESULT' && !w.won) art = MAN_SAD;
    if (w.state === 'splash') art = MAN_SAD;
    var bob = w.pushing ? Math.abs(Math.sin(t * 16)) * 10 : Math.sin(t * 3) * 4;
    soft(mx, my + 60, 46, 12, 0.12);
    game.draw.sprite(art, PAL_MAN, mx, my - bob, 11, { anchor: 'center' });
  }

  function label(s, x, y, size, color) {
    game.draw.text(s, x + 3, y + 3, { size: size, color: '#ffffff', bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function drawStage() {
    drawPark();
    drawPedestal();
    drawBall();
    drawMan();
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, '#ffffff', 0.75);
    label('SCORE ' + w.score, W * 0.3, 74, 40, INK);
    label(w.homed + ' / ' + ROUNDS.length, W * 0.78, 74, 46, BALL_C);
    var frac = Math.max(0, w.clock / TIME_LIMIT);
    game.draw.rect(80, 132, W - 160, 20, '#dde4e8');
    game.draw.rect(80, 132, (W - 160) * frac, 20, frac < 0.2 ? RED : '#4ac08a');
    for (var i = 0; i < ROUNDS.length; i++) game.draw.circle(W / 2 - 80 + i * 80, 196, 20, i < w.homed ? BALL_C : '#dde4e8');
  }

  // ── ATTRACT(実物理 + ゴーストの押し) ────────────────
  // 1個目: 止まる位置が台座の中央に届いた所で離す(成功例) / 2個目: 押しすぎて池へ(失敗例)
  var demo = { t: 0, gx: W / 2, gy: H * 0.85, press: false, ux: 0, uy: -1, step: 0 };
  var DEMO_CYCLE = 7.8;
  function runDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) { w = freshWorld(true); w.phase = 'run'; placeBall(); demo.step = 0; }
    var R = ROUNDS[w.r];
    if (w.state === 'roll') {
      if (demo.step === 0) {
        var dx = R.px - w.bx, dy = R.py - w.by, d = Math.hypot(dx, dy) || 1;
        demo.ux = dx / d; demo.uy = dy / d;
      }
      // 押す向きは押し始めに決めて保つ(指は玉の後ろ側)
      var hx = w.bx - demo.ux * (BALL_R + 130), hy = w.by - demo.uy * (BALL_R + 130);
      demo.gx += (hx - demo.gx) * Math.min(1, dt * 8); demo.gy += (hy - demo.gy) * Math.min(1, dt * 8);
      if (demo.step === 0 && cyc > 0.6) { startPush(hx, hy); demo.step = 1; }
      if (w.pushing) {
        w.fx = hx; w.fy = hy;
        var stop = predictStop();
        var along = (stop.bx - R.px) * demo.ux + (stop.by - R.py) * demo.uy;
        if (along >= (w.r === 0 ? 0 : 400)) { endPush(); demo.step = 2; }
      }
    } else if (w.state === 'home' && w.stateT < 0.1) {
      w.state = 'roll'; w.r = 1; placeBall(); demo.step = 0;
    }
    demo.press = w.pushing;
    advance(dt);
  }

  function begin() {
    initGame();
    MODE = 'PLAYING';
    game.audio.play('se_coin', 0.5);
  }

  game.onTap(function (x, y) {
    if (MODE === 'ATTRACT') { begin(); return; }
    if (MODE === 'RESULT') { MODE = 'ATTRACT'; initGame(); demo.t = 0; game.audio.play('se_tap', 0.3); return; }
    if (w.state !== 'roll') game.audio.play('se_tap', 0.06);
  });

  game.onPress(function (x, y) {
    if (MODE !== 'PLAYING') return;
    if (startPush(x, y)) { game.audio.play('se_jump', 0.2); game.fx.burst(w.bx, w.by, { color: '#ffffff', count: 4, speed: 120 }); }
    else game.audio.play('se_tap', 0.05);
  });

  game.onMove(function (x, y) {
    if (!w || !w.pushing) return;
    w.fx = x; w.fy = y;
    if (Math.random() < 0.08) game.audio.tone(180, 0.03, { wave: 'triangle', volume: 0.04 });
  });

  game.onRelease(function (x, y) {
    if (MODE !== 'PLAYING') return;
    if (endPush()) game.audio.tone('E4', 0.06, { wave: 'triangle', volume: 0.08 });
  });

  game.onUpdate(function (dt) {
    if (!w) initGame();
    if (MODE === 'ATTRACT') {
      runDemo(dt);
      drawStage();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, 230, '#ffffff', 0.75);
      label(TITLE, W / 2, 92, 72, BALL_C);
      label('HI-SCORE ' + game.best, W / 2, 174, 34, INK);
      if (Math.floor(game.time.elapsed * 1.6) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.955, 40, BALL_C);
      else label('INSERT COIN', W / 2, H * 0.955, 34, INK);
      return;
    }
    if (MODE === 'RESULT') {
      drawStage();
      game.draw.rect(0, H * 0.48, W, H * 0.24, '#ffffff', 0.85);
      label(w.won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.53, 86, w.won ? GOLD : RED);
      label('SCORE ' + w.score, W / 2, H * 0.59, 50, INK);
      label(w.homed + ' / ' + ROUNDS.length + '   PERFECT ' + w.perfects, W / 2, H * 0.635, 36, '#3a8ad8');
      if (!w.won) label('あと' + (ROUNDS.length - w.homed) + '個!', W / 2, H * 0.68, 44, BALL_C);
      else if (w.score > game.best) label('NEW RECORD', W / 2, H * 0.68, 46, BALL_C);
      else label('BEST ' + game.best, W / 2, H * 0.68, 40, INK);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.955, 34, INK);
      return;
    }
    if (w.phase === 'ready') {
      w.readyT -= dt;
      if (w.readyT <= 0) { w.phase = 'run'; game.audio.play('se_tap', 0.3); }
    } else if (w.phase === 'run') {
      advance(dt);
    } else if (w.phase === 'stop') {
      w.stopT -= dt;
      if (w.stopT <= 0) settle();
    }
    drawStage();
    drawHud();
    if (w.phase === 'ready') {
      label(w.readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.56, 96, BALL_C);
      game.draw.hand(w.bx, w.by + BALL_R + 120, { press: true, scale: 12, alpha: 0.7 });
    }
  });

  game.onStart(function () {
    // 朝の公園ののどかな行進
    game.audio.melody([
      ['C5', 0.5], ['G4', 0.5], ['A4', 0.5], ['E4', 0.5], ['F4', 0.5], ['G4', 0.5], ['C5', 1],
      ['D5', 0.5], ['B4', 0.5], ['G4', 0.5], ['A4', 0.5], ['B4', 0.5], ['D5', 0.5], ['C5', 1],
    ], { tempo: 126, wave: 'sine', volume: 0.07, loop: true, bass: [['C3', 2], ['F2', 2], ['G2', 2], ['C3', 2]], bassVolume: 0.06 });
    MODE = 'ATTRACT';
    initGame();
    demo.t = 0;
  });
})(game);
