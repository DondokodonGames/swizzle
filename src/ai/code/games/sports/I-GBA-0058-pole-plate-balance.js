// I-GBA-0058-pole-plate-balance.js
// ポールプレート・バランス — 頭上のポールに乗せた皿が落ちないよう、左右タップで重心を保つ
// 操作: 皿が傾いた側と逆をタップして体重を移し、水平に戻し続ける
// 終わり: 規定時間、皿を落とさず保てれば成功。皿が落ちれば失敗
// @mechanic: balance
// @theme: pole_plate_balance
// 世界観: 大道芸の一座。頭に立てた細いポールの先で皿を回し続ける芸人が、風で傾く皿を落とさぬよう耐える
// 残るもの: 正誤(CLEAR/GAME OVER) + 保ち続けた時間
// スタイル: 70s VECTOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s VECTOR: 黒地に発光する線画のみ、塗りを使わない
  var C = {
    bg: '#000000', line: '#39ff7a', lineDim: '#0a3a1a', accent: '#ffe14d',
    bad: '#ff3355', white: '#e8ffe8',
  };

  var GAME_TITLE = 'PLATE BALANCE';
  var CX = W * 0.5, PERFORMER_Y = H * 0.62;
  var HOLD_TARGET = 10.5;
  var MAX_TILT = 40;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var tilt, tiltVel, wind, held, done, endWait, finished;
  var ready, hitStop, shake, lastMilestone;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PERFORMER_SPRITE = ['..##..', '.####.', '..##..', '#.##.#', '.#..#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, '#050505'], [0.6, C.bg], [1, '#020402']]);
    for (var i = 0; i < 6; i++) game.draw.circle(W * (0.15 + i * 0.15), H * (0.1 + (i % 2) * 0.03), 3, C.lineDim);
    game.draw.line(0, H * 0.92, W, H * 0.92, C.lineDim, 4);
  }

  function drawPerformer(t) {
    var poleTopX = CX + t * 2.2, poleTopY = PERFORMER_Y - 220;
    game.draw.sprite(PERFORMER_SPRITE, { '#': C.line }, CX, PERFORMER_Y, 22, { anchor: 'center' });
    game.draw.line(CX, PERFORMER_Y - 90, poleTopX, poleTopY, C.line, 5);
    // 皿(横1pxストリップの疑似楕円は不要、線と円で十分表現)
    game.draw.line(poleTopX - 70, poleTopY - t * 0.6, poleTopX + 70, poleTopY + t * 0.6, C.accent, 8);
    game.draw.circle(poleTopX, poleTopY, 10, C.accent);
  }

  function initGame() {
    tilt = 0; tiltVel = 0; wind = 0; held = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; lastMilestone = 0;
  }

  function push(side) {
    if (finished || done || ready > 0) return;
    game.audio.play('se_tap', 0.15);
    tiltVel += side === 'right' ? -14 : 14;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) push(x < CX ? 'left' : 'right');
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function stepPhysics(dt) {
    wind += (game.random(-1, 1) - wind) * dt * 0.6;
    tiltVel += wind * dt * 30;
    tilt += tiltVel * dt;
    tiltVel *= 0.96;
    tilt = Math.max(-MAX_TILT, Math.min(MAX_TILT, tilt));
  }

  var demo = { t: 0, gx: CX - 150, gy: H * 0.85, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.0;
    if (cyc < dt || demo.t <= dt) { tilt = 0; tiltVel = 0; wind = 0; held = 0; }
    // 実ロジックを流用: 傾きに応じて逆側を軽くタップし続ける
    stepPhysics(dt);
    if (Math.abs(tilt) > 10 && Math.random() < dt * 6) {
      var side = tilt > 0 ? 'left' : 'right';
      tiltVel += side === 'right' ? -14 : 14;
      demo.gx = CX + (side === 'left' ? -150 : 150);
      demo.press = true;
      game.audio.play('se_tap', 0.08);
    } else {
      demo.press = false;
    }
    if (cyc > 4.6) tilt *= 0.9;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (tilt === undefined) initGame();
      bg();
      stepDemo(dt);
      drawPerformer(tilt);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.line);
      txt('BEST ' + (game.best > 0 ? Math.round(game.best * 10) / 10 + 's' : '-'), W / 2, H * 0.12, 22, C.accent);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.accent);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.line);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawPerformer(ok ? 0 : tilt);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.line : C.bad);
      txt(held.toFixed(1) + ' / ' + HOLD_TARGET + 's', W / 2, H * 0.13, 28, C.accent);
      var rPct = Math.min(1, held / HOLD_TARGET);
      game.draw.rect(60, H * 0.16, W - 120, 16, C.lineDim);
      game.draw.rect(60, H * 0.16, (W - 120) * rPct, 16, ok ? C.line : C.accent);
      if (!ok) txt('あと少し!', W / 2, H * 0.2, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.line);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var heldR = Math.round(held * 10) / 10;
        if (ok) game.end.success(heldR, { held: heldR });
        else game.end.failure({ held: heldR });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepPhysics(dt);
      held += dt;
      if (Math.floor(held) > lastMilestone && held < HOLD_TARGET) {
        lastMilestone = Math.floor(held);
        game.fx.popup(lastMilestone + 's!', CX, PERFORMER_Y - 260, { color: C.accent, size: 34 });
        game.audio.play('se_milestone', 0.3);
      }
      if (Math.abs(tilt) >= MAX_TILT) {
        ok = false; finished = true; hitStop = 0.35; shake = 0.3;
        game.feedback.bad(CX, PERFORMER_Y - 220, { text: 'MISS' });
        game.audio.play('se_failure', 0.4);
        finish();
      } else if (held >= HOLD_TARGET) {
        ok = true; finished = true; hitStop = 0.25;
        game.feedback.good(CX, PERFORMER_Y - 220, { text: 'CLEAR', color: C.line });
        game.fx.burst(CX, PERFORMER_Y - 220, { color: C.accent, count: 20, speed: 380 });
        game.audio.play('se_success', 0.5);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawPerformer(tilt);

    txt(held.toFixed(1) + ' / ' + HOLD_TARGET + 's', W / 2, H * 0.06, 30, C.line);
    var tiltPct = 1 - Math.abs(tilt) / MAX_TILT;
    game.draw.rect(60, 150, W - 120, 16, C.lineDim);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, tiltPct), 16, tiltPct < 0.3 ? C.bad : C.line);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.accent);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.3], ['G4', 0.3], ['B4', 0.3], ['E5', 0.6]], { tempo: 100, wave: 'sine', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
