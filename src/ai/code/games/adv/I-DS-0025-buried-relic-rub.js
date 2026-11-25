// I-DS-0025-buried-relic-rub.js
// 埋没遺物こすり出し — 砂に埋もれた遺物を同じ場所を指でこすり続けて掘り出す
// 操作: 砂の下に見える遺物の上を指で高速に往復させてこすり、露出させる
// 終わり: 制限時間内に露出度100%まで掘り出せれば成功。時間切れなら失敗
// @mechanic: rub
// @theme: desert_excavation
// 世界観: 砂漠の発掘現場。若い発掘隊員が、砂に埋もれた古い遺物を刷毛代わりの指でこすり出し記録する
// 残るもの: 正誤(CLEAR/GAME OVER) + 露出度%
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 低彩度4色パレット、大粒ドット、単色ハイライト
  var C = {
    bg: '#3a3020', bg2: '#241c14', sand: '#c8a866', sandDark: '#a3844c',
    relic: '#7d8a92', relicLit: '#d8c98a', accent: '#e0a63a',
    good: '#7ed957', bad: '#e0503c', gold: '#ffd23a', white: '#f4ecd8', ink: '#140f08',
  };

  var GAME_TITLE = 'RELIC RUB';
  var TIME_LIMIT = 12;
  var RX = W * 0.5, RY = H * 0.46, RW = 300, RH = 220;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var expose, timeLeft, done, endWait, finished;
  var ready, hitStop, shake;
  var lastRubX, lastRubY, rubDir, milestoneShown;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BRUSH_HAND = ['.##.', '####', '.##.'];
  var RELIC_SPRITE = [
    '..####..',
    '.######.',
    '##....##',
    '##.##.##',
    '.######.',
    '..####..',
  ];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) {
      game.draw.rect(0, H * 0.62 + i * 26, W, 4, '#00000018');
    }
    game.draw.rect(0, H * 0.6, W, H * 0.32, C.sandDark, 0.3);
  }

  function drawRelic() {
    // 露出度に応じて砂の被覆(横帯)を減らしていく
    var coverH = RH * (1 - expose);
    game.draw.rect(RX - RW / 2, RY - RH / 2, RW, RH, C.sand, 1);
    game.draw.sprite(RELIC_SPRITE, { '#': expose > 0.15 ? C.relicLit : C.relic }, RX, RY, 30, { anchor: 'center' });
    if (coverH > 2) {
      game.draw.rect(RX - RW / 2, RY - RH / 2, RW, coverH, C.sand, 1);
      for (var i = 0; i < 5; i++) {
        game.draw.rect(RX - RW / 2 + i * (RW / 5), RY - RH / 2, 2, coverH, C.sandDark, 0.4);
      }
    }
    game.draw.rect(RX - RW / 2, RY - RH / 2, RW, 6, C.sandDark, 0.6);
  }

  function initGame() {
    expose = 0; timeLeft = TIME_LIMIT; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    lastRubX = null; lastRubY = null; rubDir = 0; milestoneShown = false;
  }

  function inRelic(x, y) {
    return x > RX - RW / 2 && x < RX + RW / 2 && y > RY - RH / 2 && y < RY + RH / 2;
  }

  function doRub(x, y) {
    if (finished || ready > 0 || done) return;
    if (!inRelic(x, y)) return;
    if (lastRubX !== null) {
      var dx = x - lastRubX;
      var newDir = dx > 2 ? 1 : (dx < -2 ? -1 : 0);
      if (newDir !== 0 && newDir !== rubDir) {
        rubDir = newDir;
        expose = Math.min(1, expose + 0.045);
        game.audio.play('se_tap', 0.08);
        game.fx.burst(x, y, { color: C.accent, count: 4, speed: 120 });
        if (!milestoneShown && expose >= 0.5) {
          milestoneShown = true;
          game.fx.popup('HALFWAY!', RX, RY - RH / 2 - 40, { color: C.gold, size: 38 });
          game.audio.play('se_milestone', 0.4);
        }
        if (expose >= 1) {
          expose = 1; finished = true; ok = true; hitStop = 0.15;
          game.feedback.good(RX, RY, { text: 'CLEAR', color: C.good });
          game.fx.burst(RX, RY, { color: C.gold, count: 22, speed: 380 });
          game.audio.play('se_success', 0.5);
          finish();
        }
      }
    }
    lastRubX = x; lastRubY = y;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    lastRubX = x; lastRubY = y; rubDir = 0;
    if (inRelic(x, y)) game.audio.play('se_tap', 0.06); else game.feedback.bad(x, y, { text: '', sound: 'se_bad', shake: 0 });
  });
  game.onMove(function(x, y) { if (state === S.PLAYING) doRub(x, y); });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    game.audio.play('se_tap', 0.03);
    lastRubX = null; lastRubY = null; rubDir = 0;
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: RX, gy: RY, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { expose = 0; }
    var p = Math.min(1, cyc / 3.0);
    expose = p;
    var sweep = Math.sin(demo.t * 14) * (RW * 0.32);
    demo.gx = RX + sweep;
    demo.gy = RY;
    demo.press = cyc < 3.0;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (expose === undefined) initGame();
      bg();
      stepDemo(dt);
      drawRelic();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + '%' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawRelic();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(Math.round(expose * 100) + '%', W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + Math.max(1, Math.round((1 - expose) * 100)) + '%!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct = Math.round(expose * 100);
        if (ok) game.end.success(pct, { pct: pct }); else game.end.failure({ pct: pct });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 3 && timeLeft + dt > 3) {
        game.fx.popup('あと3秒!', RX, RY - RH / 2 - 40, { color: C.bad, size: 34 });
      }
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.3;
        game.feedback.bad(RX, RY, { text: 'TIME UP' });
        shake = 0.3;
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawRelic();

    txt(Math.round(expose * 100) + '%', W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 16, C.accent);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.72, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D3', 0.4], ['F3', 0.4], ['A3', 0.4], ['D4', 0.8]], { tempo: 100, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
