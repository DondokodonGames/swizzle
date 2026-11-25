// D-20092012-0007-spring-tower-ascent.js
// スプリングタワー・アセント — バネ脚の小さな探検者が自動で跳ね上がり続け、崩れる足場の塔を上る
// 操作: 跳ぶ瞬間に画面の左右どちらかを押さえていると、その方向の足場へ流れて着地する。放せば直進で着地
// 終わり: 規定段数(7段)を跳び継いで頂上に届けば成功。足場を外して落下したら失敗
// @mechanic: camera_climb
// @theme: spring_tower_ascent
// 世界観: 雲の上にそびえる古い観測塔。バネ脚の探検者が崩れゆく足場を一段ずつ跳び渡り、てっぺんの鐘を目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達した段数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 空グラデ+遠景シルエット+近景の3層、大きめキャラ、暗色輪郭+ハイライト
  var C = {
    skyTop: '#3a5fb8', skyBot: '#8fc4e8', farTower: '#26407a', nearPlat: '#5a3d2a',
    platEdge: '#8a6440', platGood: '#7fce4a', platEdgeGood: '#4f9c2a',
    body: '#e8a24a', accent: '#ffd94a', good: '#4dff8a', bad: '#ff4d5e',
    gold: '#ffe14a', white: '#fff8ec', ink: '#1a1008',
  };

  var GAME_TITLE = 'SPRING TOWER';
  var TOTAL = 7;
  var CX = W * 0.5;
  var LANE_STEP = 260;
  var GRAV = 3200, JUMP_V = -1250;
  var FLIGHT = (2 * -JUMP_V) / GRAV; // 0.78125s
  var DRIFT_SPEED = LANE_STEP / FLIGHT;
  var GAP = 0.28; // 着地後、次に跳ぶまでの間

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var HERO = ['.##.', '####', '.##.', '#..#'];
  var HERO2 = ['.##.', '####', '#.##', '.##.'];

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg(camY) {
    game.draw.gradient(0, H, [[0, C.skyTop], [1, C.skyBot]]);
    for (var i = 0; i < 4; i++) {
      var yy = ((i * 420 - camY * 0.3) % 2000 + 2000) % 2000 - 400;
      game.draw.rect(W * 0.5 - 90, yy, 180, 500, C.farTower, 0.35);
    }
  }

  var PLATS;
  function buildPlats() {
    PLATS = [];
    var laneIdx = 1; // 0=left,1=center,2=right
    var y = H * 0.86;
    for (var i = 0; i <= TOTAL; i++) {
      var x = CX + (laneIdx - 1) * LANE_STEP;
      PLATS.push({ x: x, y: y, lane: laneIdx });
      var step = i % 3 === 1 ? 0 : (Math.random() < 0.5 ? -1 : 1);
      laneIdx = Math.max(0, Math.min(2, laneIdx + step));
      y -= 190;
    }
  }

  var lvl, camY, heroX, heroY, vel, drift, anim, done, endWait, finished;
  var ready, hitStop, shake, milestoneDone, airborne, bounceTimer, inputDir;

  function initGame() {
    buildPlats();
    lvl = 0; camY = 0; heroX = PLATS[0].x; heroY = PLATS[0].y - 70;
    vel = 0; drift = 0; anim = 0; airborne = false; bounceTimer = 0; inputDir = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneDone = false;
  }

  game.onPress(function() { game.audio.play('se_tap', 0.05); });

  function launch(dir) {
    if (lvl >= TOTAL) return;
    lvl++;
    drift = dir;
    vel = JUMP_V;
    anim = 0.3;
    airborne = true;
    game.audio.play('se_jump', 0.35);
    if (lvl === Math.ceil(TOTAL / 2) && !milestoneDone) {
      milestoneDone = true;
      game.fx.popup('HALFWAY!', CX, H * 0.4, { color: C.gold, size: 40 });
      game.audio.play('se_milestone', 0.4);
    }
  }

  function checkLanding() {
    var target = PLATS[lvl];
    var dx = Math.abs(heroX - target.x);
    if (dx <= 90) {
      game.feedback.good(heroX, heroY, { text: lvl >= TOTAL ? 'CLEAR' : 'GOOD', color: C.good, count: lvl >= TOTAL ? 10 : 4 });
      if (lvl >= TOTAL) { ok = true; finished = true; hitStop = 0.15; finish(); }
      else { bounceTimer = GAP; }
    } else {
      hitStop = 0.35; shake = 0.3;
      game.feedback.bad(heroX, heroY, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function updatePhysics(dt, dirSample) {
    if (!finished) {
      if (airborne) {
        vel += GRAV * dt;
        heroY += vel * dt;
        heroX += drift * DRIFT_SPEED * dt;
        var target = PLATS[lvl];
        if (vel > 0 && heroY >= target.y - 70) {
          heroY = target.y - 70; heroX = drift === 0 ? PLATS[lvl - 1].x : PLATS[lvl - 1].x + drift * LANE_STEP;
          vel = 0; drift = 0; airborne = false;
          checkLanding();
        }
      } else if (bounceTimer > 0) {
        bounceTimer -= dt;
        if (bounceTimer <= 0 && !finished) launch(dirSample());
      } else if (lvl === 0 && !finished) {
        launch(dirSample());
      }
    }
    camY = Math.max(0, PLATS[Math.min(lvl, TOTAL)].y - H * 0.7) * -1;
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false, dir: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; }
    updatePhysics(dt, function() {
      var next = PLATS[lvl + 1];
      var d = next && PLATS[lvl] ? next.lane - PLATS[lvl].lane : 0;
      demo.dir = d;
      return d;
    });
    demo.gx = heroX + demo.dir * 90;
    demo.gy = airborne ? heroY - 40 : heroY + camY - 120;
    demo.press = airborne && demo.dir !== 0;
  }

  function playerDir() {
    var pressing = game.input.pressing;
    if (!pressing) return 0;
    return game.input.x < CX ? -1 : 1;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (lvl === undefined) initGame();
      bg(camY);
      stepDemo(dt);
      drawPlats();
      drawHero();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg(camY);
      drawPlats();
      drawHero();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(lvl + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - lvl) + '段!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(lvl, { level: lvl, total: TOTAL });
        else game.end.failure({ level: lvl, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else {
      updatePhysics(dt, playerDir);
    }
    if (shake > 0) shake -= dt;

    bg(camY);
    drawPlats();
    drawHero();

    var dirNow = playerDir();
    if (dirNow !== 0 && !finished && ready <= 0) {
      game.draw.text(dirNow < 0 ? '◄' : '►', CX + dirNow * 220, H * 0.6, { size: 60, color: C.accent, align: 'center', bold: true });
    }

    txt(lvl + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (lvl / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  function drawPlats() {
    for (var i = 0; i <= TOTAL; i++) {
      var p = PLATS[i];
      var sy = p.y + camY;
      if (sy < -100 || sy > H + 100) continue;
      var edge = i === TOTAL ? C.platEdgeGood : C.platEdge;
      var fill = i === TOTAL ? C.platGood : C.nearPlat;
      game.draw.rect(p.x - 110, sy, 220, 26, edge);
      game.draw.rect(p.x - 106, sy + 4, 212, 14, fill);
      if (i === TOTAL) game.draw.circle(p.x, sy - 50, 30, C.gold, 0.8 + Math.sin(game.time.elapsed * 4) * 0.15);
    }
  }

  function drawHero() {
    var sy = heroY + camY;
    var frame = anim > 0.15 ? HERO2 : HERO;
    var bob = Math.sin(game.time.elapsed * 3) * (!airborne ? 6 : 0);
    game.draw.sprite(frame, { '#': C.body }, heroX, sy + bob, 16, { anchor: 'center' });
    if (anim > 0) anim -= 0.016;
  }

  game.onStart(function() {
    game.audio.melody([['C4', 0.4], ['E4', 0.4], ['G4', 0.4], ['C5', 0.8]], { tempo: 140, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
