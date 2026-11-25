// D-20222026-0031-siege-arc-breach.js
// シージアークブリーチ — 投石機の腕が描く弧を見切り、遠い砦の壁へ狙いすまして岩を放つ
// 操作: 下の振れ幅ゲージが砦の真上に来た瞬間にタップして投石機を放つ
// 終わり: 規定回数、砦へ命中させれば成功。時間切れで失敗
// @mechanic: trajectory
// @theme: siege_catapult_breach
// 世界観: 遠い城砦を攻めあぐねる攻城方の砲手が、演出だけで描かれる敵砦の守りを見て、弧を描く投石の間合いを一投だけ見極める
// 残るもの: 正誤(CLEAR/GAME OVER) + 命中数
// スタイル: 80s ISO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s ISO: 中彩度の等角風配色。実際の投影変換は行わず矩形の重ね塗りで奥行きを示す
  var C = {
    bg: '#3a3a5a', bg2: '#20203a', ground: '#4a4a3a', groundDk: '#2a2a1e',
    keep: '#7a7a8a', keepDk: '#4a4a5a', stone: '#a0906a', good: '#8ac878', bad: '#ff4d5e',
    gold: '#ffd24d', ink: '#eceaf6',
  };

  var GAME_TITLE = 'ARC BREACH';
  var MAX_TIME = 16;
  var NEEDED = 3;
  var LAUNCH_X = W * 0.18, LAUNCH_Y = H * 0.62;
  var KEEP_X = W * 0.76, KEEP_Y = H * 0.34;
  var TARGET_T = 0.62, TARGET_TOL = 0.09;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#0c0c18', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var KEEP_S = ['#.####.#', '########', '#.####.#', '########'];
  var CREW_S = ['.##.', '####', '.##.'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.2);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.2);
    game.draw.rect(0, H * 0.66, W, H * 0.34, C.ground);
    game.draw.rect(0, H * 0.66, W, 10, C.groundDk);
    game.draw.sprite(CREW_S, { '#': C.stone }, LAUNCH_X, LAUNCH_Y + 90, 16, { anchor: 'center' });
  }

  var hits, roundClock, halfCalled, gaugeT, gaugeDir, stone, keepHp;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    hits = 0; roundClock = 0; halfCalled = false; gaugeT = 0; gaugeDir = 1;
    stone = null; keepHp = NEEDED;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function arcPoint(t, u) {
    var x = LAUNCH_X + (KEEP_X - LAUNCH_X + 0) * t;
    var landX = LAUNCH_X + (W * 0.62) * t;
    var px = LAUNCH_X + (landX - LAUNCH_X) * u;
    var py = LAUNCH_Y - Math.sin(u * Math.PI) * (220 + t * 180);
    return { x: px, y: py, landX: landX };
  }

  function drawScene() {
    bg();
    game.draw.rect(KEEP_X - 130, KEEP_Y - 30, 260, 30, C.keepDk, 0.5);
    game.draw.sprite(KEEP_S, { '#': keepHp < NEEDED ? C.keepDk : C.keep }, KEEP_X, KEEP_Y, 20, { anchor: 'center' });
    game.draw.rect(KEEP_X - 120, KEEP_Y - 130, 240, 14, C.groundDk, 0.5);
    game.draw.rect(KEEP_X - 120, KEEP_Y - 130, 240 * (keepHp / NEEDED), 14, C.bad);

    // 下部: 弧の振れ幅ゲージ(横一列)。TARGET帯を明示し、マーカーが通過する瞬間を狙う
    var gx0 = W * 0.18, gx1 = W * 0.82, gy = H * 0.86;
    game.draw.rect(gx0, gy - 10, gx1 - gx0, 20, C.groundDk, 0.6);
    game.draw.rect(gx0 + (gx1 - gx0) * (TARGET_T - TARGET_TOL), gy - 10, (gx1 - gx0) * TARGET_TOL * 2, 20, C.gold, 0.7);
    var mx = gx0 + (gx1 - gx0) * gaugeT;
    game.draw.circle(mx, gy, 22, C.stone);

    if (stone) {
      var p = arcPoint(stone.t, stone.u);
      game.draw.circle(p.x, p.y, 24, C.stone);
    }
  }

  function launch(tap) {
    var landOk = Math.abs(gaugeT - TARGET_T) <= TARGET_TOL;
    stone = { t: gaugeT, u: 0, ok: landOk };
    game.audio.play('se_jump', 0.3);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished && !stone) {
      launch(true);
    } else if (state === S.PLAYING && stone) {
      game.audio.play('se_tap', 0.08);
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function updateStone(dt) {
    if (!stone) return;
    stone.u += dt / 0.55;
    if (stone.u >= 1) {
      var p = arcPoint(stone.t, 1);
      if (stone.ok) {
        hits += 1; keepHp -= 1;
        hitStop = 0.15;
        game.feedback.good(p.x, p.y, { text: 'GOOD', color: C.good });
        game.fx.burst(p.x, p.y, { color: C.gold, count: 22, speed: 400 });
        game.audio.play('se_good', 0.4);
        if (hits === Math.ceil(NEEDED / 2)) {
          game.fx.popup('NICE', KEEP_X, KEEP_Y - 160, { color: C.gold, size: 30 });
          game.audio.play('se_milestone', 0.3);
        }
        if (hits >= NEEDED) {
          finished = true; ok = true; hitStop = 0.3;
          game.audio.play('se_success', 0.5);
          finish();
        }
      } else {
        shake = 0.15;
        game.feedback.bad(p.x, p.y, { text: 'MISS' });
        game.audio.play('se_bad', 0.3);
      }
      stone = null;
    }
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.86, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.0;
    if (cyc < dt || demo.t <= dt) resetDemo();
    tickGauge(dt);
    updateStone(dt);
    var gx0 = W * 0.18, gx1 = W * 0.82;
    demo.gx = gx0 + (gx1 - gx0) * gaugeT; demo.gy = H * 0.86;
    demo.press = false;
    if (!stone && Math.abs(gaugeT - TARGET_T) < 0.015 && !finished) {
      demo.press = true;
      launch(true);
    }
  }

  function tickGauge(dt) {
    gaugeT += gaugeDir * dt / 1.1;
    if (gaugeT > 1) { gaugeT = 1; gaugeDir = -1; }
    if (gaugeT < 0) { gaugeT = 0; gaugeDir = 1; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (roundClock === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 36, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.135, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.bad);
      txt(hits + ' / ' + NEEDED, W / 2, H * 0.14, 26, C.gold);
      if (!ok) txt('あと' + Math.max(1, NEEDED - hits) + '発!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits });
        else game.end.failure({ hits: hits });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      tickGauge(dt);
      updateStone(dt);
      if (!halfCalled && roundClock >= MAX_TIME * 0.5) {
        halfCalled = true;
        game.fx.popup('NICE', KEEP_X, KEEP_Y - 160, { color: C.gold, size: 28 });
        game.audio.play('se_milestone', 0.25);
      }
      if (roundClock >= MAX_TIME) {
        finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(KEEP_X, KEEP_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    drawScene();
    txt(hits + ' / ' + NEEDED, W / 2, H * 0.06, 28, C.ink);
    var barPct = Math.max(0, 1 - roundClock / MAX_TIME);
    game.draw.rect(60, 150, W - 120, 16, C.groundDk, 0.5);
    game.draw.rect(60, 150, (W - 120) * barPct, 16, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C3', 0.3], ['E3', 0.3], ['G3', 0.3], ['C4', 0.6]], { tempo: 100, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
