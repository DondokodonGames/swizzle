// I-Switch2-0013-searchlight-buoy-press.js
// サーチライトブイプレス — 潜水艦の探照灯係が、海中を漂うブイのスイッチを狙って光った瞬間に押し込む
// 操作: 漂う光るブイを狙ってタップし、点灯した瞬間に押し込んで作動させる
// 終わり: 規定数(5個)のブイを全て正しいタイミングで押せれば成功。的外れ・タイミング外しで失敗
// @mechanic: aim_shoot
// @theme: submarine_searchlight_buoy
// 世界観: 深海を進む小型潜水艇の探照灯係。海流に漂う通信ブイを狙い、点滅が最も強くなった瞬間だけ押し込んで信号を送る仕事
// 残るもの: 正誤(CLEAR/GAME OVER) + 作動させたブイ数
// スタイル: HD POST 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 深みのあるグラデーション、柔らかい光暈、コントラストの効いた縁取り
  var C = {
    bg: '#031824', bg2: '#062c3c', deep: '#02101a', buoyOff: '#1a4a5a', buoyOn: '#4ae8ff',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#eafcff', ink: '#010a0e',
  };

  var GAME_TITLE = 'BUOY PRESS';
  var TOTAL = 5;
  var SUB_X = W * 0.5, SUB_Y = H * 0.82;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var hits, done, endWait, finished;
  var ready, hitStop, shake;
  var buoy; // {x,y,t,dur,resolved}

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SUB = ['..####..', '.######.', '########', '..####..'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.deep]]);
    for (var i = 0; i < 8; i++) game.draw.circle(W * ((i * 37) % 100) / 100, H * ((i * 53) % 70) / 100 + H * 0.05, 4, '#ffffff10');
    game.draw.sprite(SUB, { '#': C.gold }, SUB_X, SUB_Y, 16, { anchor: 'center' });
  }

  function newBuoy(round) {
    return {
      x: W * (0.25 + Math.random() * 0.5),
      y: H * (0.25 + Math.random() * 0.3),
      t: 0, dur: Math.max(1.1, 1.8 - round * 0.1), resolved: false,
    };
  }

  function initGame() {
    hits = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    buoy = newBuoy(0);
  }

  function buoyPulse(b) {
    var p = b.t / b.dur;
    return 0.5 + 0.5 * Math.sin(p * Math.PI * 3);
  }

  function attemptPress(x, y) {
    if (!buoy || buoy.resolved || ready > 0 || done || finished) return;
    var d = Math.hypot(x - buoy.x, y - buoy.y);
    var pulse = buoyPulse(buoy);
    var correct = d < 90 && pulse > 0.82;
    buoy.resolved = true;
    hitStop = correct ? 0.1 : 0.3;
    if (correct) {
      hits++;
      game.feedback.good(buoy.x, buoy.y, { text: 'GOOD', color: C.good });
      game.fx.burst(buoy.x, buoy.y, { color: C.gold, count: 16, speed: 340 });
      game.audio.play('se_good', 0.4);
      if (hits === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', SUB_X, SUB_Y - 400, { color: C.gold, size: 40 });
    } else {
      game.feedback.bad(x, y, { text: 'MISS' });
      shake = 0.25;
      game.audio.play('se_bad', 0.4);
    }
    if (!correct) { ok = false; finished = true; finish(); return; }
    if (hits >= TOTAL) { ok = true; finished = true; finish(); return; }
    buoy = newBuoy(hits);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) { game.audio.play('se_tap', 0.05); attemptPress(x, y); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawBuoy(b) {
    if (!b) return;
    var pulse = buoyPulse(b);
    // telegraph: pulse>0.65 相当の0.5-0.8秒前から強く点滅、点灯ピークで押す合図
    if (pulse > 0.65) game.draw.circle(b.x, b.y, 70 + pulse * 40, C.buoyOn, 0.18 + pulse * 0.15);
    game.draw.circle(b.x, b.y, 46, pulse > 0.82 ? C.buoyOn : C.buoyOff);
    game.draw.circle(b.x, b.y, 20, C.white, pulse > 0.82 ? 0.7 : 0.2);
  }

  var demo = { t: 0, gx: SUB_X, gy: SUB_Y, press: false, b: null };
  function stepDemo(dt) {
    demo.t += dt;
    if (!demo.b) demo.b = newBuoy(0);
    demo.b.t += dt;
    buoy = demo.b;
    var pulse = buoyPulse(demo.b);
    demo.gx = demo.b.x; demo.gy = demo.b.y;
    if (pulse > 0.82 && !demo.pressed) {
      demo.pressed = true; demo.press = true;
      game.feedback.good(demo.b.x, demo.b.y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.25);
    }
    if (demo.b.t / demo.b.dur >= 1) { demo.b = null; demo.press = false; demo.pressed = false; demo.gx = SUB_X; demo.gy = SUB_Y; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawBuoy(buoy);
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
      drawBuoy(null);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(hits + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - hits) + '個!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
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
    } else if (!finished) {
      buoy.t += dt;
      if (buoy.t / buoy.dur >= 1 && !buoy.resolved) {
        buoy.resolved = true;
        hitStop = 0.3;
        game.feedback.bad(buoy.x, buoy.y, { text: 'MISS' });
        shake = 0.25;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawBuoy(buoy);

    txt(hits + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (hits / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C3', 0.6], ['E3', 0.6], ['G3', 1.2]], { tempo: 90, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
