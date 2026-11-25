// D-20092012-0012-lane-guard-garden.js
// レーンガーデン — 3本の畝を虫が奥の小屋へ迫る。虫がいる畝を見極めてタップし、守り草を差して撃退する
// 操作: 虫が通っている畝(左/中/右)の親指ゾーンをタップして守り草を配置する
// 終わり: 規定数の虫を撃退できれば成功。2匹小屋にたどり着けば失敗
// @mechanic: judge
// @theme: garden_lane_defense
// 世界観: 郊外の家庭菜園。3本の畝を虫が上から小屋に向かって這い進む。畝を見極めて守り草を差し、小屋を守る番人の話
// 残るもの: 正誤(CLEAR/GAME OVER) + 撃退した虫の数
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: 明るいフラットカラー、太い縁取りなし、柔らかい影の代わりに面分割
  var C = {
    bg: '#bfe6a8', bg2: '#9ed17f', soil: '#8a5a3c', soilDark: '#6e4529',
    house: '#e8dcc0', roof: '#c0503c', leaf: '#3fae4a', leafDark: '#2c7d34',
    bug: '#7a4a8c', bugDark: '#4e2c5c', good: '#2fbf6e', bad: '#e0463f',
    gold: '#ffb200', white: '#ffffff', ink: '#20301c',
  };

  var GAME_TITLE = 'LANE GUARD';
  var TOTAL = 6;
  var MAX_MISS = 2;
  var LANES = [W * 0.26, W * 0.5, W * 0.74];
  var LANE_ZONE_Y = H * 0.62; // 親指ゾーン内の判定ボタン群
  var LANE_ZONE_H = 190;
  var HOUSE_Y = H * 0.30;
  var SPAWN_Y = H * 0.10;
  var KILL_Y0 = H * 0.20, KILL_Y1 = H * 0.62; // タップが有効な区間(この間に入っていれば撃退成功)

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BUG = ['.##.', '####', '.##.'];
  var PLANT = ['..#..', '.###.', '#####', '..#..'];
  var HOUSE_SPR = ['..#..', '.###.', '#####', '#.#.#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, HOUSE_Y - 130, W, 260, C.soilDark, 0.15);
    for (var i = 0; i < LANES.length; i++) {
      game.draw.rect(LANES[i] - 90, KILL_Y0 - 40, 180, H * 0.55, C.soil, 0.9);
      game.draw.line(LANES[i] - 90, KILL_Y0 - 40, LANES[i] - 90, KILL_Y0 - 40 + H * 0.55, C.soilDark, 4);
      game.draw.line(LANES[i] + 90, KILL_Y0 - 40, LANES[i] + 90, KILL_Y0 - 40 + H * 0.55, C.soilDark, 4);
    }
    game.draw.sprite(HOUSE_SPR, { '#': C.roof }, W * 0.5, HOUSE_Y, 24, { anchor: 'center' });
    game.draw.rect(W * 0.5 - 60, HOUSE_Y + 10, 120, 60, C.house);
  }

  function drawLaneButtons(activeLane, pressFlash) {
    for (var i = 0; i < LANES.length; i++) {
      var isHot = (i === activeLane);
      game.draw.rect(LANES[i] - 90, LANE_ZONE_Y, 180, LANE_ZONE_H, isHot ? C.leaf : '#ffffff', isHot ? 0.9 : 0.5);
      game.draw.rect(LANES[i] - 90, LANE_ZONE_Y, 180, LANE_ZONE_H, C.leafDark, 0.0);
      game.draw.sprite(PLANT, { '#': isHot ? C.white : C.leafDark }, LANES[i], LANE_ZONE_Y + LANE_ZONE_H / 2, 10, { anchor: 'center' });
    }
    if (pressFlash > 0) {
      game.draw.rect(LANES[activeLane] - 96, LANE_ZONE_Y - 6, 192, LANE_ZONE_H + 12, C.gold, Math.min(0.6, pressFlash));
    }
  }

  var enemies; // {lane, y, dead, warned}
  var defeated, missed, done, endWait, finished;
  var ready, hitStop, shake, spawnTimer, spawnInterval, pressFlash;

  function initGame() {
    enemies = [];
    defeated = 0; missed = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; pressFlash = 0;
    spawnTimer = 0.5; spawnInterval = 1.15;
  }

  function spawnBug() {
    var lane = Math.floor(game.random(0, 3));
    if (lane > 2) lane = 2;
    enemies.push({ lane: lane, y: SPAWN_Y, dead: false, warned: false, speed: game.random(210, 260) + defeated * 6 });
  }

  function tapLane(lane) {
    pressFlash = 0.15;
    game.audio.play('se_tap', 0.15);
    var hit = null;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.dead || e.lane !== lane) continue;
      if (e.y >= KILL_Y0 && e.y <= KILL_Y1) { hit = e; break; }
    }
    if (hit) {
      hit.dead = true;
      defeated++;
      hitStop = 0.08;
      game.feedback.good(LANES[lane], hit.y, { text: 'GOOD', color: C.good });
      game.fx.burst(LANES[lane], hit.y, { color: C.leaf, count: 14, speed: 300 });
      game.audio.play('se_break', 0.35);
      if (defeated === Math.ceil(TOTAL / 2)) game.fx.popup(defeated + ' / ' + TOTAL, W * 0.5, H * 0.34, { color: C.gold, size: 40 });
      if (defeated >= TOTAL) { ok = true; finished = true; finish(); }
    } else {
      game.feedback.bad(LANES[lane], LANE_ZONE_Y, { text: '', sound: 'se_bad', shake: 0 });
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && !finished && ready <= 0 && hitStop <= 0) {
      if (y < LANE_ZONE_Y - 40) return;
      var lane = x < W / 3 ? 0 : (x < W * 2 / 3 ? 1 : 2);
      tapLane(lane);
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function updateEnemies(dt) {
    for (var i = enemies.length - 1; i >= 0; i--) {
      var e = enemies[i];
      if (e.dead) continue;
      e.y += e.speed * dt;
      if (!e.warned && e.y > KILL_Y1 - 80) { e.warned = true; }
      if (e.y >= HOUSE_Y + 20) {
        e.dead = true;
        missed++;
        hitStop = 0.35;
        shake = 0.3;
        game.feedback.bad(W * 0.5, HOUSE_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        if (missed >= MAX_MISS) { ok = false; finished = true; finish(); }
      }
    }
    enemies = enemies.filter(function(e) { return !e.dead || e.y < HOUSE_Y + 40; });
  }

  function drawEnemies() {
    var activeLane = -1;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.dead) continue;
      var warnBlink = e.warned && Math.floor(game.time.elapsed * 10) % 2 === 0;
      game.draw.sprite(BUG, { '#': warnBlink ? C.bad : C.bugDark }, LANES[e.lane], e.y, 12, { anchor: 'center' });
      if (e.y >= KILL_Y0 && e.y <= KILL_Y1) activeLane = e.lane;
    }
    return activeLane;
  }

  var demo = { t: 0, gx: LANES[1], gy: LANE_ZONE_Y + 90, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { enemies = [{ lane: 1, y: SPAWN_Y, dead: false, warned: false, speed: (W) / 3.0 * 0 + 320 }]; }
    var e = enemies[0];
    if (e && !e.dead) {
      e.y += 320 * dt;
      if (e.y >= KILL_Y0 && e.y <= KILL_Y1 - 60 && !e.warned) {
        e.warned = true;
        demo.gx = LANES[e.lane]; demo.gy = LANE_ZONE_Y + LANE_ZONE_H / 2; demo.press = true;
        e.dead = true;
        game.feedback.good(LANES[e.lane], e.y, { text: 'GOOD', color: C.good });
        game.audio.play('se_break', 0.2);
      }
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (pressFlash > 0) pressFlash -= dt;
    if (state === S.ATTRACT) {
      if (enemies === undefined) initGame();
      bg();
      stepDemo(dt);
      drawEnemies();
      drawLaneButtons(-1, pressFlash);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 46, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.10, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawLaneButtons(-1, 0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 50, ok ? C.good : C.bad);
      txt(defeated + ' / ' + TOTAL, W / 2, H * 0.11, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - defeated) + '匹!', W / 2, H * 0.16, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(defeated, { defeated: defeated, missed: missed });
        else game.end.failure({ defeated: defeated, missed: missed });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      spawnTimer -= dt;
      if (spawnTimer <= 0) { spawnBug(); spawnTimer = spawnInterval; spawnInterval = Math.max(0.62, spawnInterval - 0.05); }
      updateEnemies(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    var activeLane = finished ? -1 : drawEnemies();
    drawLaneButtons(activeLane, pressFlash);

    txt(defeated + ' / ' + TOTAL, W * 0.5, H * 0.045, 30, C.ink);
    game.draw.rect(60, 120, W - 120, 14, '#ffffff', 0.5);
    game.draw.rect(60, 120, (W - 120) * (defeated / TOTAL), 14, C.good);
    for (var m = 0; m < MAX_MISS; m++) {
      game.draw.circle(W - 60 - m * 34, 74, 12, m < missed ? C.bad : '#ffffff88');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.4], ['E4', 0.4], ['G4', 0.4], ['E4', 0.4]], { tempo: 118, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
