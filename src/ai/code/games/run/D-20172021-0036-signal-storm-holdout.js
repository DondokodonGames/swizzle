// D-20172021-0036-signal-storm-holdout.js
// シグナルストーム・ホールドアウト — 収縮していく電磁ストームの圏内に留まりながら降り注ぐ残骸を移動でかわし続ける
// 操作: 画面を押さえたまま指を動かし、圏内に留まりつつ降ってくる残骸を避け続ける
// 終わり: 制限時間内生き延びれば成功。残骸に当たる/圏外に長く留まれば失敗
// @mechanic: dodge
// @theme: landing_zone_storm_holdout
// 世界観: 荒野の着地地点に降り立った回収班の一人が、収縮していく電磁ストームの圏内に留まりながら降り注ぐ残骸をかわし切る生存訓練
// 残るもの: 正誤(CLEAR/GAME OVER) + 生き延びた秒数
// スタイル: HYPERCASUAL 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 明るい単純グラデーション、太い輪郭、影は柔らかく1段のみ
  var C = {
    bg: '#3ad0c8', bg2: '#1c8ca0', zone: '#eafdfa', zoneEdge: '#ff5a7a',
    player: '#ffd400', playerDark: '#a37c00', debris: '#4a3a2c', debrisDark: '#241c14',
    good: '#2bd67b', bad: '#ff4d5e', gold: '#ffd400', white: '#ffffff', ink: '#0c1414',
  };

  var GAME_TITLE = 'STORM HOLDOUT';
  var TIME_LIMIT = 20;
  var CX = W * 0.5, CY = H * 0.46;
  var R0 = 430, R1 = 210;
  var FIELD_TOP = H * 0.18, FIELD_BOT = H * 0.76;
  var OUT_MAX = 1.1;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var survived, done, endWait, finished;
  var ready, hitStop, shake;
  var px, py, debris, spawnT, outsideT, halfCalled;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PLAYER_SPRITE = ['.##.', '####', '.##.', '#..#'];
  var DEBRIS_SPRITE = ['#.#', '.#.', '#.#'];

  function zoneR() { return R0 - (R0 - R1) * Math.min(1, survived / TIME_LIMIT); }

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.3);
    var r = zoneR();
    game.draw.circle(CX, CY, r, C.zone, 0.28);
    game.draw.circle(CX, CY, r, C.zoneEdge, 0.5);
  }

  function initGame() {
    survived = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    px = CX; py = CY; debris = []; spawnT = 0.6; outsideT = 0; halfCalled = false;
  }

  function spawnDebris() {
    var x = W * 0.16 + Math.random() * W * 0.68;
    debris.push({ x: x, y: FIELD_TOP - 30 });
  }

  var DEBRIS_SPEED = H * 0.62;

  function drawDebris() {
    for (var i = 0; i < debris.length; i++) {
      var d = debris[i];
      game.draw.circle(d.x, d.y, 32, C.debrisDark, 0.9);
      game.draw.sprite(DEBRIS_SPRITE, { '#': C.debris }, d.x, d.y, 14, { anchor: 'center' });
    }
  }

  function drawPlayer() {
    var bob = Math.sin(game.time.elapsed * 7) * 4;
    var out = Math.hypot(px - CX, py - CY) > zoneR();
    game.draw.circle(px, py, 34, out ? C.bad : C.playerDark, 0.6);
    game.draw.sprite(PLAYER_SPRITE, { '#': C.player }, px, py + bob, 16, { anchor: 'center' });
  }

  function movePlayer(x, y) {
    px = Math.max(W * 0.06, Math.min(W * 0.94, x));
    py = Math.max(FIELD_TOP - 10, Math.min(FIELD_BOT + 10, y));
  }

  game.onPress(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) { game.audio.play('se_tap', 0.04); movePlayer(x, y); }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    if (Math.random() < 0.06) game.audio.play('se_tap', 0.02);
    movePlayer(x, y);
  });

  function crash() {
    ok = false; finished = true;
    hitStop = 0.32; shake = 0.32;
    game.feedback.bad(px, py, { text: 'MISS' });
    game.audio.play('se_bad', 0.45);
    finish();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: CY, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.0;
    if (cyc < dt || demo.t <= dt) { survived = 0; debris = []; spawnT = 0.5; px = CX; py = CY; }
    survived = cyc;
    spawnT -= dt;
    if (spawnT <= 0) { spawnDebris(); spawnT = 0.65; }
    for (var i = debris.length - 1; i >= 0; i--) {
      debris[i].y += DEBRIS_SPEED * dt;
      if (Math.abs(debris[i].y - py) < 140 && Math.abs(debris[i].x - px) < 90) {
        px += (px < debris[i].x ? -1 : 1) * 220 * dt * 6;
        px = Math.max(W * 0.2, Math.min(W * 0.8, px));
      }
      if (debris[i].y > FIELD_BOT + 40) debris.splice(i, 1);
    }
    demo.gx = px; demo.gy = py; demo.press = true;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (debris === undefined) initGame();
      bg();
      stepDemo(dt);
      drawDebris();
      drawPlayer();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 36, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best + 's' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawDebris();
      drawPlayer();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(Math.floor(survived) + ' / ' + TIME_LIMIT, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + Math.max(0, Math.ceil(TIME_LIMIT - survived)) + '秒!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(Math.floor(survived), { survived: Math.floor(survived) });
        else game.end.failure({ survived: Math.floor(survived) });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      survived += dt;
      if (!halfCalled && survived >= TIME_LIMIT * 0.5) {
        halfCalled = true;
        game.fx.popup('あと' + Math.ceil(TIME_LIMIT * 0.5) + '秒!', px, py - 200, { color: C.gold, size: 32 });
        game.audio.play('se_milestone', 0.3);
      }
      spawnT -= dt;
      var interval = Math.max(0.4, 0.75 - survived * 0.015);
      if (spawnT <= 0) { spawnDebris(); spawnT = interval; }
      var out = Math.hypot(px - CX, py - CY) > zoneR();
      if (out) { outsideT += dt; if (outsideT >= OUT_MAX) { crash(); } }
      else outsideT = Math.max(0, outsideT - dt * 2);
      for (var k = debris.length - 1; k >= 0; k--) {
        debris[k].y += DEBRIS_SPEED * dt;
        if (!finished && game.hit.circle(px, py, 30, debris[k].x, debris[k].y, 28)) { crash(); break; }
        if (debris[k].y > FIELD_BOT + 40) debris.splice(k, 1);
      }
      if (!finished && survived >= TIME_LIMIT) {
        ok = true; finished = true;
        game.feedback.good(px, py, { text: 'CLEAR', color: C.good });
        game.fx.burst(px, py, { color: C.gold, count: 22, speed: 400 });
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawDebris();
    if (!finished || ok) drawPlayer();

    txt(Math.floor(survived) + ' / ' + TIME_LIMIT, W / 2, H * 0.06, 30, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.min(1, survived / TIME_LIMIT), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D3', 0.2], ['F3', 0.2], ['A3', 0.2], ['D4', 0.4]], { tempo: 118, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
