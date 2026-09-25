// D-20132016-0091-spore-gust-dash.js
// スポアガストダッシュ — 風に漂う胞子を操り、迫る大きな影から風を溜めて一気に逃げる
// 操作: 指を押し続けて風を溜め、影の予告が出たタイミングで離してダッシュ回避する
// 終わり: 規定回数(3回)の接近を全てかわせば成功。1回でも避け損なえば失敗
// @mechanic: hold_charge
// @theme: meadow_spore_drift
// 世界観: 風に漂う小さな胞子の精。牧草地を漂いながら、時おり舞い降りる大きな鳥影に呑まれぬよう風を溜めて逃げ切る
// 残るもの: 正誤(CLEAR/GAME OVER) + 回避できた回数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 明るい2トーン塗り分け+太い縁取り、彩度高め
  var STYLE = { bg: ['#a8e0c8', '#5fb894'], main: ['#fff2b0', '#e0a840'], accent: ['#3a2a4a', '#ff6a6a'] };
  var C = {
    sky1: STYLE.bg[0], sky2: STYLE.bg[1], grass: '#3f9c6e', grassDark: '#2d7a54',
    spore: STYLE.main[0], sporeDark: STYLE.main[1], shadow: STYLE.accent[0], shadowGlow: '#6a4a7a',
    gold: '#ffe066', good: '#4dff9a', bad: STYLE.accent[1], white: '#fffdf2', ink: '#20140a',
  };

  var GAME_TITLE = 'SPORE GUST';
  var TOTAL = 3;
  var CX = W * 0.5, PY = H * 0.62;
  var CHARGE_MIN = 0.28;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SPORE_SPRITE = ['.#.', '###', '.#.'];
  var SHADOW_SPRITE = ['##.##', '#####', '.###.', '..#..'];

  function bg() {
    var e = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky1], [1, C.sky2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(e * 1.3));
    for (var i = 0; i < 6; i++) {
      var gx = (i * 190 + Math.sin(e * 0.3 + i) * 20) % W;
      game.draw.circle(gx, H * (0.78 + 0.04 * Math.sin(e * 0.5 + i)), 10, C.grassDark, 0.5);
    }
    game.draw.rect(0, H * 0.86, W, H * 0.14, C.grass);
    game.draw.rect(0, H * 0.86, W, 6, C.grassDark);
  }

  function newShadow() {
    return { t: 0, dur: Math.max(1.0, 1.6 - round * 0.15), telegraphed: false, resolved: false, sx: CX + (Math.random() < 0.5 ? -1 : 1) * W * 0.28 };
  }

  var round, shadow, sporeX, sporeY, chargeActive, chargeStart, chargePow, dashVX, wobble;

  function initGame() {
    round = 0; ok = false;
    doneCount = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    sporeX = CX; sporeY = PY; dashVX = 0; wobble = 0;
    chargeActive = false; chargeStart = 0; chargePow = 0;
    shadow = newShadow();
  }

  var doneCount, done, endWait, finished, ready, hitStop, shake;

  function resolveDash(heldDur) {
    if (!shadow || shadow.resolved || ready > 0 || done || finished) return;
    shadow.resolved = true;
    var correct = heldDur >= CHARGE_MIN && shadow.telegraphed;
    hitStop = correct ? 0.12 : 0.35;
    if (correct) {
      doneCount++;
      dashVX = (shadow.sx < CX ? 1 : -1) * 620;
      game.feedback.good(sporeX, sporeY, { text: 'DASH', color: C.good });
      game.fx.burst(sporeX, sporeY, { color: C.gold, count: 16, speed: 340 });
      game.audio.play('se_powerup', 0.4);
      if (doneCount === Math.ceil(TOTAL / 2)) game.fx.popup('あと少し!', sporeX, sporeY - 200, { color: C.gold, size: 40 });
    } else {
      game.feedback.bad(sporeX, sporeY, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
    }
    if (!correct) { ok = false; finished = true; finish(); return; }
    if (doneCount >= TOTAL) { ok = true; finished = true; finish(); return; }
    round++;
    shadow = newShadow();
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    chargeActive = true; chargeStart = game.time.elapsed;
    game.audio.play('se_tap', 0.06);
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    if (!chargeActive) return;
    var held = game.time.elapsed - chargeStart;
    chargeActive = false; chargePow = 0;
    resolveDash(held);
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

  function drawShadowFig(sh) {
    if (!sh) return;
    var p = Math.min(1, sh.t / sh.dur);
    var y = H * 0.06 + (PY - H * 0.06 - 40) * p;
    if (p > 0.55) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) game.draw.circle(sh.sx, y, 90, C.bad, 0.22);
    }
    game.draw.circle(sh.sx, y, 60, C.shadowGlow, 0.4);
    game.draw.sprite(SHADOW_SPRITE, { '#': C.shadow }, sh.sx, y, 20, { anchor: 'center' });
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false, phase: 'wait' };
  function stepDemo(dt) {
    demo.t += dt;
    if (round === undefined || round === null) initGame();
    if (!shadow) { shadow = newShadow(); shadow.dur = 1.3; round = 0; }
    shadow.t += dt;
    sporeX += (CX - sporeX) * Math.min(1, dt * 3);
    var p = shadow.t / shadow.dur;
    if (p > 0.5 && !demo.pressing) {
      demo.pressing = true; demo.gy = H * 0.86; demo.press = true;
    }
    if (p > 0.6 && p < 0.7 && !shadow.telegraphed) {
      shadow.telegraphed = true;
    }
    if (p > 0.68 && demo.pressing) {
      demo.pressing = false; demo.press = false;
      var swipeDir = shadow.sx < CX ? 1 : -1;
      sporeX = CX + swipeDir * 220;
      game.feedback.good(CX, PY, { text: 'DASH', color: C.good });
      game.audio.play('se_powerup', 0.25);
    }
    if (p >= 1) { shadow = null; sporeX = CX; demo.gy = H * 0.86; demo.press = false; demo.pressing = false; }
  }

  game.onUpdate(function(dt) {
    wobble += dt;
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawShadowFig(shadow);
      game.draw.sprite(SPORE_SPRITE, { '#': C.spore }, sporeX + Math.sin(wobble * 2) * 6, PY + Math.cos(wobble * 1.7) * 8, 16, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      game.draw.sprite(SPORE_SPRITE, { '#': ok ? C.good : C.bad }, sporeX, PY + Math.sin(wobble * 2) * 6, 16, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(doneCount + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.ink);
      if (!ok) txt('あと' + (TOTAL - doneCount) + '回!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(doneCount, { dashed: doneCount, total: TOTAL });
        else game.end.failure({ dashed: doneCount, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      shadow.t += dt;
      if (shadow.t / shadow.dur >= 1 && !shadow.resolved) {
        shadow.resolved = true;
        hitStop = 0.35;
        game.feedback.bad(sporeX, sporeY, { text: 'MISS' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
      if (chargeActive) chargePow = Math.min(1, game.time.elapsed - chargeStart);
    }
    if (dashVX !== 0) { sporeX += dashVX * dt; dashVX *= 0.88; if (Math.abs(dashVX) < 10) dashVX = 0; sporeX = Math.max(140, Math.min(W - 140, sporeX)); }
    else sporeX += (CX - sporeX) * Math.min(1, dt * 3);
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawShadowFig(shadow);
    game.draw.sprite(SPORE_SPRITE, { '#': C.spore }, sporeX + Math.sin(wobble * 2) * 4, sporeY + Math.cos(wobble * 1.7) * 6, 16, { anchor: 'center' });
    if (chargeActive) game.draw.circle(sporeX, sporeY, 40 + chargePow * 40, C.gold, 0.35);

    txt(doneCount + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.2);
    game.draw.rect(60, 150, (W - 120) * (doneCount / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A4', 0.3], ['C5', 0.3], ['E5', 0.3], ['C5', 0.3]], { tempo: 108, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
