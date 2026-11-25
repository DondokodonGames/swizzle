// I-GBA-0064-sled-boulder-dodge.js
// 雪原ソリ回避 — ハンドルのように左右を傾け、迫る岩塊をかわしながら滑り降りる
// 操作: 岩が来る側と逆をホールド移動して橇を寄せ、正面衝突を避ける
// 終わり: 規定本数の岩を避けきれば成功。1つでも衝突すれば失敗
// @mechanic: dodge
// @theme: sled_boulder_dodge
// 世界観: 雪山の斜面を一気に滑り降りる木製ソリ乗り。正面から迫る雪玉状の岩塊を、ハンドルを切ってかわす
// 残るもの: 正誤(CLEAR/GAME OVER) + かわした個数
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 立方体を上面/左面/右面の3明度で。等角に積む
  var C = {
    bg: '#bfe6ff', bg2: '#8fc8f0', snow: '#ffffff', snowShadow: '#dceeff',
    rockTop: '#c9b8a0', rockLeft: '#a89578', rockRight: '#8a7860',
    sled: '#c0522a', sledDark: '#7a3316',
    good: '#2ecc71', bad: '#e74c3c', gold: '#ffb020', white: '#0a2038', ink: '#0a2038',
  };

  var GAME_TITLE = 'BOULDER DODGE';
  var LANE_X = W * 0.5, SLED_Y = H * 0.72;
  var TOTAL = 6;
  var LANE_RANGE = 260;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var sledX, dodged, thrown, rocks, spawnT, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#ffffff', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SLED_SPRITE = ['..##..', '.####.', '######', '.#..#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) game.draw.line(W * (0.1 + i * 0.16), 0, W * 0.5, H * 0.5, C.snowShadow, 3);
  }

  function drawVoxel(cx, cy, size, topC, leftC, rightC) {
    game.draw.rect(cx - size, cy - size * 0.5, size * 2, size * 0.6, topC);
    game.draw.rect(cx - size, cy, size, size, leftC);
    game.draw.rect(cx, cy, size, size, rightC);
  }

  function drawRock(r) {
    var y = SLED_Y - 900 + r.t * 900;
    var scale = 30 + r.t * 60;
    if (r.t > 0.55 && r.t < 0.78) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) game.draw.circle(r.x, y, scale + 20, C.bad, 0.25);
    }
    drawVoxel(r.x, y, scale, C.rockTop, C.rockLeft, C.rockRight);
  }

  function drawSled(x) {
    game.draw.circle(x + 4, SLED_Y + 44, 60, '#00000020');
    game.draw.sprite(SLED_SPRITE, { '#': C.sled }, x, SLED_Y, 20, { anchor: 'center' });
    game.draw.rect(x - 50, SLED_Y + 30, 100, 14, C.sledDark);
  }

  function newRock() {
    var side = Math.random() < 0.5 ? -1 : 1;
    return { x: LANE_X + side * LANE_RANGE, t: 0, dur: Math.max(0.9, 1.5 - thrown * 0.08), resolved: false };
  }

  function initGame() {
    sledX = LANE_X; dodged = 0; thrown = 0; rocks = []; spawnT = 0.6;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onHold(function(x, y) {
    if (state === S.PLAYING) game.audio.play('se_tap', 0.04);
  });

  function stepGame(dt, holdX) {
    var targetX = holdX !== null ? holdX : sledX;
    sledX += (targetX - sledX) * Math.min(1, dt * 10);
    sledX = Math.max(LANE_X - LANE_RANGE - 40, Math.min(LANE_X + LANE_RANGE + 40, sledX));

    for (var i = rocks.length - 1; i >= 0; i--) {
      var r = rocks[i];
      r.t += dt / r.dur;
      if (r.t >= 1 && !r.resolved) {
        r.resolved = true;
        var hit = Math.abs(sledX - r.x) < 90;
        if (hit) {
          ok = false; finished = true; hitStop = 0.35; shake = 0.3;
          game.feedback.bad(sledX, SLED_Y, { text: 'MISS' });
          game.audio.play('se_failure', 0.4);
          finish();
        } else {
          dodged++;
          game.feedback.good(r.x, SLED_Y - 60, { text: 'GOOD', color: C.good });
          game.audio.play('se_good', 0.3);
          if (dodged === Math.ceil(TOTAL / 2)) {
            game.fx.popup('HALFWAY!', LANE_X, SLED_Y - 300, { color: C.gold, size: 38 });
            game.audio.play('se_milestone', 0.3);
          }
          if (dodged >= TOTAL) {
            ok = true; finished = true; hitStop = 0.25;
            game.feedback.good(LANE_X, SLED_Y, { text: 'CLEAR', color: C.good });
            game.fx.burst(LANE_X, SLED_Y, { color: C.gold, count: 22, speed: 400 });
            game.audio.play('se_success', 0.5);
            finish();
          }
        }
        rocks.splice(i, 1);
      }
    }
    if (!finished) {
      spawnT -= dt;
      if (spawnT <= 0 && thrown < TOTAL) {
        rocks.push(newRock());
        thrown++;
        spawnT = 1.5 + Math.random() * 0.4;
      }
    }
  }

  var demo = { t: 0, gx: LANE_X, gy: H * 0.9, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.5;
    if (cyc < dt || demo.t <= dt) { sledX = LANE_X; dodged = 0; thrown = 0; rocks = []; spawnT = 0.5; }
    var holdX = null;
    for (var i = 0; i < rocks.length; i++) {
      var r = rocks[i];
      if (r.t > 0.3) { holdX = LANE_X - (r.x - LANE_X); demo.gx = holdX; demo.press = true; }
    }
    if (holdX === null) demo.press = false;
    if (cyc < 6.0) stepGame(dt, holdX !== null ? holdX : sledX);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (sledX === undefined) initGame();
      bg();
      stepDemo(dt);
      for (var i = 0; i < rocks.length; i++) drawRock(rocks[i]);
      drawSled(sledX);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawSled(sledX);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(dodged + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - dodged) + '個!', W / 2, H * 0.17, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(dodged, { dodged: dodged, total: TOTAL });
        else game.end.failure({ dodged: dodged, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      var holdX = game.input.pressing ? Math.max(LANE_X - LANE_RANGE - 40, Math.min(LANE_X + LANE_RANGE + 40, game.input.x)) : sledX;
      stepGame(dt, holdX);
    }
    if (shake > 0) shake -= dt;

    bg();
    for (var j = 0; j < rocks.length; j++) drawRock(rocks[j]);
    if (!finished) drawSled(sledX);

    txt(dodged + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, '#ffffff80');
    game.draw.rect(60, 150, (W - 120) * (dodged / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.25], ['G4', 0.25], ['B4', 0.25], ['E5', 0.5]], { tempo: 140, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
