// D-20172021-0032-flare-beat-barrage.js
// フレアビート・バラージ — 収縮していく光輪が的の大きさに重なる拍の瞬間だけ撃ち、影の飛行体を撃退する
// 操作: 中央で収縮するリングが的の輪に重なった瞬間にタップして発砲する
// 終わり: 規定回数(7回)拍のタイミングで撃ち抜けば成功。的を外すかタイミングがずれれば失敗
// @mechanic: rhythm
// @theme: harbor_watch_flare_beat_barrage
// 世界観: 夜霧の埠頭に立つ信号手が、拍に合わせて接近する影の飛行体を信号銃で狙い、一定数を撃退するまで持ち場を守る
// 残るもの: 正誤(CLEAR/GAME OVER) + 撃退できた拍数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 彩度高めのグラデーション、太い白フチ、ポップな影
  var C = {
    bg: '#123a5e', bg2: '#0a2038', pier: '#0d2c46', pierEdge: '#1f5c8a',
    ring: '#ffd400', ringHot: '#ff5a3c', target: '#2c3a4a', targetDark: '#161d24',
    good: '#3ce07a', bad: '#ff4d5e', gold: '#ffd400', white: '#ffffff', ink: '#081018',
  };

  var GAME_TITLE = 'FLARE BARRAGE';
  var TOTAL = 7;
  var CX = W * 0.5, CY = H * 0.44;
  var START_R = 170, TARGET_R = 62, TOL = 15;
  var SHRINK_T = 1.0, PERIOD = 1.2;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var hits, done, endWait, finished;
  var ready, hitStop, shake;
  var cycleT, resolved, popT;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DRONE_SPRITE = ['#...#', '.###.', '#####', '.#.#.'];
  var GUN_SPRITE = ['..##', '####', '..##'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffd400', pulse * 0.4);
    game.draw.rect(0, H * 0.7, W, H * 0.3, C.pier, 0.9);
    game.draw.rect(0, H * 0.7, W, 8, C.pierEdge);
    game.draw.sprite(GUN_SPRITE, { '#': C.pierEdge }, W * 0.5, H * 0.86, 22, { anchor: 'center' });
  }

  function curRadius(t) {
    if (t <= SHRINK_T) return START_R - (START_R - TARGET_R) * (t / SHRINK_T);
    return TARGET_R;
  }

  function initGame() {
    hits = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    cycleT = 0; resolved = false; popT = 0;
  }

  function drawScene() {
    var bob = Math.sin(game.time.elapsed * 3) * 6;
    game.draw.circle(CX, CY + bob, 46, C.targetDark);
    game.draw.sprite(DRONE_SPRITE, { '#': C.target }, CX, CY + bob, 16, { anchor: 'center' });
    var r = curRadius(Math.min(cycleT, SHRINK_T));
    var hot = Math.abs(r - TARGET_R) <= TOL;
    game.draw.circle(CX, CY, r, hot ? C.ringHot : C.ring, hot ? 0.9 : 0.55);
    game.draw.circle(CX, CY, TARGET_R, C.white, 0.25);
    if (popT > 0) game.draw.circle(CX, CY, TARGET_R + (1 - popT / 0.2) * 60, C.gold, popT / 0.2 * 0.5);
  }

  function attemptShot(x, y) {
    if (ready > 0 || done || finished || resolved) return;
    game.audio.play('se_tap', 0.08);
    var r = curRadius(Math.min(cycleT, SHRINK_T));
    var hot = cycleT <= SHRINK_T && Math.abs(r - TARGET_R) <= TOL;
    if (hot) {
      resolved = true; hits++; popT = 0.2;
      hitStop = 0.07;
      game.feedback.good(CX, CY, { text: 'HIT', color: C.good });
      game.audio.play('se_good', 0.3);
      if (hits === 4) game.fx.popup('あと' + (TOTAL - hits) + '!', CX, CY - 220, { color: C.gold, size: 36 });
      if (hits >= TOTAL) { ok = true; finished = true; finish(); return; }
      cycleT = 0; resolved = false;
    } else {
      resolved = true;
      ok = false; finished = true;
      hitStop = 0.32; shake = 0.3;
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) attemptShot(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % PERIOD;
    if (cyc < dt || demo.t <= dt) { hits = 0; }
    cycleT = cyc;
    if (cyc > SHRINK_T - 0.08 && cyc < SHRINK_T + 0.08) {
      demo.press = true; popT = 0.2;
      game.feedback.good(CX, CY, { text: 'HIT', color: C.good });
      game.audio.play('se_good', 0.2);
    } else demo.press = false;
    if (popT > 0) popT -= dt;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (cycleT === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(hits + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - hits) + '機!', W / 2, H * 0.18, 26, C.white);
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
      if (ready <= 0) { game.audio.play('se_tap'); cycleT = 0; resolved = false; }
    } else if (!finished) {
      cycleT += dt;
      if (cycleT >= PERIOD && !resolved) {
        resolved = true;
        ok = false; finished = true;
        hitStop = 0.32; shake = 0.3;
        game.feedback.bad(CX, CY, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (popT > 0) popT -= dt;
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawScene();

    txt(hits + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (hits / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.2], ['F4', 0.2], ['A4', 0.2], ['D5', 0.4]], { tempo: 128, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
