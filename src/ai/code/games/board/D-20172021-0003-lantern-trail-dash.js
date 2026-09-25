// D-20172021-0003-lantern-trail-dash.js
// ランタントレイルダッシュ — 巣の周りを飛ぶ蛍が光の軌跡で縄張りを描く。舞い込むコウモリの急襲だけ身をかわす
// 操作: 蛍は自動で軌道を飛ぶ。コウモリの急襲予告が出たら指を押さえたままにして脇へ逃げる
// 終わり: 一周して巣に戻るまでコウモリの急襲(3回)を全てかわせば成功。1回でも当たれば失敗
// @mechanic: dodge
// @theme: firefly_lantern_perimeter
// 世界観: 夜の巣の周りを飛ぶ一匹の蛍。自らの光跡で縄張りの輪を描きながら、闇から急襲するコウモリだけを身をかわしてやり過ごす
// 残るもの: 正誤(CLEAR/GAME OVER) + かわした急襲の回数
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 黒背景に発光するネオン管ライン
  var STYLE = { bg: ['#0a0018', '#1a0030'], main: ['#ffe066', '#e0a020'], accent: ['#00e5ff', '#ff3355'] };
  var C = {
    bg: STYLE.bg[0], bg2: STYLE.bg[1], nest: '#2a1a44', nestGlow: '#5a2a7a',
    trail: STYLE.accent[0], trailDim: '#0a3a44', firefly: STYLE.main[0], fireflyDark: STYLE.main[1],
    bat: '#3a2244', batGlow: STYLE.accent[1], gold: '#ffe600', good: '#39ff6a', bad: STYLE.accent[1],
    white: '#ffffff', ink: '#050008',
  };

  var GAME_TITLE = 'LANTERN DASH';
  var TOTAL = 3;
  var LOOP_TIME = 18;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var CX = W * 0.5, CY = H * 0.5;
  var RX = W * 0.32, RY = H * 0.22;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var FIREFLY_SPRITE = ['.#.', '###'];
  var BAT_SPRITE = ['#.#', '###', '#.#'];

  function bg() {
    var e = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(e * 1.3));
    game.draw.circle(CX, CY, 60, C.nestGlow, 0.3);
    game.draw.sprite(['#####', '##.##', '#####'], { '#': C.nest }, CX, CY, 14, { anchor: 'center' });
  }

  function loopPos(u) {
    var a = u * Math.PI * 2 - Math.PI / 2;
    return { x: CX + Math.cos(a) * RX, y: CY + Math.sin(a) * RY, ang: a };
  }
  function loopNormal(u) {
    var a = u * Math.PI * 2 - Math.PI / 2;
    var tx = -Math.sin(a) * RX, ty = Math.cos(a) * RY;
    var len = Math.hypot(tx, ty);
    return { x: -ty / len, y: tx / len };
  }

  var progress, off, offVel, done, endWait, finished, dived, milestoneShown;
  var ready, hitStop, shake, dive;

  function newDive(atU) {
    var side = Math.random() < 0.5 ? -1 : 1;
    return { u: atU, side: side, t: 0, dur: 1.0, telegraphed: false, resolved: false };
  }

  var diveSchedule;

  function initGame() {
    progress = 0; off = 0; offVel = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; dived = 0; milestoneShown = false;
    diveSchedule = [0.28, 0.56, 0.82];
    dive = null;
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function stepFlight(dt, resolveHits) {
    var u = Math.min(1, progress / LOOP_TIME);
    progress += dt;
    var u2 = Math.min(1, progress / LOOP_TIME);

    if (!dive && diveSchedule.length && u2 >= diveSchedule[0]) {
      dive = newDive(diveSchedule.shift());
    }
    if (dive) {
      dive.t += dt;
      var p = dive.t / dive.dur;
      if (p > 0.4 && !dive.telegraphed) dive.telegraphed = true;
      if (dive.telegraphed && resolveHits && !dive.resolved && game.input.pressing) {
        dive.resolved = true;
        dived++;
        offVel = dive.side * -14;
        hitStop = 0.1;
        var dpFb = loopPos(dive.u);
        game.feedback.good(dpFb.x, dpFb.y, { text: 'DODGE', color: C.good });
        game.audio.play('se_good', 0.4);
        if (dived === Math.ceil(TOTAL / 2)) game.fx.popup('あと少し!', CX, CY - 240, { color: C.gold, size: 40 });
        dive = null;
      } else if (p >= 1 && !dive.resolved) {
        dive.resolved = true;
        hitStop = 0.35;
        game.feedback.bad(CX, CY, { text: 'HIT' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        if (resolveHits) { ok = false; finished = true; finish(); }
        dive = null;
      }
    }
    if (u2 >= 1 && !milestoneShown) { milestoneShown = true; }
    if (resolveHits && progress >= LOOP_TIME && !finished) {
      finished = true; ok = true; hitStop = 0.1;
      game.feedback.good(CX, CY, { text: 'CLEAR', color: C.good });
      game.fx.burst(CX, CY, { color: C.gold, count: 18, speed: 380 });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function drawScene(u, offAmt, dv) {
    var pos = loopPos(u);
    var n = loopNormal(u);
    var fx = pos.x + n.x * offAmt, fy = pos.y + n.y * offAmt;
    // trail arc so far
    var steps = 40;
    var prevX = null, prevY = null;
    for (var i = 0; i <= steps; i++) {
      var uu = (u * i) / steps;
      var pp = loopPos(uu);
      if (prevX !== null) game.draw.line(prevX, prevY, pp.x, pp.y, C.trail, 6);
      prevX = pp.x; prevY = pp.y;
    }
    if (dv && !dv.resolved) {
      var dpos = loopPos(dv.u);
      var dn = loopNormal(dv.u);
      var dp = dv.t / dv.dur;
      var bx = dpos.x + dn.x * dv.side * (260 * (1 - Math.min(1, dp)));
      var by = dpos.y + dn.y * dv.side * (260 * (1 - Math.min(1, dp)));
      if (dv.telegraphed) {
        var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
        if (blink) game.draw.circle(dpos.x, dpos.y, 70, C.bad, 0.25);
      }
      game.draw.circle(bx, by, 26, C.batGlow, 0.5);
      game.draw.sprite(BAT_SPRITE, { '#': C.bat }, bx, by, 14, { anchor: 'center' });
    }
    game.draw.circle(fx, fy, 20, C.fireflyDark, 0.5);
    game.draw.sprite(FIREFLY_SPRITE, { '#': C.firefly }, fx, fy, 12, { anchor: 'center' });
    return { x: fx, y: fy };
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (LOOP_TIME * 0.7 + 1.2);
    if (cyc < dt || demo.t <= dt) { progress = 0; off = 0; offVel = 0; diveSchedule = [0.28, 0.56, 0.82]; dive = null; dived = 0; }
    stepFlight(dt, false);
    if (dive && dive.telegraphed && !demo.pressed) {
      demo.pressed = true; demo.press = true;
      var pos2 = loopPos(dive.u), n2 = loopNormal(dive.u);
      demo.gx = pos2.x + n2.x * dive.side * -100; demo.gy = pos2.y + n2.y * dive.side * -100;
    }
    if (!dive) { demo.press = false; demo.pressed = false; }
    if (offVel !== 0) { off += offVel * dt; offVel *= 0.9; if (Math.abs(offVel) < 1) offVel = 0; }
    else if (off !== 0) off *= 0.88;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene(Math.min(1, progress / LOOP_TIME), off, dive);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
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
      drawScene(Math.min(1, progress / LOOP_TIME), 0, null);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(dived + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - dived) + '回!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(dived, { dived: dived, total: TOTAL });
        else game.end.failure({ dived: dived, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepFlight(dt, true);
    }
    if (offVel !== 0) { off += offVel * dt; offVel *= 0.9; if (Math.abs(offVel) < 1) offVel = 0; }
    else if (off !== 0) off *= 0.88;
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawScene(Math.min(1, progress / LOOP_TIME), off, dive);
    else drawScene(Math.min(1, progress / LOOP_TIME), off, null);

    txt(dived + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.min(1, progress / LOOP_TIME), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.25], ['G4', 0.25], ['B4', 0.25], ['E5', 0.5]], { tempo: 120, wave: 'sine', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
