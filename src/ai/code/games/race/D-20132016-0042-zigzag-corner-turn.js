// D-20132016-0042-zigzag-corner-turn.js
// ジグザグコーナーターン — 自動で進む球を、曲がり角のタイミングでタップして正しく旋回させる
// 操作: 曲がり角の目印が光ったらタップして、そこで方向転換させる
// 終わり: 規定数(6ヶ所)の角を曲がりきれば成功。タイミングを外せばコースアウトで失敗
// @mechanic: timing_one_shot
// @theme: folded_ribbon_track
// 世界観: 谷底に敷かれた折り紙細工のような帯状コース。転がる小球が角ごとにタップの合図で正しく折れ、奥の宮まで進む
// 残るもの: 正誤(CLEAR/GAME OVER) + 曲がりきった角数
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 擬似奥行きの市松床、地平線グラデーション
  var C = {
    sky: '#ffb877', sky2: '#5a3a7a', floorA: '#3a2a58', floorB: '#4a3868',
    track: '#e8d090', trackEdge: '#a8874a', ball: '#ff5a3d', ballDark: '#a02c14',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#fff8ec', ink: '#160c04',
  };

  var GAME_TITLE = 'CORNER TURN';
  var TOTAL = 6;
  var HORIZON = H * 0.32;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var PTS, SEG_LEN, TOTAL_LEN, corners;
  function buildPath(n, seed) {
    var pts = [{ x: W * 0.5, y: H * 1.1, corner: false }];
    var dir = 1, s = seed;
    function pr() { s = (s * 1103515245 + 12345) & 0x7fffffff; return (s % 1000) / 1000; }
    var y = H * 1.1;
    for (var i = 0; i < n; i++) {
      y -= 340 + pr() * 60;
      var x = dir > 0 ? W * (0.72 + pr() * 0.1) : W * (0.28 - pr() * 0.1);
      pts.push({ x: x, y: y, corner: true });
      dir *= -1;
    }
    y -= 300;
    pts.push({ x: W * 0.5, y: y, corner: false });
    return pts;
  }

  var passed, done, endWait, finished;
  var ready, hitStop, shake;
  var progress, cornerIdx, resolvedCorner, seedN;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    game.draw.gradient(0, HORIZON, [[0, C.sky2], [1, C.sky]]);
    game.draw.rect(0, HORIZON, W, H - HORIZON, C.floorA);
    for (var i = 0; i < 14; i++) {
      var t = i / 14;
      var yb = HORIZON + t * t * (H - HORIZON);
      game.draw.rect(0, yb, W, 3, C.floorB, 0.5 + 0.2 * Math.sin(game.time.elapsed * 1.4 + i));
    }
    game.draw.rect(0, 0, W, H, '#ffffff', 0.02 + 0.02 * Math.sin(game.time.elapsed * 1.2));
  }

  function buildLens() {
    SEG_LEN = []; TOTAL_LEN = 0;
    for (var i = 1; i < PTS.length; i++) {
      var d = Math.hypot(PTS[i].x - PTS[i - 1].x, PTS[i].y - PTS[i - 1].y);
      SEG_LEN.push(d); TOTAL_LEN += d;
    }
    corners = [];
    for (var j = 1; j < PTS.length - 1; j++) if (PTS[j].corner) corners.push({ idx: j, done: false, missed: false });
  }

  function initGame() {
    passed = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    seedN = 5;
    PTS = buildPath(TOTAL, seedN);
    buildLens();
    progress = 0; cornerIdx = 0; resolvedCorner = -1;
  }

  function pointAt(len) {
    var acc = 0;
    for (var i = 1; i < PTS.length; i++) {
      if (len <= acc + SEG_LEN[i - 1] || i === PTS.length - 1) {
        var t = SEG_LEN[i - 1] > 0 ? (len - acc) / SEG_LEN[i - 1] : 0;
        t = Math.max(0, Math.min(1, t));
        return { x: PTS[i - 1].x + (PTS[i].x - PTS[i - 1].x) * t, y: PTS[i - 1].y + (PTS[i].y - PTS[i - 1].y) * t };
      }
      acc += SEG_LEN[i - 1];
    }
    return { x: PTS[PTS.length - 1].x, y: PTS[PTS.length - 1].y };
  }

  function lenAtIdx(idx) {
    var acc = 0;
    for (var i = 1; i <= idx; i++) acc += SEG_LEN[i - 1];
    return acc;
  }

  // project a world point (path space) into screen space with pseudo depth
  function proj(px, py) {
    var camY = pointAt(progress).y;
    var depth = camY - py;
    var scale = 1200 / (1200 + Math.max(0, depth));
    var sx = W * 0.5 + (px - W * 0.5) * scale;
    var sy = H * 0.86 - depth * scale * 0.34;
    return { x: sx, y: sy, scale: scale };
  }

  function drawTrack() {
    for (var i = 1; i < PTS.length; i++) {
      var a = proj(PTS[i - 1].x, PTS[i - 1].y);
      var b = proj(PTS[i].x, PTS[i].y);
      if (a.y < HORIZON - 40 && b.y < HORIZON - 40) continue;
      var wA = 150 * a.scale, wB = 150 * b.scale;
      game.draw.line(a.x, a.y, b.x, b.y, C.trackEdge, Math.max(4, (wA + wB) / 2 + 14));
      game.draw.line(a.x, a.y, b.x, b.y, C.track, Math.max(2, (wA + wB) / 2));
    }
  }

  function drawCornerMarkers() {
    for (var i = 0; i < corners.length; i++) {
      var c = corners[i];
      if (c.done || c.missed) continue;
      var p = PTS[c.idx];
      var s = proj(p.x, p.y);
      if (s.y < HORIZON - 20 || s.scale < 0.05) continue;
      var lenHere = lenAtIdx(c.idx - 1);
      var dist = lenHere - progress;
      var near = dist < 380 && dist > -140;
      var warn = near && Math.floor(game.time.elapsed * 8) % 2 === 0;
      game.draw.circle(s.x, s.y, 30 * s.scale + (warn ? 14 : 0), warn ? C.bad : C.gold, near ? 0.9 : 0.4);
    }
  }

  var BALL_SPRITE = ['.##.', '####', '####', '.##.'];
  function drawBall() {
    var bob = Math.sin(game.time.elapsed * 8) * 3;
    game.draw.circle(W * 0.5, H * 0.86 + bob, 44, C.ballDark, 0.5);
    game.draw.sprite(BALL_SPRITE, { '#': C.ball }, W * 0.5, H * 0.86 + bob, 15, { anchor: 'center' });
  }

  var FORWARD_SPEED = 420;

  function tryTurn() {
    if (ready > 0 || done || finished) return;
    var c = corners[cornerIdx];
    if (!c) return;
    var lenHere = lenAtIdx(c.idx - 1);
    var dist = Math.abs(lenHere - progress);
    game.audio.play('se_tap', 0.08);
    if (dist < 130) {
      c.done = true;
      passed++;
      hitStop = 0.06;
      var pp = pointAt(lenHere);
      var sp = proj(pp.x, pp.y);
      game.feedback.good(sp.x, sp.y, { text: 'TURN', color: C.good });
      game.audio.play('se_good', 0.3);
      if (passed === 3) game.fx.popup('HALFWAY!', W * 0.5, H * 0.3, { color: C.gold, size: 38 });
      if (passed >= TOTAL) { ok = true; finished = true; finish(); return; }
      cornerIdx++;
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) tryTurn();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.9, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) {
      seedN = 5; PTS = buildPath(TOTAL, seedN); buildLens();
      progress = 0; cornerIdx = 0; passed = 0;
    }
    progress += FORWARD_SPEED * dt;
    var c = corners[cornerIdx];
    if (c) {
      var lenHere = lenAtIdx(c.idx - 1);
      if (progress >= lenHere - 20 && !c.done) {
        c.done = true; passed++;
        demo.press = true;
        game.audio.play('se_good', 0.2);
        cornerIdx++;
      } else demo.press = false;
    }
    if (progress >= TOTAL_LEN) progress = TOTAL_LEN;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (PTS === undefined) initGame();
      bg();
      stepDemo(dt);
      drawTrack();
      drawCornerMarkers();
      drawBall();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawTrack();
      drawBall();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(passed + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - passed) + '角!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(passed, { corners: passed, total: TOTAL });
        else game.end.failure({ corners: passed, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      progress += FORWARD_SPEED * dt;
      var c = corners[cornerIdx];
      if (c) {
        var lenHere = lenAtIdx(c.idx - 1);
        if (progress > lenHere + 130 && !c.done && !c.missed) {
          c.missed = true;
          ok = false; finished = true;
          hitStop = 0.35;
          var pp = pointAt(lenHere);
          var sp = proj(pp.x, pp.y);
          game.feedback.bad(sp.x, sp.y, { text: 'MISS' });
          shake = 0.3;
          game.audio.play('se_bad', 0.4);
          finish();
        }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawTrack();
    if (!finished) drawCornerMarkers();
    drawBall();

    txt(passed + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.4);
    game.draw.rect(60, 150, (W - 120) * (passed / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.2], ['G4', 0.2], ['B4', 0.2], ['E5', 0.3]], { tempo: 150, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
