// D-20092012-0008-hillside-bounce-toss.js
// ヒルサイド・バウンストス — 丸い苔玉を丘の斜面へ勢いよく弾き飛ばし、弾みながら遠くの旗まで届ける
// 操作: 苔玉の上で指を押さえ、丘の下方向へ素早くフリック(はじく)して勢いをつける
// 終わり: 弾かれた苔玉が旗のラインを越えれば成功。勢い不足で手前に止まれば失敗
// @mechanic: flick_launch
// @theme: hillside_bounce_toss
// 世界観: 起伏する緑の丘。丸い苔玉を一気にはじき飛ばし、斜面のこぶで弾みをつけながら遠くの旗まで転がす一投勝負
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達距離%
// スタイル: HYPERCASUAL 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 白〜淡色背景 + 単色の丸い塊、真下に柔らかい影
  var C = {
    bg1: '#eaf6e0', bg2: '#cdeab8', hill: '#8fd06a', hillEdge: '#6fb84e',
    moss: '#4caf50', mossDark: '#357a38', shadow: '#00000022',
    flag: '#ff5a4a', flagPole: '#7a6a58', accent: '#ffb020', good: '#2ecc71', bad: '#ff4d5e',
    gold: '#ffb020', white: '#ffffff', ink: '#1a2a14',
  };

  var GAME_TITLE = 'HILL BOUNCE';
  var CX = W * 0.5;
  var START_Y = H * 0.22, GOAL_Y = H * 0.80;
  var GOAL_FRAC = 0.92; // これ以上進めばCLEAR
  var MIN_SPEED = 500, MAX_SPEED = 2400; // px/s フリック速度域

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var MOSS = ['.####.', '######', '#.##.#', '######', '.####.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    for (var i = 0; i < 3; i++) {
      var yy = H * (0.15 + i * 0.28);
      game.draw.circle(W * (i % 2 === 0 ? 0.18 : 0.82), yy, 110, C.hill, 0.35);
    }
  }

  function drawHill() {
    // 帯状ストリップで斜面を塗る(HYPERCASUAL 3Dの単色塊表現に合わせ帯は控えめ)
    game.draw.rect(0, START_Y - 40, W, GOAL_Y - START_Y + 140, C.hill, 0.5);
    game.draw.rect(0, START_Y - 40, W, 10, C.hillEdge, 0.6);
  }

  // 弾む経路: 上から下へ軽くジグザグしながら丘のこぶを越える
  var BUMPS = [0.15, 0.34, 0.52, 0.70, 0.88];

  function pathXY(frac) {
    var y = START_Y + (GOAL_Y - START_Y) * frac;
    var sway = Math.sin(frac * Math.PI * 3) * 90;
    return { x: CX + sway, y: y };
  }

  function drawFlag() {
    var fy = START_Y + (GOAL_Y - START_Y) * GOAL_FRAC;
    game.draw.line(CX + 260, fy, CX + 260, fy - 130, C.flagPole, 8);
    var wave = Math.sin(game.time.elapsed * 6) * 10;
    game.draw.line(CX + 260, fy - 130, CX + 260 + 70 + wave, fy - 105, C.flag, 40);
  }

  function drawBall(frac, bounceH) {
    var p = pathXY(Math.min(1, frac));
    var by = p.y - Math.max(0, bounceH);
    game.draw.circle(p.x, p.y + 8, 34, C.shadow);
    game.draw.sprite(MOSS, { '#': C.moss }, p.x, by, 11, { anchor: 'center' });
    return p;
  }

  var progress, flightT, flightDur, bouncePhase, flickPower, flickOk, done, endWait, finished;
  var ready, hitStop, shake, milestoneDone, ballRestY;

  function initGame() {
    progress = 0; flightT = 0; flightDur = 0; bouncePhase = 0; flickPower = 0; flickOk = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneDone = false;
    ballRestY = 0;
  }

  var pressStart = null;
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    pressStart = { x: x, y: y, t: game.time.elapsed };
    game.audio.play('se_tap', 0.05);
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished || !pressStart) return;
    game.audio.play('se_tap', 0.08);
    resolveFlick(pressStart.x, pressStart.y, x, y, game.time.elapsed - pressStart.t);
    pressStart = null;
  });

  function resolveFlick(x0, y0, x1, y1, dt) {
    if (finished) return;
    dt = Math.max(0.03, dt);
    var dx = x1 - x0, dy = y1 - y0;
    var dist = Math.hypot(dx, dy);
    var speed = dist / dt;
    var angle = Math.atan2(dy, dx); // 下方向フリックほど angle が +90°(PI/2)寄り
    var downward = dy > 0;
    var angleGood = downward && Math.abs(angle - Math.PI / 2) < (Math.PI / 2.6);
    var speedFrac = Math.max(0, Math.min(1, (speed - MIN_SPEED) / (MAX_SPEED - MIN_SPEED)));
    flickOk = angleGood && speed >= MIN_SPEED;
    flickPower = flickOk ? Math.max(0.35, speedFrac) : speedFrac * 0.5;
    launch();
  }

  function launch() {
    finished = true; // 入力は一投のみ
    flightT = 0;
    flightDur = 1.4 + flickPower * 1.6;
    bouncePhase = 0;
    game.audio.play('se_jump', 0.4);
    game.feedback.good(CX, START_Y, { text: 'GO!', color: C.gold, count: 6 });
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function updateFlight(dt) {
    if (flightDur <= 0) return;
    flightT += dt;
    var p = Math.min(1, flightT / flightDur);
    // 進捗は「到達フラクション」= flickPower / 到達に必要な閾値 に time-easeを掛ける
    var targetFrac = Math.min(1.08, flickPower / 0.62);
    progress = targetFrac * easeOutP(p);
    // バウンド(弾み)の見た目: 距離に応じ複数回跳ねる
    var bounceIdx = Math.floor(p * BUMPS.length);
    var bouncePos = (p * BUMPS.length) % 1;
    bouncePhase = Math.sin(bouncePos * Math.PI) * (140 - bounceIdx * 18);
    if (bouncePos < 0.06 && bounceIdx > 0 && !milestoneDone && progress > 0.45) {
      milestoneDone = true;
      game.fx.popup('あと少し!', CX, START_Y + 100, { color: C.gold, size: 34 });
      game.audio.play('se_milestone', 0.3);
    }
    if (p >= 1) {
      resolveLanding();
    }
  }

  function easeOutP(p) { return 1 - Math.pow(1 - p, 2); }

  function resolveLanding() {
    if (done) return;
    ok = progress >= GOAL_FRAC;
    hitStop = ok ? 0.15 : 0.35;
    var ballPos = pathXY(Math.min(1, progress));
    if (ok) {
      game.feedback.good(ballPos.x, ballPos.y, { text: 'CLEAR', color: C.good, count: 14 });
      game.fx.burst(ballPos.x, ballPos.y, { color: C.gold, count: 20, speed: 380 });
    } else {
      shake = 0.25;
      game.feedback.bad(ballPos.x, ballPos.y, { text: 'MISS' });
    }
    finish();
  }

  var demo = { t: 0, gx: CX, gy: H * 0.9, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.8;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; }
    if (cyc < 0.7) {
      // 待機: 苔玉の上で手が揺れながら構える
      var bx = pathXY(0).x, by = pathXY(0).y;
      demo.gx = bx + Math.cos(game.time.elapsed * 2) * 20;
      demo.gy = by + Math.sin(game.time.elapsed * 3) * 20;
      demo.press = false;
    } else if (cyc < 1.05) {
      // フリック動作
      var t2 = (cyc - 0.7) / 0.35;
      var bx2 = pathXY(0).x, by2 = pathXY(0).y;
      demo.gx = bx2 + t2 * 40;
      demo.gy = by2 + t2 * 260;
      demo.press = true;
      if (t2 > 0.9 && !finished) { flickPower = 0.85; flickOk = true; launch(); }
    } else {
      demo.press = false;
      if (finished) updateFlight(dt);
      var pp = pathXY(Math.min(1, progress || 0));
      demo.gx = pp.x; demo.gy = pp.y - 80;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      bg();
      drawHill();
      drawFlag();
      stepDemo(dt);
      drawBall(Math.min(1, progress || 0), bouncePhase);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best + '%' : '-'), W / 2, H * 0.12, 24, C.accent);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.accent);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg(); drawHill(); drawFlag();
      drawBall(Math.min(1, progress), 0);
      var pctShow = Math.round(Math.min(1, progress) / GOAL_FRAC * 100);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(Math.min(100, pctShow) + ' / 100', W / 2, H * 0.13, 32, C.accent);
      if (!ok) txt('あと少し!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pctEnd = Math.round(Math.min(1, progress) / GOAL_FRAC * 100);
        if (ok) game.end.success(Math.min(100, pctEnd), { pct: Math.min(100, pctEnd) });
        else game.end.failure({ pct: Math.min(100, pctEnd) });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (finished) {
      updateFlight(dt);
    }
    if (shake > 0) shake -= dt;

    bg(); drawHill(); drawFlag();
    drawBall(Math.min(1, progress || 0), bouncePhase);

    var pctBar = Math.round(Math.min(1, (progress || 0)) / GOAL_FRAC * 100);
    txt(Math.min(100, pctBar) + ' / 100', W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.15);
    game.draw.rect(60, 150, (W - 120) * Math.min(1, pctBar / 100), 16, C.gold);
    if (!finished && ready <= 0) {
      var restBob = Math.sin(game.time.elapsed * 3) * 6;
      game.draw.circle(CX, START_Y + restBob, 60, C.accent, 0.18 + 0.06 * Math.sin(game.time.elapsed * 4));
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_cute', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
