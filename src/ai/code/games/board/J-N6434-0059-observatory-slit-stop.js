// J-N6434-0059-observatory-slit-stop.js
// 天文台スリット止め — 回り続けるドームの観測窓を、彗星が横切る方角でぴたりと止めて写し取る
// 操作: 画面のどこでもタップで回転するドームの観測窓(針)を止める。光る方角の帯の中なら撮影成功
// 終わり: 彗星を3つ写せば成功。帯の外で止める/3秒止めずに見逃すが2回、または時間切れで失敗
// @mechanic: timing_one_shot
// @theme: observatory_comet_slit
// 世界観: 山頂の古い天文台で、夜番の見習いが回転ドームのブレーキ係を務める。流れてくる彗星の方角へ観測窓がちょうど向いた瞬間にドームを止め、写真乾板に一つずつ写し取る
// 残るもの: 正誤(CLEAR/GAME OVER) + 写した彗星の数・PERFECT数
// スタイル: 90s LOW POLY

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s LOW POLY: 面ベタ塗り、輪郭は line、頂点ジッターとフォグ
  var STYLE = { bg: ['#0b1030', '#2a2f5a'], main: ['#8f9bb8', '#c9d2e6', '#4a5378'], accent: ['#ffcf4a', '#ff6a5a'] };
  var C = { dome: '#5a6488', domeHi: '#8f9bb8', domeDark: '#3a4262', edge: '#c9d2e6', slit: '#0b1030', gold: '#ffcf4a',
    red: '#ff6a5a', good: '#7fe8a0', fog: '#2a2f5a', white: '#eef2ff', zone: '#ffcf4a' };

  var GAME_TITLE = 'COMET SLIT';
  var TIME_LIMIT = 13;
  var NEEDED = 3;
  var MAX_MISS = 2;
  var CX = 540, CY = H * 0.47, R = 330;
  var ZONES = [46, 34, 26, 20];
  var SPEEDS = [190, 235, 280, 320];
  var AIM_LIMIT = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var ang, dir, attempt, phase, phT, zoneC, zoneW, hits, misses, perfects, plates, lastHit;
  var timeLeft, ready, hitStop, finished, ok, done, endWait, score, flash;

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 3, { size: sz, color: '#05081a', bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function rad(d) { return d * Math.PI / 180; }
  function norm(d) { d = d % 360; return d < 0 ? d + 360 : d; }
  function angDiff(a, b) { var d = norm(a - b); return d > 180 ? d - 360 : d; }

  var KEEPER_A = ['..cc..', '.cccc.', '..ss..', '.bbbb.', 'b.bb.b', '..bb..', '.b..b.'];
  var KEEPER_B = ['..cc..', '.cccc.', '..ss..', '.bbbb.', '.bbbb.', 'b.bb.b', '.b..b.'];
  var KEEPER_PAL = { c: '#ff6a5a', s: '#f2d2b0', b: '#8f9bb8' };
  var COMET = ['....ww', '..wyyw', 'wwyyyw', '..wyyw', '....ww'];
  var COMET_PAL = { w: '#eef2ff', y: '#ffcf4a' };
  var OWL_A = ['o.o', 'ooo', 'oyo', '.o.'];
  var OWL_B = ['o.o', 'ooo', 'oyo', 'o.o'];

  function newAttempt() {
    var i = Math.min(attempt, ZONES.length - 1);
    zoneW = ZONES[i];
    zoneC = norm(ang + dir * game.random(120, 240));
    phase = 'comet'; phT = 0;
  }

  function initGame() {
    ang = game.random(0, 360); dir = 1; attempt = 0; hits = 0; misses = 0; perfects = 0; plates = []; lastHit = null;
    timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0; finished = false; ok = false; done = false; endWait = 0; score = 0; flash = 0;
    newAttempt();
  }

  // 止める — プレイもデモもここを通る
  function stopSlit(live) {
    if (phase !== 'aim') return false;
    var off = Math.abs(angDiff(ang, zoneC));
    var inside = off <= zoneW / 2;
    phase = 'lock'; phT = 0;
    lastHit = { inside: inside, perfect: inside && off <= zoneW * 0.18 };
    if (inside) {
      hits++;
      if (lastHit.perfect) perfects++;
      score += lastHit.perfect ? 200 : 120;
      plates.push({ perfect: lastHit.perfect });
      flash = 0.3;
      if (live) {
        var px = CX + Math.cos(rad(zoneC)) * (R + 110), py = CY + Math.sin(rad(zoneC)) * (R + 110);
        game.feedback.good(px, py, { text: lastHit.perfect ? 'PERFECT' : 'GOOD', color: lastHit.perfect ? C.gold : C.good, size: 60 });
        if (hits === 2) { game.audio.play('se_milestone', 0.5); game.fx.popup(hits + ' / ' + NEEDED, W / 2, H * 0.17, { color: C.gold, size: 64 }); }
        if (hits >= NEEDED) { finished = true; ok = true; hitStop = 0.45; score += Math.round(timeLeft * 25); }
      }
    } else {
      misses++;
      if (live) {
        game.feedback.bad(CX + Math.cos(rad(ang)) * R, CY + Math.sin(rad(ang)) * R, { text: 'MISS', shake: 8 });
        if (misses >= MAX_MISS) { finished = true; ok = false; hitStop = 0.5; }
      }
    }
    return true;
  }

  function stepDial(dt, live) {
    phT += dt;
    var sp = SPEEDS[Math.min(attempt, SPEEDS.length - 1)];
    if (phase !== 'lock') ang = norm(ang + dir * sp * dt);
    if (phase === 'comet' && phT > 0.6) { phase = 'aim'; phT = 0; if (live) game.audio.tone('E6', 0.08, { wave: 'triangle', volume: 0.05 }); }
    else if (phase === 'aim' && phT > AIM_LIMIT) {
      phase = 'lock'; phT = 0; misses++; lastHit = { inside: false, perfect: false };
      if (live) {
        game.feedback.bad(CX, CY - R - 80, { text: 'MISS' });
        if (misses >= MAX_MISS) { finished = true; ok = false; hitStop = 0.5; }
      }
    } else if (phase === 'lock' && phT > 0.7) {
      attempt++; dir = -dir; newAttempt();
    }
    if (flash > 0) flash -= dt;
    // 回転音(針が帯に近いほど高く)
    if (live && phase === 'aim' && Math.floor(phT * 8) !== Math.floor((phT - dt) * 8)) {
      var near = Math.abs(angDiff(ang, zoneC)) < zoneW / 2;
      game.audio.tone(near ? 880 : 440, 0.03, { wave: 'square', volume: near ? 0.05 : 0.025 });
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; music(); return; }
    if (finished || ready > 0) return;
    if (stopSlit(true)) game.audio.play('se_tap', 0.35);
    else { game.audio.tone(220, 0.04, { wave: 'square', volume: 0.03 }); game.fx.burst(x, y, { color: C.edge, count: 3, speed: 80 }); }
  });

  // ── ATTRACT: 本物の stepDial/stopSlit。2回は帯の中心で止め、3回目は早すぎて外す ──
  var demo = { t: 0, gx: W * 0.7, gy: H * 0.84, press: false, pt: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.5;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; demo.pt = 0; }
    stepDial(dt, false);
    demo.pt -= dt;
    if (phase === 'aim') {
      var off = angDiff(ang, zoneC) * dir;
      var early = attempt === 2;
      if ((!early && off > -4 && off < 6) || (early && off > -zoneW - 30 && off < -zoneW)) { stopSlit(false); demo.pt = 0.25; }
      if (phase === 'aim' && phT > AIM_LIMIT - 0.1) { stopSlit(false); demo.pt = 0.25; }
    }
    demo.press = demo.pt > 0;
    demo.gy = H * 0.84 + (demo.press ? 10 : 0);
  }

  function jit(t, i) { return Math.sin(t * 13 + i * 2.1) * 1.5; }

  function drawSky(t) {
    var pulse = 0.05 + 0.04 * Math.sin(t * 1.1);
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.7, STYLE.bg[1]], [1, '#4a4f7a']]);
    for (var s = 0; s < 50; s++) {
      var sx = (s * 197) % W, sy = (s * 331) % Math.floor(H * 0.8);
      game.draw.rect(sx, sy, 4, 4, C.white, 0.3 + 0.3 * Math.sin(t * 2 + s));
    }
    // 山の稜線(低ポリの面)
    for (var y = 0; y < 180; y += 3) {
      var w = 300 + y * 2.4;
      game.draw.rect(W * 0.2 - w / 2, H * 0.8 + y, w, 3, '#1e2344');
      game.draw.rect(W * 0.85 - w / 2, H * 0.78 + y, w, 3, '#232848');
    }
    game.draw.rect(0, 0, W, H, C.fog, pulse);
    // 見物のフクロウ(演出AI)
    game.draw.sprite(Math.floor(t * 2) % 2 ? OWL_A : OWL_B, { o: '#8f9bb8', y: '#ffcf4a' }, W * 0.88, H * 0.2 + Math.sin(t * 1.4) * 6, 12, { anchor: 'center' });
  }

  function drawZone(t) {
    if (phase === 'comet') {
      // 予告: 彗星が帯の方角へ流れ込む
      var k = Math.min(1, phT / 0.6);
      var ex = CX + Math.cos(rad(zoneC)) * (R + 110), ey = CY + Math.sin(rad(zoneC)) * (R + 110);
      var sx = ex + (W / 2 - ex) * 0 - 600 * (1 - k), sy = ey - 400 * (1 - k);
      game.draw.line(sx - 120, sy - 80, sx, sy, C.white, 4);
      game.draw.sprite(COMET, COMET_PAL, sx, sy, 10, { anchor: 'center' });
      return;
    }
    var n = Math.max(6, Math.round(zoneW / 3));
    for (var i = 0; i <= n; i++) {
      var a = rad(zoneC - zoneW / 2 + zoneW * i / n);
      var inner = Math.abs(i - n / 2) <= n * 0.18;
      game.draw.circle(CX + Math.cos(a) * (R + 40), CY + Math.sin(a) * (R + 40), inner ? 12 : 9, inner ? C.white : C.zone, 0.55 + 0.35 * Math.sin(t * 8 + i));
    }
    game.draw.line(CX + Math.cos(rad(zoneC - zoneW / 2)) * (R + 10), CY + Math.sin(rad(zoneC - zoneW / 2)) * (R + 10),
      CX + Math.cos(rad(zoneC - zoneW / 2)) * (R + 80), CY + Math.sin(rad(zoneC - zoneW / 2)) * (R + 80), C.zone, 5);
    game.draw.line(CX + Math.cos(rad(zoneC + zoneW / 2)) * (R + 10), CY + Math.sin(rad(zoneC + zoneW / 2)) * (R + 10),
      CX + Math.cos(rad(zoneC + zoneW / 2)) * (R + 80), CY + Math.sin(rad(zoneC + zoneW / 2)) * (R + 80), C.zone, 5);
    var cxp = CX + Math.cos(rad(zoneC)) * (R + 110), cyp = CY + Math.sin(rad(zoneC)) * (R + 110);
    if (phase === 'aim' || (phase === 'lock' && lastHit && !lastHit.inside)) {
      game.draw.circle(cxp, cyp, 40, C.gold, 0.2 + 0.1 * Math.sin(t * 10));
      game.draw.sprite(COMET, COMET_PAL, cxp + Math.sin(t * 3) * 4, cyp, 10, { anchor: 'center' });
    }
  }

  function drawDome(t) {
    // 面: 横1pxストリップで塗る16角形の近似(明暗2トーン)
    for (var y = -R; y < R; y += 4) {
      var hw = Math.sqrt(Math.max(0, R * R - y * y)) * (0.96 + 0.04 * Math.cos(y * 0.05));
      game.draw.rect(CX - hw, CY + y, hw, 4, y < 0 ? C.domeHi : C.dome);
      game.draw.rect(CX, CY + y, hw, 4, y < 0 ? C.dome : C.domeDark);
    }
    // 稜線(ジッター付き)
    var N = 16;
    for (var i = 0; i < N; i++) {
      var a1 = i / N * Math.PI * 2, a2 = (i + 1) / N * Math.PI * 2;
      var x1 = CX + Math.cos(a1) * R + jit(t, i), y1 = CY + Math.sin(a1) * R + jit(t, i + 7);
      var x2 = CX + Math.cos(a2) * R + jit(t, i + 1), y2 = CY + Math.sin(a2) * R + jit(t, i + 8);
      game.draw.line(x1, y1, x2, y2, C.edge, 4);
      game.draw.line(CX, CY, x1, y1, C.domeDark, 2);
    }
    // 観測窓(針)
    var a = rad(ang);
    var tipX = CX + Math.cos(a) * (R + 30), tipY = CY + Math.sin(a) * (R + 30);
    game.draw.line(CX, CY, tipX, tipY, C.edge, 64);
    game.draw.line(CX, CY, tipX, tipY, C.slit, 46);
    game.draw.line(CX + Math.cos(a) * 60, CY + Math.sin(a) * 60, tipX, tipY, C.fog, 10);
    game.draw.circle(tipX, tipY, 16, phase === 'lock' ? (lastHit && lastHit.inside ? C.good : C.red) : C.gold);
    game.draw.circle(CX, CY, 56, C.domeDark);
    game.draw.circle(CX, CY, 40, C.edge);
    game.draw.sprite(Math.floor(t * 2) % 2 ? KEEPER_A : KEEPER_B, KEEPER_PAL, CX, CY - 4 + Math.sin(t * 2.5) * 3, 8, { anchor: 'center' });
    if (flash > 0) game.draw.circle(tipX, tipY, 140 * (1 - flash / 0.3) + 40, C.white, flash * 2);
  }

  function drawPlates(t) {
    game.draw.rect(90, H * 0.86, W - 180, 170, '#05081a', 0.6);
    for (var i = 0; i < NEEDED; i++) {
      var px = W / 2 - 280 + i * 280, py = H * 0.86 + 85;
      game.draw.rect(px - 100, py - 60, 200, 120, i < plates.length ? '#1e2344' : '#101430');
      game.draw.line(px - 100, py - 60, px + 100, py - 60, C.edge, 3);
      if (i < plates.length) game.draw.sprite(COMET, COMET_PAL, px, py + Math.sin(t * 2 + i) * 3, 12, { anchor: 'center' });
    }
    for (var m = 0; m < MAX_MISS; m++) game.draw.circle(W - 150 + m * 50, 90, 16, m < misses ? C.red : C.white, m < misses ? 1 : 0.4);
  }

  function drawHud() {
    txt(hits + ' / ' + NEEDED, W / 2, 80, 64, C.white);
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(90, 150, W - 180, 18, '#05081a', 0.8);
    game.draw.rect(90, 150, (W - 180) * Math.max(0, timeLeft / TIME_LIMIT), 18, lowTime ? C.red : C.gold);
    if (phase === 'aim') {
      var r = Math.max(0, 1 - phT / AIM_LIMIT);
      game.draw.rect(W / 2 - 200, H * 0.83, 400 * r, 12, r < 0.35 ? C.red : C.edge);
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (ang === undefined) initGame();

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawSky(t);
      drawZone(t);
      drawDome(t);
      drawPlates(t);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.06, 74, C.gold);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.1, 34, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 44, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.965, 38, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawSky(t);
      drawDome(t);
      drawPlates(t);
      game.draw.rect(0, H * 0.34, W, H * 0.28, '#05081a', 0.8);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 96, ok ? C.good : C.red);
      txt(hits + ' / ' + NEEDED + '  PERFECT ' + perfects, W / 2, H * 0.47, 44, C.white);
      if (ok) {
        txt('SCORE ' + score, W / 2, H * 0.53, 48, C.gold);
        if (score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.58, 44, C.good);
        else txt('BEST ' + (game.best || 0), W / 2, H * 0.58, 36, C.white);
      } else {
        txt('あと' + (NEEDED - hits) + '個!', W / 2, H * 0.53, 52, C.gold);
        txt('BEST ' + (game.best || 0), W / 2, H * 0.58, 36, C.white);
      }
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) { game.audio.play('se_success', 0.6); game.end.success(score, { comets: hits, perfect: perfects, miss: misses }); }
        else { game.audio.play('se_failure', 0.6); game.end.failure({ comets: hits, perfect: perfects, miss: misses }); }
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) {
        if (ok) game.feedback.good(W / 2, H * 0.2, { text: 'CLEAR', color: C.good, count: 28 });
        else game.feedback.bad(CX, CY, { text: timeLeft <= 0 ? 'TIME UP' : 'GAME OVER' });
        done = true; endWait = 0.9;
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.4);
    } else if (!finished) {
      timeLeft -= dt;
      stepDial(dt, true);
      if (!finished && timeLeft <= 0) { timeLeft = 0; finished = true; ok = false; hitStop = 0.45; phase = 'lock'; lastHit = { inside: false }; }
    }

    drawSky(t);
    drawZone(t);
    drawDome(t);
    drawPlates(t);
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.2, 96, C.gold);
  });

  function music() {
    game.audio.melody([['A3', 1], ['E4', 1], ['C5', 1], ['B4', 1], ['G4', 1], ['E4', 1], ['F4', 2]], { tempo: 110, wave: 'sine', volume: 0.05, loop: true, bass: true });
  }
  game.onStart(function() {
    music();
    state = S.ATTRACT;
    initGame();
  });
})(game);
