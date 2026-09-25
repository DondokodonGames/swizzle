// J-N644-0017-gearbox-ensemble-beat.js
// ギアボックスアンサンブルビート — 回転する歯車の切り欠きが指揮マーカーに重なった瞬間だけ歯車太鼓を叩く
// 操作: 回転する歯車の切り欠き(隙間)が上部の指揮マーカーに来た瞬間にタップして歯車太鼓を叩く
// 終わり: 規定回数(8回)を全て正しいタイミングで叩ければ成功。1回でもズレれば失敗
// @mechanic: timing_window
// @theme: gearbox_ensemble_beat
// 世界観: 歯車仕掛けの自動演奏楽団、見習い奏者が担当する一つの歯車太鼓を、回転速度の変わる歯車の切り欠きが指揮マーカーに重なる瞬間に合わせて叩き続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 合わせられた拍数
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: 深紺+彩度の高いアクセント、太めの輪郭とグロー
  var C = {
    bg: '#140a2a', bg2: '#241452', floor: '#3a2a6a', floorDark: '#1a1240',
    gear: '#ffb020', gearDark: '#7a5a10', marker: '#ff4fd0', markerGlow: '#4a1a44',
    good: '#39ff8a', bad: '#ff3355', gold: '#ffb020', white: '#f0e8ff', ink: '#0a0518',
  };

  var GAME_TITLE = 'GEAR BEAT';
  var TOTAL = 8;
  var CX = W * 0.5, CY = H * 0.46;
  var GEAR_R = 150;
  var NOTCH_DEG = 46;
  var MARKER_ANGLE = 270;
  var SPEED_BASE = [96, 118, 134, 150, 168, 148, 176, 160];
  var TIME_LIMIT = 13;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var hits, beat, spin, speed, combo, done, endWait, finished, ready, hitStop, shake, pumpFlash, halfShown, timeLeft;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DRUM_IDLE = ['.##.', '####', '.##.', '.##.', '#.##'];
  var DRUM_HIT = ['.#..', '.##.', '####', '.##.', '#.##'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, 0, W, H, C.gold, 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3));
    for (var i = 0; i < 6; i++) {
      var x = (i / 6) * W + (Math.sin(game.time.elapsed * 0.6 + i) * 20);
      game.draw.circle(x, H * 0.2, 40, C.floor, 0.08);
    }
    game.draw.rect(0, H * 0.82, W, H * 0.18, C.floorDark, 0.6);
  }

  function drawDrummer(hit) {
    var bob = Math.sin(game.time.elapsed * 3.2) * 10;
    var sway = Math.cos(game.time.elapsed * 2.1) * 14;
    game.draw.sprite(hit ? DRUM_HIT : DRUM_IDLE, { '#': C.gold }, CX + sway, H * 0.82 + bob, 24, { anchor: 'center' });
  }

  function speedFor(n) { return SPEED_BASE[Math.min(n, SPEED_BASE.length - 1)]; }
  function rotationDeg() { return (spin * speed) % 360; }
  function notchOpen(absAngle) {
    var rel = ((absAngle - rotationDeg()) % 360 + 360) % 360;
    return rel < NOTCH_DEG;
  }

  function initGame() {
    hits = 0; beat = 0; spin = 0; speed = speedFor(0); combo = 0; halfShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; pumpFlash = 0; timeLeft = TIME_LIMIT;
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function resolveBeat() {
    if (finished || ready > 0 || done) return;
    game.audio.play('se_tap', 0.05);
    var open = notchOpen(MARKER_ANGLE);
    if (open) {
      hits++; combo++; pumpFlash = 0.15; hitStop = 0.08;
      game.feedback.good(CX, CY - 200, { text: combo >= 3 ? 'PERFECT' : 'GOOD', color: C.good });
      game.fx.burst(CX, CY, { color: C.gold, count: 14, speed: 300 });
      game.audio.play('se_good', 0.35);
      if (!halfShown && hits >= Math.ceil(TOTAL / 2)) {
        halfShown = true;
        game.fx.popup('HALFWAY!', CX, CY - 240, { color: C.gold, size: 40 });
        game.audio.play('se_milestone', 0.35);
      }
      if (hits >= TOTAL) { ok = true; finished = true; finish(); return; }
      beat++;
      spin = 0;
      speed = speedFor(beat);
    } else {
      combo = 0; hitStop = 0.3;
      game.feedback.bad(CX, CY - 200, { text: 'MISS' });
      shake = 0.28;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) resolveBeat();
  });

  function drawGear() {
    var steps = 28;
    for (var i = 0; i < steps; i++) {
      var a = (i / steps) * 360;
      if (notchOpen(a)) continue;
      var rad = a * Math.PI / 180;
      var px = CX + Math.cos(rad) * GEAR_R, py = CY + Math.sin(rad) * GEAR_R;
      game.draw.circle(px, py, 15, C.gearDark);
      game.draw.circle(px, py, 10, C.gear);
    }
    var mrad = MARKER_ANGLE * Math.PI / 180;
    var mx = CX + Math.cos(mrad) * GEAR_R, my = CY + Math.sin(mrad) * GEAR_R;
    var open = notchOpen(MARKER_ANGLE);
    var pulse = 0.5 + 0.5 * Math.sin(game.time.elapsed * (open ? 11 : 6));
    game.draw.circle(mx, my, 22, open ? C.good : C.marker, 0.5 + 0.4 * pulse);
    game.draw.circle(CX, CY, GEAR_R - 18, C.markerGlow, 0.3);
  }

  var demo = { t: 0, gx: CX, gy: H * 0.82, press: false, b: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) { spin = 0; demo.b = 0; speed = speedFor(0); }
    spin += dt;
    if (notchOpen(MARKER_ANGLE) && !demo.fired) {
      demo.fired = true; demo.press = true; pumpFlash = 0.15;
      game.feedback.good(CX, CY - 200, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.2);
    } else if (!notchOpen(MARKER_ANGLE)) {
      demo.fired = false; demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (spin === undefined) initGame();
      bg();
      stepDemo(dt);
      drawGear();
      drawDrummer(pumpFlash > 0);
      if (pumpFlash > 0) pumpFlash -= dt;
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 20 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawGear();
      drawDrummer(false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(hits + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - hits) + 'ビート!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
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
      if (ready <= 0) { game.audio.play('se_tap'); spin = 0; }
    } else if (!finished) {
      spin += dt;
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; combo = 0; hitStop = 0.3; shake = 0.28;
        game.feedback.bad(CX, CY - 200, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;
    if (pumpFlash > 0) pumpFlash -= dt;

    bg();
    drawGear();
    drawDrummer(pumpFlash > 0);

    txt(hits + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.7, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.3], ['F4', 0.3], ['A4', 0.3], ['D5', 0.5]], { tempo: 118, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
