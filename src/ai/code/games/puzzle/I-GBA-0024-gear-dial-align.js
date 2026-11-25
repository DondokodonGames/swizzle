// I-GBA-0024-gear-dial-align.js
// ギアダイヤルアライン — バラバラの向きの歯車を、円を描く指で回してお手本の向きに揃える
// 操作: 歯車の上で円を描くように指を動かして回転させ、目印をお手本の角度に合わせる
// 終わり: 全ての歯車を目標角度の許容範囲内に揃えれば成功。制限時間切れで失敗
// @mechanic: rotate_gesture
// @theme: clockmaker_gear_alignment
// 世界観: 古時計店の工房で、バラバラな向きに外れた歯車を指で回してお手本の刻印と同じ向きに揃え直す時計職人
// 残るもの: 正誤(CLEAR/GAME OVER) + 揃えた歯車の数
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: くっきりしたブロック段差の疑似3D、木目調のあたたかい色
  var C = {
    bg: '#3a2a1a', bg2: '#241608', bench: '#5a3d22', benchDark: '#3a260f',
    gear: '#c98a3a', gearDark: '#8a5a1e', mark: '#ffdf6a', target: '#5aff8a',
    good: '#5aff8a', bad: '#ff5a4a', gold: '#ffd24d', white: '#f4ecd8', ink: '#0c0602',
  };

  var GAME_TITLE = 'GEAR ALIGN';
  var DUR = 14;
  var TOL = 0.22; // ラジアン許容差
  var GEARS = [
    { x: W * 0.3, y: H * 0.32, r: 90, target: 0.6 },
    { x: W * 0.7, y: H * 0.32, r: 90, target: 2.1 },
    { x: W * 0.5, y: H * 0.52, r: 100, target: -1.4 },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var angles, aligned, done, endWait, finished, timeLeft, dragIdx, lastA;
  var ready, hitStop, shake, milestoneShown;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SMITH = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, H * 0.64, W, H * 0.14, C.bench);
    game.draw.rect(0, H * 0.64, W, 10, C.benchDark);
    game.draw.sprite(SMITH, { '#': C.gold }, W * 0.5, H * 0.78, 20, { anchor: 'center' });
  }

  function angDiff(a, b) {
    var d = (a - b) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return Math.abs(d);
  }

  function initGame() {
    angles = GEARS.map(function() { return game.random(0, Math.PI * 2); });
    aligned = angles.map(function() { return false; });
    done = false; endWait = 0; finished = false; timeLeft = DUR; dragIdx = -1; lastA = 0;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
  }

  function nearestGear(x, y) {
    var best = -1, bestD = 1e9;
    for (var i = 0; i < GEARS.length; i++) {
      var d = Math.hypot(GEARS[i].x - x, GEARS[i].y - y);
      if (d < GEARS[i].r + 30 && d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    var idx = nearestGear(x, y);
    if (idx >= 0 && !aligned[idx]) {
      dragIdx = idx;
      lastA = Math.atan2(y - GEARS[idx].y, x - GEARS[idx].x);
      game.audio.play('se_tap', 0.12);
    }
  });
  game.onMove(function(x, y) {
    if (dragIdx < 0) return;
    var g = GEARS[dragIdx];
    var a = Math.atan2(y - g.y, x - g.x);
    var delta = a - lastA;
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;
    angles[dragIdx] += delta;
    lastA = a;
    checkAlign(dragIdx);
  });
  game.onRelease(function() { dragIdx = -1; });

  function checkAlign(i) {
    if (aligned[i]) return;
    if (angDiff(angles[i], GEARS[i].target) < TOL) {
      aligned[i] = true;
      hitStop = 0.08;
      game.feedback.good(GEARS[i].x, GEARS[i].y, { text: 'GOOD', color: C.good, size: 26 });
      game.audio.play('se_good', 0.3);
      var n = aligned.filter(Boolean).length;
      if (!milestoneShown && n === Math.ceil(GEARS.length / 2)) {
        milestoneShown = true;
        game.fx.popup('HALFWAY!', W / 2, H * 0.2, { color: C.gold, size: 36 });
        game.audio.play('se_milestone', 0.4);
      }
      if (n === GEARS.length) { ok = true; finished = true; finish(); }
    }
  }

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

  function drawGears(currAngles, currAligned) {
    for (var i = 0; i < GEARS.length; i++) {
      var g = GEARS[i];
      game.draw.circle(g.x, g.y, g.r, C.gearDark);
      game.draw.circle(g.x, g.y, g.r - 16, C.gear);
      // 目標マーカー(常に固定方向で表示)
      var tx = g.x + Math.cos(g.target) * (g.r - 8), ty = g.y + Math.sin(g.target) * (g.r - 8);
      game.draw.circle(tx, ty, 14, currAligned[i] ? C.target : C.mark, 0.9);
      // 現在の刻印
      var cx = g.x + Math.cos(currAngles[i]) * (g.r - 30), cy = g.y + Math.sin(currAngles[i]) * (g.r - 30);
      game.draw.line(g.x, g.y, cx, cy, C.benchDark, 10);
      game.draw.circle(cx, cy, 10, C.white);
    }
  }

  var demo = { t: 0, gx: GEARS[1].x, gy: GEARS[1].y, press: false, a: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { angles = GEARS.map(function() { return 0; }); aligned = GEARS.map(function() { return false; }); demo.a = 0; }
    if (cyc < 2.6) {
      var g = GEARS[1];
      var p = cyc / 2.6;
      demo.a = p * (g.target - 0 + Math.PI * 2) % (Math.PI * 2);
      angles[1] = demo.a;
      demo.gx = g.x + Math.cos(demo.a) * (g.r - 30);
      demo.gy = g.y + Math.sin(demo.a) * (g.r - 30);
      demo.press = true;
      if (angDiff(angles[1], g.target) < TOL) aligned[1] = true;
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawGears(angles, aligned);
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
      drawGears(angles, aligned);
      var n = aligned.filter(Boolean).length;
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(n + ' / ' + GEARS.length, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (GEARS.length - n) + '個!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var n2 = aligned.filter(Boolean).length;
        if (ok) game.end.success(n2, { aligned: n2, total: GEARS.length });
        else game.end.failure({ aligned: n2, total: GEARS.length });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        ok = false; finished = true;
        hitStop = 0.3;
        game.feedback.bad(W / 2, H * 0.4, { text: 'MISS' });
        shake = 0.25;
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawGears(angles, aligned);

    var na = aligned.filter(Boolean).length;
    txt(na + ' / ' + GEARS.length, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.4);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / DUR), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.3], ['F4', 0.3], ['A4', 0.3], ['D5', 0.6]], { tempo: 120, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
