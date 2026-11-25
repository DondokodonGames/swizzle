// D-20132016-0049-searchlight-freeze-walk.js
// サーチライト・フリーズ — 見張り塔の光が自分を捉えている間だけ動きを止め、光の隙間で進む
// 操作: 指で押さえて前進させる。光に照らされたら指を離して静止し、消えたらまた押さえて進む
// 終わり: 光に照らされたまま動き続けなければ出口まで到達で成功。照らされたまま動くと発見され失敗
// @mechanic: freeze
// @theme: searchlight_yard_breakout
// 世界観: 高い塀に囲まれた夜の収容区画。監視塔から振れるサーチライトの隙を読み、光の外だけで進んで塀の外へ抜ける脱出者
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達した進行度%
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg: '#050014', bg2: '#0e0328', wall: '#1c0f3a', wallHi: '#2c1a52',
    light: '#fff6c8', lightCore: '#ffffff', good: '#39ff9a', bad: '#ff3355',
    gold: '#ffe600', white: '#ffffff', ink: '#040010', path: '#241a44',
  };

  var GAME_TITLE = 'FREEZE WALK';
  var PATH = [
    { x: W * 0.5, y: H * 0.70 },
    { x: W * 0.5, y: H * 0.60 },
    { x: W * 0.5, y: H * 0.50 },
    { x: W * 0.5, y: H * 0.40 },
    { x: W * 0.5, y: H * 0.30 },
    { x: W * 0.5, y: H * 0.20 },
  ];
  var TOTAL_LEN = 0, SEG_LEN = [];
  for (var i2 = 1; i2 < PATH.length; i2++) { var d2 = PATH[i2].y - PATH[i2 - 1].y; SEG_LEN.push(-d2); TOTAL_LEN += -d2; }
  var ZONES = [
    { from: 0.18, to: 0.42, speed: 1.5, phase: 0 },
    { from: 0.55, to: 0.82, speed: 1.9, phase: 2.1 },
  ];
  var TIME_LIMIT = 8.6;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var progress, timeLeft, done, endWait, finished, ready, hitStop, shake, pressing;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var RUNNER_SPRITE = ['.##.', '####', '.##.', '#..#'];

  function isLit(zone, elapsed) { return Math.sin(elapsed * zone.speed + zone.phase) > 0.15; }
  function litAmount(zone, elapsed) { return Math.sin(elapsed * zone.speed + zone.phase); }

  function progAt(y) { return (PATH[0].y - y) / TOTAL_LEN; }
  function yAt(p) { return PATH[0].y - p * TOTAL_LEN; }

  function bg(elapsed) {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.025 + 0.025 * Math.sin(elapsed * 1.3));
    game.draw.rect(W * 0.5 - 130, H * 0.14, 260, H * 0.62, C.wall, 0.6);
    game.draw.rect(W * 0.5 - 130, H * 0.14, 40, H * 0.62, C.wallHi, 0.4);
    game.draw.circle(W * 0.14, H * 0.12, 46, '#241a44');
    game.draw.circle(W * 0.86, H * 0.12, 46, '#241a44');
  }

  function drawZones(elapsed) {
    for (var i = 0; i < ZONES.length; i++) {
      var z = ZONES[i];
      var y0 = yAt(z.from), y1 = yAt(z.to);
      var lit = isLit(z, elapsed);
      var amt = litAmount(z, elapsed);
      var a = lit ? 0.30 + amt * 0.15 : Math.max(0.06, 0.12 + amt * 0.1);
      game.draw.rect(W * 0.5 - 130, y1, 260, y0 - y1, lit ? C.light : C.light, a);
      var towerX = i === 0 ? W * 0.14 : W * 0.86;
      game.draw.line(towerX, H * 0.12, W * 0.5, (y0 + y1) / 2, lit ? C.lightCore : C.light, lit ? 10 : 4);
      if (!lit && amt > -0.05) {
        var blink = Math.floor(elapsed * 8) % 2 === 0;
        if (blink) game.draw.line(towerX, H * 0.12, W * 0.5, (y0 + y1) / 2, C.bad, 5);
      }
    }
  }

  function initGame() {
    progress = 0; timeLeft = TIME_LIMIT;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; pressing = false;
  }

  function inZone(p) {
    for (var i = 0; i < ZONES.length; i++) if (p >= ZONES[i].from && p <= ZONES[i].to) return ZONES[i];
    return null;
  }

  game.onPress(function(x, y) { if (state === S.PLAYING) { pressing = true; game.audio.play('se_tap', 0.08); } });
  game.onRelease(function(x, y) { if (state === S.PLAYING) { pressing = false; game.audio.play('se_tap', 0.04); } });
  game.onMove(function(x, y) { if (state === S.PLAYING && Math.random() < 0.04) game.audio.play('se_tap', 0.02); });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.0;
  }

  function stepPlay(dt, elapsed) {
    timeLeft -= dt;
    if (timeLeft <= 0 && !finished) {
      ok = false; finished = true; hitStop = 0.3; shake = 0.2;
      game.feedback.bad(W * 0.5, yAt(progress), { text: 'MISS' });
      finish();
      return;
    }
    var z = inZone(progress);
    if (z && isLit(z, elapsed) && pressing) {
      ok = false; finished = true; hitStop = 0.45; shake = 0.35;
      game.feedback.bad(W * 0.5, yAt(progress), { text: 'MISS' });
      finish();
      return;
    }
    if (pressing) {
      var before = Math.floor(progress * 100);
      progress = Math.min(1, progress + dt / 5.4);
      var after = Math.floor(progress * 100);
      if (before < 50 && after >= 50) { game.fx.popup('50', W * 0.5, yAt(progress) - 60, { color: C.gold, size: 34 }); game.audio.play('se_milestone', 0.3); }
      if (progress >= 1) { ok = true; finished = true; game.feedback.good(W * 0.5, yAt(1), { text: 'CLEAR' }); finish(); }
    }
  }

  var demo = { t: 0, gx: W * 0.5, gy: yAt(0), press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.5;
    if (cyc < dt || demo.t <= dt) { progress = 0; }
    var z = inZone(progress);
    var wantPress = !(z && isLit(z, demo.t));
    demo.press = wantPress;
    demo.gx = W * 0.5 + Math.sin(demo.t * 3) * 6;
    demo.gy = yAt(progress) + 150;
    if (wantPress) progress = Math.min(1, progress + dt / 5.0);
    if (progress >= 1) progress = 1;
  }

  game.onUpdate(function(dt) {
    var el = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      stepDemo(dt);
      bg(el);
      drawZones(el);
      var bob = Math.sin(el * 2.4) * 4;
      game.draw.sprite(RUNNER_SPRITE, { '#': C.white, '.': null }, W * 0.5, yAt(progress) + bob, 12, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? Math.round(game.best) + '%' : '-'), W / 2, H * 0.115, 22, C.gold);
      if (Math.floor(el * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg(el);
      drawZones(el);
      game.draw.sprite(RUNNER_SPRITE, { '#': ok ? C.good : C.bad, '.': null }, W * 0.5, yAt(progress), 12, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(Math.round(progress * 100) + ' / ' + 100, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと少し!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(el * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct = Math.round(progress * 100);
        if (ok) game.end.success(pct, { pct: pct }); else game.end.failure({ pct: pct });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepPlay(dt, el);
    }
    if (shake > 0) shake -= dt;

    bg(el);
    drawZones(el);
    var flash = hitStop > 0 && Math.floor(hitStop * 30) % 2 === 0;
    game.draw.sprite(RUNNER_SPRITE, { '#': flash ? C.white : (pressing ? C.good : C.white), '.': null }, W * 0.5, yAt(progress), flash ? 15 : 12, { anchor: 'center' });

    txt(Math.round(progress * 100) + ' / ' + 100, W / 2, H * 0.06, 28, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (timeLeft / TIME_LIMIT), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
