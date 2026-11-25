// I-Switch-0008-rapids-tube-run.js
// ラピッズ・チューブ・ラン — 川下りの浮き輪に乗ったカワウソが、指の左右移動だけで岩をよける
// 操作: 画面を押している間、指の左右位置にカワウソが追従する(縦方向の操作はできない)
// 終わり: 規定時間(20秒)岩に当たらず下れば成功。1回でも当たれば失敗
// @mechanic: drag_follow
// @theme: river_tube_otter
// 世界観: 渓流を浮き輪で下るカワウソ。流れてくる岩を左右のよろめきだけでかわし、滝つぼの手前まで駆け抜ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 生存した秒数
// スタイル: 2000s ARCADE POP
(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 明るい彩度高めの3色+白フチ、丸みの強いUI
  var C = {
    bg: '#0f8fc9', bg2: '#0a5f96', water: '#2fb8e8', waterDark: '#1a86bb',
    rock: '#8a7460', rockEdge: '#5c4a38', otter: '#c68a4a', otterDark: '#8a5c2a',
    good: '#4dff9e', bad: '#ff4d6a', gold: '#ffe14d', white: '#ffffff', ink: '#062030',
  };

  var GAME_TITLE = 'RAPIDS TUBE RUN';
  var DUR = 20;
  var RY = H * 0.62;
  var LANE_MIN = W * 0.18, LANE_MAX = W * 0.82;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var OTTER_A = ['.##.', '####', '.##.'];
  var OTTER_B = ['####', '.##.', '####'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 10; i++) {
      var yy = ((i * 210 + game.time.elapsed * 260) % (H + 200)) - 100;
      game.draw.line(0, yy, W, yy - 40, C.waterDark, 4);
    }
  }

  var otterX, targetX, tSurvived, rocks, spawnT, done, endWait, finished, hitStop, shake, ready, nextMilestone, pressing;

  function newRock() {
    return { x: game.random(LANE_MIN, LANE_MAX), y: -80, r: 62, telegraphed: false };
  }

  function initGame() {
    otterX = W * 0.5; targetX = otterX; pressing = false;
    tSurvived = 0; rocks = []; spawnT = 1.0;
    done = false; endWait = 0; finished = false;
    hitStop = 0; shake = 0; ready = 0.8; nextMilestone = DUR * 0.5;
  }

  function setTarget(x) { targetX = Math.max(LANE_MIN, Math.min(LANE_MAX, x)); }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    pressing = true; setTarget(x);
    game.audio.play('se_tap', 0.05);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !pressing) return;
    setTarget(x);
  });
  game.onRelease(function() { pressing = false; });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function resolveHit() {
    finished = true; ok = false; hitStop = 0.35;
    game.feedback.bad(otterX, RY, { text: 'MISS' });
    shake = 0.3;
    game.audio.play('se_bad', 0.4);
    finish();
  }
  function resolveClear() {
    finished = true; ok = true; hitStop = 0.15;
    game.feedback.good(otterX, RY, { text: 'CLEAR', color: C.good });
    game.fx.burst(otterX, RY, { color: C.gold, count: 20, speed: 380 });
    game.audio.play('se_success', 0.5);
    finish();
  }
  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var SPEED = 640;
  function stepPhysics(dt) {
    tSurvived += dt;
    otterX += (targetX - otterX) * Math.min(1, dt * 8);
    spawnT -= dt;
    if (spawnT <= 0) { spawnT = Math.max(0.55, 0.95 - tSurvived * 0.01); rocks.push(newRock()); }
    for (var i = rocks.length - 1; i >= 0; i--) {
      var r = rocks[i];
      r.y += SPEED * dt;
      if (!r.telegraphed && r.y > RY - 340) { r.telegraphed = true; game.audio.play('se_tap', 0.1); }
      if (r.y > RY - 60 && r.y < RY + 60 && Math.abs(r.x - otterX) < r.r) return { hit: true };
      if (r.y > H + 100) rocks.splice(i, 1);
    }
    if (tSurvived >= nextMilestone && nextMilestone < DUR) {
      game.fx.popup(Math.round((nextMilestone / DUR) * 100) + '%', otterX, RY - 140, { color: C.gold, size: 36 });
      game.audio.play('se_milestone', 0.5);
      nextMilestone += DUR * 0.5;
    }
    if (tSurvived >= DUR) return { clear: true };
    return null;
  }

  function drawRocks() {
    for (var i = 0; i < rocks.length; i++) {
      var r = rocks[i];
      var blink = r.telegraphed && Math.floor(game.time.elapsed * 12) % 2 === 0;
      game.draw.circle(r.x, r.y, r.r + 10, blink ? C.gold : C.rockEdge, 0.6);
      game.draw.circle(r.x, r.y, r.r, C.rock);
    }
  }

  var demo = { t: 0, gx: W * 0.5, gy: RY, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.6;
    if (cyc < dt || demo.t <= dt) { otterX = W * 0.5; targetX = otterX; tSurvived = 0; rocks = []; spawnT = 0.8; }
    for (var i = 0; i < rocks.length; i++) {
      var r = rocks[i];
      if (!r.telegraphed && r.y > RY - 420 && r.y < RY - 260) {
        setTargetDemo(r.x < otterX ? LANE_MAX * 0.9 : LANE_MIN * 1.1);
      }
    }
    var res = stepPhysics(dt);
    demo.gx = otterX; demo.gy = RY + 170; demo.press = true;
    if (res) { otterX = W * 0.5; targetX = otterX; tSurvived = 0; rocks = []; }
  }
  function setTargetDemo(x) { targetX = Math.max(LANE_MIN, Math.min(LANE_MAX, x)); }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (tSurvived === undefined) initGame();
      stepDemo(dt);
      bg(); drawRocks();
      game.draw.sprite(Math.floor(game.time.elapsed * 5) % 2 === 0 ? OTTER_A : OTTER_B, { '#': C.otter }, otterX, RY, 16, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? Math.round(game.best) + 's' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg(); drawRocks();
      game.draw.sprite(OTTER_A, { '#': ok ? C.otter : C.bad }, otterX, RY, 16, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(tSurvived.toFixed(1) + 's / ' + DUR + 's', W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + Math.max(1, Math.round(DUR - tSurvived)) + '秒!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var sec = Math.round(tSurvived * 10) / 10;
        if (ok) game.end.success(sec, { seconds: sec }); else game.end.failure({ seconds: sec });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      var r = stepPhysics(dt);
      if (r && r.hit) resolveHit();
      else if (r && r.clear) resolveClear();
    }
    if (shake > 0) shake -= dt;

    bg(); drawRocks();
    game.draw.sprite(Math.floor(game.time.elapsed * 7) % 2 === 0 ? OTTER_A : OTTER_B, { '#': finished && !ok ? C.bad : C.otter }, otterX, RY, 16, { anchor: 'center' });

    txt(Math.round(tSurvived) + ' / ' + DUR + 's', W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.min(1, tSurvived / DUR), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.3], ['B4', 0.3], ['D5', 0.3], ['G5', 0.5]], { tempo: 150, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
