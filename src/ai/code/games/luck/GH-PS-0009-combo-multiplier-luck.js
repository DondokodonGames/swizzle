// GH-PS-0009-combo-multiplier-luck.js
// ラッキーレーダー — 回る針が光る扇の中を通った瞬間にタップ。当て続けるほど倍率が伸びる
// 操作: 針が光る扇の範囲に重なった瞬間にタップ。外すか、扇の外でタップすると倍率が1に戻る
// 終わり: 規定回数の周回が終われば終了。積み上げたスコアが残る
// @mechanic: jackpot_combo
// @theme: neon_luck_radar
// 世界観: 暗闇に光る円盤レーダー。針が一周する間、光る扇形が一箇所だけ現れる。そこを射抜き続けるほど倍率が伸び、黄金の扇は当てれば倍率がその場で跳ね上がる
// 残るもの: スコア(SCORE)。最高連続的中数と的中数
// スタイル: 70s VECTOR

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 70s VECTOR: 黒地に発光する線画のみ。塗りを使わず線を重ねて発光を作る
  var C = {
    bg: '#040308', ring: '#1a2a3a', line: '#3ad4ff', lineDim: '#123244',
    zone: '#39ff7a', zoneDim: '#0c3a1c', golden: '#ffd400', goldenDim: '#4a3c08',
    good: '#39ff7a', bad: '#ff3a4a', white: '#eaf6ff', ink: '#020208',
  };

  var GAME_TITLE = 'LUCKY RADAR';
  var TOTAL_SPINS = 10;
  var CX = W / 2, CY = H * 0.42, R = 360;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var spinIdx, angle, angSpeed, zoneA, zoneW, golden, zoneHitThisSpin;
  var score, combo, bestCombo, hits, misses;
  var done, endWait, finished, finalScore, starPulse;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function radarBg() {
    game.draw.gradient(0, H, [[0, '#0a0e18'], [0.5, C.bg], [1, '#020204']]);
    for (var i = 0; i < 3; i++) game.draw.circle(CX, CY, R * (0.34 + i * 0.33), C.ring, 0.0);
    game.draw.circle(CX, CY, R + 8, C.line, 0.04);
    game.draw.circle(CX, CY, R - 6, C.bg, 1);
    game.draw.circle(CX, CY, R, C.lineDim, 0.5);
  }

  var STAR_SPRITE = ['..#..', '.###.', '#####', '.###.', '#.#.#'];

  function normAngle(a) { a = a % 360; if (a < 0) a += 360; return a; }

  function drawZoneArc(a0, w, color, dimColor, bright) {
    var steps = Math.max(6, Math.round(w / 4));
    for (var i = 0; i <= steps; i++) {
      var a = a0 + (w * i) / steps;
      var rad = (a - 90) * Math.PI / 180;
      var x1 = CX + Math.cos(rad) * (R - 30), y1 = CY + Math.sin(rad) * (R - 30);
      var x2 = CX + Math.cos(rad) * (R + 14), y2 = CY + Math.sin(rad) * (R + 14);
      game.draw.line(x1, y1, x2, y2, bright ? color : dimColor, bright ? 8 : 4);
    }
  }

  function drawDial() {
    // 外周の薄い目盛り
    for (var d = 0; d < 360; d += 10) {
      var rad = (d - 90) * Math.PI / 180;
      var x1 = CX + Math.cos(rad) * (R - 10), y1 = CY + Math.sin(rad) * (R - 10);
      var x2 = CX + Math.cos(rad) * R, y2 = CY + Math.sin(rad) * R;
      game.draw.line(x1, y1, x2, y2, C.lineDim, 2);
    }
    drawZoneArc(zoneA, zoneW, golden ? C.golden : C.zone, golden ? C.goldenDim : C.zoneDim, true);
    // 針
    var rad2 = (angle - 90) * Math.PI / 180;
    var hx = CX + Math.cos(rad2) * (R - 4), hy = CY + Math.sin(rad2) * (R - 4);
    game.draw.line(CX, CY, hx, hy, C.line, 10);
    game.draw.line(CX, CY, hx, hy, '#ffffff', 3);
    game.draw.circle(CX, CY, 60, C.ring, 0.6);
    var sc = 1 + starPulse * 0.5;
    game.draw.sprite(STAR_SPRITE, { '#': combo > 0 ? C.golden : C.line }, CX, CY, 9 * sc, { anchor: 'center' });
  }

  function newSpin() {
    spinIdx++;
    golden = spinIdx % 4 === 0 && spinIdx > 0;
    zoneW = golden ? 62 : Math.max(30, 52 - combo * 2);
    zoneA = Math.random() * 360;
    angle = 0;
    angSpeed = 200 + spinIdx * 8;
    zoneHitThisSpin = false;
  }

  function initGame() {
    spinIdx = -1; score = 0; combo = 0; bestCombo = 0; hits = 0; misses = 0;
    done = false; endWait = 0; finished = false; starPulse = 0;
    ready = 0.8; hitStop = 0; shake = 0;
    newSpin();
  }

  function inZone() {
    var a = normAngle(angle);
    var a0 = normAngle(zoneA);
    var diff = normAngle(a - a0);
    return diff <= zoneW;
  }

  function attempt() {
    if (done || ready > 0 || hitStop > 0 || finished || zoneHitThisSpin) return;
    zoneHitThisSpin = true;
    var rad = (angle - 90) * Math.PI / 180;
    var px = CX + Math.cos(rad) * R, py = CY + Math.sin(rad) * R;
    if (inZone()) {
      hits++; combo++; bestCombo = Math.max(bestCombo, combo);
      starPulse = 1;
      var gain = 100 * combo + (golden ? 400 : 0);
      score += gain;
      hitStop = 0.10;
      game.feedback.good(px, py, { text: golden ? 'BONUS' : 'x' + combo, color: golden ? C.golden : C.good });
      game.audio.play(golden ? 'se_powerup' : 'se_good', 0.35);
      if (golden) { game.fx.popup('BONUS', CX, H * 0.20, { color: C.golden, size: 44 }); }
      else if (combo % 2 === 0) { game.fx.popup('x' + combo, CX, H * 0.20, { color: C.zone, size: 42 }); game.audio.play('se_milestone', 0.3); }
    } else {
      misses++; combo = 0;
      hitStop = 0.06;
      game.feedback.bad(px, py, { text: 'MISS' });
      shake = 0.12;
      game.audio.play('se_bad', 0.3);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.press = false; return; }
    attempt();
  });

  function finish() {
    if (done) return;
    done = true;
    finalScore = score;
    game.audio.stopBgm();
    game.audio.play(hits > misses ? 'se_success' : 'se_failure', 0.4);
    endWait = 1.4;
  }

  function stepSpin(dt) {
    angle += angSpeed * dt;
    if (starPulse > 0) starPulse -= dt * 2.4;
    if (angle >= 360) {
      if (!zoneHitThisSpin) { misses++; combo = 0; }
      if (spinIdx + 1 >= TOTAL_SPINS) { finished = true; finish(); return; }
      newSpin();
    }
  }

  var demo = { t: 0, gx: CX, gy: CY, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    if (spinIdx === undefined) initGame();
    if (!finished) {
      stepSpin(dt);
      var inz = inZone();
      demo.press = inz && Math.floor(demo.t * 5) % 2 === 0;
      if (demo.press && !demo.did) { demo.did = true; attempt(); }
      if (!demo.press) demo.did = false;
    } else { initGame(); }
    var rad = (angle - 90) * Math.PI / 180;
    demo.gx = CX + Math.cos(rad) * (R * 0.6); demo.gy = CY + Math.sin(rad) * (R * 0.6);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      radarBg();
      stepDemo(dt);
      drawDial();
      game.draw.hand(demo.gx + Math.cos(game.time.elapsed * 2.5) * 14, demo.gy + Math.sin(game.time.elapsed * 2.5) * 14, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.06, 44, C.white, 'center');
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.10, 24, C.golden, 'center');
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 42, C.golden, 'center');
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 28, C.white, 'center');
      }
      return;
    }

    if (state === S.RESULT) {
      radarBg();
      drawDial();
      txt('TIME UP', W / 2, H * 0.06, 46, C.white, 'center');
      txt('SCORE ' + finalScore, W / 2, H * 0.105, 34, C.golden, 'center');
      txt('BEST COMBO x' + bestCombo, W / 2, H * 0.15, 26, C.zone, 'center');
      if (bestCombo < 8 && bestCombo >= 6) txt('あと' + (8 - bestCombo) + '!', W / 2, H * 0.19, 26, C.bad, 'center');
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + best, W / 2, H * 0.225, 24, C.white, 'center');
      if (finalScore > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.27, 32, C.golden, 'center');
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.white, 'center');
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        game.end.record(score, { hits: hits, misses: misses, bestCombo: bestCombo });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepSpin(dt);
    }
    if (shake > 0) shake -= dt;

    radarBg();
    drawDial();

    txt('SCORE ' + score, W / 2, H * 0.055, 34, C.white, 'center');
    var progress = Math.max(0, Math.min(1, (spinIdx + 1) / TOTAL_SPINS)); // 周回の進捗
    game.draw.rect(60, 90, W - 120, 14, C.ink, 0.6);
    game.draw.rect(60, 90, (W - 120) * progress, 14, C.golden);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.80, 58, C.golden, 'center');
  });

  game.onStart(function() {
    game.audio.melody(
      [['C5', 0.12], ['E5', 0.12], ['G5', 0.12], ['B5', 0.12], ['C6', 0.24]],
      { tempo: 150, wave: 'square', volume: 0.06, loop: true }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
