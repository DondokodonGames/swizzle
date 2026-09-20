// I-Switch-0007-ductway-drone.js
// ダクトウェイ・ドローン — 通風ダクトを飛ぶ配達ドローン。上下3段のレーンだけを移動し、回るファンをよける
// 操作: 上/下にスワイプしてレーンを1段だけ移動する。左右移動はできない
// 終わり: 規定時間(18秒)ファンに当たらず飛び続ければ成功。1回でも当たれば失敗
// @mechanic: camera_run
// @theme: duct_delivery_drone
// 世界観: 工場地下の通風ダクトを飛ぶ紙飛行機型の配達ドローン。回転ファンの隙間だけを縫って荷物を届ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 生存した秒数
// スタイル: 90s 16bit
(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 中彩度4色+金属グレー、細かいハイライトの帯
  var C = {
    bg: '#1a2230', bg2: '#0f151f', duct: '#2c3a4c', ductEdge: '#46586e',
    fan: '#c94a4a', fanDark: '#7a2a2a', drone: '#5ad1ff', droneDark: '#1c7aa0',
    good: '#63ffa8', bad: '#ff5c5c', gold: '#ffd85c', white: '#f2f7ff', ink: '#050810',
  };

  var GAME_TITLE = 'DUCTWAY DRONE';
  var DUR = 18;
  var LANES = [H * 0.34, H * 0.5, H * 0.66];
  var DX = W * 0.28;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DRONE_A = ['..#..', '.###.', '#####'];
  var DRONE_B = ['.....', '.###.', '#####'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, LANES[0] - 90, W, 8, C.ductEdge);
    game.draw.rect(0, LANES[2] + 90, W, 8, C.ductEdge);
    for (var i = 0; i < 8; i++) game.draw.line(0, LANES[0] - 90 + i * 60, W, LANES[0] - 90 + i * 60, '#ffffff05', 2);
  }

  var lane, laneY, laneAnim, tSurvived, walls, spawnT, done, endWait, finished, hitStop, shake, ready, nextMilestone;

  function newWall(x) {
    var safe = Math.floor(Math.random() * 3);
    return { x: x, safe: safe, telegraphed: false, passed: false };
  }

  function initGame() {
    lane = 1; laneY = LANES[1]; laneAnim = 0;
    tSurvived = 0; walls = []; spawnT = 1.4;
    done = false; endWait = 0; finished = false;
    hitStop = 0; shake = 0; ready = 0.8; nextMilestone = DUR * 0.5;
    var x = W + 300;
    for (var i = 0; i < 3; i++) { walls.push(newWall(x)); x += 460; }
  }

  function moveLane(d) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    var nl = Math.max(0, Math.min(2, lane + d));
    if (nl === lane) return;
    lane = nl;
    game.audio.play('se_tap', 0.15);
    game.feedback.good(DX, laneY, { text: '', color: C.drone, count: 4 });
  }
  game.onSwipe(function(dir) {
    if (dir === 'up') moveLane(-1);
    else if (dir === 'down') moveLane(1);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function resolveHit() {
    finished = true; ok = false; hitStop = 0.35;
    game.feedback.bad(DX, laneY, { text: 'MISS' });
    shake = 0.3;
    game.audio.play('se_bad', 0.4);
    finish();
  }
  function resolveClear() {
    finished = true; ok = true; hitStop = 0.15;
    game.feedback.good(DX, laneY, { text: 'CLEAR', color: C.good });
    game.fx.burst(DX, laneY, { color: C.gold, count: 20, speed: 380 });
    game.audio.play('se_success', 0.5);
    finish();
  }
  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var SPEED = 480;
  function stepPhysics(dt) {
    tSurvived += dt;
    laneAnim += (LANES[lane] - laneAnim) * Math.min(1, dt * 10);
    laneY = laneAnim;
    spawnT -= dt;
    if (spawnT <= 0) { spawnT = 1.5; walls.push(newWall(W + 300)); }
    for (var i = walls.length - 1; i >= 0; i--) {
      var w = walls[i];
      w.x -= SPEED * dt;
      if (!w.telegraphed && w.x < DX + 340) { w.telegraphed = true; game.audio.play('se_tap', 0.1); }
      if (!w.passed && w.x < DX - 30) {
        w.passed = true;
        if (w.safe !== lane) return { hit: true };
        game.fx.popup('NICE', DX, laneY - 90, { color: C.gold, size: 30 });
      }
      if (w.x < -200) { walls.splice(i, 1); }
    }
    if (tSurvived >= nextMilestone && nextMilestone < DUR) {
      game.fx.popup(Math.round((nextMilestone / DUR) * 100) + '%', DX, laneY - 140, { color: C.gold, size: 36 });
      game.audio.play('se_milestone', 0.5);
      nextMilestone += DUR * 0.5;
    }
    if (tSurvived >= DUR) return { clear: true };
    return null;
  }

  function drawWalls() {
    for (var i = 0; i < walls.length; i++) {
      var w = walls[i];
      if (w.x < -200 || w.x > W + 200) continue;
      var blink = w.telegraphed && !w.passed && Math.floor(game.time.elapsed * 12) % 2 === 0;
      for (var l = 0; l < 3; l++) {
        if (l === w.safe) continue;
        var col = blink ? C.gold : C.fan;
        game.draw.rect(w.x - 55, LANES[l] - 46, 110, 92, C.fanDark);
        game.draw.circle(w.x, LANES[l], 40, col);
        game.draw.line(w.x - 30, LANES[l], w.x + 30, LANES[l], C.ink, 6);
        game.draw.line(w.x, LANES[l] - 30, w.x, LANES[l] + 30, C.ink, 6);
      }
    }
  }

  var demo = { t: 0, gx: DX, gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.2;
    if (cyc < dt || demo.t <= dt) {
      lane = 1; laneY = LANES[1]; laneAnim = LANES[1]; tSurvived = 0; walls = []; spawnT = 1.2;
      var x = W + 260;
      for (var i = 0; i < 4; i++) { walls.push(newWall(x)); x += 420; }
    }
    demo.press = false;
    for (var j = 0; j < walls.length; j++) {
      var w = walls[j];
      if (!w.telegraphed && w.x < DX + 380 && w.x > DX + 200 && w.safe !== lane) {
        demo.press = true;
        lane = w.safe;
      }
    }
    var r = stepPhysics(dt);
    demo.gx = DX; demo.gy = laneY + 160;
    if (r) { lane = 1; walls = []; tSurvived = 0; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (tSurvived === undefined) initGame();
      stepDemo(dt);
      bg(); drawWalls();
      game.draw.sprite(Math.floor(game.time.elapsed * 6) % 2 === 0 ? DRONE_A : DRONE_B, { '#': C.drone }, DX, laneY, 16, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? Math.round(game.best) + 's' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg(); drawWalls();
      game.draw.sprite(DRONE_A, { '#': ok ? C.drone : C.bad }, DX, laneY, 16, { anchor: 'center' });
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

    bg(); drawWalls();
    game.draw.sprite(Math.floor(game.time.elapsed * 8) % 2 === 0 ? DRONE_A : DRONE_B, { '#': finished && !ok ? C.bad : C.drone }, DX, laneY, 16, { anchor: 'center' });

    txt(Math.round(tSurvived) + ' / ' + DUR + 's', W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.min(1, tSurvived / DUR), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.3], ['C4', 0.3], ['E4', 0.3], ['A4', 0.5]], { tempo: 140, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
