// D-20222026-0028-signal-trail-hunt.js
// シグナルトレイルハント — 画面の探知環に浮かぶ気配を見切り、迫る獣影めがけて得物を振り抜く
// 操作: 探知環の外周から迫ってくる獣影を、指で素早く払って斬る。光る虫は払わずやり過ごす
// 終わり: 規定数の獣影を斬れれば成功。光る虫を払う/獣影が懐に入る/時間切れで失敗
// @mechanic: slice
// @theme: signal_trail_hunt
// 世界観: 探知環を頼りに歩く狩人が、環の外周から迫る獣影の気配だけを見切り、得物を一閃させて仕留める
// 残るもの: 正誤(CLEAR/GAME OVER) + 仕留めた数
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: ブロック状の面を矩形の積層で表現。輪郭線は使わず面の明暗差で立体感を出す
  var C = {
    bg: '#182a1c', bg2: '#0c1610', ring: '#2a4a30', ringDim: '#1c3222',
    prey: '#c8a24a', preyDk: '#8a6a20', bug: '#7ef0c8', bugGlow: '#3ac098',
    hunter: '#3a6a4a', good: '#7ef0c8', bad: '#ff4d5e', gold: '#ffd24d', ink: '#e8f4ea',
  };

  var GAME_TITLE = 'TRAIL HUNT';
  var NEEDED = 6;
  var MAX_TIME = 13;
  var CX = W * 0.5, CY = H * 0.42, RING_R = 420;
  var HUNTER_Y = H * 0.86;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#081008', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PREY_S = ['#.#.#', '#####', '.###.', '#.#.#'];
  var BUG_S = ['.#.', '###', '.#.'];
  var HUNTER_S = ['.##.', '####', '.##.', '#..#'];

  var kills, spawns, spawnT, roundClock, halfCalled, trail, sweep;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    kills = 0; spawns = []; spawnT = 0.5; roundClock = 0; halfCalled = false;
    done = false; endWait = 0; finished = false; trail = null; sweep = 0;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function spawnOne() {
    var isBug = Math.random() < 0.24;
    var ang = game.random(0, Math.PI * 2);
    var x = CX + Math.cos(ang) * RING_R;
    var y = CY + Math.sin(ang) * RING_R * 0.62;
    var speed = isBug ? game.random(70, 110) : game.random(210, 300);
    spawns.push({ x: x, y: y, tx: CX, ty: HUNTER_Y - 40, speed: speed, r: isBug ? 34 : 58, bug: isBug, gone: false });
  }

  function distToSeg(px, py, ax, ay, bx, by) {
    var vx = bx - ax, vy = by - ay, wx = px - ax, wy = py - ay;
    var len2 = vx * vx + vy * vy;
    var t = len2 > 0 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2)) : 0;
    var cx = ax + vx * t, cy = ay + vy * t;
    return Math.hypot(px - cx, py - cy);
  }

  function moveSpawns(dt) {
    for (var i = spawns.length - 1; i >= 0; i--) {
      var s = spawns[i];
      if (s.gone) { spawns.splice(i, 1); continue; }
      var dx = s.tx - s.x, dy = s.ty - s.y, d = Math.hypot(dx, dy) || 1;
      s.x += (dx / d) * s.speed * dt;
      s.y += (dy / d) * s.speed * dt;
      if (d < 70) {
        if (!s.bug) {
          s.gone = true;
          finished = true; ok = false; hitStop = 0.35; shake = 0.3;
          game.feedback.bad(s.x, s.y, { text: 'MISS' });
          game.audio.play('se_bad', 0.4);
          finish();
        } else {
          s.gone = true;
        }
      }
    }
  }

  function trySlice(x1, y1, x2, y2) {
    var segLen = Math.hypot(x2 - x1, y2 - y1);
    if (segLen < 14) return;
    for (var i = 0; i < spawns.length; i++) {
      var s = spawns[i];
      if (s.gone) continue;
      if (distToSeg(s.x, s.y, x1, y1, x2, y2) < s.r) {
        s.gone = true;
        if (s.bug) {
          finished = true; ok = false; hitStop = 0.3; shake = 0.25;
          game.feedback.bad(s.x, s.y, { text: 'MISS' });
          game.audio.play('se_bad', 0.4);
          finish();
        } else {
          kills += 1;
          game.feedback.good(s.x, s.y, { text: 'GOOD', color: C.good });
          game.fx.burst(s.x, s.y, { color: C.prey, count: 18, speed: 360 });
          game.audio.play('se_good', 0.4);
          if (kills === Math.ceil(NEEDED * 0.5)) {
            game.fx.popup('NICE', s.x, s.y - 60, { color: C.gold, size: 30 });
            game.audio.play('se_milestone', 0.3);
          }
          if (kills >= NEEDED) {
            finished = true; ok = true; hitStop = 0.3;
            game.audio.play('se_success', 0.5);
            finish();
          }
        }
      }
    }
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    sweep += 0;
    game.draw.circle(CX, CY, RING_R, C.ringDim, 0.18);
    for (var r = 0; r < 3; r++) game.draw.circle(CX, CY, RING_R * (0.4 + r * 0.3), C.ring, 0.12);
    var sang = (game.time.elapsed * 1.1) % (Math.PI * 2);
    var sx = CX + Math.cos(sang) * RING_R, sy = CY + Math.sin(sang) * RING_R * 0.62;
    game.draw.line(CX, CY, sx, sy, C.good, 3);
    game.draw.sprite(HUNTER_S, { '#': C.hunter }, CX, HUNTER_Y, 22, { anchor: 'center' });
  }

  function drawSpawns() {
    for (var i = 0; i < spawns.length; i++) {
      var s = spawns[i];
      if (s.gone) continue;
      if (s.bug) {
        var g = 0.5 + 0.3 * Math.sin(game.time.elapsed * 6 + i);
        game.draw.circle(s.x, s.y, s.r * 0.7, C.bugGlow, g);
        game.draw.sprite(BUG_S, { '#': C.bug }, s.x, s.y, 10, { anchor: 'center' });
      } else {
        game.draw.sprite(PREY_S, { '#': C.prey }, s.x, s.y, 16, { anchor: 'center' });
      }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    trail = { x: x, y: y };
    if (state === S.PLAYING && ready <= 0 && !finished) {
      game.audio.play('se_tap', 0.12);
      game.fx.burst(x, y, { color: C.good, count: 6, speed: 160 });
    }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || done || ready > 0 || finished || hitStop > 0) { trail = { x: x, y: y }; return; }
    if (Math.random() < 0.06) game.audio.play('se_tap', 0.03);
    if (trail) trySlice(trail.x, trail.y, x, y);
    trail = { x: x, y: y };
  });
  game.onRelease(function() { trail = null; game.audio.play('se_tap', 0.04); });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: HUNTER_Y - 200, press: false, lastX: null, lastY: null, targetIdx: -1 };
  function resetDemo() { initGame(); demo.targetIdx = -1; demo.lastX = null; demo.lastY = null; }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) resetDemo();
    moveSpawns(dt);
    if (cyc < 3.6) {
      spawnT -= dt;
      if (spawnT <= 0) { spawnOne(); spawnT = game.random(0.5, 0.75); }
    }
    if (demo.targetIdx < 0 || !spawns[demo.targetIdx] || spawns[demo.targetIdx].gone) {
      var pick = -1;
      for (var i = 0; i < spawns.length; i++) { if (!spawns[i].bug && !spawns[i].gone) { pick = i; break; } }
      demo.targetIdx = pick;
    }
    if (demo.targetIdx >= 0 && spawns[demo.targetIdx]) {
      var s = spawns[demo.targetIdx];
      var perp = Math.atan2(s.ty - s.y, s.tx - s.x) + Math.PI / 2;
      var f = (Math.sin(demo.t * 7) + 1) / 2;
      var ox = Math.cos(perp) * 90 * (f - 0.5) * 2, oy = Math.sin(perp) * 90 * (f - 0.5) * 2;
      demo.gx = s.x + ox; demo.gy = s.y + oy;
      demo.press = true;
      if (demo.lastX !== null) trySlice(demo.lastX, demo.lastY, demo.gx, demo.gy);
      demo.lastX = demo.gx; demo.lastY = demo.gy;
    } else {
      demo.gx = CX; demo.gy = HUNTER_Y - 220; demo.press = false;
      demo.lastX = null; demo.lastY = null;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (spawns === undefined) initGame();
      bg();
      stepDemo(dt);
      drawSpawns();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.135, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg(); drawSpawns();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(kills + ' / ' + NEEDED, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(1, NEEDED - kills) + '体!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(kills, { kills: kills, needed: NEEDED });
        else game.end.failure({ kills: kills, needed: NEEDED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      spawnT -= dt;
      if (spawnT <= 0) { spawnOne(); spawnT = game.random(0.5, 0.75); }
      moveSpawns(dt);
      if (!halfCalled && roundClock >= MAX_TIME * 0.5) {
        halfCalled = true;
        game.fx.popup('NICE', CX, CY - 80, { color: C.gold, size: 30 });
        game.audio.play('se_milestone', 0.25);
      }
      if (roundClock >= MAX_TIME) {
        finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(CX, CY, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawSpawns();

    txt(kills + ' / ' + NEEDED, W / 2, H * 0.06, 30, C.ink);
    var barPct = Math.max(0, 1 - roundClock / MAX_TIME);
    game.draw.rect(60, 150, W - 120, 16, C.ringDim, 0.5);
    game.draw.rect(60, 150, (W - 120) * barPct, 16, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.2], ['E4', 0.2], ['G4', 0.2], ['C5', 0.4]], { tempo: 140, wave: 'sawtooth', volume: 0.04, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
