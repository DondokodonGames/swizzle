// I-Switch-0005-firefly-updraft.js
// ファイアフライ・アップドラフト — 洞窟の縦穴を指で押さえて浮かび上がり、垂れる鍾乳石をよける
// 操作: 画面を押し続けている間だけ上昇する。離すと沈む。左右には流されず自機は中央固定、障害物が下から迫る
// 終わり: 規定の高度(100)に到達すれば成功。鍾乳石に触れれば失敗
// @mechanic: dodge
// @theme: cave_firefly_rescue
// 世界観: 地底湖の洞窟を昇るホタル。仲間を待つ地上の巣まで、垂れ下がる鍾乳石の群れをかわしながら上昇する
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達した高度%
// スタイル: 8bit HANDHELD
(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 低彩度4色パレット、丸みのある小さいドット、単色背景グラデ
  var C = {
    bg: '#0e2438', bg2: '#183a52', rock: '#2c4a5c', rockEdge: '#456478',
    glow: '#ffe680', glowDark: '#c9a83a', good: '#7cffb0', bad: '#ff6b6b',
    gold: '#ffe680', white: '#eafaff', ink: '#081420',
  };

  var GAME_TITLE = 'FIREFLY UPDRAFT';
  var GOAL = 100; // 高度%
  var CX = W * 0.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var FLY_UP = ['.##.', '####', '.##.'];
  var FLY_DN = ['.##.', '####', '####'];

  var altitude, holding, flyY, vy, obstacles, spawnT, done, endWait, finished, hitStop, shake, ready, milestoneHit;

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) {
      var yy = ((i * 340 + (game.time.elapsed * 20)) % (H + 200)) - 100;
      game.draw.circle(W * (0.15 + (i % 3) * 0.35), yy, 60, '#ffffff05');
    }
  }

  function drawRockAt(o) {
    var w = 190;
    if (o.side === 'top') {
      game.draw.rect(o.x - w / 2, 0, w, o.len, C.rockEdge);
      game.draw.rect(o.x - w / 2 + 10, 0, w - 20, o.len - 14, C.rock);
    } else {
      game.draw.rect(o.x - w / 2, H - o.len, w, o.len, C.rockEdge);
      game.draw.rect(o.x - w / 2 + 10, H - o.len + 14, w - 20, o.len - 14, C.rock);
    }
  }

  function newObstacle(worldY) {
    var side = Math.random() < 0.5 ? 'top' : 'bottom';
    return {
      x: W * (0.25 + Math.random() * 0.5),
      worldY: worldY,
      side: side,
      len: 420 + Math.random() * 260,
      telegraphed: false,
    };
  }

  function initGame() {
    altitude = 0; holding = false; flyY = H * 0.78; vy = 0;
    obstacles = []; spawnT = 0;
    done = false; endWait = 0; finished = false;
    hitStop = 0; shake = 0; ready = 0.8; milestoneHit = false;
    var y = H * 0.4;
    for (var i = 0; i < 3; i++) { obstacles.push(newObstacle(y)); y -= 520; }
  }

  function resolveHit() {
    finished = true; ok = false; hitStop = 0.35;
    game.feedback.bad(CX, flyY, { text: 'MISS' });
    shake = 0.3;
    game.audio.play('se_bad', 0.4);
    finish();
  }
  function resolveClear() {
    finished = true; ok = true; hitStop = 0.15;
    game.feedback.good(CX, flyY, { text: 'CLEAR', color: C.good });
    game.fx.burst(CX, flyY, { color: C.gold, count: 20, speed: 380 });
    game.audio.play('se_success', 0.5);
    finish();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  game.onPress(function(x, y) { if (state === S.PLAYING) { holding = true; game.audio.play('se_tap', 0.05); } });
  game.onRelease(function() { if (state === S.PLAYING) holding = false; });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function stepGame(dt, isDemoHold) {
    var wantHold = isDemoHold !== undefined ? isDemoHold : holding;
    vy += (wantHold ? -1150 : 900) * dt;
    vy = Math.max(-620, Math.min(620, vy));
    flyY += vy * dt;
    if (flyY > H * 0.86) { flyY = H * 0.86; vy = 0; }
    if (flyY < H * 0.2) flyY = H * 0.2;

    altitude += (wantHold ? 30 : -6) * dt;
    altitude = Math.max(0, Math.min(GOAL, altitude));

    spawnT -= dt;
    if (spawnT <= 0) {
      spawnT = 1.6;
      obstacles.push(newObstacle(altitude - 6));
    }
    for (var i = obstacles.length - 1; i >= 0; i--) {
      var o = obstacles[i];
      var rel = altitude - o.worldY; // どれだけ近づいたか(0-6くらいで通過)
      if (rel > 7) { obstacles.splice(i, 1); continue; }
      if (!o.telegraphed && rel > 4.6) { o.telegraphed = true; game.audio.play('se_tap', 0.15); }
      if (rel > 5.2 && rel < 6.2) {
        var edgeY = o.side === 'top' ? o.len : H - o.len;
        var dist = o.side === 'top' ? (flyY - edgeY) : (edgeY - flyY);
        if (Math.abs(o.x - CX) < 100 && dist < 30) {
          return { hit: true };
        }
      }
    }
    if (altitude >= GOAL) return { clear: true };
    if (!milestoneHit && altitude >= GOAL * 0.5) { milestoneHit = true; game.fx.popup('50 / 100', CX, flyY - 120, { color: C.gold, size: 40 }); game.audio.play('se_milestone', 0.5); }
    return null;
  }

  function drawScene() {
    bg();
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      var rel = altitude - o.worldY;
      if (rel < 6.4 && rel > -1) drawRockAt(o);
    }
  }

  var demo = { t: 0, gx: CX, gy: H * 0.78, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) { altitude = 0; flyY = H * 0.78; vy = 0; obstacles = []; spawnT = 0;
      var y = H * 0.4; for (var i = 0; i < 3; i++) { obstacles.push(newObstacle(y)); y -= 520; }
    }
    var hold = (Math.floor(cyc * 2.4) % 2 === 0);
    var r = stepGame(dt, hold);
    demo.gx = CX; demo.gy = flyY; demo.press = hold;
    if (r && r.clear) { altitude = 0; flyY = H * 0.78; vy = 0; }
    if (r && r.hit) { altitude = Math.max(0, altitude - 10); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (altitude === undefined) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.sprite(vy < -20 ? FLY_UP : FLY_DN, { '#': C.glow }, CX, flyY, 14, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy + 140, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? Math.round(game.best) + '%' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.sprite(FLY_DN, { '#': ok ? C.glow : C.bad }, CX, flyY, 14, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(Math.round(altitude) + ' / ' + GOAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + Math.max(1, Math.round(GOAL - altitude)) + '!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct = Math.round(altitude);
        if (ok) game.end.success(pct, { altitude: pct }); else game.end.failure({ altitude: pct });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      var r = stepGame(dt);
      if (r && r.hit) resolveHit();
      else if (r && r.clear) resolveClear();
    }
    if (shake > 0) shake -= dt;

    drawScene();
    game.draw.sprite(vy < -20 ? FLY_UP : FLY_DN, { '#': finished && !ok ? C.bad : C.glow }, CX, flyY, 14, { anchor: 'center' });

    txt(Math.round(altitude) + ' / ' + GOAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (altitude / GOAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.4], ['G4', 0.4], ['B4', 0.4], ['E5', 0.8]], { tempo: 118, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
