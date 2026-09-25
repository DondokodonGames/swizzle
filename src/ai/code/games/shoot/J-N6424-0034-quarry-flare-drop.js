// J-N6424-0034-quarry-flare-drop.js
// クオリー・フレア・ドロップ — 移動する採掘ゴンドラから照準を定めて信号弾を落とし、地上の発破目印に命中させる
// 操作: 指で照準線を左右にドラッグして狙いを定め、タップして信号弾を投下する
// 終わり: 規定数(5発)命中させれば成功。弾切れで命中数が届かなければ失敗
// @mechanic: aim_shoot
// @theme: quarry_gondola_flare_drop
// 世界観: 岩山を行き来する採掘ゴンドラの発破員が、地上を通過する発破目印を照準で狙い、信号弾を撃ち落として命中数を稼ぐ
// 残るもの: 正誤(CLEAR/GAME OVER) + 命中数
// スタイル: HD POST 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 落ち着いた岩肌トーン、強めのコントラストとリムライト
  var C = {
    bg: '#5a6a72', bg2: '#2c3a42', rockDark: '#2c2018',
    target: '#ffb020', targetDark: '#a05e0a', flare: '#ff5a3c', good: '#39d67a',
    bad: '#ff4d5e', gold: '#ffd400', ink: '#0a0a0a', white: '#ffffff',
  };

  var GAME_TITLE = 'FLARE DROP';
  var GROUND_Y = H * 0.78;
  var GONDOLA_Y = H * 0.22;
  var NEED_HITS = 5;
  var AMMO = 8;
  var HIT_R = 60;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CREW = ['.##.', '####', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, C.rockDark);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
  }

  var crosshairX, target, flares, hits, ammoLeft;
  var done, endWait, finished, ready, hitStop, shake, halfCalled;

  function spawnTarget() {
    return { x: W * (0.2 + Math.random() * 0.6), dir: Math.random() < 0.5 ? 1 : -1, speed: 90 + Math.random() * 90 };
  }

  function initGame() {
    crosshairX = W * 0.5; target = spawnTarget(); flares = []; hits = 0; ammoLeft = AMMO;
    halfCalled = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function fireFlare() {
    if (finished || ready > 0 || ammoLeft <= 0) return;
    ammoLeft--;
    flares.push({ x: crosshairX, y: GONDOLA_Y + 50 });
    game.audio.play('se_jump', 0.3);
  }

  function stepPlay(dt) {
    target.x += target.dir * target.speed * dt;
    if (target.x < 90 || target.x > W - 90) target.dir *= -1;
    for (var i = flares.length - 1; i >= 0; i--) {
      var f = flares[i];
      f.y += 900 * dt;
      if (f.y >= GROUND_Y) {
        var d = Math.abs(f.x - target.x);
        if (d < HIT_R) {
          hits++;
          game.feedback.good(f.x, GROUND_Y, { text: 'HIT', color: C.good });
          game.fx.burst(f.x, GROUND_Y, { color: C.gold, count: 14, speed: 320 });
          game.audio.play('se_good', 0.4);
          if (!halfCalled && hits === Math.ceil(NEED_HITS / 2)) { halfCalled = true; game.fx.popup('NICE', W * 0.5, H * 0.3, { color: C.gold, size: 32 }); }
          if (hits >= NEED_HITS) {
            finished = true; ok = true; hitStop = 0.3;
            game.feedback.good(f.x, GROUND_Y, { text: 'CLEAR', color: C.good });
            game.audio.play('se_success', 0.5);
            finish();
          } else {
            target = spawnTarget();
          }
        } else {
          game.feedback.bad(f.x, GROUND_Y, { text: 'MISS' });
          game.audio.play('se_bad', 0.3);
          if (ammoLeft <= 0 && !finished) {
            finished = true; ok = false; hitStop = 0.35; shake = 0.25;
            game.audio.play('se_failure', 0.4);
            finish();
          }
        }
        flares.splice(i, 1);
      }
    }
  }

  function renderScene() {
    var ring = 1 + 0.08 * Math.sin(game.time.elapsed * 4);
    game.draw.circle(target.x, GROUND_Y, HIT_R * ring, C.targetDark);
    game.draw.circle(target.x, GROUND_Y, HIT_R * 0.6 * ring, C.target);
    game.draw.line(crosshairX, GONDOLA_Y + 40, crosshairX, GROUND_Y, '#ffffff', 3);
    game.draw.circle(crosshairX, GONDOLA_Y + 30, 26, C.rockDark);
    game.draw.sprite(CREW, { '#': C.white }, crosshairX, GONDOLA_Y, 22, { anchor: 'center' });
    for (var i = 0; i < flares.length; i++) {
      game.draw.circle(flares[i].x, flares[i].y, 12, C.flare);
    }
  }

  game.onMove(function(x, y) {
    if (state !== S.PLAYING || finished) return;
    crosshairX = Math.max(60, Math.min(W - 60, x));
    if (Math.random() < 0.06) game.audio.tone('C5', 0.03, { wave: 'triangle', volume: 0.02 });
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) { crosshairX = Math.max(60, Math.min(W - 60, x)); fireFlare(); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.5, gy: GONDOLA_Y, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) resetDemo();
    stepPlay(dt);
    var seg = cyc % 1.1;
    crosshairX += (target.x - crosshairX) * 0.15;
    demo.gx = crosshairX; demo.gy = GONDOLA_Y;
    if (seg > 0.85 && seg < 0.95) { demo.press = true; fireFlare(); } else demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (flares === undefined) initGame();
      stepDemo(dt);
      bg();
      renderScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      renderScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(hits + ' / ' + NEED_HITS, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + Math.max(0, NEED_HITS - hits) + '発!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, need: NEED_HITS });
        else game.end.failure({ hits: hits, need: NEED_HITS });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepPlay(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    renderScene();

    txt('HIT ' + hits + ' / ' + NEED_HITS, W / 2, H * 0.06, 28, C.white);
    txt('AMMO ' + ammoLeft, W / 2, H * 0.63, 22, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G3', 0.25], ['B3', 0.25], ['D4', 0.25], ['G4', 0.5]], { tempo: 132, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
