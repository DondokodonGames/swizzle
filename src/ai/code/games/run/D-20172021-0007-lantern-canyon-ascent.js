// D-20172021-0007-lantern-canyon-ascent.js
// ランタンキャニオンアセント — 峡谷を昇る熱気ランタンの傾きを、吹き付ける風に逆らって左右タップで支え続ける
// 操作: ランタンが傾いた側と逆側(画面左半分/右半分)をタップして重心を戻す
// 終わり: 頂上まで傾きを支えきれば成功。傾きが限界を超え崖に触れれば失敗
// @mechanic: balance
// @theme: canyon_lantern_ascent
// 世界観: 岩壁の迫る峡谷を昇ってゆく一つの熱気ランタン。吹き荒れる谷風に煽られる傾きを、左右への重心移動で支えながら頂上のリッジを目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + 昇った高度(%)
// スタイル: HD POST 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 深みのあるグラデーション、柔らかい光沢ハイライト
  var STYLE = { bg: ['#ffb877', '#3a4d78'], main: ['#ff8a4d', '#c05a2a'], accent: ['#ffe066', '#ff4d4d'] };
  var C = {
    sky1: STYLE.bg[0], sky2: STYLE.bg[1], rockL: '#5a4638', rockR: '#4a3a2e', rockEdge: '#2e2218',
    lantern: STYLE.main[0], lanternDark: STYLE.main[1], flame: '#ffe066',
    gold: '#ffe066', good: '#5dffb0', bad: STYLE.accent[1], white: '#ffffff', ink: '#241408',
  };

  var GAME_TITLE = 'CANYON ASCENT';
  var ASCEND_TIME = 20;
  var CX = W * 0.5, CY = H * 0.55;
  var MAX_TILT = 1.0;
  var PUSH = 1.4;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var LANTERN_SPRITE = ['.###.', '#####', '#####', '..#..'];

  function bg() {
    var e = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky1], [1, C.sky2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(e * 1.3));
    var scroll = (e * 90) % 240;
    for (var i = -1; i < 10; i++) {
      var y = i * 240 - scroll;
      game.draw.rect(0, y, W * 0.16, 200, C.rockL);
      game.draw.rect(W * 0.16, y, W * 0.03, 200, C.rockEdge);
      game.draw.rect(W * 0.84, y, W * 0.16, 200, C.rockR);
      game.draw.rect(W * 0.81, y, W * 0.03, 200, C.rockEdge);
    }
  }

  var tilt, tiltVel, windPhase, gustT, gustDir, gustWarn, elapsedT, done, endWait, finished;
  var ready, hitStop, shake, milestoneShown;

  function initGame() {
    tilt = 0; tiltVel = 0; windPhase = 0; gustT = 1.6; gustDir = 0; gustWarn = false;
    elapsedT = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
  }

  function push(dir) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    tiltVel += dir * PUSH;
    game.audio.play('se_tap', 0.15);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) push(x < W * 0.5 ? -1 : 1);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepPhysics(dt, resolveHits) {
    windPhase += dt;
    gustT -= dt;
    if (gustT <= 0.6 && !gustWarn) gustWarn = true;
    if (gustT <= 0) {
      gustDir = Math.random() < 0.5 ? -1 : 1;
      tiltVel += gustDir * 1.1;
      gustT = 2.2 + Math.random() * 1.0;
      gustWarn = false;
      game.audio.play('se_tap', 0.1);
    }
    tiltVel += Math.sin(windPhase * 0.6) * 0.25 * dt;
    tilt += tiltVel * dt;
    tiltVel *= 0.9;
    if (tilt > MAX_TILT) tilt = MAX_TILT;
    if (tilt < -MAX_TILT) tilt = -MAX_TILT;
    if (resolveHits && Math.abs(tilt) >= MAX_TILT - 0.01) {
      finished = true; ok = false; hitStop = 0.35;
      game.feedback.bad(CX + tilt * 260, CY, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      finish();
      return;
    }
    if (resolveHits) {
      elapsedT += dt;
      var pct = elapsedT / ASCEND_TIME;
      if (!milestoneShown && pct >= 0.5) { milestoneShown = true; game.fx.popup('HALFWAY!', CX, CY - 220, { color: C.gold, size: 38 }); game.audio.play('se_milestone', 0.4); }
      if (elapsedT >= ASCEND_TIME) {
        finished = true; ok = true; hitStop = 0.1;
        game.feedback.good(CX, CY, { text: 'CLEAR', color: C.good });
        game.fx.burst(CX, CY, { color: C.gold, count: 18, speed: 380 });
        game.audio.play('se_success', 0.5);
        finish();
      }
    }
  }

  var demo = { t: 0, gx: W * 0.3, gy: H * 0.86, press: false, side: -1 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.5;
    if (cyc < dt || demo.t <= dt) { initGame(); }
    stepPhysics(dt, false);
    if (Math.abs(tilt) > 0.35) {
      demo.side = tilt > 0 ? -1 : 1;
      demo.gx = demo.side < 0 ? W * 0.25 : W * 0.75;
      demo.gy = H * 0.86;
      demo.press = true;
      tiltVel += demo.side * PUSH * 0.6 * dt * 8;
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawLantern();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + '%' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawLantern();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      var pct2 = Math.round((elapsedT / ASCEND_TIME) * 100);
      txt(pct2 + ' / ' + 100, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + Math.max(1, 100 - pct2) + '%!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct3 = Math.round((elapsedT / ASCEND_TIME) * 100);
        if (ok) game.end.success(pct3, { pct: pct3 }); else game.end.failure({ pct: pct3 });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepPhysics(dt, true);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawLantern();

    txt(Math.round((elapsedT / ASCEND_TIME) * 100) + ' / ' + 100, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.min(1, elapsedT / ASCEND_TIME), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  function drawLantern() {
    var e = game.time.elapsed;
    var lx = CX + tilt * 260 + Math.sin(e * 1.7) * 5;
    var ly = CY + Math.cos(e * 1.4) * 8;
    var warn = Math.abs(tilt) > 0.6;
    if (warn) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) game.draw.circle(lx, ly, 90, C.bad, 0.25);
    }
    game.draw.circle(lx, ly - 40, 16, C.flame, 0.7);
    game.draw.sprite(LANTERN_SPRITE, { '#': C.lantern }, lx, ly, 18, { anchor: 'center' });
  }

  game.onStart(function() {
    game.audio.melody([['F4', 0.35], ['A4', 0.35], ['C5', 0.35], ['F5', 0.7]], { tempo: 100, wave: 'sine', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
