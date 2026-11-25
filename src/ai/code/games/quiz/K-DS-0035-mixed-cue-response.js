// K-DS-0035-mixed-cue-response.js
// ミックスキュー・レスポンス — 3種の合図が入り混じって出題され、その都度正しいゾーンを正確なタイミングで押す
// 操作: 中央に現れる合図の色/形に対応する下部3ゾーン(左・中央・右)を、点灯している間にタップする
// 終わり: 規定回数(6回)全て正しいゾーン・正しいタイミングで反応すれば成功。1回でも外せば失敗
// @mechanic: judge
// @theme: mixed_cue_response
// 世界観: 独自デザインの試験官の前に座る受験者。入り混じって出る3種の合図それぞれに、正しい手元ゾーンで即応する適性検査
// 残るもの: 正誤(CLEAR/GAME OVER) + 正答できた回数
// スタイル: HD POST 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 深みのある陰影グラデーション、金属的なハイライトの帯
  var C = {
    bg: '#182028', bg2: '#0c1218', panel: '#243040', panelEdge: '#3a4a5e',
    a: '#3ad4ff', b: '#ff5a7a', c: '#ffd23a',
    good: '#4dffa0', bad: '#ff3a4a', gold: '#ffe23a', white: '#eef4fa', ink: '#040608',
  };

  var ZONE_COL = [C.a, C.b, C.c];
  var GAME_TITLE = 'MIXED CUE';
  var TOTAL = 6;
  var CUE_Y = H * 0.4;
  var ZONE_Y = H * 0.78;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var hits, done, endWait, finished;
  var ready, hitStop, shake, round, cue, cueT, cueDur, zoneFlash, zoneFlashT;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CUE_SPR = ['.#.', '###', '.#.'];
  var EXAMINEE = ['.##.', '####', '.##.'];

  function zoneX(i) { return W * (0.2 + i * 0.3); }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 3; i++) {
      game.draw.rect(zoneX(i) - 90, ZONE_Y - 60, 180, 120, C.panel);
      game.draw.rect(zoneX(i) - 90, ZONE_Y - 60, 180, 8, C.panelEdge);
    }
  }

  function newCueDur() {
    var n = Math.min(round, TOTAL - 1);
    return Math.max(0.85, 1.4 - n * 0.09);
  }

  function initGame() {
    hits = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; round = 0; zoneFlash = -1; zoneFlashT = 0;
    cue = Math.floor(Math.random() * 3); cueT = 0; cueDur = 1.4;
  }

  function resolveZone(tappedZone) {
    if (finished || ready > 0 || done) return;
    game.audio.play('se_tap', 0.05);
    var p = cueT / cueDur;
    if (tappedZone === cue && p > 0.25) {
      hits++; hitStop = 0.08; zoneFlash = cue; zoneFlashT = 0.35;
      game.feedback.good(zoneX(cue), ZONE_Y, { text: 'GOOD', color: C.good });
      game.fx.burst(zoneX(cue), ZONE_Y, { color: ZONE_COL[cue], count: 14, speed: 300 });
      game.audio.play('se_good', 0.4);
      if (hits === Math.ceil(TOTAL / 2)) game.fx.popup('SHARP!', W / 2, CUE_Y - 200, { color: C.gold, size: 36 });
      if (hits >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++;
      cue = Math.floor(Math.random() * 3); cueT = 0; cueDur = newCueDur();
    } else {
      failCue();
    }
  }

  function failCue() {
    hitStop = 0.3;
    game.feedback.bad(zoneX(cue), ZONE_Y, { text: 'MISS' });
    shake = 0.28;
    game.audio.play('se_bad', 0.4);
    ok = false; finished = true; finish();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING) return;
    var zone = 0, bd = 1e9;
    for (var i = 0; i < 3; i++) { var d = Math.abs(x - zoneX(i)); if (d < bd) { bd = d; zone = i; } }
    resolveZone(zone);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawScene() {
    game.draw.sprite(EXAMINEE, { '#': C.white }, W * 0.5, H * 0.16, 26, { anchor: 'center' });
    if (!finished) {
      var p = cueT / cueDur;
      if (p > 0.5) {
        var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
        if (blink) game.draw.circle(zoneX(cue), ZONE_Y, 110, ZONE_COL[cue], 0.25);
      }
      game.draw.sprite(CUE_SPR, { '#': ZONE_COL[cue] }, W * 0.5, CUE_Y, 34, { anchor: 'center' });
    }
    for (var i = 0; i < 3; i++) {
      var lit = zoneFlash === i && zoneFlashT > 0;
      game.draw.circle(zoneX(i), ZONE_Y, lit ? 68 : 50, ZONE_COL[i], lit ? 0.9 : 0.35);
    }
  }

  var demo = { t: 0, gx: zoneX(0), gy: ZONE_Y, press: false, c: 0, ct: 0, cd: 1.1 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) { round = 0; demo.c = Math.floor(demo.t / 2.6) % 3; demo.ct = 0; demo.cd = 1.1; demo.hit = false; }
    demo.ct += dt;
    cue = demo.c; cueT = demo.ct; cueDur = demo.cd;
    demo.gx = zoneX(demo.c);
    var p = demo.ct / demo.cd;
    if (p > 0.6 && !demo.hit) {
      demo.hit = true; demo.press = true; zoneFlash = demo.c; zoneFlashT = 0.35;
      game.feedback.good(zoneX(demo.c), ZONE_Y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.2);
    }
    if (zoneFlashT > 0) zoneFlashT -= dt;
    if (demo.hit && p > 0.9) { demo.press = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 20 });
      txt(GAME_TITLE, W / 2, H * 0.06, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.1, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 46, ok ? C.good : C.bad);
      txt(hits + ' / ' + TOTAL, W / 2, H * 0.11, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - hits) + '問!', W / 2, H * 0.16, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (zoneFlashT > 0) zoneFlashT -= dt;

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
      cueT += dt;
      if (cueT >= cueDur) failCue();
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(hits + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (hits / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.6, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
