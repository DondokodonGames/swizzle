// J-N644-0016-skybarge-crate-drop.js
// スカイバージクレートドロップ — 左右に揺れる飛行船から、地上の目印にちょうど重なった瞬間だけ荷箱を落とす
// 操作: 飛行船が地上の目印の真上に来た瞬間にタップして荷箱を投下する
// 終わり: 規定数(5個)全て的に命中させれば成功。1個でも外せば失敗
// @mechanic: drop_timing
// @theme: skybarge_relief_crate_drop
// 世界観: 左右に揺れながら進む救援飛行船の投下員が、地上に置かれた受け取り目印の真上を通過する一瞬だけを狙って荷箱を落とし続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 命中させた個数
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 疑似奥行きの縞状地面、遠近で色を明滅
  var C = {
    sky1: '#3a6fb0', sky2: '#0a2a50', ground: '#4a8a3a', groundDark: '#2a5a1a',
    barge: '#e0c060', bargeDark: '#a08030', mark: '#ffd400', markGlow: '#fff6c0',
    gold: '#ffd400', good: '#5affc0', bad: '#ff5a5a', white: '#ffffff', ink: '#04213a',
  };

  var GAME_TITLE = 'CRATE DROP';
  var TOTAL = 5;
  var BARGE_Y = H * 0.24, GROUND_Y = H * 0.72;
  var AMP = W * 0.32;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BARGE_SPRITE = ['..####..', '########', '..####..'];
  var CRATE_SPRITE = ['####', '#..#', '####'];

  function bg() {
    var e = game.time.elapsed;
    game.draw.gradient(0, GROUND_Y, [[0, C.sky1], [1, C.sky2]]);
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, C.ground);
    var scroll = (e * 200) % 100;
    for (var i = -1; i < 12; i++) game.draw.rect(0, GROUND_Y + i * 100 - scroll, W, 6, C.groundDark, 0.4);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.02 + 0.02 * Math.sin(e * 1.3));
  }

  var round, hits, bargeSpeed, bargePhase, markX, crate, resolved, finished, done, endWait, hitStop, shake, ready, halfShown;

  function bargeX() { return W * 0.5 + Math.sin(bargePhase) * AMP; }

  function newRound() {
    markX = W * 0.5 + game.random(-AMP + 80, AMP - 80);
    resolved = false;
    crate = null;
  }

  function initGame() {
    round = 0; hits = 0; bargePhase = -Math.PI / 2; bargeSpeed = 1.15; halfShown = false;
    done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
    newRound();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function dropCrate() {
    if (state !== S.PLAYING || ready > 0 || finished || crate || resolved) return;
    game.audio.play('se_tap', 0.1);
    crate = { x: bargeX(), y: BARGE_Y + 20 };
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) dropCrate();
  });

  function resolveLanding() {
    resolved = true;
    var d = Math.abs(crate.x - markX);
    if (d <= 70) {
      hits++;
      hitStop = 0.14;
      game.feedback.good(crate.x, GROUND_Y, { text: 'HIT', color: C.good });
      game.fx.burst(crate.x, GROUND_Y, { color: C.gold, count: 18, speed: 360 });
      game.audio.play('se_success', 0.4);
      if (!halfShown && hits >= Math.ceil(TOTAL / 2)) {
        halfShown = true;
        game.fx.popup('HALFWAY!', W / 2, GROUND_Y - 260, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.35);
      }
      if (hits >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++;
      bargeSpeed = Math.min(2.1, 1.15 + round * 0.16);
      newRound();
    } else {
      hitStop = 0.32;
      game.feedback.bad(crate.x, GROUND_Y, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  function stepCrate(dt) {
    if (!crate) return;
    crate.y += 1500 * dt;
    if (crate.y >= GROUND_Y) resolveLanding();
  }

  function drawGround() {
    var aligned = Math.abs(bargeX() - markX) < 90;
    game.draw.circle(markX, GROUND_Y, 90, C.markGlow, aligned ? 0.35 : 0.18);
    game.draw.circle(markX, GROUND_Y, 60, C.mark, 0.9);
    game.draw.circle(markX, GROUND_Y, 30, C.ink, 0.4);
  }

  function drawBarge() {
    var bx = bargeX();
    game.draw.rect(bx - 90, BARGE_Y - 60, 180, 16, C.bargeDark, 0.5);
    game.draw.sprite(BARGE_SPRITE, { '#': C.barge }, bx, BARGE_Y, 26, { anchor: 'center' });
  }

  function drawCrate() {
    if (crate) game.draw.sprite(CRATE_SPRITE, { '#': C.mark }, crate.x, crate.y, 14, { anchor: 'center' });
  }

  var demo = { t: 0, gx: W * 0.5, gy: BARGE_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { round = 0; bargeSpeed = 1.15; hits = 0; halfShown = false; newRound(); }
    bargePhase += bargeSpeed * dt;
    stepCrate(dt);
    demo.gx = bargeX(); demo.gy = BARGE_Y;
    if (!crate && !resolved && Math.abs(bargeX() - markX) < 50) {
      demo.press = true;
      dropCrateDemo();
    } else {
      demo.press = false;
    }
  }
  function dropCrateDemo() {
    if (crate || resolved) return;
    crate = { x: bargeX(), y: BARGE_Y + 20 };
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      drawGround();
      drawBarge();
      drawCrate();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawGround();
      drawBarge();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(hits + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - hits) + '個!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, total: TOTAL });
        else game.end.failure({ hits: hits, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      bargePhase += bargeSpeed * dt;
      stepCrate(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawGround();
    drawBarge();
    drawCrate();

    txt(hits + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.3);
    game.draw.rect(60, 150, (W - 120) * (hits / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.2], ['C4', 0.2], ['E4', 0.2], ['A4', 0.4]], { tempo: 130, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
