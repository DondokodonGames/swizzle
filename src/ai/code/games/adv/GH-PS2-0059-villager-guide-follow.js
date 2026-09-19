// GH-PS2-0059-villager-guide-follow.js
// ヴィレッジャー・ガイド — 指でなぞって、隠れるべき村人を安全な影へそっと導く
// 操作: 村人は指の位置にゆっくり追従する。速く動かすほどランタンの灯りが強まり見つかりやすくなるので、なめらかに動かす
// 終わり: 巡回の光が2回とも影の中でやり過ごせて出口に着けば成功。光に見つかるか制限時間切れで失敗
// @mechanic: drag_follow
// @theme: night_patrol_hideaway
// 世界観: 夜の村。巡回の光が定期的に走査線のように通る。ランタンを持つ村人を指でなぞって影の中へ導き、光をやり過ごしながら出口へ運ぶ
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達した進行度%
// スタイル: 90s LOW POLY

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 90s LOW POLY: 面ベタ塗り。輪郭はline、面は横1pxストリップ塗り。遠景はフォグ色の矩形
  var C = {
    fog: '#141c2c', night: '#0c1220', ground: '#22304a', groundEdge: '#101828',
    shadow: '#0a1424', shadowEdge: '#050a14',
    villager: '#e8c060', lanternGlow: '#ffdf80', sweepLight: '#dff0ff',
    good: '#5fe0a0', bad: '#ff5a6a', gold: '#ffd24a', ink: '#04070c', white: '#e8ecf4',
  };

  var GAME_TITLE = 'NIGHT GUIDE';
  var MAX_TIME = 20;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var vx, vy, tx, ty, noise, caughtSweep, timeLeft, sweepIdx, sweepT, sweepPhase, sweepAngle;
  var goalReached, done, endWait, finished, ready, hitStop, shake;

  // シェルターの影ゾーン(等角の床の上に置かれた矩形の影)
  var SHADOWS = [
    { x: W * 0.28, y: H * 0.42, w: 190, h: 130 },
    { x: W * 0.68, y: H * 0.32, w: 210, h: 150 },
    { x: W * 0.50, y: H * 0.58, w: 220, h: 140 },
  ];
  var START = { x: W * 0.5, y: H * 0.68 };
  var GOAL = { x: W * 0.5, y: H * 0.20, r: 80 };

  // 巡回サーチライトが「ロックする」タイミング(秒)。0.6秒前から予告する
  var SWEEP_TIMES = [6, 13];

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function stripFill(x, y, w, h, color, alpha) {
    for (var i = 0; i < h; i += 4) game.draw.rect(x, y + i, w, 4, color, alpha);
  }

  function inShadow(px, py) {
    for (var i = 0; i < SHADOWS.length; i++) {
      var s = SHADOWS[i];
      if (px > s.x - s.w / 2 && px < s.x + s.w / 2 && py > s.y - s.h / 2 && py < s.y + s.h / 2) return true;
    }
    return false;
  }

  function nightBg() {
    game.draw.gradient(0, H, [[0, C.fog], [0.6, C.night], [1, '#080c16']]);
    stripFill(0, H * 0.14, W, H * 0.72, C.ground, 0.9);
    game.draw.rect(0, H * 0.14, W, 6, C.groundEdge, 0.8);
    for (var i = 0; i < SHADOWS.length; i++) {
      var s = SHADOWS[i];
      stripFill(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, C.shadow, 0.9);
      game.draw.line(s.x - s.w / 2, s.y - s.h / 2, s.x + s.w / 2, s.y - s.h / 2, C.shadowEdge, 3);
    }
    game.draw.circle(GOAL.x, GOAL.y, GOAL.r, C.groundEdge, 0.6);
  }

  var VILLAGER_F0 = ['.#.', '###', '.#.', '#.#'];
  var VILLAGER_F1 = ['.#.', '###', '.#.', '.#.'];

  function drawVillager(x, y, frame, lit) {
    game.draw.sprite(frame ? VILLAGER_F1 : VILLAGER_F0, { '#': C.villager }, x, y, 16, { anchor: 'center' });
    if (lit) game.draw.circle(x, y - 20, 30 + noise * 24, C.lanternGlow, 0.35 + noise * 0.35);
  }

  function drawSweep(dt2) {
    if (sweepPhase === 'warn') {
      // telegraph: 点滅する警告ライン(0.5〜0.8秒前)
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        game.draw.rect(0, sweepAngle - 4, W, 8, C.sweepLight, 0.5);
      }
    } else if (sweepPhase === 'lock') {
      game.draw.rect(0, sweepAngle - 40, W, 80, C.sweepLight, 0.35);
      game.draw.line(0, sweepAngle, W, sweepAngle, C.white, 4);
    }
  }

  function initGame() {
    vx = START.x; vy = START.y; tx = vx; ty = vy; noise = 0;
    timeLeft = MAX_TIME; sweepIdx = 0; sweepPhase = 'idle'; sweepT = 0; sweepAngle = H * 0.30;
    goalReached = false; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function fail(reason, x, y) {
    finished = true; ok = false;
    hitStop = 0.35; shake = 0.28;
    game.feedback.bad(x, y, { text: reason });
    game.audio.play('se_failure', 0.4);
    finish();
  }

  function succeed() {
    finished = true; ok = true;
    hitStop = 0.2;
    game.feedback.good(vx, vy, { text: 'CLEAR', color: C.good });
    game.fx.burst(vx, vy, { color: C.gold, count: 20, speed: 400 });
    game.audio.play('se_success', 0.5);
    finish();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function onDrag(px, py) {
    if (finished || done || ready > 0) return;
    tx = px; ty = py;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.press = false; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.04); onDrag(x, y); } });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING) return;
    if (Math.random() < 0.06) game.audio.play('se_tap', 0.02);
    onDrag(x, y);
  });

  function stepPlay(dt) {
    // 村人は指の目標へイージングで追従(drag_follow)。速く動かすほどノイズ(発覚率)が上がる
    var dx = tx - vx, dy = ty - vy;
    var dist = Math.hypot(dx, dy);
    var speed = Math.min(1, dist / 40);
    vx += dx * Math.min(1, dt * 6);
    vy += dy * Math.min(1, dt * 6);
    noise += (speed * 1.4 - noise) * Math.min(1, dt * 3);
    noise = Math.max(0, Math.min(1, noise));

    timeLeft -= dt;
    if (timeLeft <= 0) { fail('TIME UP', vx, vy); return; }

    // 巡回サーチライト: 予告(0.6秒)→ロック(判定)
    if (sweepIdx < SWEEP_TIMES.length) {
      var target = SWEEP_TIMES[sweepIdx];
      var toEvent = target - (MAX_TIME - timeLeft);
      if (sweepPhase === 'idle' && toEvent <= 0.6) {
        sweepPhase = 'warn';
        game.audio.tone(220, 0.15, { wave: 'sawtooth', volume: 0.12 });
      }
      if (sweepPhase === 'warn' && toEvent <= 0) {
        sweepPhase = 'lock';
        sweepAngle = H * (sweepIdx === 0 ? 0.30 : 0.46);
        var hidden = inShadow(vx, vy) && noise < 0.5;
        if (!hidden) { fail('FOUND', vx, vy); return; }
        game.fx.popup('CLEAR ' + (sweepIdx + 1) + ' / 2', vx, vy - 100, { color: C.gold, size: 36 });
        game.audio.play('se_milestone', 0.4);
        sweepIdx++;
        sweepPhase = 'idle';
      }
    }

    if (Math.hypot(vx - GOAL.x, vy - GOAL.y) < GOAL.r && sweepIdx >= SWEEP_TIMES.length) {
      succeed();
    }
  }

  // ── ATTRACT ゴースト実演: 影へ滑らかに導いて光をやり過ごす成功、速く動かして見つかる危険例 ──
  var demo = { t: 0, gx: START.x, gy: START.y, press: true };
  var dvx, dvy, dnoise, dsweep;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.2;
    if (cyc < dt || demo.t <= dt) { dvx = START.x; dvy = START.y; dnoise = 0; dsweep = 'idle'; }
    var path = [
      { x: START.x, y: START.y, t: 0 },
      { x: SHADOWS[2].x, y: SHADOWS[2].y, t: 1.4 },
      { x: SHADOWS[2].x, y: SHADOWS[2].y, t: 2.2 },
      { x: W * 0.75, y: H * 0.30, t: 3.6 },
    ];
    var gx = START.x, gy = START.y;
    for (var i = 1; i < path.length; i++) {
      if (cyc <= path[i].t) {
        var t0 = path[i - 1].t, t1 = path[i].t;
        var f = t1 > t0 ? Math.min(1, (cyc - t0) / (t1 - t0)) : 1;
        gx = path[i - 1].x + (path[i].x - path[i - 1].x) * f;
        gy = path[i - 1].y + (path[i].y - path[i - 1].y) * f;
        break;
      }
      gx = path[i].x; gy = path[i].y;
    }
    demo.gx = gx; demo.gy = gy; demo.press = true;
    var dx = gx - dvx, dy = gy - dvy;
    dvx += dx * Math.min(1, dt * 6); dvy += dy * Math.min(1, dt * 6);
    var moveSpd = cyc > 2.8 && cyc < 3.6 ? 1 : 0.15;
    dnoise += (moveSpd - dnoise) * Math.min(1, dt * 3);
    vx = dvx; vy = dvy; noise = dnoise;

    if (cyc > 1.6 && cyc < 2.2) sweepPhase = cyc < 1.9 ? 'warn' : 'lock'; else if (cyc < 3.9) sweepPhase = 'idle';
    sweepAngle = H * 0.30;
    if (cyc > 1.90 && cyc < 1.95) game.fx.popup('CLEAR 1 / 2', dvx, dvy - 100, { color: C.gold, size: 32 });

    if (cyc > 3.6 && cyc < 4.2) { sweepPhase = cyc < 3.9 ? 'warn' : 'lock'; sweepAngle = H * 0.46; }
    if (cyc > 3.90 && cyc < 3.95) game.feedback.bad(dvx, dvy, { text: 'FOUND' });
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (vx === undefined) initGame();
      nightBg();
      stepDemo(dt);
      drawSweep(dt);
      drawVillager(vx, vy, Math.floor(game.time.elapsed * 3) % 2, noise > 0.3);
      game.draw.hand(demo.gx + Math.sin(game.time.elapsed * 2.3) * 12, demo.gy + Math.cos(game.time.elapsed * 1.7) * 12, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + '%' : '-'), W / 2, H * 0.10, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      nightBg();
      drawVillager(vx, vy, 0, false);
      var pct = Math.round((sweepIdx / SWEEP_TIMES.length) * 100);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 48, ok ? C.good : C.bad);
      txt(pct + ' / 100', W / 2, H * 0.10, 28, C.white);
      if (!ok && sweepIdx === SWEEP_TIMES.length - 1) txt('あと少し!', W / 2, H * 0.14, 26, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct2 = Math.round((sweepIdx / SWEEP_TIMES.length) * 100);
        if (ok) game.end.success({ pct: 100 }); else game.end.failure({ pct: pct2 });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepPlay(dt);
    }
    if (shake > 0) shake -= dt;

    nightBg();
    drawSweep(dt);
    drawVillager(vx, vy, Math.floor(game.time.elapsed * 3) % 2, noise > 0.3);

    game.draw.rect(60, H * 0.09, W - 120, 14, C.white, 0.2);
    game.draw.rect(60, H * 0.09, (W - 120) * (timeLeft / MAX_TIME), 14, C.gold);
    txt(sweepIdx + ' / ' + SWEEP_TIMES.length, W / 2, H * 0.06, 30, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D3', 0.6], ['F3', 0.4], ['A3', 0.6], ['G3', 0.4]], { tempo: 84, wave: 'triangle', volume: 0.05, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
