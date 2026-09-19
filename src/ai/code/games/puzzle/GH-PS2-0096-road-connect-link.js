// GH-PS2-0096-road-connect-link.js
// ロードリンク — 家から街の広場まで指で道を引く。川に触れると道は流される
// 操作: 家の丸から街の広場までドラッグして道を引く。川(斜めの帯)を避けて自由に引いてよい
// 終わり: 5軒つなげば成功。道が川に触れるか、猶予切れの家が3軒出ると失敗
// @mechanic: connect
// @theme: aerial_road_planner
// 世界観: 空から見た開拓地。広場を中心に家が次々に現れる。家ごとに猶予の輪が細っていき、切れる前に道を広場までつながないと孤立する
// 残るもの: 正誤(CLEAR/GAME OVER) + つないだ家の数
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // MODE7 PSEUDO: 少色 + 地平グラデ。横1pxストリップ圧縮のイメージで、床は水平帯を重ねて奥行きを出す
  var C = {
    sky1: '#0e1a2a', sky2: '#1c3350', horizon: '#3a5a78',
    land1: '#28422e', land2: '#1c3322', river: '#2d6fae', riverDark: '#1a4a7a',
    road: '#c9a55c', roadBad: '#ff4d5e', hub: '#ffd400', house: '#e8925a', houseDark: '#a4562a',
    good: '#5dffb0', bad: '#ff4d5e', gold: '#ffd400', white: '#f2f6ff', ink: '#060a12',
  };

  var GAME_TITLE = 'ROAD LINK';
  var HUB = { x: W * 0.5, y: H * 0.66 };
  var NEED_HOUSES = 5;
  var MAX_FAILS = 3;
  var HOUSE_TIMEOUT = 6.5;

  // 川(固定のジオメトリ。斜めの帯を2本)
  var RIVERS = [
    { x1: W * 0.05, y1: H * 0.30, x2: W * 0.55, y2: H * 0.20, w: 60 },
    { x1: W * 0.70, y1: H * 0.55, x2: W * 1.02, y2: H * 0.40, w: 60 },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var finalScore = 0;

  var houses, linked, fails, drawingIdx, roadPts, roadBlocked, spawnTimer, totalTime, done, endWait, finished, ok;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var HOUSE_SPRITE = ['.##.', '####', '####'];

  function landBg() {
    // 地平線へ収束するグラデ床(疑似3Dの簡易表現: 水平帯を重ねる)
    game.draw.gradient(0, H, [[0, C.sky1], [0.28, C.sky2], [0.34, C.horizon], [0.40, C.land1], [1, '#0e1a12']]);
    for (var i = 0; i < 14; i++) {
      var t = i / 14;
      var y = H * 0.34 + t * (H * 0.62);
      game.draw.rect(0, y, W, 3, i % 2 === 0 ? C.land2 : C.land1, 0.4);
    }
  }

  function drawRivers() {
    for (var i = 0; i < RIVERS.length; i++) {
      var r = RIVERS[i];
      game.draw.line(r.x1, r.y1, r.x2, r.y2, C.riverDark, r.w + 10);
      game.draw.line(r.x1, r.y1, r.x2, r.y2, C.river, r.w);
    }
  }

  function distToSeg(px, py, ax, ay, bx, by) {
    var vx = bx - ax, vy = by - ay, wx = px - ax, wy = py - ay;
    var len2 = vx * vx + vy * vy;
    var t = len2 > 0 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2)) : 0;
    var cx = ax + vx * t, cy = ay + vy * t;
    return Math.hypot(px - cx, py - cy);
  }

  function crossesRiver(x, y) {
    for (var i = 0; i < RIVERS.length; i++) {
      var r = RIVERS[i];
      if (distToSeg(x, y, r.x1, r.y1, r.x2, r.y2) < r.w / 2 + 16) return true;
    }
    return false;
  }

  function drawHub() {
    game.draw.circle(HUB.x, HUB.y, 60, C.hub, 0.3);
    game.draw.circle(HUB.x, HUB.y, 40, C.hub);
    game.draw.circle(HUB.x, HUB.y, 20, C.ink, 0.5);
  }

  function drawHouse(h) {
    var pulse = h.timeLeft < 2 ? (Math.floor(game.time.elapsed * 8) % 2 === 0) : false;
    game.draw.circle(h.x, h.y, 46, '#000000', 0.25);
    game.draw.sprite(HOUSE_SPRITE, { '#': h.linked ? C.good : (pulse ? C.bad : C.house) }, h.x, h.y, 14, { anchor: 'center' });
    // 猶予リング(telegraph)
    var frac = Math.max(0, h.timeLeft / HOUSE_TIMEOUT);
    game.draw.circle(h.x, h.y, 54, C.ink, 0.35);
    for (var a = 0; a < 24; a++) {
      if (a / 24 > frac) continue;
      var ang = -Math.PI / 2 + (a / 24) * Math.PI * 2;
      game.draw.circle(h.x + Math.cos(ang) * 54, h.y + Math.sin(ang) * 54, 4, pulse ? C.bad : C.gold);
    }
  }

  function drawRoad(pts, blocked) {
    if (!pts || pts.length < 2) return;
    for (var i = 1; i < pts.length; i++) {
      game.draw.line(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y, blocked ? C.roadBad : C.road, 10);
    }
  }

  function initGame() {
    houses = []; linked = 0; fails = 0; drawingIdx = -1; roadPts = null; roadBlocked = false;
    spawnTimer = 0.4; totalTime = 0; done = false; endWait = 0; finished = false; ok = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  var HOUSE_SPOTS = [
    { x: W * 0.18, y: H * 0.46 }, { x: W * 0.82, y: H * 0.44 },
    { x: W * 0.20, y: H * 0.80 }, { x: W * 0.80, y: H * 0.82 },
    { x: W * 0.5, y: H * 0.24 }, { x: W * 0.12, y: H * 0.66 },
    { x: W * 0.88, y: H * 0.66 },
  ];
  function spawnHouse() {
    if (houses.length >= 2) return;
    var free = HOUSE_SPOTS.filter(function(s) {
      return !houses.some(function(h) { return Math.abs(h.x - s.x) < 20 && Math.abs(h.y - s.y) < 20; });
    });
    if (free.length === 0) return;
    var spot = free[Math.floor(Math.random() * free.length)];
    houses.push({ x: spot.x, y: spot.y, timeLeft: HOUSE_TIMEOUT, linked: false, id: Math.random() });
  }

  function houseTimeout(h) {
    fails++;
    var idx = houses.indexOf(h);
    if (idx >= 0) houses.splice(idx, 1);
    hitStop = 0.3; shake = 0.25;
    game.feedback.bad(h.x, h.y, { text: 'MISS' });
    game.audio.play('se_bad', 0.4);
    if (fails >= MAX_FAILS) { ok = false; finished = true; finish(); }
  }

  function tryStart(x, y) {
    for (var i = 0; i < houses.length; i++) {
      var h = houses[i];
      if (!h.linked && Math.hypot(x - h.x, y - h.y) < 70) { drawingIdx = i; roadPts = [{ x: h.x, y: h.y }]; roadBlocked = false; game.audio.play('se_tap', 0.2); return; }
    }
  }

  function tryDrag(x, y) {
    if (drawingIdx < 0) return;
    var last = roadPts[roadPts.length - 1];
    if (Math.hypot(x - last.x, y - last.y) < 14) return;
    roadPts.push({ x: x, y: y });
    if (crossesRiver(x, y)) { roadBlocked = true; }
  }

  function tryEnd(x, y) {
    if (drawingIdx < 0) return;
    var h = houses[drawingIdx];
    var reached = Math.hypot(x - HUB.x, y - HUB.y) < 80;
    if (reached && !roadBlocked) {
      h.linked = true; linked++;
      game.feedback.good(HUB.x, HUB.y, { text: '+1', color: C.good });
      game.fx.burst(HUB.x, HUB.y, { color: C.gold, count: 14, speed: 320 });
      game.audio.play('se_success', 0.35);
      if (linked === 3) { game.fx.popup(linked + ' / ' + NEED_HOUSES, W / 2, H * 0.20, { color: C.gold, size: 44 }); game.audio.play('se_milestone', 0.4); }
      houses.splice(drawingIdx, 1);
      if (linked >= NEED_HOUSES) { ok = true; finished = true; finish(); }
    } else {
      hitStop = 0.2; shake = 0.18;
      game.feedback.bad(x, y, { text: reached ? 'MISS' : 'MISS' });
      game.audio.play('se_bad', 0.35);
    }
    drawingIdx = -1; roadPts = null; roadBlocked = false;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.press = false; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || done || ready > 0 || finished) return;
    game.audio.play('se_tap', 0.15);
    tryStart(x, y);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || done || ready > 0 || finished) return;
    if (Math.random() < 0.08) game.audio.play('se_tap', 0.03);
    tryDrag(x, y);
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || done || ready > 0 || finished) return;
    game.audio.play('se_tap', 0.1);
    tryEnd(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    finalScore = linked * 100;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  // ── ATTRACT ゴースト実演: 実際の tryStart/tryDrag/tryEnd を流用し、成功1回+川に阻まれる失敗1回 ──
  var demo = { t: 0, gx: 0, gy: 0, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.2;
    if (cyc < dt || demo.t <= dt) { houses = [{ x: HOUSE_SPOTS[0].x, y: HOUSE_SPOTS[0].y, timeLeft: HOUSE_TIMEOUT, linked: false }, { x: HOUSE_SPOTS[1].x, y: HOUSE_SPOTS[1].y, timeLeft: HOUSE_TIMEOUT, linked: false }]; drawingIdx = -1; roadPts = null; }
    for (var i = 0; i < houses.length; i++) houses[i].timeLeft -= dt;
    if (cyc < 0.3) { demo.gx = houses[0].x; demo.gy = houses[0].y; demo.press = false; }
    else if (cyc < 0.5) { if (drawingIdx < 0) tryStart(houses[0].x, houses[0].y); demo.press = true; }
    else if (cyc < 2.0) {
      var t1 = (cyc - 0.5) / 1.5;
      var midx = houses[0].x + (HUB.x - houses[0].x) * t1, midy = houses[0].y + (HUB.y - houses[0].y) * t1;
      demo.gx = midx; demo.gy = midy;
      tryDrag(midx, midy);
    } else if (cyc < 2.2) { tryEnd(HUB.x, HUB.y); demo.press = false; }
    else if (cyc < 3.0) { demo.press = false; }
    else if (cyc < 3.3) { if (drawingIdx < 0 && houses[1]) tryStart(houses[1].x, houses[1].y); demo.gx = houses[1] ? houses[1].x : demo.gx; demo.gy = houses[1] ? houses[1].y : demo.gy; demo.press = true; }
    else if (cyc < 4.2) {
      // 川を突っ切るルートを見せる(失敗例)
      var riverPt = { x: W * 0.35, y: H * 0.24 };
      demo.gx = riverPt.x; demo.gy = riverPt.y;
      tryDrag(riverPt.x, riverPt.y);
    } else if (cyc < 4.4) { tryEnd(HUB.x, HUB.y); demo.press = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (houses === undefined) initGame();
      landBg();
      drawRivers();
      drawHub();
      stepDemo(dt);
      for (var i = 0; i < houses.length; i++) drawHouse(houses[i]);
      if (roadPts) drawRoad(roadPts, roadBlocked);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 52, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 42, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.97, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      landBg();
      drawRivers();
      drawHub();
      for (var k = 0; k < houses.length; k++) drawHouse(houses[k]);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(linked + ' / ' + NEED_HOUSES, W / 2, H * 0.13, 32, C.white);
      if (!ok && linked >= NEED_HOUSES - 1) txt('あと1軒!', W / 2, H * 0.18, 28, C.gold);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + String(best).padStart(4, '0'), W / 2, H * 0.23, 26, C.gold);
      if (finalScore > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.28, 28, C.gold);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 24, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(finalScore, { linked: linked }); else game.end.failure({ linked: linked, fails: fails });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      totalTime += dt;
      spawnTimer -= dt;
      if (spawnTimer <= 0) { spawnHouse(); spawnTimer = 1.6; }
      for (var hi = houses.length - 1; hi >= 0; hi--) {
        var h = houses[hi];
        if (h.linked) continue;
        h.timeLeft -= dt;
        if (h.timeLeft <= 0) houseTimeout(h);
      }
    }
    if (shake > 0) shake -= dt;

    landBg();
    drawRivers();
    drawHub();
    for (var h2 = 0; h2 < houses.length; h2++) drawHouse(houses[h2]);
    if (roadPts) drawRoad(roadPts, roadBlocked);

    txt(linked + ' / ' + NEED_HOUSES, W / 2, 100, 36, C.white);
    for (var f = 0; f < MAX_FAILS; f++) game.draw.circle(W - 70 - f * 44, 100, 13, f < fails ? C.bad : C.ink, f < fails ? 1 : 0.4);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.90, 68, C.gold);
  });

  game.onStart(function() {
    game.audio.melody(
      [['G4', 0.25], ['B4', 0.25], ['D5', 0.25], ['B4', 0.25], ['G4', 0.25], ['D5', 0.25]],
      { tempo: 118, wave: 'triangle', volume: 0.06, loop: true, bass: [['G3', 0.5], ['D3', 0.5]], bassWave: 'sine', bassVolume: 0.06 }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
