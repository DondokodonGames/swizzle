// D-20092012-0006-orchard-orb-slice.js
// オーチャードオーブスライス — 飛び上がる果実を指で素早く払って斬る。混じる爆弾を斬ると即終了
// 操作: 飛んでくる果実めがけて指で素早く払う(スワイプの軌跡が触れれば斬れる)
// 終わり: 規定個数(6個)の果実を斬れれば成功。爆弾を1つでも斬るか時間切れなら失敗
// @mechanic: slice
// @theme: orchard_orb_slice
// 世界観: 夜の果樹園に住む番人。宙に舞い上がる果実を次々斬り落とすが、混じる爆弾だけは絶対に斬ってはいけない
// 残るもの: 正誤(CLEAR/GAME OVER) + 斬った果実数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い輪郭を先に描き、内側は明暗2色のみ
  var STYLE = {
    bg: ['#1c3a2a', '#0a1c14'],
    main: ['#ff8a3d', '#ffd23d', '#3a6a2a'],
    accent: ['#ff3d3d', '#3dd67a'],
  };
  var C = {
    skyTop: STYLE.bg[0], skyBot: STYLE.bg[1],
    fruit: STYLE.main[0], fruitDark: '#c85a1a', leaf: STYLE.main[2],
    bomb: '#2a2a2a', bombGlow: STYLE.accent[0],
    good: STYLE.accent[1], bad: STYLE.accent[0], gold: STYLE.main[1], white: '#eef4e6', ink: '#0a1208',
  };

  var GAME_TITLE = 'ORCHARD SLICE';
  var NEEDED = 6;
  var MAX_TIME = 13;
  var GROUND_Y = H * 0.90;
  var GRAVITY = 1600;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var FRUIT_SPR = ['.##.', '####', '.##.'];
  var BOMB_SPR = ['.##.', '####', '.##.'];

  var sliced, orbs, spawnT, elapsedRound, trail;
  var done, endWait, finished, ready, hitStop, shake, milestoneShown;

  function initGame() {
    sliced = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
    orbs = []; spawnT = 0.5; elapsedRound = 0; trail = null;
  }

  function spawnOrb() {
    var isBomb = orbs.length >= 0 && Math.random() < 0.22;
    var x = W * (0.25 + Math.random() * 0.5);
    var vx = game.random(-140, 140);
    var vy = -game.random(1150, 1350);
    orbs.push({ x: x, y: GROUND_Y, vx: vx, vy: vy, r: 54, isBomb: isBomb, sliced: false, gone: false });
  }

  function distToSeg(px, py, ax, ay, bx, by) {
    var vx = bx - ax, vy = by - ay;
    var wx = px - ax, wy = py - ay;
    var len2 = vx * vx + vy * vy;
    var t = len2 > 0 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2)) : 0;
    var cx = ax + vx * t, cy = ay + vy * t;
    return Math.hypot(px - cx, py - cy);
  }

  function updateOrbs(dt, isDemo) {
    spawnT -= dt;
    if (spawnT <= 0) { spawnOrb(); spawnT = game.random(0.55, 0.85); }
    for (var i = orbs.length - 1; i >= 0; i--) {
      var o = orbs[i];
      if (o.gone) { orbs.splice(i, 1); continue; }
      o.vy += GRAVITY * dt;
      o.x += o.vx * dt; o.y += o.vy * dt;
      if (o.y > H + 120) o.gone = true;
    }
  }

  function trySliceSegment(x1, y1, x2, y2) {
    if (state !== S.PLAYING && !arguments.isDemo) { }
    for (var i = 0; i < orbs.length; i++) {
      var o = orbs[i];
      if (o.sliced || o.gone) continue;
      var d = distToSeg((x1 + x2) / 2, (y1 + y2) / 2, x1, y1, x2, y2);
      var segLen = Math.hypot(x2 - x1, y2 - y1);
      var closeEnough = distToSeg(o.x, o.y, x1, y1, x2, y2) < o.r;
      if (closeEnough && segLen > 12) {
        o.sliced = true; o.gone = true;
        if (o.isBomb) {
          hitStop = 0.35;
          game.feedback.bad(o.x, o.y, { text: 'BOMB' });
          shake = 0.32;
          game.audio.play('se_bad', 0.4);
          ok = false; finished = true; finish();
        } else {
          sliced++;
          hitStop = 0.08;
          game.feedback.good(o.x, o.y, { text: '', color: C.good });
          game.fx.burst(o.x, o.y, { color: C.fruit, count: 14, speed: 320 });
          game.audio.play('se_good', 0.35);
          if (sliced === Math.ceil(NEEDED / 2) && !milestoneShown) { milestoneShown = true; game.fx.popup('あと' + (NEEDED - sliced) + '個!', W * 0.5, H * 0.18, { color: C.white, size: 34 }); game.audio.play('se_milestone', 0.3); }
          if (sliced >= NEEDED) { ok = true; finished = true; finish(); }
        }
      }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { trail = { x: x, y: y }; if (state === S.PLAYING) game.audio.play('se_tap', 0.05); });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || done || ready > 0 || finished || hitStop > 0) { trail = { x: x, y: y }; return; }
    if (trail) trySliceSegment(trail.x, trail.y, x, y);
    trail = { x: x, y: y };
  });
  game.onRelease(function() { trail = null; });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.5, gy: GROUND_Y, press: false, lastX: null, lastY: null, targetIdx: -1 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt || demo.t <= dt) { orbs = []; sliced = 0; spawnT = 0.3; demo.targetIdx = -1; }
    updateOrbs(dt, true);
    // 実演: 果実を1つ選んで払う。爆弾は避けて見せる
    if (demo.targetIdx < 0 || !orbs[demo.targetIdx] || orbs[demo.targetIdx].gone) {
      var pick = -1;
      for (var i = 0; i < orbs.length; i++) { if (!orbs[i].isBomb && !orbs[i].sliced && orbs[i].y < H * 0.75) { pick = i; break; } }
      demo.targetIdx = pick;
    }
    if (demo.targetIdx >= 0 && orbs[demo.targetIdx]) {
      var o = orbs[demo.targetIdx];
      var nx = o.x + 90, ny = o.y;
      var px = o.x - 90, py = o.y;
      var f = (Math.sin(demo.t * 6) + 1) / 2;
      demo.gx = px + (nx - px) * f; demo.gy = py;
      demo.press = true;
      if (demo.lastX !== null) trySliceSegment(demo.lastX, demo.lastY, demo.gx, demo.gy);
      demo.lastX = demo.gx; demo.lastY = demo.gy;
    } else {
      demo.gx = W * 0.5; demo.gy = GROUND_Y - 200;
      demo.press = false;
      demo.lastX = null; demo.lastY = null;
    }
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.skyTop], [1, C.skyBot]]);
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, '#142a1c');
    for (var i = 0; i < 4; i++) game.draw.circle(W * (0.15 + i * 0.24), H * 0.08, 30, C.leaf, 0.25);
  }

  function drawOrbs() {
    for (var i = 0; i < orbs.length; i++) {
      var o = orbs[i];
      if (o.gone) continue;
      if (o.isBomb) {
        var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
        game.draw.circle(o.x, o.y, o.r + 14, C.bombGlow, blink ? 0.5 : 0.2);
        game.draw.sprite(BOMB_SPR, { '#': C.bomb }, o.x, o.y, 14, { anchor: 'center' });
        game.draw.circle(o.x, o.y - o.r, 8, C.bombGlow);
      } else {
        game.draw.sprite(FRUIT_SPR, { '#': C.fruit }, o.x, o.y, 14, { anchor: 'center' });
        game.draw.circle(o.x - 12, o.y - 12, 8, '#ffffff55');
      }
    }
  }

  function drawTrail() {
    if (trail && demo.lastX !== null && state === S.ATTRACT) return;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawOrbs();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + ' / ' + NEEDED : '-'), W / 2, H * 0.115, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 38, C.gold);
      } else {
        txt('TAP TO START', W / 2, H * 0.95, 30, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg(); drawOrbs();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(sliced + ' / ' + NEEDED, W / 2, H * 0.13, 30, C.white);
      if (!ok && sliced === NEEDED - 1) txt('あと1個!', W / 2, H * 0.17, 26, C.white);
      if (sliced > game.best) txt('NEW RECORD', W / 2, H * 0.21, 28, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { sliced: sliced, total: NEEDED };
        if (ok) game.end.success(sliced, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      elapsedRound += dt;
      updateOrbs(dt, false);
      if (elapsedRound >= MAX_TIME) { ok = sliced >= NEEDED; finished = true; finish(); }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawOrbs();

    txt(sliced + ' / ' + NEEDED, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, 1 - elapsedRound / MAX_TIME), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.2], ['B4', 0.2], ['D5', 0.2], ['G5', 0.4]], { tempo: 160, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
