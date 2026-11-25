// J-N6434-0028-kiln-ember-relay.js
// 窯の火種リレー — 自分の担当区間を走り、干してある壺を跳び越え、受け渡し帯で次の走者へ火種をつなぐ
// 操作: タップでジャンプして壺を越える。最後の光る受け渡し帯に入ったらタップで火種を渡す(社内メモ。画面には出さない)
// 終わり: 受け渡し帯で火種を渡せば成功。3回つまずいて火種が消える/帯を通り過ぎる/時間切れで失敗
// @mechanic: camera_run
// @theme: kiln_ember_relay
// 世界観: 焼き物の里の火祭りで、トカゲの走者が窯から窯へ火種を運ぶリレーの一区間を受け持ち、乾かし中の壺をよけて次の走者が待つ受け渡し帯まで火を絶やさず届ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 区間タイム・越えた壺の数・受け渡しの精度
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: 限定5色、大きいドット、差し色は火種の橙1色だけ
  var STYLE = {
    bg: ['#1b1740', '#3a2f6b', '#f2e6c9'],
    main: ['#f2e6c9', '#6b5bb0', '#2a2352'],
    accent: ['#ff7a1a', '#ffd166'],
  };
  var C = {
    night: STYLE.bg[0], dusk: STYLE.bg[1], cream: STYLE.bg[2],
    lilac: STYLE.main[1], deep: STYLE.main[2],
    ember: STYLE.accent[0], glow: STYLE.accent[1],
    ink: '#120f2a',
  };

  var GAME_TITLE = 'EMBER RELAY';
  var TIME_LIMIT = 16;
  var ZONE_START = 108, ZONE_END = 114;   // m
  var PX = 60;
  var RUN_X = W * 0.26;
  var GROUND_Y = H * 0.62;
  var JUMP_V = 1600, GRAV = 4200;
  var LIVES = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  // ── スプライト(大きいドット) ─────────────────────────
  var LIZARD = [
    ['....ccc.', '...cckc.', 'tttccccc', '...cccc.', '..cc.cc.', '..c...c.'],
    ['....ccc.', '...cckc.', 'tttccccc', '...cccc.', '...cc...', '..c..c..'],
    ['....ccc.', '...cckc.', '.ttccccc', 'tt.cccc.', '..cccc..', '........'],
  ];
  var LIZ_PAL = { c: '#f2e6c9', k: '#120f2a', t: '#6b5bb0' };
  var MATE_PAL = { c: '#6b5bb0', k: '#f2e6c9', t: '#f2e6c9' };
  var TORCH = [['.o.', 'ooo', '.y.', '.l.'], ['o..', 'ooo', '.y.', '.l.']];
  var TORCH_PAL = { o: '#ff7a1a', y: '#ffd166', l: '#6b5bb0' };
  var POT = ['.cccc.', 'cc..cc', 'cccccc', 'cllllc', 'cccccc', '.cccc.'];
  var POT_PAL = { c: '#f2e6c9', l: '#6b5bb0' };
  var KILN = ['...cc...', '..cccc..', '.cccccc.', 'cccccccc', 'cc.oo.cc', 'cc.oo.cc', 'cccccccc'];
  var SMOKE = ['.l.', 'lll', '.l.'];

  // ── 状態 ─────────────────────────────────────────
  var dist, speed, y, vy, onGround, obstacles, lives, cleared, timeLeft, runT, stunT, invT;
  var ready, phase, stopT, doneT, ok, endReason, focus, passGrade, halfShown, nextObs;

  function txt(str, x, yy, sz, color, align) {
    game.draw.text(str, x + 4, yy + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, yy, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function initGame(demoMode) {
    dist = 0; speed = 8.5; y = 0; vy = 0; onGround = true; lives = LIVES; cleared = 0;
    timeLeft = TIME_LIMIT; runT = 0; stunT = 0; invT = 0;
    ready = demoMode ? 0 : 0.8; phase = demoMode ? 'run' : 'ready';
    stopT = 0; doneT = 0; ok = false; endReason = ''; focus = null; passGrade = ''; halfShown = false;
    obstacles = []; nextObs = 14;
    while (nextObs < ZONE_START - 12) {
      var tall = nextObs > 45 && Math.random() < 0.35;
      var dbl = !tall && nextObs > 70 && Math.random() < 0.3;
      obstacles.push({ d: nextObs, h: tall ? 170 : 110, w: dbl ? 150 : 80, tall: tall, dbl: dbl, hit: false, passed: false });
      nextObs += 8 + Math.random() * 6;
    }
  }

  // タップ: 地上ならジャンプ、受け渡し帯の中なら火種を渡す(プレイヤーもデモAIも共通)
  function act(live) {
    if (phase !== 'run') return;
    var rx = RUN_X + 40, ry = GROUND_Y - y - 120;
    if (dist >= ZONE_START - 0.5 && dist <= ZONE_END) {
      var mid = (ZONE_START + ZONE_END) / 2;
      var off = Math.abs(dist - mid);
      passGrade = off < 1 ? 'PERFECT' : off < 2.2 ? 'GOOD' : 'NICE';
      phase = 'stop'; stopT = 0.7; ok = true; endReason = 'clear'; focus = null;
      if (live) {
        game.audio.stopBgm();
        game.feedback.good(rx + 120, ry - 60, { text: passGrade, color: C.glow, size: 70, count: 24 });
        game.audio.play('se_success', 0.55);
      } else game.fx.burst(rx + 120, ry, { color: C.ember, count: 16, speed: 260 });
      return;
    }
    if (onGround && stunT <= 0) {
      vy = JUMP_V; onGround = false;
      if (live) { game.audio.play('se_jump', 0.3); game.fx.burst(RUN_X, GROUND_Y, { color: C.cream, count: 5, speed: 120 }); }
      else game.fx.burst(RUN_X, GROUND_Y, { color: C.cream, count: 4, speed: 100 });
    } else if (live) {
      game.audio.play('se_tap', 0.1);
    }
  }

  function stumble(o, live) {
    o.hit = true; lives--; stunT = 0.45; invT = 0.9; speed = 4;
    focus = o;
    if (lives <= 0) {
      phase = 'stop'; stopT = 0.6; ok = false; endReason = 'out';
      if (live) {
        game.audio.stopBgm();
        game.feedback.bad(RUN_X, GROUND_Y - 200, { text: 'MISS', color: C.ember, shake: 14 });
        game.audio.play('se_failure', 0.5);
      } else game.fx.burst(RUN_X, GROUND_Y - 100, { color: C.ember, count: 12, speed: 240 });
      return;
    }
    if (live) {
      game.audio.play('se_break', 0.4);
      game.feedback.bad(RUN_X, GROUND_Y - 200, { text: 'MISS', color: C.ember, shake: 10 });
    } else game.fx.burst(RUN_X, GROUND_Y - 100, { color: C.ember, count: 8, speed: 200 });
  }

  function stepWorld(dt, live) {
    if (invT > 0) invT -= dt;
    if (phase !== 'run') return;
    runT += dt;
    if (live) timeLeft = Math.max(0, TIME_LIMIT - runT);
    // 加速: 8.5 → 12 m/s。つまずき後は 4 m/s から立て直す
    var target = Math.min(12, 8.5 + dist * 0.035);
    if (stunT > 0) stunT -= dt;
    else speed += (target - speed) * Math.min(1, dt * 1.6);
    dist += speed * dt;
    // ジャンプ
    if (!onGround) {
      y += vy * dt; vy -= GRAV * dt;
      if (y <= 0) { y = 0; vy = 0; onGround = true; }
    }
    // 障害物
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      var ox = RUN_X + (o.d - dist) * PX;
      if (!o.hit && !o.passed && invT <= 0 && ox < RUN_X + 45 && ox + o.w > RUN_X - 45 && y < o.h - 10) {
        stumble(o, live);
        if (phase !== 'run') return;
      }
      if (!o.passed && ox + o.w < RUN_X - 45) {
        o.passed = true;
        if (!o.hit) {
          cleared++;
          if (live) game.feedback.good(RUN_X, GROUND_Y - y - 220, { text: o.tall || o.dbl ? 'NICE' : 'GOOD', color: C.glow, size: 40, count: 6, sound: 'se_coin', volume: 0.25 });
        }
      }
    }
    if (live && !halfShown && dist >= ZONE_START / 2) {
      halfShown = true;
      game.audio.play('se_milestone', 0.4);
      game.fx.popup('50m', W / 2, H * 0.30, { color: C.glow, size: 64 });
    }
    // 受け渡し帯の予告(帯の手前で鈴)
    if (live && dist >= ZONE_START - 10 && dist - speed * dt < ZONE_START - 10) game.audio.tone('A5', 0.12, { wave: 'triangle', volume: 0.08 });
    if (dist > ZONE_END) {
      phase = 'stop'; stopT = 0.6; ok = false; endReason = 'over'; focus = 'zone';
      if (live) {
        game.audio.stopBgm();
        game.feedback.bad(RUN_X, GROUND_Y - 200, { text: 'MISS', color: C.ember, shake: 10 });
        game.audio.play('se_failure', 0.5);
      }
      return;
    }
    if (live && timeLeft <= 0) {
      phase = 'stop'; stopT = 0.6; ok = false; endReason = 'time'; focus = null;
      game.audio.stopBgm();
      game.feedback.bad(RUN_X, GROUND_Y - 200, { text: 'TIME UP', color: C.ember, shake: 8 });
      game.audio.play('se_failure', 0.5);
    }
  }

  // ── 描画 ─────────────────────────────────────────
  function drawBack() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.night], [0.55, C.dusk], [0.62, C.dusk], [0.63, C.deep], [1, C.night]]);
    game.draw.rect(0, 0, W, H, C.ember, 0.03 + 0.03 * Math.sin(t * 1.4));
    // 窯の遠景(パララックス)と煙
    var off = (dist * PX * 0.3) % 520;
    for (var i = -1; i < 4; i++) {
      var kx = i * 520 - off + 200;
      game.draw.sprite(KILN, { c: C.lilac, o: C.ember }, kx, GROUND_Y - 190, 24, { anchor: 'center', alpha: 0.7 });
      for (var s = 0; s < 3; s++) {
        var sy = (t * 60 + s * 70) % 210;
        game.draw.sprite(SMOKE, { l: C.lilac }, kx + Math.sin(t * 2 + s) * 20, GROUND_Y - 300 - sy, 14, { anchor: 'center', alpha: 0.5 - sy / 500 });
      }
    }
    // 地面のタイル(大きいドット)
    var goff = (dist * PX) % 120;
    for (var gx = -goff; gx < W; gx += 120) {
      game.draw.rect(gx, GROUND_Y + 10, 112, 24, C.lilac);
      game.draw.rect(gx + 20, GROUND_Y + 54, 72, 16, C.dusk);
    }
  }

  function drawZone() {
    var zx = RUN_X + (ZONE_START - dist) * PX;
    var zw = (ZONE_END - ZONE_START) * PX;
    if (zx > W + 50 || zx + zw < -50) return;
    var t = game.time.elapsed;
    var blink = Math.floor(t * 6) % 2 === 0;
    game.draw.rect(zx, GROUND_Y - 6, zw, 20, blink ? C.glow : C.ember);
    game.draw.rect(zx + zw * 0.33, GROUND_Y - 12, zw * 0.34, 8, C.cream);
    if (focus === 'zone') game.draw.rect(zx, GROUND_Y - 300, zw, 300, C.cream, 0.25 + 0.2 * Math.sin(t * 30));
    // 次の走者(待っている仲間)
    var f = Math.floor(t * 4) % 2;
    var mx = zx + zw + 60;
    game.draw.sprite(LIZARD[f === 0 ? 2 : 0], MATE_PAL, mx, GROUND_Y - 60 - (f ? 12 : 0), 18, { anchor: 'center' });
  }

  function drawObstacles() {
    var t = game.time.elapsed;
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      var ox = RUN_X + (o.d - dist) * PX;
      if (ox > W + 40 || ox + o.w < -40) continue;
      var hl = focus === o && phase !== 'run';
      if (hl) game.draw.circle(ox + o.w / 2, GROUND_Y - o.h / 2, 150, C.cream, 0.35 + 0.3 * Math.sin(t * 30));
      var n = o.dbl ? 2 : 1;
      for (var k = 0; k < n; k++) {
        var px = ox + k * 75;
        if (o.tall) {
          game.draw.sprite(POT, POT_PAL, px + 40, GROUND_Y - 50, 14, { anchor: 'center', alpha: o.hit ? 0.5 : 1 });
          game.draw.sprite(POT, POT_PAL, px + 40, GROUND_Y - 140, 12, { anchor: 'center', alpha: o.hit ? 0.5 : 1 });
        } else {
          game.draw.sprite(POT, POT_PAL, px + 40, GROUND_Y - 50, 14, { anchor: 'center', alpha: o.hit ? 0.5 : 1 });
        }
      }
      // 画面右端に入る直前の予告マーク
      if (ox > W - 260 && ox < W + 40 && Math.floor(t * 10) % 2 === 0) game.draw.rect(W - 30, GROUND_Y - o.h, 16, o.h - 20, C.ember);
    }
  }

  function drawRunner() {
    var t = game.time.elapsed;
    var f = !onGround ? 2 : Math.floor(t * (6 + speed)) % 2;
    var blink = invT > 0 && Math.floor(t * 20) % 2 === 0;
    var sad = phase !== 'run' && !ok && endReason === 'out';
    var ry = GROUND_Y - y - 60;
    var idle = phase === 'run' ? Math.sin(t * 14) * 4 : Math.sin(t * 4) * 6;
    game.draw.circle(RUN_X, GROUND_Y + 8, 50 - Math.min(30, y / 10), C.ink, 0.35);
    game.draw.sprite(LIZARD[f], LIZ_PAL, RUN_X, ry + idle, 18, { anchor: 'center', alpha: blink ? 0.4 : 1, flipY: sad });
    // 火種(残り火の数で大きさが変わる)
    if (!sad) {
      var tf = Math.floor(t * 10) % 2;
      game.draw.circle(RUN_X + 70, ry - 70 + idle, 24 + lives * 10 + Math.sin(t * 20) * 4, C.ember, 0.3);
      game.draw.sprite(TORCH[tf], TORCH_PAL, RUN_X + 70, ry - 50 + idle, 14, { anchor: 'center' });
    }
  }

  function drawPad() {
    // 親指ゾーン: 跳ぶ/渡すボタン(帯の中では火種マークに変わる)
    var t = game.time.elapsed;
    var inZone = dist >= ZONE_START - 0.5 && dist <= ZONE_END;
    var by = H * 0.84;
    game.draw.circle(W / 2, by, 150, C.deep);
    game.draw.circle(W / 2, by, 128, inZone ? C.ember : C.lilac, 0.8 + 0.2 * Math.sin(t * 6));
    if (inZone) game.draw.sprite(TORCH[Math.floor(t * 10) % 2], TORCH_PAL, W / 2, by, 22, { anchor: 'center' });
    else game.draw.sprite(LIZARD[2], LIZ_PAL, W / 2, by - (onGround ? 0 : 30), 14, { anchor: 'center' });
  }

  function drawHud() {
    txt(Math.floor(Math.min(dist, ZONE_END)) + ' / ' + ZONE_START + 'm', W / 2, 70, 50, C.cream);
    game.draw.rect(80, 120, W - 160, 20, C.deep);
    game.draw.rect(80, 120, (W - 160) * Math.min(1, dist / ZONE_START), 20, C.ember);
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 154, W - 160, 12, C.deep);
    game.draw.rect(80, 154, (W - 160) * (timeLeft / TIME_LIMIT), 12, low ? C.ember : C.cream);
    for (var i = 0; i < LIVES; i++) game.draw.sprite(TORCH[0], TORCH_PAL, 110 + i * 60, 205, 9, { anchor: 'center', alpha: i < lives ? 1 : 0.2 });
    txt(cleared + '', W - 110, 205, 40, C.glow);
  }

  function drawScene() {
    drawBack();
    drawZone();
    drawObstacles();
    drawRunner();
    drawPad();
  }

  function drawResult() {
    game.draw.rect(0, H * 0.30, W, H * 0.18, C.night, 0.85);
    if (ok) {
      txt('CLEAR', W / 2, H * 0.34, 100, C.glow);
      txt(runT.toFixed(2) + '秒  ' + passGrade, W / 2, H * 0.41, 44, C.cream);
    } else {
      txt(endReason === 'time' ? 'TIME UP' : 'GAME OVER', W / 2, H * 0.34, 90, C.ember);
      txt('あと' + Math.max(1, Math.ceil(ZONE_START - Math.min(dist, ZONE_START))) + 'm!', W / 2, H * 0.41, 44, C.cream);
    }
    txt('BEST ' + (game.best > 0 ? game.best : 0), W / 2, H * 0.46, 34, C.lilac);
    if (ok && calcScore() > game.best) txt('NEW RECORD', W / 2, H * 0.27, 52, C.glow);
  }

  function calcScore() {
    var bonus = passGrade === 'PERFECT' ? 300 : passGrade === 'GOOD' ? 150 : 50;
    return Math.round(timeLeft * 60) + cleared * 40 + lives * 50 + bonus;
  }

  // ── 入力 ─────────────────────────────────────────
  game.onTap(function(x, yy) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin');
      state = S.PLAYING; initGame(false); startMusic();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(true); demo.t = 0; startMusic(); return; }
    if (phase === 'run') act(true);
    else game.audio.play('se_tap', 0.08);
  });

  // ── ATTRACT デモ: AIが同じ act で跳ぶ。周期ごとに1回わざと跳び遅れてつまずく ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.84, press: false, pressT: 0, missDone: false, skip: null, hold: 0 };
  function demoReset() {
    initGame(true);
    dist = ZONE_START - 58;
    for (var k = 0; k < obstacles.length; k++) if (obstacles[k].d < dist + 3) obstacles[k].passed = true;
    demo.missDone = false; demo.skip = null; demo.hold = 0;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8;
    if (cyc < dt || demo.t <= dt) demoReset();
    if (phase !== 'run') {
      // 受け渡し(またはつまずき切れ)の余韻を見せてから次の周へ
      demo.hold += dt;
      if (demo.hold > 1.0) demoReset();
    } else {
      // 次の壺までの距離で跳ぶ(高い壺・二連は早めに)
      for (var i = 0; i < obstacles.length; i++) {
        var o = obstacles[i];
        if (o.passed || o.hit) continue;
        var gap = o.d - dist;
        var lead = o.tall || o.dbl ? 2.6 : 2.0;
        if (gap < lead && gap > 0 && onGround && o !== demo.skip) {
          // 1回だけ跳ばずに突っ込み、つまずきを見せる
          if (!demo.missDone && dist > ZONE_START - 45) { demo.missDone = true; demo.skip = o; break; }
          act(false); demo.pressT = 0.18;
        }
        break;
      }
      // 受け渡し帯の中央で火種を渡す
      if (dist >= (ZONE_START + ZONE_END) / 2 - 0.4) { act(false); demo.pressT = 0.25; }
    }
    if (demo.pressT > 0) demo.pressT -= dt;
    demo.press = demo.pressT > 0;
    stepWorld(dt, false);
  }

  function startMusic() {
    game.audio.melody([
      ['D5', 0.5], ['A4', 0.5], ['D5', 0.5], ['F5', 0.5], ['E5', 0.5], ['C5', 0.5], ['A4', 1],
      ['D5', 0.5], ['F5', 0.5], ['G5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 1],
    ], { tempo: 184, wave: 'square', volume: 0.045, loop: true, bass: true });
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (dist === undefined) initGame(true);
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.06, 80, C.ember);
      txt('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, H * 0.105, 34, C.cream);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 46, C.glow);
      else txt('INSERT COIN', W / 2, H * 0.965, 40, C.cream);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      drawResult();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.cream);
      return;
    }

    // PLAYING
    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'run'; game.audio.play('se_tap', 0.4); }
    } else if (phase === 'stop') {
      stopT -= dt;
      if (stopT <= 0) { phase = 'done'; doneT = 1.4; }
    } else if (phase === 'done') {
      doneT -= dt;
      if (doneT <= 0) {
        state = S.RESULT;
        var stats = { distance: Math.floor(Math.min(dist, ZONE_END)), pots: cleared, lives: lives, pass: passGrade || '-' };
        if (ok) game.end.success(calcScore(), stats);
        else game.end.failure(stats);
      }
    }
    stepWorld(dt, true);

    drawScene();
    drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 100, C.glow);
    if (phase === 'done') drawResult();
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
    demo.t = 0;
    startMusic();
  });
})(game);
