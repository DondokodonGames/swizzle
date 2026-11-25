// GH-PS-0090-golf-charge-power.js
// ゴルフチャージ・パワー — パワーゲージを溜めて離し、距離と精度でカップを狙う
// 操作: 押し続けるとパワーゲージが伸びる(伸びすぎるとオーバーチャージで失速)。狙った強さで指を離して打つ
// 終わり: 3打の合計スコアが目標以上ならCLEAR。届かなければGAME OVER。3打目は追い風の黄金ショット
// @mechanic: hold_charge
// @theme: voxel_links_course
// 世界観: ボクセルブロックで組まれたミニリンクス。3打でカップに近づけるほど高得点。溜めすぎると逆にオーバーチャージで失速する
// 残るもの: 正誤(CLEAR/GAME OVER) + 合計スコア
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // VOXEL BLOCK: 立方体を上面/左面/右面の3明度で。等角に積む
  var C = {
    sky1: '#bfe8ff', sky2: '#eaf7ff', fairway: '#6fd06a', fairwayDark: '#4aa848', fairwayLight: '#8fe08a',
    cup: '#2a2a2a', flag: '#ff4d5e', golfer: '#f0c860', golferDark: '#c89830',
    good: '#4de08a', bad: '#ff4d5e', gold: '#ffd400', white: '#ffffff', ink: '#182018',
  };

  var GAME_TITLE = 'CHARGE SHOT';
  var SHOTS = 3, TARGET_SCORE = 6;
  var CX = W / 2;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var shotIdx, totalScore, charging, chargeT, ballFrac, flying, flyT, lastPts, wind;
  var done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CHARGE_MAX = 1.1; // これを超えて溜めるとオーバーチャージ
  var TEE_Y = H * 0.62, CUP_Y = H * 0.24;

  function voxelStrip(x, y, w, h, top, left) {
    game.draw.rect(x, y, w, h * 0.5, top);
    game.draw.rect(x, y + h * 0.5, w, h * 0.5, left);
  }

  function courseBg() {
    game.draw.gradient(0, H, [[0, C.sky1], [0.35, C.sky2], [0.36, C.fairwayLight], [1, C.fairwayDark]]);
    for (var i = 0; i < 10; i++) voxelStrip(i * (W / 10), H * 0.36, W / 10 - 2, H * 0.62, C.fairwayLight, C.fairway);
    game.draw.circle(CX, CUP_Y, 26, C.cup);
    game.draw.rect(CX + 22, CUP_Y - 110, 6, 110, '#8a6a3a');
    game.draw.rect(CX + 28, CUP_Y - 108, 44, 30, C.flag);
  }

  var GOLFER_BACK = ['.##.', '####', '.##.', '#..#'];
  var GOLFER_SWING = ['.##.', '####', '.##.', '..##'];

  function drawGolfer(swinging) {
    game.draw.sprite(swinging ? GOLFER_SWING : GOLFER_BACK, { '#': C.golfer }, CX - 140, TEE_Y, 24, { anchor: 'center' });
  }

  function drawBall(px, py) {
    game.draw.circle(px, py, 14, C.white);
  }

  function newShot() {
    charging = false; chargeT = 0; flying = false; flyT = 0; lastPts = 0;
    wind = shotIdx === SHOTS - 1 ? (Math.random() < 0.5 ? -1 : 1) * (0.15 + Math.random() * 0.1) : 0;
  }

  function initGame() {
    shotIdx = 0; totalScore = 0; finished = false; done = false; endWait = 0;
    ready = 0.8; hitStop = 0; shake = 0;
    newShot();
  }

  function startCharge() {
    if (done || ready > 0 || hitStop > 0 || finished || flying) return;
    charging = true; chargeT = 0;
  }

  function releaseCharge() {
    if (!charging) return;
    charging = false;
    var over = chargeT > CHARGE_MAX;
    var power = over ? Math.max(0.15, 1 - (chargeT - CHARGE_MAX) * 1.4) : Math.min(1, chargeT / CHARGE_MAX);
    hitStop = 0.14;
    game.audio.play('se_jump', 0.35);
    flying = true; flyT = 0; ballFrac = 0;
    flying = { power: power, over: over };
  }

  function landShot() {
    var res = flying;
    flying = false;
    var dist = res.power; // 0..1 目安
    var accuracy = 1 - Math.abs(dist - 0.82) * 2.2 + wind;
    accuracy = Math.max(0, Math.min(1, accuracy));
    var pts = res.over ? 0 : Math.round(accuracy * 3);
    lastPts = pts;
    totalScore += pts;
    var landX = CX - 140 + (CX + 140 - (CX - 140)) * dist + wind * 200;
    var landY = TEE_Y - (TEE_Y - CUP_Y) * dist;
    hitStop = 0.2;
    if (pts >= 3) {
      game.feedback.good(landX, landY, { text: shotIdx === SHOTS - 1 ? 'GOLDEN!' : 'PERFECT', color: C.good });
      game.fx.burst(landX, landY, { color: C.gold, count: 20, speed: 380 });
      game.audio.play('se_success', 0.4);
    } else if (pts > 0) {
      game.feedback.good(landX, landY, { text: 'GOOD', color: C.good });
      game.fx.burst(landX, landY, { color: C.gold, count: 10, speed: 300 });
      game.audio.play('se_good', 0.35);
    } else {
      game.feedback.bad(landX, landY, { text: res.over ? 'OVER CHARGE' : 'MISS' });
      shake = 0.2;
      game.audio.play('se_bad', 0.35);
    }
    if (shotIdx === Math.floor(SHOTS / 2)) { game.fx.popup(totalScore + ' PT', CX, H * 0.14, { color: C.gold, size: 40 }); game.audio.play('se_milestone', 0.4); }
    shotIdx++;
    if (shotIdx >= SHOTS) {
      ok = totalScore >= TARGET_SCORE;
      finished = true;
      finish();
    } else {
      newShot();
    }
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
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.press = false; return; }
  });
  game.onPress(function() { if (state === S.PLAYING) { game.audio.play('se_tap', 0.05); startCharge(); } });
  game.onRelease(function() { if (state === S.PLAYING) { game.audio.play('se_tap', 0.03); releaseCharge(); } });

  function stepPlay(dt) {
    if (charging) chargeT += dt;
    if (flying && typeof flying === 'object') {
      flyT += dt;
      if (flyT > 0.5) landShot();
    }
  }

  // ── ATTRACT ゴースト実演: ちょうどよく溜めて放つ成功例1回、溜めすぎるオーバーチャージ失敗例1回 ──
  var demo = { t: 0, gx: CX - 140, gy: TEE_Y + 260, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.0;
    wind = 0;
    if (cyc < 0.15) { charging = false; chargeT = 0; demo.press = false; }
    else if (cyc < 1.10) { charging = true; chargeT = cyc - 0.15; demo.press = true; }
    else if (cyc < 1.6) { charging = false; demo.press = false; }
    else if (cyc < 2.15) { charging = false; demo.press = false; }
    else if (cyc < 3.45) { charging = true; chargeT = cyc - 2.15; demo.press = true; }
    else { charging = false; demo.press = false; }

    if (cyc >= 1.09 && cyc < 1.11) { game.feedback.good(CX + 60, H * 0.40, { text: 'PERFECT', color: C.good }); game.fx.burst(CX + 60, H * 0.40, { color: C.gold, count: 14, speed: 340 }); }
    if (cyc >= 3.44 && cyc < 3.46) { game.feedback.bad(CX + 120, TEE_Y - 20, { text: 'OVER CHARGE' }); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (totalScore === undefined) initGame();
      courseBg();
      stepDemo(dt);
      drawGolfer(charging);
      var gf = charging ? Math.min(1.4, chargeT / CHARGE_MAX) : 0;
      game.draw.rect(CX - 200, H * 0.86, 400, 26, C.white, 0.5);
      game.draw.rect(CX - 200, H * 0.86, 400 * Math.min(1, gf), 26, gf > 1 ? C.bad : C.gold);
      game.draw.hand(demo.gx + Math.cos(game.time.elapsed * 2.5) * 34, demo.gy + Math.sin(game.time.elapsed * 2.5) * 34, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, CX, H * 0.06, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best + ' PT' : '-'), CX, H * 0.10, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', CX, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', CX, H * 0.94, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      courseBg();
      drawGolfer(false);
      txt(ok ? 'CLEAR' : 'GAME OVER', CX, H * 0.06, 48, ok ? C.good : C.bad);
      txt(totalScore + ' / ' + TARGET_SCORE, CX, H * 0.10, 30, C.ink);
      if (!ok && totalScore === TARGET_SCORE - 1) txt('あと1打分!', CX, H * 0.14, 26, C.gold);
      if (ok && (game.best === 0 || totalScore > game.best)) txt('NEW RECORD', CX, H * 0.14, 26, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', CX, H * 0.94, 26, C.ink);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success({ score: totalScore }); else game.end.failure({ score: totalScore });
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

    courseBg();
    drawGolfer(charging);
    if (flying && typeof flying === 'object') {
      var f = Math.min(1, flyT / 0.5);
      var bx = CX - 140 + ((CX + 140) - (CX - 140)) * flying.power * f;
      var by = TEE_Y - (TEE_Y - CUP_Y) * flying.power * f - Math.sin(f * Math.PI) * 120;
      drawBall(bx, by);
    }
    var gfrac = charging ? Math.min(1.4, chargeT / CHARGE_MAX) : 0;
    game.draw.rect(CX - 200, H * 0.86, 400, 28, C.white, 0.6);
    game.draw.rect(CX - 200, H * 0.86, 400 * Math.min(1, gfrac), 28, gfrac > 1 ? C.bad : C.gold);

    txt(shotIdx + ' / ' + SHOTS, CX, H * 0.06, 32, C.ink);
    txt(totalScore + ' PT', CX, H * 0.10, 26, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', CX, H * 0.48, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C5', 0.3], ['G5', 0.3], ['E5', 0.3], ['C6', 0.5]], { tempo: 122, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
