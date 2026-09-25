// D-20172021-0001-tube-slide-sprint.js
// チューブスライドスプリント — 巨大ウォータースライドを浮き輪で滑走し、迫る仕切り板を避けてゴールへ先着する
// 操作: 左右にスワイプして3本のレーンを移動し、迫る仕切り板を避ける
// 終わり: 規定回数(5回)の仕切り板を全て避けきればゴール成功。1回でもぶつかれば失敗
// @mechanic: camera_run
// @theme: waterpark_tube_race
// 世界観: 夏のウォーターパーク、巨大チューブスライドを浮き輪で滑り降りる競走者。2台のライバル浮き輪と並走しながら仕切り板をレーン移動でかわしゴールを目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + かわした仕切り板の数
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 疑似奥行きの縞状レーン、遠近で色を明滅
  var STYLE = { bg: ['#1a6fb0', '#0a3a66'], main: ['#ffe066', '#e0a020'], accent: ['#ff5a5a', '#5affc0'] };
  var C = {
    sky1: STYLE.bg[0], sky2: STYLE.bg[1], lane: '#2a8fd0', laneEdge: '#8ad4ff',
    tube: STYLE.main[0], tubeDark: STYLE.main[1], rival: '#c0e0ff', rivalDark: '#7ab0dc',
    gold: STYLE.accent[0], good: STYLE.accent[1], bad: '#ff4d4d', white: '#ffffff', ink: '#04213a',
  };

  var GAME_TITLE = 'TUBE SPRINT';
  var TOTAL = 5;
  var LANES = [W * 0.28, W * 0.5, W * 0.72];
  var PY = H * 0.78;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var TUBER_SPRITE = ['.##.', '####', '.##.'];
  var RIVAL_SPRITE = ['.##.', '####'];

  function bg() {
    var e = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky1], [1, C.sky2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(e * 1.3));
    for (var i = 0; i < LANES.length + 1; i++) {
      var lx = W * (0.14 + i * 0.36);
      game.draw.line(lx, H * 0.1, lx, H * 0.95, C.laneEdge, 5);
    }
    var scroll = (e * 260) % 120;
    for (var s = -1; s < 16; s++) {
      game.draw.rect(0, s * 120 - scroll, W, 6, C.laneEdge, 0.15);
    }
  }

  function newBar() {
    var laneIdx = Math.floor(Math.random() * 3);
    return { t: 0, dur: Math.max(1.1, 1.7 - round * 0.1), lane: laneIdx, telegraphed: false, resolved: false };
  }

  var round, bar, passed, playerLane, laneX, done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    round = 0; passed = 0; ok = false; playerLane = 1; laneX = LANES[1];
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    bar = newBar();
  }

  function moveLane(dir) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    var nl = playerLane + dir;
    if (nl < 0 || nl > 2) { game.feedback.bad(laneX, PY, { text: 'MISS' }); game.audio.play('se_tap', 0.2); return; }
    playerLane = nl;
    game.audio.play('se_tap', 0.25);
  }

  function resolveBar() {
    if (!bar || bar.resolved || ready > 0 || done || finished) return;
    bar.resolved = true;
    var correct = playerLane !== bar.lane;
    hitStop = correct ? 0.1 : 0.35;
    if (correct) {
      passed++;
      game.feedback.good(laneX, PY, { text: 'PASS', color: C.good });
      game.fx.burst(laneX, PY, { color: C.gold, count: 14, speed: 340 });
      game.audio.play('se_good', 0.4);
      if (passed === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', W / 2, PY - 220, { color: C.gold, size: 40 });
    } else {
      game.feedback.bad(laneX, PY, { text: 'HIT' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
    }
    if (!correct) { ok = false; finished = true; finish(); return; }
    if (passed >= TOTAL) { ok = true; finished = true; finish(); return; }
    round++;
    bar = newBar();
  }

  game.onSwipe(function(dir) {
    if (dir === 'left') moveLane(-1);
    else if (dir === 'right') moveLane(1);
  });

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

  function drawBar(b) {
    if (!b) return;
    var p = Math.min(1, b.t / b.dur);
    var y = H * 0.14 + (PY - H * 0.14 - 30) * p;
    if (p > 0.5) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) game.draw.rect(LANES[b.lane] - 70, y - 90, 140, 14, C.bad, 0.5);
    }
    game.draw.rect(LANES[b.lane] - 70, y - 20, 140, 40, C.bad);
    game.draw.rect(LANES[b.lane] - 70, y - 20, 140, 10, C.white, 0.6);
  }

  var demo = { t: 0, gx: LANES[1], gy: H * 0.86, press: false, lastSwipe: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    if (round === undefined || round === null) initGame();
    if (!bar) { bar = newBar(); bar.dur = 1.5; round = 0; }
    bar.t += dt;
    laneX += (LANES[playerLane] - laneX) * Math.min(1, dt * 6);
    var p = bar.t / bar.dur;
    if (p > 0.5 && p < 0.62 && !bar.telegraphed) {
      bar.telegraphed = true;
      var targetLane = bar.lane === 1 ? (Math.random() < 0.5 ? 0 : 2) : 1;
      var dir = targetLane > playerLane ? 1 : -1;
      demo.gx = laneX + dir * 260; demo.press = true;
      playerLane = targetLane;
      game.feedback.good(laneX, PY, { text: 'PASS', color: C.good });
      game.audio.play('se_good', 0.25);
    }
    if (p > 0.68) demo.press = false;
    if (p >= 1) { bar = null; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      game.draw.sprite(RIVAL_SPRITE, { '#': C.rivalDark }, LANES[0], PY - 40, 16, { anchor: 'center' });
      game.draw.sprite(RIVAL_SPRITE, { '#': C.rival }, LANES[2], PY - 60, 16, { anchor: 'center' });
      drawBar(bar);
      game.draw.sprite(TUBER_SPRITE, { '#': C.tube }, laneX, PY, 20, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      game.draw.sprite(TUBER_SPRITE, { '#': ok ? C.good : C.bad }, laneX, PY, 20, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(passed + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - passed) + '枚!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(passed, { passed: passed, total: TOTAL });
        else game.end.failure({ passed: passed, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      bar.t += dt;
      if (bar.t / bar.dur >= 1 && !bar.resolved) resolveBar();
    }
    laneX += (LANES[playerLane] - laneX) * Math.min(1, dt * 8);
    if (shake > 0) shake -= dt;

    bg();
    game.draw.sprite(RIVAL_SPRITE, { '#': C.rivalDark }, LANES[0], PY - 40, 16, { anchor: 'center' });
    game.draw.sprite(RIVAL_SPRITE, { '#': C.rival }, LANES[2], PY - 60, 16, { anchor: 'center' });
    if (!finished) drawBar(bar);
    game.draw.sprite(TUBER_SPRITE, { '#': C.tube }, laneX, PY, 20, { anchor: 'center' });

    txt(passed + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (passed / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.25], ['B4', 0.25], ['D5', 0.25], ['G5', 0.5]], { tempo: 140, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
