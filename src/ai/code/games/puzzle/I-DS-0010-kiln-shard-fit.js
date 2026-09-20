// I-DS-0010-kiln-shard-fit.js
// キルンシャードフィット — 2つに割れた陶片を指でつまんで動かし、継ぎ目にぴったり貼り合わせる
// 操作: 離れた場所にある陶片を指で押さえてドラッグし、固定された片方の継ぎ目までぴったり運んで合わせる
// 終わり: 制限時間内に陶片を4組すべて継ぎ合わせれば成功。時間切れなら失敗
// @mechanic: gap_fit
// @theme: kiln_repair_workshop
// 世界観: 窯元の修復工房。職人が割れた器の陶片を指でつまみ、継ぎ目の形にぴったり合わせて次々と接ぎ直す
// 残るもの: 正誤(CLEAR/GAME OVER) + 継ぎ合わせた組数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 先に一回り大きい黒で輪郭、内側は明・暗の2色だけ、中間調を作らない
  var C = {
    bg: '#5a3a2a', bg2: '#3a2216', bench: '#7a5236', benchDark: '#4a2e1a',
    shardLight: '#e8c07a', shardDark: '#b8862a', outline: '#000000',
    seam: '#ffdf6a', good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#fff6e6', ink: '#140a04',
  };

  var GAME_TITLE = 'SHARD FIT';
  var DUR = 18;
  var TOTAL = 4;
  var SNAP_R = 56;
  var ANCHORS = [
    { x: W * 0.32, y: H * 0.34 },
    { x: W * 0.68, y: H * 0.30 },
    { x: W * 0.30, y: H * 0.50 },
    { x: W * 0.68, y: H * 0.48 },
  ];
  var LOOSE_SPAWNS = [
    { x: W * 0.20, y: H * 0.66 },
    { x: W * 0.80, y: H * 0.62 },
    { x: W * 0.24, y: H * 0.72 },
    { x: W * 0.76, y: H * 0.68 },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var SHARD_A = ['.####', '######', '#####.', '####..'];
  var SHARD_B = ['####.', '######', '.#####', '..####'];

  var fitted, round, fixedPos, targetPos, looseX, looseY, dragging, timeLeft, milestoneShown;
  var done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CRAFTSMAN = ['.##.', '####', '.##.', '#.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, H * 0.78, W, H * 0.22, C.bench);
    game.draw.rect(0, H * 0.78, W, 8, C.benchDark);
    game.draw.sprite(CRAFTSMAN, { '#': C.white }, W * 0.5, H * 0.90, 14, { anchor: 'center' });
  }

  function anchorFor(r) { return ANCHORS[r % ANCHORS.length]; }
  function spawnFor(r) { return LOOSE_SPAWNS[r % LOOSE_SPAWNS.length]; }

  function newRound() {
    fixedPos = anchorFor(round);
    targetPos = { x: fixedPos.x + 96, y: fixedPos.y };
    var s = spawnFor(round);
    looseX = s.x; looseY = s.y; dragging = false;
  }

  function initGame() {
    fitted = 0; round = 0; timeLeft = DUR; milestoneShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    newRound();
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    if (Math.hypot(x - looseX, y - looseY) < 90) {
      dragging = true;
      game.audio.play('se_tap', 0.1);
    }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !dragging || finished) return;
    looseX = x; looseY = y;
  });
  game.onRelease(function() { dragging = false; });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawShard(x, y, bitmap, dragged) {
    game.draw.sprite(bitmap, { '#': C.outline }, x + 4, y + 4, 15, { anchor: 'center' });
    game.draw.sprite(bitmap, { '#': dragged ? C.shardLight : C.shardDark }, x, y, 15, { anchor: 'center' });
  }

  function stepFit(dt) {
    if (dragging) {
      var d = Math.hypot(looseX - targetPos.x, looseY - targetPos.y);
      if (d < SNAP_R) {
        fitted++;
        hitStop = 0.1;
        looseX = targetPos.x; looseY = targetPos.y; dragging = false;
        game.feedback.good(targetPos.x, targetPos.y, { text: fitted + '/' + TOTAL, color: C.good });
        game.fx.burst(targetPos.x, targetPos.y, { color: C.gold, count: 16, speed: 340 });
        game.audio.play('se_good', 0.4);
        if (!milestoneShown && fitted >= Math.ceil(TOTAL / 2)) {
          milestoneShown = true;
          game.fx.popup('HALFWAY!', W / 2, H * 0.18, { color: C.gold, size: 36 });
          game.audio.play('se_milestone', 0.4);
        }
        if (fitted >= TOTAL) { ok = true; finished = true; finish(); return; }
        round++;
        newRound();
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      drawShard(fixedPos.x, fixedPos.y, SHARD_A, false);
      game.draw.circle(targetPos.x, targetPos.y, SNAP_R, C.seam, 0.3);
      drawShard(looseX, looseY, SHARD_B, demo.press);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.96, 36, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.96, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawShard(fixedPos.x, fixedPos.y, SHARD_A, false);
      drawShard(looseX, looseY, SHARD_B, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(fitted + ' / ' + TOTAL, W / 2, H * 0.12, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - fitted) + '組!', W / 2, H * 0.16, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(fitted, { fitted: fitted, total: TOTAL }); else game.end.failure({ fitted: fitted, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      stepFit(dt);
      if (timeLeft <= 0) {
        ok = false; finished = true; hitStop = 0.3;
        game.feedback.bad(targetPos.x, targetPos.y, { text: 'MISS' });
        shake = 0.25;
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawShard(fixedPos.x, fixedPos.y, SHARD_A, false);
    game.draw.circle(targetPos.x, targetPos.y, SNAP_R, C.seam, 0.25);
    drawShard(looseX, looseY, SHARD_B, dragging);

    txt(fitted + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.4);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / DUR), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.62, 56, C.gold);
  });

  var demo = { t: 0, gx: LOOSE_SPAWNS[0].x, gy: LOOSE_SPAWNS[0].y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { round = 0; fitted = 0; milestoneShown = false; newRound(); }
    var p = Math.min(1, cyc / 2.4);
    demo.press = cyc < 2.4;
    var s = spawnFor(round);
    looseX = s.x + (targetPos.x - s.x) * p;
    looseY = s.y + (targetPos.y - s.y) * p;
    demo.gx = looseX; demo.gy = looseY;
  }

  game.onStart(function() {
    game.audio.melody([['C4', 0.3], ['E4', 0.3], ['G4', 0.3], ['C5', 0.6]], { tempo: 106, wave: 'triangle', volume: 0.05, loop: true, bass: [['C3', 1], ['G2', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
