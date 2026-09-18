// GH-PS2-0044-cover-dash.js
// カバーダッシュ — 遮蔽物の間を走る。敵の射線が切れた瞬間だけ動く
// 操作: サーチライトが自分から外れている間にタップして次の遮蔽物へ走る
// 終わり: 5つの遮蔽物を進めば成功。ライトが当たっている時に動けば見つかって失敗
// @mechanic: timing_window
// @theme: searchlight_corridor
// 世界観: 奥へ続く通路。サーチライトが周期的に通路を掃く。光が外れた一瞬だけ、次の遮蔽物まで走れる
// 残るもの: 正誤(CLEAR/GAME OVER) + 進んだ遮蔽物の数
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // MODE7 PSEUDO: 少色 + 地平グラデ。地平線へ収束する床
  var C = {
    sky1: '#1a1e2a', sky2: '#0e1018', floor1: '#2a3040', floor2: '#1e2230',
    cover: '#4a5468', light: '#ffe89a', good: '#4dcf8a', bad: '#ff4d5e', gold: '#ffd400', white: '#f0f0f4', ink: '#0a0a10',
  };

  var GAME_TITLE = 'COVER DASH';
  var CHECKPOINTS = 5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, pos = 0;

  var lightOn, lightT, resolved, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var HX = W / 2, HY = H * 0.22, FY = H * 0.86;

  function corridorBg() {
    game.draw.gradient(0, HY, [[0, C.sky1], [1, C.sky2]]);
    game.draw.rect(0, HY, W, FY - HY, C.floor1);
    // サーチライトの掃引(画面全体で動きを作る)
    var sweepX = (game.time.elapsed * 260) % (W + 400) - 200;
    game.draw.rect(sweepX, 0, 200, H, C.light, 0.20);
    for (var i = 1; i < 7; i++) {
      var t = i / 7;
      var y = HY + (FY - HY) * t;
      var w = 20 + t * (W - 20);
      game.draw.rect(HX - w / 2, y, w, 3, C.floor2, 0.6);
    }
    for (var j = -3; j <= 3; j++) game.draw.line(HX, HY, HX + j * 240, FY, C.floor2, 2);
    // 遮蔽物(左右交互)
    for (var c = 0; c < CHECKPOINTS; c++) {
      var t2 = (c + 1) / (CHECKPOINTS + 1);
      var y2 = HY + (FY - HY) * t2;
      var scale = 0.3 + t2 * 0.7;
      var side = c % 2 === 0 ? -1 : 1;
      var x2 = HX + side * 160 * scale;
      game.draw.rect(x2 - 40 * scale, y2 - 100 * scale, 80 * scale, 100 * scale, C.cover);
    }
  }

  var SOLDIER_SPRITE = ['.#.', '###', '.#.', '#.#'];

  function drawSoldier() {
    var t = pos / CHECKPOINTS;
    var y = HY + (FY - HY) * Math.min(1, t * 0.9 + 0.08);
    var scale = 0.35 + Math.min(1, t) * 0.65;
    game.draw.circle(HX, y + 20 * scale, 24 * scale, '#000000', 0.3);
    game.draw.sprite(SOLDIER_SPRITE, { '#': C.white }, HX, y, 16 * scale, { anchor: 'center' });
    if (lightOn) game.draw.circle(HX, y, 60 * scale, C.light, 0.35);
  }

  function newCycle() {
    lightOn = true; lightT = 0.7 + Math.random() * 0.3; resolved = false;
  }

  function initGame() {
    pos = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    newCycle();
  }

  function dash() {
    if (done || ready > 0 || finished || resolved) return;
    resolved = true;
    hitStop = 0.08;
    if (!lightOn) {
      pos++;
      game.feedback.good(HX, FY - 200, { text: null, color: C.good });
      game.fx.burst(HX, FY - 200, { color: C.good, count: 10, speed: 300 });
      game.audio.play('se_success', 0.3);
      if (pos >= CHECKPOINTS) { ok = true; finished = true; finish(); }
      else { newCycle(); game.fx.popup(pos + ' / ' + CHECKPOINTS, W / 2, H * 0.14, { color: C.gold, size: 42 }); }
    } else {
      ok = false; finished = true;
      game.feedback.bad(HX, FY - 200, { text: 'SPOTTED' });
      shake = 0.2;
      game.audio.play('se_failure', 0.5);
      finish();
    }
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    dash();
  });

  // ── ATTRACT ゴースト実演: 光が外れた瞬間だけタップ ──
  var demo = { t: 0, gx: HX, gy: H * 0.70, press: false, on: true, t2: 1.0 };
  function stepDemo(dt) {
    demo.t += dt;
    demo.t2 -= dt;
    lightOn = demo.on;
    if (demo.on && demo.t2 <= 0) { demo.on = false; demo.t2 = 0.5; }
    else if (!demo.on && demo.t2 <= 0) {
      demo.press = true;
      if (demo.t2 > -0.03) { game.feedback.good(HX, FY - 200, { text: null, color: C.good }); game.fx.burst(HX, FY - 200, { color: C.good, count: 8, speed: 260 }); }
      demo.on = true; demo.t2 = 0.9;
    } else demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      corridorBg();
      stepDemo(dt);
      drawSoldier();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.08, 50, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.13, 26, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 44, C.gold);
        txt('TAP TO START', W / 2, H * 0.95, 34, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 30, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      corridorBg();
      drawSoldier();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 54, ok ? C.good : C.bad);
      txt(pos + ' / ' + CHECKPOINTS, W / 2, H * 0.13, 34, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 30, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success({ pos: pos });
        else game.end.failure({ pos: pos });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      lightT -= dt;
      if (lightOn && lightT <= 0) { lightOn = false; lightT = 0.55; }
      else if (!lightOn && lightT <= 0) {
        if (!resolved) { /* 動かなければ何も起きない、光が戻る */ }
        lightOn = true; lightT = 0.8 + Math.random() * 0.4; resolved = false;
      }
    }
    if (shake > 0) shake -= dt;

    corridorBg();
    drawSoldier();

    game.draw.rect(60, 40, W - 120, 20, C.ink, 0.5);
    game.draw.rect(60, 40, (W - 120) * (pos / CHECKPOINTS), 20, C.gold);
    txt(pos + ' / ' + CHECKPOINTS, W / 2, 100, 34, C.white);
    txt(lightOn ? 'HOLD' : 'GO!', W / 2, H * 0.50, 70, lightOn ? C.bad : C.good);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.62, 70, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
