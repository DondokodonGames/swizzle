// I-Wii-0002-crosswind-arrow-judge.js
// 横風矢読み — 横に構えた弓を風向きの合図で判断し、正しい的ゾーンをタップして射る
// 操作: 吹き流しが示す風向きを見て、風上側にずれた的ゾーン(左/中/右)を選んでタップする
// 終わり: 規定本数(5本)全てで正しいゾーンを選べれば成功。1本でも外せば失敗
// @mechanic: judge
// @theme: cliffside_archery_range
// 世界観: 崖の上の弓場。弓を横に構えた射手が、揺れる吹き流しで風向きを読み、狙うべき的を瞬時に判断する
// 残るもの: 正誤(CLEAR/GAME OVER) + 命中本数
// スタイル: 70s VECTOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s VECTOR: 細い輪郭線、単色塗りのフラットな幾何、彩度低め
  var C = {
    bg: '#e8dcc0', bg2: '#d4c49c', cliff: '#8a7458', sky: '#c8dce0',
    target: '#c85a3c', targetRing: '#f0e8d0', flag: '#3c7a5a',
    good: '#3c8a4a', bad: '#c8402c', gold: '#d8a83a', white: '#2c2418', ink: '#f4ecd8',
  };

  var GAME_TITLE = 'WIND ARROW';
  var TOTAL = 5;
  var ZONE_Y = H * 0.44;
  var ZONE_X = [W * 0.28, W * 0.5, W * 0.72];
  var ZONE_R = 110;
  var FLAG_X = W * 0.5, FLAG_Y = H * 0.24;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var done, endWait, finished, hits, milestoneShown;
  var ready, hitStop, shake;
  var wind, answerZone, roundReady, windupT;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000044', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ARCHER_SPRITE = ['.##.', '####', '.##.', '####'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.sky], [1, C.bg]]);
    game.draw.rect(0, H * 0.7, W, H * 0.15, C.cliff, 1);
  }

  function windToZone(w) {
    // w<-0.33 左, w>0.33 右, それ以外 中央 (風上にずらして狙う)
    if (w < -0.33) return 0;
    if (w > 0.33) return 2;
    return 1;
  }

  function newRound() {
    var w = game.random(-1, 1);
    return { wind: w, answerZone: windToZone(w) };
  }

  function initGame() {
    hits = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
    var r = newRound(); wind = r.wind; answerZone = r.answerZone;
    roundReady = 0.9; windupT = 0;
  }

  function drawFlag() {
    var sway = Math.sin(game.time.elapsed * 3) * 8 + wind * 40;
    game.draw.line(FLAG_X, FLAG_Y - 60, FLAG_X, FLAG_Y + 30, C.cliff, 6);
    game.draw.line(FLAG_X, FLAG_Y - 55, FLAG_X + sway, FLAG_Y - 30, C.flag, 18);
  }

  function drawZones() {
    for (var i = 0; i < 3; i++) {
      game.draw.circle(ZONE_X[i], ZONE_Y, ZONE_R, C.targetRing, 1);
      game.draw.circle(ZONE_X[i], ZONE_Y, ZONE_R * 0.6, C.target, 1);
      game.draw.circle(ZONE_X[i], ZONE_Y, ZONE_R * 0.25, C.ink, 1);
    }
  }

  function pick(zoneIdx) {
    if (finished || ready > 0 || done || roundReady > 0) return;
    var correct = zoneIdx === answerZone;
    hitStop = correct ? 0.1 : 0.3;
    if (correct) {
      hits++;
      game.feedback.good(ZONE_X[zoneIdx], ZONE_Y, { text: 'HIT', color: C.good });
      game.fx.burst(ZONE_X[zoneIdx], ZONE_Y, { color: C.gold, count: 14, speed: 300 });
      game.audio.play('se_good', 0.4);
      if (!milestoneShown && hits >= Math.ceil(TOTAL / 2)) {
        milestoneShown = true;
        game.fx.popup('HALFWAY!', W / 2, H * 0.32, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.4);
      }
      if (hits >= TOTAL) {
        finished = true; ok = true;
        game.audio.play('se_success', 0.5);
        finish();
        return;
      }
      var r = newRound(); wind = r.wind; answerZone = r.answerZone; roundReady = 0.55; windupT = 0;
    } else {
      game.feedback.bad(ZONE_X[zoneIdx], ZONE_Y, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      finished = true; ok = false;
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING) return;
    for (var i = 0; i < 3; i++) {
      if (Math.hypot(x - ZONE_X[i], y - ZONE_Y) < ZONE_R) { pick(i); return; }
    }
    game.audio.play('se_tap', 0.04);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: ZONE_X[1], gy: ZONE_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) {
      var r = newRound(); wind = r.wind; answerZone = r.answerZone; hits = hits || 0; demo.tapped = false;
    }
    if (cyc > 1.6 && !demo.tapped) {
      demo.tapped = true;
      demo.gx = ZONE_X[answerZone]; demo.gy = ZONE_Y; demo.press = true;
      game.fx.burst(demo.gx, demo.gy, { color: C.gold, count: 10, speed: 260 });
      game.audio.play('se_good', 0.2);
    }
    if (cyc <= 1.6) demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (wind === undefined) initGame();
      bg();
      stepDemo(dt);
      drawZones();
      drawFlag();
      game.draw.sprite(ARCHER_SPRITE, { '#': C.cliff }, W * 0.5, H * 0.62, 20, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.cliff);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.cliff);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawZones();
      drawFlag();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(hits + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.cliff);
      if (!ok) txt('あと' + (TOTAL - hits) + '本!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, total: TOTAL });
        else game.end.failure({ hits: hits, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (roundReady > 0) {
      roundReady -= dt;
      windupT += dt;
    }
    if (shake > 0) shake -= dt;

    bg();
    drawZones();
    drawFlag();
    game.draw.sprite(ARCHER_SPRITE, { '#': C.cliff }, W * 0.5, H * 0.62, 20, { anchor: 'center' });

    txt(hits + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.cliff, 0.4);
    game.draw.rect(60, 150, (W - 120) * (hits / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.3], ['F4', 0.3], ['A4', 0.3], ['D5', 0.6]], { tempo: 108, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
