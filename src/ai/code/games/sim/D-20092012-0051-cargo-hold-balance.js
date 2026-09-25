// D-20092012-0051-cargo-hold-balance.js
// カーゴホールドバランス — 積み込まれる荷でかしぐ輸送機を、左右タップで水平に保ち続ける
// 操作: 機体が傾いた側と逆の半面をタップして重心を戻し、水平を保つ
// 終わり: 規定個数(7個)積み終わるまで転倒しなければ成功。傾きが限界を超えれば失敗
// @mechanic: balance
// @theme: cargo_transport_airfield
// 世界観: 新しい航路を開く輸送機の積み込み場。次々積まれる荷で傾く機体を、係員が左右の重心操作で水平に保ち続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 無事に積み終えた荷の個数
// スタイル: 90s LOW POLY

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s LOW POLY: くすんだ実用色、平面的な塊、控えめなハイライト
  var C = {
    bg: '#2a3a44', bg2: '#1a262e', sky: '#3d5a68', ground: '#243038',
    plane: '#c9d4d8', planeDark: '#8a9aa0', crate: '#c98a4a', crateEdge: '#7a5228',
    good: '#5fd47a', bad: '#e0524f', gold: '#f2c14e', white: '#ffffff', ink: '#101418',
  };

  var GAME_TITLE = 'CARGO HOLD';
  var TOTAL = 7;
  var DUR = 20;
  var CX = W * 0.5, CY = H * 0.48;
  var MAX_TILT = 52;
  var TIP_TILT = 62;
  var STEP = 9;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PLANE_SPR = ['..####..', '########', '..####..', '...##...'];

  function ambient(t) { game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(t * 1.3)); }

  function bg(t) {
    game.draw.gradient(0, H, [[0, C.sky], [1, C.bg]]);
    game.draw.rect(0, H * 0.82, W, H * 0.2, C.ground);
    for (var i = 0; i < 6; i++) game.draw.rect(W * (0.08 + i * 0.17), H * 0.8, 8, 30, '#00000030');
    ambient(t);
  }

  var angle, angVel, loaded, timeLeft, crate, spawnT, done, endWait, finished, ready, hitStop, shake, tipped;

  function newCrate() {
    var side = Math.random() < 0.5 ? -1 : 1;
    return { side: side, t: 0, dur: 0.85, landed: false };
  }

  function initGame() {
    angle = 0; angVel = 0; loaded = 0; timeLeft = DUR;
    crate = newCrate(); spawnT = 0;
    done = false; endWait = 0; finished = false; tipped = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function tapSide(x) {
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    game.audio.play('se_tap', 0.15);
    if (x < CX) angVel -= STEP; else angVel += STEP;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    tapSide(x);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawPlane(a, tipFlash) {
    var wobX = Math.sin(a * Math.PI / 180) * 60;
    var wobY = Math.cos(a * Math.PI / 180) * 10;
    game.draw.rect(CX - 220, CY + 40, 440, 18, C.planeDark);
    game.draw.sprite(PLANE_SPR, { '#': tipFlash ? C.white : C.plane }, CX + wobX * 0.2, CY - wobY, 30, { anchor: 'center' });
    // 傾きメーター
    game.draw.circle(CX, CY + 200, 130, C.ink, 0.4);
    var needleX = CX + Math.sin(a * Math.PI / 180) * 110;
    var needleY = CY + 200 - Math.cos(a * Math.PI / 180) * 110;
    game.draw.line(CX, CY + 200, needleX, needleY, Math.abs(a) > MAX_TILT ? C.bad : C.gold, 8);
    game.draw.circle(CX, CY + 200, 10, C.white);
  }

  function drawCrate(cr) {
    if (!cr) return;
    var p = Math.min(1, cr.t / cr.dur);
    var x = CX + cr.side * 200;
    var y = H * 0.14 + (H * 0.32 - H * 0.14) * p;
    if (p > 0.5) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) game.draw.circle(x, H * 0.32, 60, C.bad, 0.25);
    }
    game.draw.rect(x - 34, y - 34, 68, 68, C.crateEdge);
    game.draw.rect(x - 26, y - 26, 52, 52, C.crate);
  }

  var demo = { t: 0, gx: CX, gy: H * 0.7, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.2;
    if (cyc < dt || demo.t <= dt) { crate = newCrate(); angle *= 0.4; }
    crate.t += dt;
    if (crate.t / crate.dur >= 1 && !crate.landed) {
      crate.landed = true;
      angVel += crate.side * 14;
    }
    angVel += -angle * 1.6 * dt;
    angle += angVel * dt;
    angVel *= 0.9;
    if (cyc > 1.2 && cyc < 1.6) {
      var side = angle > 0 ? -1 : 1;
      demo.gx = CX + side * 300;
      demo.press = true;
      angVel += side * 6;
    } else demo.press = false;
    demo.gy = H * 0.7;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      bg(t);
      stepDemo(dt);
      drawPlane(angle, false);
      drawCrate(crate);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.10, 22, C.gold);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg(t);
      drawPlane(tipped ? (angle > 0 ? TIP_TILT : -TIP_TILT) : 0, tipped);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 48, ok ? C.good : C.bad);
      txt(loaded + ' / ' + TOTAL, W / 2, H * 0.11, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - loaded) + '個!', W / 2, H * 0.16, 26, C.white);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(loaded, { loaded: loaded, total: TOTAL });
        else game.end.failure({ loaded: loaded, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      crate.t += dt;
      if (crate.t / crate.dur >= 1 && !crate.landed) {
        crate.landed = true;
        angVel += crate.side * 15;
        loaded++;
        game.feedback.good(CX + crate.side * 200, H * 0.32, { text: 'GOOD', color: C.good, count: 6 });
        game.audio.play('se_coin', 0.3);
        if (loaded === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, H * 0.24, { color: C.gold, size: 38 });
        if (loaded >= TOTAL) { ok = true; finished = true; finish(); }
        else crate = newCrate();
      }
      angVel += -angle * 1.1 * dt * 1.6;
      angle += angVel * dt;
      angVel *= 0.94;
      if (Math.abs(angle) > TIP_TILT && !finished) {
        tipped = true; ok = false; finished = true; hitStop = 0.35; shake = 0.35;
        game.feedback.bad(CX, CY, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg(t);
    drawPlane(angle, false);
    if (!finished) drawCrate(crate);

    txt(loaded + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (timeLeft / DUR), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.44, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.35], ['F4', 0.35], ['A4', 0.35], ['D5', 0.35]], { tempo: 110, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
