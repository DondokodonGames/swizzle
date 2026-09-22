// K-X-0032-lantern-height-match.js
// ランタン高さ合わせ — 指を上下にドラッグしてランタンを操り、渡ってくる灯りの高さに重ねる
// 操作: 画面を指で押さえたまま上下にドラッグし、ランタン(手元の灯)の高さを近づく灯りに合わせる
// 終わり: 規定6個の灯りに重ねられれば成功。合わせ損ねて灯りが通過すれば失敗
// @mechanic: drag_follow
// @theme: lighthouse_lantern_keeper
// 世界観: 断崖の灯台守。沖から届く連絡船の灯りの高さを読み、自分のランタンを同じ高さに掲げて応答信号を送る
// 残るもの: 正誤(CLEAR/GAME OVER) + 合わせられた灯りの数
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 大きく見やすいドットキャラ、太いアウトライン、はっきりした色面
  var C = {
    bg: '#0a1830', bg2: '#142a4a', sea: '#0d2244', cliff: '#1c2f42',
    lantern: '#ffcf4d', lanternGlow: '#7a5a10', boat: '#5ecbff', boatDim: '#0f3a55',
    good: '#39ff6a', bad: '#ff4455', gold: '#ffe066', white: '#ffffff', ink: '#050510',
  };

  var GAME_TITLE = 'LANTERN HEIGHT';
  var TOTAL = 6;
  var LANE_X_PLAYER = W * 0.22, LANE_X_BOAT = W * 0.82;
  var FIELD_TOP = H * 0.20, FIELD_BOT = H * 0.72;
  var CONTACT_X = LANE_X_PLAYER + 40;
  var TOL = 90;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var caught, done, endWait, finished, playerY, targetY, boat, speed, round;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var KEEPER = ['.##.', '####', '.##.', '####', '.##.'];
  var BOAT_SPR = ['#....#', '######', '.####.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, FIELD_BOT + 40, W, H - FIELD_BOT - 40, C.sea, 0.6);
    for (var i = 0; i < 6; i++) game.draw.line(0, FIELD_BOT + 60 + i * 26, W, FIELD_BOT + 60 + i * 26, '#ffffff08', 3);
    game.draw.rect(LANE_X_PLAYER - 70, FIELD_TOP - 40, 30, FIELD_BOT - FIELD_TOP + 90, C.cliff);
  }

  function newBoat(spd) {
    return { y: game.random(FIELD_TOP + 60, FIELD_BOT - 60), x: LANE_X_BOAT, resolved: false, telegraphed: false, spd: spd };
  }

  function initGame() {
    caught = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; round = 0; speed = 210;
    playerY = (FIELD_TOP + FIELD_BOT) / 2;
    boat = newBoat(speed);
  }

  function onDragY(y) {
    if (done || ready > 0 || finished) return;
    playerY = Math.max(FIELD_TOP, Math.min(FIELD_BOT, y));
  }

  game.onPress(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.08); onDragY(y); } });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING) return;
    if (Math.random() < 0.05) game.audio.play('se_tap', 0.02);
    onDragY(y);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawScene() {
    game.draw.sprite(KEEPER, { '#': C.gold }, LANE_X_PLAYER, playerY, 14, { anchor: 'center' });
    game.draw.circle(LANE_X_PLAYER, playerY, 46, C.lanternGlow, 0.35);
    game.draw.circle(LANE_X_PLAYER, playerY, 20, C.lantern);
    if (boat) {
      var p = boat;
      if (p.x < W * 0.55 && !p.telegraphed) { p.telegraphed = true; }
      if (p.x < W * 0.55) {
        var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
        if (blink) game.draw.line(p.x, p.y - 50, p.x, p.y + 50, C.gold, 4);
      }
      game.draw.sprite(BOAT_SPR, { '#': C.boat }, p.x, p.y, 12, { anchor: 'center' });
      game.draw.circle(p.x, p.y - 30, 12, C.lantern, 0.9);
    }
  }

  var demo = { t: 0, gx: LANE_X_PLAYER, gy: H * 0.5, press: true, b: null };
  function stepDemo(dt) {
    demo.t += dt;
    if (round === undefined || round === null) initGame();
    if (!demo.b) { demo.b = newBoat(320); }
    demo.b.x -= demo.b.spd * dt * 1.4;
    boat = demo.b;
    if (demo.b.x < CONTACT_X + 200 && !demo.b.telegraphed2) {
      demo.b.telegraphed2 = true;
      playerY += (demo.b.y - playerY) * 0.9;
    }
    playerY += (demo.b.y - playerY) * Math.min(1, dt * 3);
    demo.gx = LANE_X_PLAYER; demo.gy = playerY; demo.press = true;
    if (demo.b.x <= CONTACT_X) {
      game.feedback.good(demo.b.x, demo.b.y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.2);
      demo.b = null;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(caught + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - caught) + '隻!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(caught * 15, { caught: caught, total: TOTAL });
        else game.end.failure({ caught: caught, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      boat.x -= boat.spd * dt;
      if (boat.x <= CONTACT_X) {
        var hit = Math.abs(boat.y - playerY) <= TOL;
        if (hit) {
          caught++; hitStop = 0.1;
          game.feedback.good(boat.x, boat.y, { text: 'GOOD', color: C.good });
          game.fx.burst(LANE_X_PLAYER, playerY, { color: C.gold, count: 14, speed: 300 });
          game.audio.play('se_good', 0.35);
          if (caught === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', W / 2, H * 0.3, { color: C.gold, size: 40 });
          if (caught >= TOTAL) { ok = true; finished = true; finish(); }
          else { round++; speed = Math.min(420, speed + 25); boat = newBoat(speed); }
        } else {
          hitStop = 0.35; shake = 0.3;
          game.feedback.bad(boat.x, boat.y, { text: 'MISS' });
          game.audio.play('se_bad', 0.4);
          ok = false; finished = true; finish();
        }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawScene(); else drawScene();

    txt(caught + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.4], ['C4', 0.4], ['E4', 0.4], ['A4', 0.8]], { tempo: 110, wave: 'sine', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
