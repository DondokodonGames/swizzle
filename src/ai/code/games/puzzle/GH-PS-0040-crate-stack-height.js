// GH-PS-0040-crate-stack-height.js
// クレートスタッカー — 埠頭のクレーンで積み荷を落とし、崩さず高く積む
// 操作: 左右に揺れる積み荷を、下の山の真上に来た瞬間にタップして落とす
// 終わり: 規定段数まで崩さず積めば成功。ズレて落とせば崩落して失敗
// @mechanic: stack
// @theme: harbor_crane
// 世界観: 埠頭のクレーンで、目のついた木箱を船倉に積み上げる。積むほど山は細く許容範囲が狭まり、時おり突風で箱が大きく振れる
// 残るもの: 正誤(CLEAR/GAME OVER) + 積み上げた段数
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // NEO-RETRO: 限定4〜6色、大きいドット、1色だけ強い差し色
  var C = {
    sky1: '#2a3550', sky2: '#161c30', sea: '#0e1626', pier: '#1c2740',
    crate: '#c98a4a', crateDark: '#8a5a2a', crateLine: '#5a3818',
    gold: '#ffd400', good: '#4dff9a', bad: '#ff4d5e', white: '#f4ecd8', ink: '#100a06',
  };

  var GAME_TITLE = 'CRATE STACKER';
  var NEEDED = 9;
  var BASE_Y = H * 0.80;
  var LEVEL_H = 94;
  var CRATE_W = 190;
  var VISIBLE_LEVELS = 6;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var stackXs, height, tol, swingX, swingDir, swingT, gustT, gustWarn, gustActive;
  var done, endWait, finished, camY, faceHit;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var GULL_SPRITE = ['#.#', '###'];

  function pierBg() {
    game.draw.gradient(0, H * 0.62, [[0, C.sky1], [1, C.sky2]]);
    game.draw.rect(0, H * 0.62, W, H * 0.38, C.sea);
    for (var i = 0; i < 5; i++) game.draw.rect(0, H * 0.62 + i * 40, W, 3, '#ffffff08');
    game.draw.rect(0, H * 0.74, W, H * 0.06, C.pier);
    var gx = (game.time.elapsed * 60) % (W + 200) - 100;
    game.draw.sprite(GULL_SPRITE, { '#': '#ffffff55' }, gx, H * 0.10, 8, { anchor: 'center' });
  }

  function tolFor(lv) { return Math.max(64, 148 - lv * 9); }

  function initGame() {
    stackXs = [W / 2];
    height = 1; tol = tolFor(1); camY = 0; faceHit = 0;
    swingX = W / 2; swingDir = 1; swingT = 0;
    gustT = 3.0 + game.random(0, 2); gustWarn = 0; gustActive = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function levelScreenY(lv) { return BASE_Y - lv * LEVEL_H + camY; }

  function drawCrate(x, y, w, golden, eyesClosed) {
    var body = golden ? C.gold : C.crate;
    game.draw.rect(x - w / 2, y - LEVEL_H / 2 + 6, w, LEVEL_H - 12, C.crateDark);
    game.draw.rect(x - w / 2 + 6, y - LEVEL_H / 2 + 6, w - 12, LEVEL_H - 18, body);
    game.draw.line(x - w / 2 + 6, y, x + w / 2 - 6, y, C.crateLine, 4);
    game.draw.line(x, y - LEVEL_H / 2 + 8, x, y + LEVEL_H / 2 - 10, C.crateLine, 4);
    // 目(モチーフ)
    if (eyesClosed) {
      game.draw.line(x - 28, y - 10, x - 12, y - 10, C.ink, 5);
      game.draw.line(x + 12, y - 10, x + 28, y - 10, C.ink, 5);
    } else {
      game.draw.circle(x - 20, y - 10, 12, C.white);
      game.draw.circle(x + 20, y - 10, 12, C.white);
      game.draw.circle(x - 20, y - 10, 5, C.ink);
      game.draw.circle(x + 20, y - 10, 5, C.ink);
    }
  }

  function drawStack() {
    for (var lv = 1; lv <= height; lv++) {
      var sy = levelScreenY(lv);
      if (sy < H * 0.10 - LEVEL_H || sy > H * 0.85 + LEVEL_H) continue;
      var w = CRATE_W - Math.max(0, height - lv) * 0; // 山自体の幅は一定、許容範囲だけ狭まる
      var golden = lv % 3 === 0 && lv > 1;
      drawCrate(stackXs[lv - 1], sy, w, golden, false);
    }
    // 土台
    game.draw.rect(W * 0.5 - 230, BASE_Y + LEVEL_H / 2 - 6 + camY, 460, 40, C.pier);
  }

  function currentTopX() { return stackXs[height - 1]; }

  function drawFalling() {
    if (done || finished) return;
    var sy = levelScreenY(height + 1) - 260; // 待機高度(山の上空)
    var targetX = currentTopX();
    var toleranceEdge = tol;
    // 落下先マーカー(影)を山の上に投影 = telegraph
    var markerY = levelScreenY(height) - LEVEL_H / 2 - 4;
    var within = Math.abs(swingX - targetX) <= toleranceEdge;
    game.draw.rect(targetX - toleranceEdge, markerY - 6, toleranceEdge * 2, 10, within ? C.good : C.bad, 0.35);
    game.draw.circle(swingX, markerY, 8, within ? C.good : C.bad, 0.7);
    drawCrate(swingX, sy, CRATE_W, height % 3 === 2, false);
    // 突風の警告(点滅マーカー+粒子)
    if (gustWarn > 0) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) {
        game.draw.rect(0, H * 0.30, W, 14, C.gold, 0.6);
        game.draw.rect(0, H * 0.62, W, 14, C.gold, 0.6);
      }
    }
    if (gustActive > 0) {
      for (var i = 0; i < 6; i++) {
        var wx = (W * i / 6 + game.time.elapsed * 900) % W;
        game.draw.rect(wx, H * 0.20 + i * 60, 60, 4, '#ffffff33');
      }
    }
  }

  function stepSwing(dt) {
    if (done || finished || ready > 0 || hitStop > 0) return;
    swingT += dt;
    if (gustWarn > 0) { gustWarn -= dt; if (gustWarn <= 0) { gustActive = 1.6; game.audio.tone(180, 0.35, { wave: 'sawtooth', volume: 0.2, slide: -60 }); } }
    if (gustActive > 0) gustActive -= dt;
    gustT -= dt;
    if (gustT <= 0 && gustWarn <= 0 && gustActive <= 0 && height >= 4) {
      gustT = 5 + game.random(0, 2); gustWarn = 0.65;
      game.audio.tone(880, 0.12, { wave: 'square', volume: 0.15 });
    }
    var speed = (0.9 + height * 0.05) * (gustActive > 0 ? 2.0 : 1);
    var range = 260 + Math.min(180, height * 8);
    swingX = currentTopX() + Math.sin(swingT * speed) * range;
    swingX = Math.max(CRATE_W / 2 + 20, Math.min(W - CRATE_W / 2 - 20, swingX));
  }

  function dropCrate() {
    if (done || ready > 0 || hitStop > 0 || finished) return;
    var targetX = currentTopX();
    var offset = swingX - targetX;
    var golden = height % 3 === 2;
    var landY = levelScreenY(height + 1);
    if (Math.abs(offset) <= tol) {
      hitStop = 0.12;
      height++;
      stackXs.push(targetX + offset * 0.5);
      tol = tolFor(height);
      game.audio.play('se_tap', 0.15);
      game.feedback.good(swingX, landY, { text: golden ? 'BONUS' : null, color: golden ? C.gold : C.good });
      if (golden) { game.fx.popup('BONUS', swingX, landY - 60, { color: C.gold, size: 40 }); game.audio.play('se_powerup', 0.4); }
      if (height >= VISIBLE_LEVELS) camY = (height - VISIBLE_LEVELS) * LEVEL_H;
      if (height - 1 >= NEEDED) { ok = true; finished = true; game.fx.burst(swingX, landY, { color: C.gold, count: 22, speed: 400 }); game.audio.play('se_success', 0.5); finish(); }
      else if (height % 3 === 0) { game.fx.popup(height + ' / ' + NEEDED, W / 2, H * 0.16, { color: C.gold, size: 40 }); game.audio.play('se_milestone', 0.4); }
    } else {
      finished = true; ok = false; hitStop = 0.4;
      faceHit = 0.6;
      game.feedback.bad(swingX, landY, { text: 'MISS', shake: true });
      shake = 0.35;
      game.fx.burst(swingX, landY, { color: C.bad, count: 18, speed: 380 });
      game.audio.play('se_failure', 0.5);
      finish();
    }
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.4;
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.press = false; return; }
    dropCrate();
  });

  // ── ATTRACT ゴースト実演: 実ロジックで揺れを見て、山の真上でタップ ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.4, press: false, fails: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    if (stackXs === undefined) initGame();
    stepSwing(dt);
    demo.gx = swingX;
    demo.gy = levelScreenY(height + 1) - 260;
    var aligned = Math.abs(swingX - currentTopX()) <= tol * 0.6;
    demo.press = aligned && Math.floor(demo.t * 3) % 3 === 0;
    if (demo.press && !demo.did) { demo.did = true; dropCrate(); if (height > NEEDED || finished) { initGame(); } }
    if (!demo.press) demo.did = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      pierBg();
      stepDemo(dt);
      drawStack();
      if (!finished) drawFalling();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + '段' : '-'), W / 2, H * 0.105, 26, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 42, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      pierBg();
      drawStack();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.07, 52, ok ? C.good : C.bad);
      txt((height - 1) + ' / ' + NEEDED + '段', W / 2, H * 0.12, 32, C.gold);
      if (!ok && height - 1 >= NEEDED - 1) txt('あと1段!', W / 2, H * 0.165, 30, C.bad);
      var best = Math.max(game.best, height - 1);
      txt('BEST ' + best + '段', W / 2, H * 0.205, 26, C.white);
      if (height - 1 > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.25, 34, C.gold);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { height: height - 1 };
        if (ok) game.end.success(height - 1, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepSwing(dt);
    }
    if (shake > 0) shake -= dt;
    if (faceHit > 0) faceHit -= dt;

    pierBg();
    drawStack();
    if (!finished) drawFalling();

    txt((height - 1) + ' / ' + NEEDED, W / 2, H * 0.055, 34, C.white);
    game.draw.rect(60, 76, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 76, (W - 120) * Math.min(1, (height - 1) / NEEDED), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 60, C.gold);
  });

  game.onStart(function() {
    game.audio.melody(
      [['C4', 0.25], ['E4', 0.25], ['G4', 0.25], ['C5', 0.25], ['G4', 0.25], ['E4', 0.25]],
      { tempo: 118, wave: 'square', volume: 0.06, loop: true }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
