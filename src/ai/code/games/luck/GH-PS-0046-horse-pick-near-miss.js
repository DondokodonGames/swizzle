// GH-PS-0046-horse-pick-near-miss.js
// レーンピック — 調子の良い走者を見極めて1頭を選び、あとは声援を送って見守る
// 操作: 出走前、各レーンのオーラの強さ(調子)を見て1つタップして選ぶ。レース中は下の声援ゾーンを連打して盛り上げる
// 終わり: 選んだ走者が1着なら成功。僅差の2着以下なら「あと◯着差」を悔しがって終わる
// @mechanic: near_miss
// @theme: track_form_pick
// 世界観: 4レーンの走路。出走前に見えるオーラの強さだけが手がかり。選んだ後は声援を送るだけで、結果は僅差になる
// 残るもの: 正誤(CLEAR/GAME OVER) + 着差(秒)
// スタイル: 90s LOW POLY

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 90s LOW POLY: 輪郭はline、面は横1pxストリップ塗り。頂点ジッターとフォグ
  var C = {
    sky: '#2a3448', fog: '#5a6478', track: '#3a4a3a', lane: '#2e3c2e',
    r0: '#e06a4a', r1: '#4aa0e0', r2: '#e0c84a', r3: '#8ae08a',
    good: '#5adf8a', bad: '#ff5a5a', gold: '#ffd45a', white: '#eef0f4', ink: '#12141c',
  };
  var RUNNER_COL = [C.r0, C.r1, C.r2, C.r3];

  var GAME_TITLE = 'LANE PICK';
  var LANES = 4;
  var TRACK_Y0 = H * 0.80, TRACK_Y1 = H * 0.22;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, gapSec = 0;

  var LANE_X = [];
  for (var li = 0; li < LANES; li++) LANE_X.push(W * (0.20 + li * 0.20));

  var phase, phaseT, pickIdx, form, finishTime, elapsed, winnerIdx, cheerCd, cheerN, jitterSeed;
  var done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function strip(x, y, w, h, colA, colB) {
    for (var yy = 0; yy < h; yy++) game.draw.rect(x, y + yy, w, 1, yy % 2 === 0 ? colA : colB);
  }

  var RUNNER_SPRITE = ['.##.', '####', '.##.', '#..#'];

  function trackBg() {
    game.draw.gradient(0, TRACK_Y1, [[0, C.sky], [1, C.fog]]);
    game.draw.rect(0, TRACK_Y1 - 40, W, 40, C.fog, 0.6); // 遠景フォグ
    game.draw.rect(0, TRACK_Y1, W, TRACK_Y0 - TRACK_Y1 + 60, C.track);
    for (var l = 0; l < LANES; l++) {
      game.draw.line(LANE_X[l] - 90, TRACK_Y0 + 40, LANE_X[l] - 90, TRACK_Y1 - 20, C.lane, 4);
    }
    game.draw.line(0, TRACK_Y1, W, TRACK_Y1, C.white, 6);
  }

  function laneY(i) {
    var t = Math.min(1, elapsed / finishTime[i]);
    return TRACK_Y0 + (TRACK_Y1 - TRACK_Y0) * t;
  }

  function initGame() {
    phase = 'scout'; phaseT = 1.3;
    pickIdx = -1; winnerIdx = -1; gapSec = 0;
    form = []; finishTime = [];
    for (var i = 0; i < LANES; i++) { form.push(0.4 + Math.random() * 0.6); finishTime.push(0); }
    elapsed = 0; cheerCd = 0; cheerN = 0; jitterSeed = Math.random() * 100;
    done = false; endWait = 0; finished = false;
    ready = 0; hitStop = 0; shake = 0;
  }

  function computeFinishTimes() {
    var base = 4.6;
    for (var i = 0; i < LANES; i++) {
      var speedBias = (1 - form[i]) * 1.4; // 調子が良いほど速い(タイムが短い)
      finishTime[i] = base + speedBias + (Math.random() * 0.6 - 0.3);
      if (i === pickIdx) finishTime[i] -= 0.35; // 選んだ走者はやや有利
    }
    var minT = Math.min.apply(null, finishTime);
    winnerIdx = finishTime.indexOf(minT);
    // near_miss: 選んだ走者が勝てなかった場合、僅差(0.12〜0.45s差)に必ず寄せる
    if (winnerIdx !== pickIdx) {
      finishTime[pickIdx] = finishTime[winnerIdx] + 0.12 + Math.random() * 0.33;
    }
  }

  function pickLane(idx) {
    if (phase !== 'pick' || idx < 0 || idx >= LANES) return;
    pickIdx = idx;
    computeFinishTimes();
    game.feedback.good(LANE_X[idx], TRACK_Y0, { text: 'PICK', color: RUNNER_COL[idx] });
    game.audio.play('se_powerup', 0.4);
    phase = 'ready'; phaseT = 0.8;
  }

  function cheer() {
    if (phase !== 'race' || cheerCd > 0) return;
    cheerCd = 0.32;
    cheerN++;
    game.feedback.good(LANE_X[pickIdx], laneY(pickIdx), { text: null, count: 6 });
    game.audio.play('se_tap', 0.2);
    if (cheerN % 4 === 0) game.fx.popup('COMBO x' + cheerN, W / 2, H * 0.20, { color: C.gold, size: 32 });
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.press = false; return; }
    if (phase === 'pick') {
      var best = -1, bd = 999;
      for (var i = 0; i < LANES; i++) { var d = Math.abs(x - LANE_X[i]); if (d < bd) { bd = d; best = i; } }
      if (bd < 110) pickLane(best); else { game.feedback.bad(x, y, { text: null }); }
    } else if (phase === 'race' && y > H * 0.78) {
      cheer();
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.4);
    endWait = 1.4;
  }

  function resolveRace() {
    finished = true;
    ok = winnerIdx === pickIdx;
    gapSec = Math.round(Math.abs(finishTime[pickIdx] - finishTime[winnerIdx]) * 100) / 100;
    hitStop = 0.35;
    if (ok) {
      game.feedback.good(LANE_X[pickIdx], TRACK_Y1, { text: 'WIN', color: C.gold });
      game.fx.burst(LANE_X[pickIdx], TRACK_Y1, { color: C.gold, count: 20, speed: 380 });
    } else {
      game.feedback.bad(LANE_X[pickIdx], TRACK_Y1, { text: 'LOSE' });
      shake = 0.2;
    }
    finish();
  }

  var demo = { t: 0, gx: LANE_X[0], gy: TRACK_Y0, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.5;
    if (cyc < dt || demo.t <= dt) { initGame(); pickIdx = 1; computeFinishTimes(); winnerIdx = 1; finishTime[1] = 4.0; phase = 'race'; }
    if (cyc < 1.0) { phase = 'scout'; elapsed = 0; }
    else if (cyc < 1.6) {
      phase = 'pick';
      demo.gx += (LANE_X[1] - demo.gx) * Math.min(1, dt * 6);
      demo.gy += (TRACK_Y0 - demo.gy) * Math.min(1, dt * 6);
      demo.press = cyc > 1.3 && cyc < 1.45;
    } else {
      phase = 'race';
      elapsed = Math.min(finishTime[1], (cyc - 1.6) * 1.3);
      demo.gy = H * 0.90;
      demo.gx = W * 0.5;
      demo.press = Math.floor((cyc - 1.6) * 6) % 2 === 0;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (form === undefined) initGame();
      trackBg();
      stepDemo(dt);
      for (var i = 0; i < LANES; i++) {
        var y = phase === 'race' ? laneY(i) : TRACK_Y0;
        var jitter = Math.sin(game.time.elapsed * 9 + jitterSeed + i) * 3;
        if (phase === 'scout' || phase === 'pick') game.draw.circle(LANE_X[i], TRACK_Y0, 60 + form[i] * 40, RUNNER_COL[i], 0.25 + form[i] * 0.35);
        game.draw.sprite(RUNNER_SPRITE, { '#': RUNNER_COL[i] }, LANE_X[i] + jitter, y, 14, { anchor: 'center' });
      }
      game.draw.hand(demo.gx + Math.cos(game.time.elapsed * 2.5) * 34, demo.gy + Math.sin(game.time.elapsed * 2.5) * 34, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? 'WIN' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      trackBg();
      for (var i2 = 0; i2 < LANES; i2++) game.draw.sprite(RUNNER_SPRITE, { '#': RUNNER_COL[i2] }, LANE_X[i2], laneY(i2), 14, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      if (!ok) txt('あと' + gapSec.toFixed(2) + '秒差!', W / 2, H * 0.13, 30, C.bad);
      else txt(gapSec.toFixed(2) + '秒差', W / 2, H * 0.13, 26, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 24, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(1, { gapSec: gapSec, cheerN: cheerN });
        else game.end.failure({ gapSec: gapSec, cheerN: cheerN });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (phase === 'scout') {
      phaseT -= dt;
      if (phaseT <= 0) { phase = 'pick'; }
    } else if (phase === 'ready') {
      phaseT -= dt;
      if (phaseT <= 0) { phase = 'race'; game.audio.play('se_tap'); }
    } else if (phase === 'race' && !finished) {
      elapsed += dt;
      if (cheerCd > 0) cheerCd -= dt;
      var minFinish = Math.min.apply(null, finishTime);
      if (elapsed >= minFinish && !finished) {
        resolveRace();
      } else if (Math.floor(elapsed * 2) > Math.floor((elapsed - dt) * 2) && minFinish - elapsed < 1.2) {
        game.fx.popup('あと少し!', W / 2, H * 0.30, { color: C.gold, size: 34 });
      }
    }
    if (shake > 0) shake -= dt;

    trackBg();
    for (var i3 = 0; i3 < LANES; i3++) {
      var y3 = phase === 'race' ? laneY(i3) : TRACK_Y0;
      var jitter3 = Math.sin(game.time.elapsed * 9 + jitterSeed + i3) * 3;
      if (phase === 'scout' || phase === 'pick') game.draw.circle(LANE_X[i3], TRACK_Y0, 60 + form[i3] * 40, RUNNER_COL[i3], 0.25 + form[i3] * 0.35);
      game.draw.sprite(RUNNER_SPRITE, { '#': RUNNER_COL[i3] }, LANE_X[i3] + jitter3, y3, 14, { anchor: 'center' });
      if (i3 === pickIdx) game.draw.circle(LANE_X[i3] + jitter3, y3 + 46, 10, C.gold);
    }

    if (phase === 'ready') txt(phaseT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.10, 40, C.gold);
    if (phase === 'race' && pickIdx >= 0) {
      var progress = Math.min(1, elapsed / finishTime[pickIdx]);
      txt(String(cheerN), W / 2, H * 0.10, 30, C.white);
      game.draw.rect(60, 60, W - 120, 20, C.lane);
      game.draw.rect(60, 60, (W - 120) * progress, 20, RUNNER_COL[pickIdx]);
      game.draw.rect(60, H * 0.86, W - 120, 90, C.lane, 0.5);
    }
  });

  game.onStart(function() {
    game.audio.bgm('bgm_cute', 0.09);
    state = S.ATTRACT;
    initGame();
  });
})(game);
