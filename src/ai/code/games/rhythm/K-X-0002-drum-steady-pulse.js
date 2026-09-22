// K-X-0002-drum-steady-pulse.js
// ドラムスティディパルス — 一定速度で縮む光輪が的に重なる瞬間だけ、中央か縁を正確に打つ
// 操作: 太鼓の上で縮んでくる光輪が的の大きさに重なった刹那、輪の色が示す面(中央/縁)を叩く
// 終わり: 規定回数(8回)すべて窓内で正しい面を打てれば成功。1回でも窓を外すか面を誤れば失敗
// @mechanic: timing_window
// @theme: clockwork_drum_dojo
// 世界観: 歯車仕掛けの稽古場。一定の速さで縮む光輪が太鼓に重なる一瞬だけを頼りに、中央と縁を寸分違わず打ち分ける鍛錬
// 残るもの: 正誤(CLEAR/GAME OVER) + 窓内で打てた回数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 背景2〜3層、大きめキャラ、暗色輪郭+ハイライト
  var C = {
    bg: '#1a2438', bg2: '#0e1624', gearDark: '#242e44', gear: '#38445c',
    drumBody: '#5c6478', drumRim: '#8c96ac', drumCenter: '#2a3040',
    ringCenter: '#3ad4ff', ringRim: '#ff9d3d', ringOk: '#3dd67a',
    good: '#3dd67a', bad: '#ff5040', gold: '#ffd24d', white: '#eef2f8', ink: '#0a0e18',
  };

  var GAME_TITLE = 'STEADY PULSE';
  var DX = W * 0.5, DY = H * 0.46;
  var R_IN = 110, R_OUT = 190;
  var TOTAL = 8;
  var RING_START = 320, RING_TOL = 20;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var MONK_A = ['.##.', '####', '.##.', '#..#'];
  var MONK_B = ['.##.', '####', '.##.', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 4; i++) {
      game.draw.circle(W * (0.15 + i * 0.28), H * 0.14, 40, C.gearDark, 0.5);
      game.draw.circle(W * (0.15 + i * 0.28), H * 0.14, 24, C.gear, 0.5);
    }
    // 常時アニメ(ATTRACTが静止して見えないようにする明滅)
    var pulse = 0.5 + 0.5 * Math.sin(game.time.elapsed * 1.5);
    game.draw.rect(0, 0, W, H, C.ringCenter, 0.015 + 0.03 * pulse);
  }

  function drawDrum() {
    game.draw.circle(DX, DY + 14, R_OUT + 10, '#00000040');
    game.draw.circle(DX, DY, R_OUT, C.drumRim);
    game.draw.circle(DX, DY, R_IN + 6, C.drumBody);
    game.draw.circle(DX, DY, R_IN, C.drumCenter);
    var frame = Math.floor(game.time.elapsed * 4) % 2 === 0 ? MONK_A : MONK_B;
    game.draw.sprite(frame, { '#': C.white }, DX, DY - R_OUT - 70, 20, { anchor: 'center' });
  }

  var round, ringR, zone, resolved, cleared, done, endWait, finished, strikeFlash;
  var ready, hitStop, shake, milestoneShown;
  var RING_SPEED = 260;
  var targetR;

  function newRound() {
    zone = Math.random() < 0.5 ? 'center' : 'rim';
    targetR = zone === 'center' ? R_IN : R_OUT;
    ringR = RING_START; resolved = false; strikeFlash = 0;
  }

  function initGame() {
    round = 0; cleared = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
    newRound();
  }

  function strike(x, y) {
    if (resolved || done || ready > 0 || finished) return;
    var d = Math.hypot(x - DX, y - DY);
    var tappedZone = d <= R_IN ? 'center' : (d <= R_OUT ? 'rim' : null);
    resolved = true;
    var diff = Math.abs(ringR - targetR);
    var correct = tappedZone === zone && diff <= RING_TOL;
    hitStop = correct ? 0.1 : 0.3;
    strikeFlash = 0.15;
    if (correct) {
      cleared++;
      game.feedback.good(DX, DY, { text: 'HIT', color: C.good });
      game.fx.burst(DX, DY, { color: C.gold, count: 14, speed: 320 });
      game.audio.play('se_good', 0.4);
      if (!milestoneShown && cleared >= Math.ceil(TOTAL / 2)) {
        milestoneShown = true;
        game.fx.popup(cleared + ' / ' + TOTAL, DX, H * 0.16, { color: C.gold, size: 36 });
        game.audio.play('se_milestone', 0.35);
      }
      if (cleared >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++; newRound();
    } else {
      game.feedback.bad(DX, DY, { text: 'MISS' });
      shake = 0.28;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onPress(function(x, y) { if (state === S.PLAYING) strike(x, y); });

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

  function drawRing(flash) {
    var col = zone === 'center' ? C.ringCenter : C.ringRim;
    var closeness = 1 - Math.min(1, Math.abs(ringR - targetR) / 60);
    game.draw.circle(DX, DY, ringR, flash ? C.white : col, 0.15 + closeness * 0.55);
    game.draw.circle(DX, DY, ringR + 4, flash ? C.white : col, 0.9);
  }

  var demo = { t: 0, gx: DX, gy: H * 0.9, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.4;
    if (cyc < dt || demo.t <= dt) { newRound(); round = 0; }
    if (ringR === undefined) newRound();
    if (!resolved) ringR -= RING_SPEED * dt;
    if (Math.abs(ringR - targetR) <= RING_TOL && !resolved) {
      resolved = true; strikeFlash = 0.15;
      game.feedback.good(DX, DY, { text: 'HIT', color: C.good });
      game.audio.play('se_good', 0.22);
      demo.gy = zone === 'center' ? DY : DY - 160;
      demo.press = true;
    }
    if (resolved && strikeFlash <= 0) demo.press = false, demo.gy = H * 0.9;
    if (strikeFlash > 0) strikeFlash -= dt;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      drawDrum();
      if (!resolved || strikeFlash > 0) drawRing(strikeFlash > 0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 22 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('TAP TO START', W / 2, H * 0.94, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawDrum();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(cleared + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - cleared) + '打!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
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
      if (!resolved) {
        ringR -= RING_SPEED * dt;
        if (ringR <= targetR - RING_TOL - 40) {
          resolved = true;
          game.feedback.bad(DX, DY, { text: 'MISS' });
          shake = 0.28; game.audio.play('se_bad', 0.4); hitStop = 0.3;
          ok = false; finished = true; finish();
        }
      }
    }
    if (strikeFlash > 0) strikeFlash -= dt;
    if (shake > 0) shake -= dt;

    bg();
    drawDrum();
    if (!finished) drawRing(strikeFlash > 0);

    txt(cleared + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, '#00000030', 1);
    game.draw.rect(60, 150, (W - 120) * (round / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.78, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.25], ['A3', 0.25], ['E4', 0.25], ['A3', 0.5]], { tempo: 120, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
