// I-Wii-0014-deepspear-charge-thrust.js
// ディープスピア・チャージスラスト — 銛を押し続けて溜め、深度の的に合わせて前へ突き出す
// 操作: 押し続けると銛のバネが溜まる(溜めすぎると失速)。深度ゲージの光る帯に合わせて指を離して突く
// 終わり: 3投中、深度の帯に合わせられた回数が全3回なら成功。1回でも外せば失敗
// @mechanic: hold_charge
// @theme: deep_sea_spear_diver
// 世界観: 深海の銛突き潜水士。光る深度ゲージの帯に合わせて銛を溜めて突き、闇に潜むちょうちんアンコウを仕留める
// 残るもの: 正誤(CLEAR/GAME OVER) + 突けた回数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 白黒2値。線の太さで語る。危険のみ紅一色を例外使用
  var C = {
    bg: '#050508', bg2: '#0c0c14', ink0: '#f4f4f4', ink1: '#9a9aa4', ink2: '#3a3a44',
    danger: '#ff3344', gold: '#f4f4f4', ink: '#000000',
  };

  var GAME_TITLE = 'SPEAR THRUST';
  var SHOTS = 3;
  var CHARGE_MAX = 1.0;
  var CX = W * 0.5, DIVER_Y = H * 0.72, GAUGE_X0 = H * 0.0;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var shotIdx, hits, charging, chargeT, thrown, thrownPower, target, tol;
  var done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DIVER_SPRITE = ['.##.', '####', '.##.', '.##.'];
  var FISH_SPRITE = ['..##..', '.####.', '######', '.####.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 5; i++) game.draw.rect(0, H * (0.15 + i * 0.14), W, 2, C.ink1, 0.15);
  }

  function newShot() {
    charging = false; chargeT = 0; thrown = false; thrownPower = 0;
    target = game.random(0.28, 0.82);
    tol = Math.max(0.09, 0.16 - shotIdx * 0.02);
  }

  function initGame() {
    shotIdx = 0; hits = 0; finished = false; done = false; endWait = 0;
    ready = 0.8; hitStop = 0; shake = 0;
    newShot();
  }

  function startCharge() {
    if (done || ready > 0 || hitStop > 0 || finished || thrown) return;
    charging = true; chargeT = 0;
    game.audio.play('se_tap', 0.1);
  }

  function releaseCharge() {
    if (!charging) return;
    charging = false;
    thrown = true;
    thrownPower = Math.min(1, chargeT / CHARGE_MAX);
    resolveShot(thrownPower);
  }

  function resolveShot(power) {
    var hit = Math.abs(power - target) <= tol;
    hitStop = hit ? 0.14 : 0.3;
    var y = DIVER_Y - power * (DIVER_Y - H * 0.2);
    if (hit) {
      hits++;
      game.feedback.good(CX, y, { text: 'HIT', color: C.ink0 });
      game.fx.burst(CX, y, { color: C.ink0, count: 16, speed: 320 });
      game.audio.play('se_good', 0.4);
      if (shotIdx === Math.floor(SHOTS / 2)) {
        game.fx.popup('HALFWAY!', CX, H * 0.16, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.5);
      }
    } else {
      game.feedback.bad(CX, y, { text: 'MISS' });
      shake = 0.25;
      game.audio.play('se_bad', 0.4);
    }
    if (!hit) { ok = false; finished = true; finish(); return; }
    shotIdx++;
    if (shotIdx >= SHOTS) { ok = hits >= SHOTS; finished = true; finish(); return; }
    newShot();
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
  game.onPress(function() { if (state === S.PLAYING) startCharge(); });
  game.onRelease(function() { if (state === S.PLAYING) releaseCharge(); });

  function stepPlay(dt) {
    if (charging) {
      chargeT += dt;
      if (chargeT > CHARGE_MAX + 0.45) {
        charging = false; thrown = true; thrownPower = 1;
        resolveShot(1.3); // オーバーチャージは的を大きく外す
      }
    }
  }

  function drawGauge() {
    var gx0 = W * 0.5 - 200, gx1 = W * 0.5 + 200, gy = H * 0.86;
    game.draw.line(gx0, gy, gx1, gy, C.ink2, 24);
    var tx = gx0 + (gx1 - gx0) * target;
    game.draw.line(tx - (gx1 - gx0) * tol, gy, tx + (gx1 - gx0) * tol, gy, C.ink1, 28);
    if (charging) {
      var px = gx0 + (gx1 - gx0) * Math.min(1.05, chargeT / CHARGE_MAX);
      game.draw.circle(px, gy, 20, C.ink0);
    }
  }

  function drawDiver() {
    game.draw.sprite(DIVER_SPRITE, { '#': C.ink0 }, CX, DIVER_Y + 40, 22, { anchor: 'center' });
  }

  function drawFishAt(power) {
    var y = DIVER_Y - power * (DIVER_Y - H * 0.2);
    game.draw.sprite(FISH_SPRITE, { '#': C.ink1 }, CX, H * 0.2 + (1 - target) * (DIVER_Y - H * 0.2) * 0, 18, { anchor: 'center' });
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { charging = false; chargeT = 0; thrown = false; target = 0.6; tol = 0.14; }
    if (cyc < 0.2) { charging = false; demo.press = false; }
    else if (cyc < 1.3) { charging = true; chargeT = cyc - 0.2; demo.press = true; }
    else if (cyc < 1.5 && charging) {
      charging = false; thrown = true;
      var y = DIVER_Y - Math.min(1, chargeT / CHARGE_MAX) * (DIVER_Y - H * 0.2);
      game.feedback.good(CX, y, { text: 'HIT', color: C.ink0 });
      game.audio.play('se_good', 0.25);
      demo.press = false;
    } else if (cyc < 2.0) { /* hold */ } else { thrown = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawGauge();
      drawDiver();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.ink0);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.ink1);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.ink0);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink1);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawDiver();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, C.ink0);
      txt(hits + ' / ' + SHOTS, W / 2, H * 0.13, 32, C.ink1);
      if (!ok) txt('あと' + Math.max(1, SHOTS - hits) + '本!', W / 2, H * 0.18, 26, C.danger);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink1);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, total: SHOTS });
        else game.end.failure({ hits: hits, total: SHOTS });
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

    bg();
    drawGauge();
    drawDiver();

    txt(hits + ' / ' + SHOTS, W / 2, H * 0.06, 32, C.ink0);
    game.draw.rect(60, 150, W - 120, 16, C.ink2, 0.6);
    game.draw.rect(60, 150, (W - 120) * (shotIdx / SHOTS), 16, C.ink0);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 56, C.ink0);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_dark', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
