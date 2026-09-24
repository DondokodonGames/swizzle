// D-20092012-0023-rooftop-courier-dash.js
// ルーフトップ・クーリエ・ダッシュ — 自動で走り続ける配達人が、迫る障害物をタップで跳び越え/突き抜ける
// 操作: 画面をタップすると次の障害物を跳躍または突進で処理する(接近を見て早すぎず遅すぎず)
// 終わり: 規定本数の障害物を全てクリアすれば成功。1つでも処理し損ねれば失敗
// @mechanic: camera_run
// @theme: rooftop_courier
// 世界観: 屋根伝いに荷物を届ける配達人が、夕暮れの屋上を自動で走り続け、迫る障害物をタップ一つで跳躍/突進して切り抜ける
// 残るもの: 正誤(CLEAR/GAME OVER) + クリアした障害物数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: くっきりした中間色、複数レイヤーの背景、はっきりした縁取り
  var C = {
    sky1: '#ff9d5c', sky2: '#3a3f7a', roofFar: '#2b2f55', roofNear: '#4a3f66',
    ledge: '#6b5a8a', ledgeEdge: '#8f7ab0', runner: '#ffd166', runnerDark: '#c99a2e',
    ok: '#4dff8a', bad: '#ff4d5e', gold: '#ffe066', white: '#fff6e8', ink: '#1a1020',
  };

  var GAME_TITLE = 'ROOFTOP DASH';
  var TOTAL = 6;
  var PX = W * 0.28, PY = H * 0.62;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var cleared, done, endWait, finished, ready, hitStop, shake, speed, runFrame, runAnimT, jumpT;
  var obs;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var RUN_A = ['.##.', '####', '.##.', '#..#'];
  var RUN_B = ['.##.', '####', '.##.', '.##.'];
  var JUMP_S = ['.##.', '####', '..#.', '.#..'];

  function bg() {
    game.draw.gradient(0, H * 0.6, [[0, C.sky1], [1, C.sky2]]);
    for (var i = 0; i < 4; i++) {
      var fx = ((i * 340 - (game.time.elapsed * 30) % 340) + 340) % 340 - 100;
      game.draw.rect(fx, H * 0.34, 160, H * 0.22, C.roofFar, 0.7);
    }
    game.draw.rect(0, H * 0.6, W, H * 0.14, C.roofNear);
    game.draw.rect(0, H * 0.74, W, 10, C.ledgeEdge);
    game.draw.rect(0, H * 0.74, W, H * 0.26, C.ledge);
  }

  function newObstacle(idx) {
    var kind = idx % 2 === 0 ? 'gap' : 'wall';
    var dur = Math.max(1.0, 1.7 - idx * 0.06);
    return { kind: kind, t: 0, dur: dur, telegraphed: false, resolved: false, hit: false };
  }

  function initGame() {
    cleared = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; speed = 1;
    runAnimT = 0; runFrame = 0; jumpT = 0;
    obs = newObstacle(0);
  }

  function resolveTap() {
    if (!obs || obs.resolved || ready > 0 || done || finished) return;
    obs.resolved = true;
    jumpT = 0.35;
    var p = obs.t / obs.dur;
    var goodWindow = p > 0.25 && p < 0.92;
    hitStop = goodWindow ? 0.08 : 0.3;
    if (goodWindow) {
      cleared++;
      game.feedback.good(PX, PY - 60, { text: obs.kind === 'gap' ? 'JUMP' : 'DASH' });
      game.fx.burst(PX, PY - 40, { color: C.gold, count: 12, speed: 300 });
      game.audio.play('se_jump', 0.4);
      speed = 1 + cleared * 0.06;
      if (cleared === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', PX, PY - 220, { color: C.gold, size: 40 });
      if (cleared >= TOTAL) { ok = true; finished = true; finish(); return; }
      obs = newObstacle(cleared);
    } else {
      game.feedback.bad(PX, PY - 40, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) resolveTap();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawRunner(x, y, jumping) {
    runAnimT += 0;
    var frame = jumping ? JUMP_S : (runFrame === 0 ? RUN_A : RUN_B);
    var bob = jumping ? -Math.sin(Math.min(1, jumpT / 0.35) * Math.PI) * 90 : Math.abs(Math.sin(game.time.elapsed * 10)) * 6;
    game.draw.sprite(frame, { '#': C.runner }, x, y - bob, 20, { anchor: 'center' });
  }

  function drawObstacle(o) {
    if (!o) return;
    var startX = W + 120;
    var p = Math.min(1, o.t / o.dur);
    var x = startX + (PX + 40 - startX) * p;
    if (p > 0.42 && !o.hit) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) game.draw.circle(x, PY - 30, 46, C.bad, 0.35);
    }
    if (o.kind === 'gap') {
      game.draw.rect(x - 30, PY - 6, 60, 40, C.ledgeEdge);
      game.draw.rect(x - 34, PY - 12, 68, 10, C.bad, 0.8);
    } else {
      game.draw.rect(x - 22, PY - 130, 44, 150, C.roofFar);
      game.draw.rect(x - 26, PY - 136, 52, 12, C.bad, 0.8);
    }
  }

  var demo = { t: 0, gx: PX, gy: H * 0.86, press: false };
  var demoObs = null, demoCleared = 0;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { demoObs = newObstacle(0); demoCleared = 0; }
    if (demoObs) {
      demoObs.t += dt;
      var p = demoObs.t / demoObs.dur;
      if (p > 0.6 && !demoObs.telegraphed) {
        demoObs.telegraphed = true;
        demo.press = true;
        game.feedback.good(PX, PY - 60, { text: demoObs.kind === 'gap' ? 'JUMP' : 'DASH' });
        game.audio.play('se_jump', 0.2);
        jumpT = 0.35; demoCleared++;
      }
      if (p >= 1) { demoObs = newObstacle(demoCleared % 4); demo.press = false; }
    }
    obs = demoObs;
  }

  game.onUpdate(function(dt) {
    runAnimT += dt;
    if (Math.floor(runAnimT * 8) % 2 === 0) runFrame = 0; else runFrame = 1;
    if (jumpT > 0) jumpT -= dt;

    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawObstacle(obs);
      drawRunner(PX, PY, jumpT > 0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
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
      drawRunner(PX, PY, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.ok : C.bad);
      txt(cleared + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - cleared) + '個!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, total: TOTAL });
        else game.end.failure({ cleared: cleared, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      obs.t += dt * speed;
      if (obs.t / obs.dur >= 1 && !obs.resolved) {
        obs.resolved = true; obs.hit = true;
        hitStop = 0.3;
        game.feedback.bad(PX, PY - 40, { text: 'MISS' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawObstacle(obs);
    drawRunner(PX, PY, jumpT > 0);

    txt(cleared + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (cleared / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.25], ['G4', 0.25], ['A4', 0.25], ['C5', 0.5]], { tempo: 150, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
