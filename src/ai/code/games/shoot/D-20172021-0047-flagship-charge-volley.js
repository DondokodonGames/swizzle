// D-20172021-0047-flagship-charge-volley.js
// フラッグシップチャージヴォレー — オートで進撃する艦隊を見守りながら、照準ゲージを溜めて敵艦の急所に主砲を撃ち込む
// 操作: 中央の砲門ボタンを長押しでゲージを溜め、光る急所帯に重なった瞬間に指を離して発射する
// 終わり: 2回の主砲をどちらも急所に当てれば成功。外せば失敗
// @mechanic: hold_charge
// @theme: flagship_charge_volley
// 世界観: 自動で進撃する艦隊の旗艦に乗る砲撃管制官が、迫る敵艦の急所帯を見極めながら主砲のゲージを溜め、渾身の一撃を撃ち込む
// 残るもの: 正誤(CLEAR/GAME OVER) + 命中数
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 立方体を上面/左面/右面の3明度で。等角に積む
  var C = {
    sea1: '#0a2a4a', sea2: '#123a5a', wave: '#1a5a8a',
    hullTop: '#8aa0b0', hullL: '#5a7080', hullR: '#3a5060',
    enemyTop: '#c06050', enemyL: '#903828', enemyR: '#602010',
    gaugeBg: '#0a1a2a', gaugeFill: '#4ad0ff', band: '#ffd54a',
    good: '#39e07a', bad: '#ff4d5e', gold: '#ffd54a', ink: '#eaf6ff', white: '#ffffff',
  };

  var GAME_TITLE = 'FLAGSHIP VOLLEY';
  var MAX_HOLD = 2.2;
  var BAND_LO = 0.62, BAND_HI = 0.84;
  var WAVE_TIMEOUT = 3.2;
  var WAVES = 2;
  var TIME_LIMIT = WAVES * WAVE_TIMEOUT + 1.5;
  var NEEDED = 2;
  var BTN = { x: W * 0.5, y: H * 0.83, r: 150 };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var GUNNER = ['..#..', '.###.', '#####', '.#.#.'];

  function voxelShip(cx, cy, s, topC, lc, rc) {
    game.draw.rect(cx - s * 1.4, cy - s * 0.3, s * 2.8, s * 0.6, lc, 1);
    game.draw.rect(cx - s * 1.4, cy - s * 0.7, s * 1.4, s * 0.5, topC, 1);
    game.draw.rect(cx, cy - s * 0.5, s * 1.4, s * 0.3, rc, 1);
    game.draw.rect(cx - s * 0.3, cy - s * 1.1, s * 0.6, s * 0.5, topC, 1);
  }

  function bg(scroll) {
    game.draw.gradient(0, H, [[0, C.sea1], [1, C.sea2]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    for (var i = 0; i < 10; i++) {
      var y = (i * 90 + (scroll % 90));
      game.draw.rect(0, H * 0.30 + y, W, 4, C.wave, 0.35);
    }
    voxelShip(W * 0.22, H * 0.34, 40, C.hullTop, C.hullL, C.hullR);
    voxelShip(W * 0.78, H * 0.30, 34, C.hullTop, C.hullL, C.hullR);
  }

  function drawEnemyShip() {
    var wobble = Math.sin(game.time.elapsed * 2) * 8;
    voxelShip(W * 0.5, H * 0.44 + wobble, 62, C.enemyTop, C.enemyL, C.enemyR);
    if (flashT > 0) game.draw.circle(W * 0.5, H * 0.44 + wobble, 100, flashGood ? C.good : C.bad, flashT / 0.25 * 0.5);
  }

  function drawGauge() {
    var isCharging = pressing;
    game.draw.circle(BTN.x, BTN.y, BTN.r + 16, isCharging ? C.gaugeFill : '#1a2a3a', isCharging ? 0.5 : 0.3);
    game.draw.circle(BTN.x, BTN.y, BTN.r, C.hullR, 1);
    game.draw.sprite(GUNNER, { '#': C.ink }, BTN.x, BTN.y, 18, { anchor: 'center' });
    var barX = 90, barW = W - 180, barY = H * 0.60, barH = 44;
    game.draw.rect(barX, barY, barW, barH, C.gaugeBg, 1);
    game.draw.rect(barX + barW * BAND_LO, barY, barW * (BAND_HI - BAND_LO), barH, C.band, 0.55);
    game.draw.rect(barX, barY, barW * Math.min(1, charge), barH, C.gaugeFill, 1);
  }

  var pressing, charge, waveIdx, waveClock, hits, halfCalled, flashT, flashGood;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    pressing = false; charge = 0; waveIdx = 0; waveClock = 0; hits = 0; halfCalled = false;
    flashT = 0; flashGood = false;
    done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
  }

  function resolveVolley() {
    var success = charge >= BAND_LO && charge <= BAND_HI;
    flashT = 0.25; flashGood = success;
    if (success) {
      hits++;
      game.feedback.good(W * 0.5, H * 0.44, { text: 'PERFECT', color: C.good });
      game.fx.burst(W * 0.5, H * 0.44, { color: C.gold, count: 24, speed: 420 });
      game.audio.play('se_powerup', 0.4);
      hitStop = 0.3;
      if (!halfCalled) { halfCalled = true; game.fx.popup('NICE', W * 0.5, H * 0.30, { color: C.gold, size: 32 }); game.audio.play('se_milestone', 0.3); }
      if (hits >= NEEDED && !finished) { ok = true; finished = true; finish(); }
    } else {
      game.feedback.bad(W * 0.5, H * 0.44, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      hitStop = 0.3; shake = 0.22;
    }
    waveIdx++;
    charge = 0; pressing = false; waveClock = 0;
    if (waveIdx >= WAVES && !finished) { ok = hits >= NEEDED; finished = true; finish(); }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    var d = Math.hypot(x - BTN.x, y - BTN.y);
    if (d > BTN.r * 1.2) return;
    game.audio.play('se_tap', 0.08);
    pressing = true;
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    game.audio.play('se_tap', 0.04);
    if (pressing) resolveVolley();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: BTN.x, gy: BTN.y, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) resetDemo();
    demo.gx = BTN.x; demo.gy = BTN.y;
    var releaseAt = MAX_HOLD * ((BAND_LO + BAND_HI) / 2);
    if (cyc < releaseAt) {
      if (!pressing) pressing = true;
      charge = cyc / MAX_HOLD;
      demo.press = true;
    } else if (cyc < releaseAt + 0.5) {
      if (pressing) resolveVolley();
      demo.press = false;
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (flashT > 0) flashT -= dt;

    if (state === S.ATTRACT) {
      if (charge === undefined) initGame();
      stepDemo(dt);
      bg(game.time.elapsed * 30);
      drawEnemyShip();
      drawGauge();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.10, 38, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.145, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg(game.time.elapsed * 30);
      drawEnemyShip();
      drawGauge();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.10, 46, ok ? C.good : C.bad);
      txt(hits + ' / ' + NEEDED, W / 2, H * 0.155, 30, C.gold);
      if (!ok) txt('あと' + Math.max(0, NEEDED - hits) + '発!', W / 2, H * 0.20, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, needed: NEEDED });
        else game.end.failure({ hits: hits, needed: NEEDED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      waveClock += dt;
      if (pressing) charge = Math.min(1, charge + dt / MAX_HOLD);
      if (waveClock >= WAVE_TIMEOUT) resolveVolley();
    }

    var shakeX = 0;
    if (shake > 0) { shake -= dt; shakeX = (Math.random() - 0.5) * 16 * shake; }

    bg(game.time.elapsed * 30);
    drawEnemyShip();
    drawGauge();
    txt(hits + ' / ' + NEEDED, W * 0.5, H * 0.065, 32, C.white);
    var pct = Math.max(0, 1 - waveClock / WAVE_TIMEOUT);
    game.draw.rect(70, 150, W - 140, 16, '#0a1a2a', 1);
    game.draw.rect(70, 150, (W - 140) * pct, 16, pct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense');
    state = S.ATTRACT;
    initGame();
  });
})(game);
