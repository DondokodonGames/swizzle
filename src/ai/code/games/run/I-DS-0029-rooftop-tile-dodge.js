// I-DS-0029-rooftop-tile-dodge.js
// 屋根がわら避け — 嵐の屋根の上、迫り落ちてくる瓦を指でぜんまい仕掛けをドラッグしてよける
// 操作: 落ちてくる瓦の影を見て、瓦がない位置までぜんまい仕掛けを指で左右にドラッグする
// 終わり: 制限時間を瓦に当たらず耐えきれば成功。1枚でも当たれば失敗
// @mechanic: dodge
// @theme: storm_rooftop_windup
// 世界観: 嵐の夜の屋根。ぜんまい仕掛けの小さなロボットが、剥がれ落ちる瓦を避けながら煙突まで踏みとどまる
// 残るもの: 正誤(CLEAR/GAME OVER) + 耐えた秒数
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 疑似奥行きの水平ストライプ床、遠近感のある帯グラデーション
  var C = {
    bg: '#141428', bg2: '#0a0a18', roof: '#3a3050', roofLine: '#524470',
    bot: '#d8c840', botDark: '#9a8c26', tile: '#c85a3c', tileShadow: '#000000',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#f0e8f4', ink: '#0a080c',
  };

  var GAME_TITLE = 'TILE DODGE';
  var TIME_LIMIT = 20;
  var LANE_Y = H * 0.80;
  var LANE_X0 = W * 0.15, LANE_X1 = W * 0.85;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var done, endWait, finished, survived, milestoneShown;
  var ready, hitStop, shake;
  var botX, tiles, spawnT, spawnInterval;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BOT_SPRITE = ['.###.', '#####', '.#.#.', '##.##'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 14; i++) {
      var y = H * 0.15 + i * i * 4;
      if (y > H) break;
      game.draw.rect(0, y, W, 3, C.roofLine, 0.4);
    }
    game.draw.rect(0, LANE_Y + 70, W, H - (LANE_Y + 70), C.roof, 1);
  }

  function newTile(x) {
    return { x: x, y: -60, vy: game.random(560, 720), landed: false, warnedAt: 0 };
  }

  function initGame() {
    survived = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    milestoneShown = false;
    botX = W * 0.5; tiles = []; spawnT = 0; spawnInterval = 0.85;
  }

  function moveBot(x) {
    botX = Math.max(LANE_X0, Math.min(LANE_X1, x));
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.05); moveBot(x); } });
  game.onMove(function(x, y) { if (state === S.PLAYING) moveBot(x); });
  game.onRelease(function(x, y) { if (state === S.PLAYING) game.audio.play('se_tap', 0.02); });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.5); else game.audio.play('se_success', 0.5);
    endWait = 1.3;
  }

  function updateTiles(dt) {
    spawnT += dt;
    var elapsedFrac = Math.min(1, survived / TIME_LIMIT);
    var curInterval = spawnInterval - elapsedFrac * 0.35;
    if (spawnT >= curInterval) {
      spawnT = 0;
      tiles.push(newTile(game.random(LANE_X0 + 30, LANE_X1 - 30)));
    }
    for (var i = tiles.length - 1; i >= 0; i--) {
      var t = tiles[i];
      var groundY = LANE_Y;
      var prevY = t.y;
      t.y += t.vy * dt;
      var telegraphStart = groundY - 130;
      if (prevY < telegraphStart && t.y >= telegraphStart && t.warnedAt === 0) {
        t.warnedAt = game.time.elapsed;
        game.audio.play('se_tap', 0.15);
      }
      if (t.y >= groundY) {
        if (Math.abs(t.x - botX) < 74) {
          finished = true; ok = false; hitStop = 0.35;
          game.feedback.bad(botX, LANE_Y, { text: 'HIT' });
          shake = 0.3;
          game.audio.play('se_bad', 0.4);
          finish();
          return;
        }
        tiles.splice(i, 1);
        game.fx.burst(t.x, groundY, { color: C.tileShadow, count: 6, speed: 120 });
      }
    }
  }

  function drawTiles() {
    for (var i = 0; i < tiles.length; i++) {
      var t = tiles[i];
      var groundY = LANE_Y;
      if (t.warnedAt > 0) {
        var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
        var shadowScale = Math.max(0.3, Math.min(1, t.y / groundY));
        if (blink) game.draw.circle(t.x, groundY, 44 * shadowScale, C.tileShadow, 0.35);
      }
      game.draw.rect(t.x - 30, t.y - 14, 60, 28, C.tile, 1);
      game.draw.rect(t.x - 30, t.y - 14, 60, 6, '#ffffff33');
    }
  }

  var demo = { t: 0, gx: W * 0.5, gy: LANE_Y, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { tiles = [{ x: W * 0.5, y: -60, vy: 600, landed: false, warnedAt: 0 }]; botX = W * 0.5; }
    var t = tiles[0];
    if (t) {
      t.y += 600 * dt;
      if (t.y > LANE_Y - 260 && t.warnedAt === 0) t.warnedAt = 1;
      if (t.y > LANE_Y - 240 && demo.gx === W * 0.5) {
        demo.gx = W * 0.28;
      }
      botX += (demo.gx - botX) * Math.min(1, dt * 6);
      if (t.y > LANE_Y) {
        tiles = [];
        demo.gx = W * 0.5;
      }
    }
    demo.gy = LANE_Y;
    demo.press = true;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (tiles === undefined) initGame();
      bg();
      stepDemo(dt);
      drawTiles();
      game.draw.sprite(BOT_SPRITE, { '#': C.bot }, botX, LANE_Y, 15, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy + 130, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + 's' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawTiles();
      game.draw.sprite(BOT_SPRITE, { '#': C.bot }, botX, LANE_Y, 15, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(Math.round(survived) + ' / ' + TIME_LIMIT, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + Math.max(1, Math.round(TIME_LIMIT - survived)) + '秒!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var secs = Math.round(survived * 10) / 10;
        if (ok) game.end.success(secs, { survived: secs }); else game.end.failure({ survived: secs });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      survived += dt;
      if (!milestoneShown && survived >= TIME_LIMIT / 2) {
        milestoneShown = true;
        game.fx.popup('HALFWAY!', botX, LANE_Y - 200, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.4);
      }
      updateTiles(dt);
      if (survived >= TIME_LIMIT) {
        survived = TIME_LIMIT; finished = true; ok = true; hitStop = 0.12;
        game.feedback.good(botX, LANE_Y, { text: 'SAFE!', color: C.good });
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawTiles();
    if (!finished || ok) game.draw.sprite(BOT_SPRITE, { '#': C.bot }, botX, LANE_Y, 15, { anchor: 'center' });

    txt(Math.min(TIME_LIMIT, Math.round(survived)) + ' / ' + TIME_LIMIT, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.min(1, survived / TIME_LIMIT), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
