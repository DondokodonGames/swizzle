// J-N6424-0027-windup-bumper-clear.js
// ゼンマイ・バンパークリア — おもちゃ箱の盤上で相手のゼンマイ車を次々と縁から弾き出す
// 操作: 押し出したい方向へホールドで力をため、離した瞬間に自分の車が突進して相手車を弾き飛ばす
// 終わり: 規定台数を盤外へ弾き出せれば成功。自分が縁に近づきすぎて弾かれる/時間切れで失敗
// @mechanic: push_out
// @theme: windup_bumper_arena
// 世界観: おもちゃ箱の中で目覚めたゼンマイ仕掛けのバンパーカーが、盤上に並ぶ相手のおもちゃ車を次々と縁から弾き出していく
// 残るもの: 正誤(CLEAR/GAME OVER) + 弾き出した台数
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: ブロック状の面、影は横ストリップ1本で表現
  var C = {
    bg: '#3a2c1a', bg2: '#1f160c', arena: '#e8c98a', arenaEdge: '#8a6a3a',
    player: '#ff5a3d', playerDark: '#a83a20', rival: '#3d7dff', rivalDark: '#1d4fa0',
    good: '#39c96a', bad: '#ff4d5e', gold: '#ffd400', ink: '#2a1c0c', white: '#ffffff',
  };

  var GAME_TITLE = 'BUMPER CLEAR';
  var ARENA_CX = W * 0.5, ARENA_CY = H * 0.48, ARENA_R = 420;
  var NEED = 4;
  var MAX_TIME = 17;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#1f160c', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CAR = ['.##.', '####', '####', '.##.'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, C.gold, pulse * 0.15);
    game.draw.circle(ARENA_CX, ARENA_CY, ARENA_R, C.arenaEdge);
    game.draw.circle(ARENA_CX, ARENA_CY, ARENA_R - 26, C.arena);
  }

  var player, rivals, cleared, chargeDir, charging, chargeT, roundClock, halfCalled;
  var done, endWait, finished, ready, hitStop, shake;

  function spawnRivals() {
    rivals = [];
    var n = NEED;
    for (var i = 0; i < n; i++) {
      var ang = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      var r = 160 + Math.random() * 140;
      rivals.push({ x: ARENA_CX + Math.cos(ang) * r, y: ARENA_CY + Math.sin(ang) * r, alive: true, vx: 0, vy: 0 });
    }
  }

  function initGame() {
    player = { x: ARENA_CX, y: ARENA_CY };
    spawnRivals();
    cleared = 0; roundClock = 0; halfCalled = false;
    charging = false; chargeT = 0; chargeDir = { x: 0, y: -1 };
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function drawScene() {
    for (var i = 0; i < rivals.length; i++) {
      var r = rivals[i];
      if (!r.alive) continue;
      var bob = Math.sin(game.time.elapsed * 3 + i) * 4;
      game.draw.sprite(CAR, { '#': C.rival }, r.x, r.y + bob, 12, { anchor: 'center' });
    }
    var chargeGlow = charging ? Math.min(1, chargeT / 0.5) : 0;
    if (charging) {
      game.draw.line(player.x, player.y, player.x + chargeDir.x * 90, player.y + chargeDir.y * 90, C.gold, 6 + chargeGlow * 6);
    }
    game.draw.circle(player.x, player.y, 30 + chargeGlow * 10, C.playerDark, 0.5);
    game.draw.sprite(CAR, { '#': C.player }, player.x, player.y, 13, { anchor: 'center' });
  }

  function launchPush(x, y) {
    if (finished || ready > 0 || charging) return;
    var dx = x - player.x, dy = y - player.y;
    var len = Math.hypot(dx, dy) || 1;
    chargeDir = { x: dx / len, y: dy / len };
    charging = true; chargeT = 0;
    game.audio.play('se_tap', 0.15);
  }

  function releasePush() {
    if (!charging) return;
    charging = false;
    var power = 620 + Math.min(1, chargeT / 0.5) * 420;
    player.vx = chargeDir.x * power; player.vy = chargeDir.y * power;
    game.audio.play('se_jump', 0.3);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) {
      if (!charging) launchPush(x, y);
      else releasePush();
    }
  });

  function finish() {
    if (state === S.ATTRACT || done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function stepPhysics(dt) {
    if (charging) chargeT += dt;
    if (player.vx || player.vy) {
      player.x += player.vx * dt; player.y += player.vy * dt;
      player.vx *= Math.max(0.45, 1 - 0.5 * dt); player.vy *= Math.max(0.45, 1 - 0.5 * dt);
      for (var i = 0; i < rivals.length; i++) {
        var r = rivals[i];
        if (!r.alive) continue;
        var d = Math.hypot(player.x - r.x, player.y - r.y);
        if (d < 70) {
          var nx = (r.x - player.x) / (d || 1), ny = (r.y - player.y) / (d || 1);
          r.vx = nx * 900; r.vy = ny * 900;
          game.audio.play('se_break', 0.3);
          game.fx.shake(6, 0.1);
        }
      }
      var distFromCenter = Math.hypot(player.x - ARENA_CX, player.y - ARENA_CY);
      if (distFromCenter > ARENA_R - 30) {
        finished = true; ok = false; hitStop = 0.35; shake = 0.3;
        game.fx.flash(C.bad, 0.2);
        game.feedback.bad(player.x, player.y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
        return;
      }
    }
    for (var j = 0; j < rivals.length; j++) {
      var rv = rivals[j];
      if (!rv.alive) continue;
      if (rv.vx || rv.vy) {
        rv.x += rv.vx * dt; rv.y += rv.vy * dt;
        rv.vx *= Math.max(0.5, 1 - 0.6 * dt); rv.vy *= Math.max(0.5, 1 - 0.6 * dt);
        var dc = Math.hypot(rv.x - ARENA_CX, rv.y - ARENA_CY);
        if (dc > ARENA_R) {
          rv.alive = false; cleared++;
          game.feedback.good(rv.x, rv.y, { text: 'GOOD', color: C.good });
          game.fx.burst(rv.x, rv.y, { color: C.gold, count: 14, speed: 320 });
          game.audio.play('se_coin', 0.35);
          if (!halfCalled && cleared >= Math.ceil(NEED / 2)) { halfCalled = true; game.fx.popup('NICE', rv.x, rv.y - 60, { color: C.gold, size: 30 }); }
          if (cleared >= NEED) {
            finished = true; ok = true; hitStop = 0.3;
            game.feedback.good(player.x, player.y, { text: 'CLEAR', color: C.good });
            game.audio.play('se_success', 0.5);
            finish();
          }
        }
      }
    }
  }

  var demo = { t: 0, gx: ARENA_CX, gy: ARENA_CY, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) resetDemo();
    stepPhysics(dt);
    var target = null;
    for (var i = 0; i < rivals.length; i++) { if (rivals[i].alive) { target = rivals[i]; break; } }
    if (target) {
      var dx = target.x - player.x, dy = target.y - player.y;
      var len = Math.hypot(dx, dy) || 1;
      demo.gx = player.x + (dx / len) * 90; demo.gy = player.y + (dy / len) * 90;
      var phase = cyc % 1.2;
      demo.press = phase < 0.5;
      if (phase < 0.02 && !charging) launchPush(target.x, target.y);
      if (phase >= 0.5 && phase < 0.52 && charging) releasePush();
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (player === undefined) initGame();
      stepDemo(dt);
      bg();
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 44, ok ? C.good : C.bad);
      txt(cleared + ' / ' + NEED, W / 2, H * 0.13, 26, C.gold);
      if (!ok) txt('あと' + Math.max(0, NEED - cleared) + '台!', W / 2, H * 0.17, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, total: NEED });
        else game.end.failure({ cleared: cleared, total: NEED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepPhysics(dt);
      roundClock += dt;
      if (roundClock >= MAX_TIME) {
        finished = true; ok = false;
        game.feedback.bad(player.x, player.y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();
    txt(cleared + ' / ' + NEED, W / 2, H * 0.06, 28, C.ink);
    var tbW = W - 120;
    var pctLeft = Math.max(0, 1 - roundClock / MAX_TIME);
    game.draw.rect(60, 150, tbW, 16, '#ffffff', 0.3);
    game.draw.rect(60, 150, tbW * pctLeft, 16, pctLeft < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 50, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['F3', 0.25], ['A3', 0.25], ['C4', 0.25], ['F4', 0.45]], { tempo: 130, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
