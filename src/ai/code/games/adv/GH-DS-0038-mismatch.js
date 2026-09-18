// GH-DS-0038-mismatch.js
// ミスマッチ — 3人のうち、証言(天気アイコン)と見た目(濡れ具合)が食い違う1人を指す
// 操作: 天気アイコンが出そろったら、矛盾している人物をタップ
// 終わり: 正誤と、見抜くまでの秒数が残る
// @mechanic: judge
// @theme: interview_room
// 世界観: 取調室。3人が同じ質問(天気)に答える。晴れと言うなら乾いているはず、雨と言うなら濡れているはず。1人だけ違う
// 残るもの: 正誤(CLEAR/GAME OVER) + 見抜くまでの秒数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 1BIT INK: 白黒2値。ディザで階調、線の太さで語る
  var C = {
    paper: '#f0ece0', ink: '#141212', mid: '#8a8478', accent: '#141212',
    good: '#141212', bad: '#141212', white: '#f0ece0',
  };

  var GAME_TITLE = 'MISMATCH';
  var REVEAL_STEP = 0.9, DECIDE_TIME = 5.0;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, reactTime = 0;

  var suspects, culprit, revealIdx, revealT, decideT, phase, done, endWait;
  var ready, hitStop, shake, decideStart;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function dither(x, y, w, h, a) {
    for (var yy = 0; yy < h; yy += 6) {
      for (var xx = (yy % 12 === 0 ? 0 : 6); xx < w; xx += 12) game.draw.rect(x + xx, y + yy, 3, 3, C.ink, a);
    }
  }

  var PERSON = ['.##.', '####', '.##.', '####', '.##.', '####'];
  var PERSON_PAL = { '#': C.ink };
  var SUN = ['.#.#.', '..#..', '#.#.#', '..#..', '.#.#.'];
  var SUN_PAL = { '#': C.ink };
  var RAIN = ['.###.', '#####', '#####', '.#.#.', '#.#.#'];
  var RAIN_PAL = { '#': C.ink };
  var DROP = ['.#.', '###', '###'];
  var DROP_PAL = { '#': C.ink };
  var FOLDER = ['######', '#....#', '#....#', '#....#', '######'];
  var FOLDER_PAL = { '#': C.ink };
  var PEN = ['#', '#', '#', '#', '.'];
  var PEN_PAL = { '#': C.ink };

  function paperBg() {
    game.draw.gradient(0, H, [[0, '#e8e2d2'], [0.5, C.paper], [1, '#e2dccc']]);
    dither(0, H * 0.85, W, H * 0.15, 0.5);
    dither(0, 0, W, H * 0.10, 0.3);
    // 取調室の机(人物カード下の空きを埋める)
    game.draw.rect(0, H * 0.53, W, 6, C.ink, 0.7);
    dither(0, H * 0.535, W, H * 0.11, 0.20);
    game.draw.sprite(FOLDER, FOLDER_PAL, W * 0.18, H * 0.58, 8, { anchor: 'center' });
    game.draw.sprite(PEN, PEN_PAL, W * 0.82, H * 0.585, 8, { anchor: 'center' });
    game.draw.rect(0, H * 0.78, W, 4, C.ink, 0.6);
  }

  function newRound() {
    culprit = Math.floor(Math.random() * 3);
    suspects = [];
    for (var i = 0; i < 3; i++) {
      var claimSun = Math.random() < 0.5;
      var wet = i === culprit ? claimSun : !claimSun;   // 非犯人は claim と一致、犯人だけ矛盾
      suspects.push({ claimSun: claimSun, wet: wet, revealed: false });
    }
    revealIdx = 0; revealT = 0; phase = 'reveal'; decideStart = null;
  }

  function initGame() {
    done = false; endWait = 0; ready = 0.8; hitStop = 0; shake = 0; decideT = 0;
    newRound();
  }

  var SX = [W * 0.22, W * 0.50, W * 0.78];
  var SY = H * 0.42;

  function drawSuspect(i, x, revealed) {
    var s = suspects[i];
    game.draw.rect(x - 90, SY - 130, 180, 260, C.paper);
    game.draw.rect(x - 90, SY - 130, 180, 260, C.ink, 0.0);
    dither(x - 86, SY - 126, 172, 252, 0.10);
    game.draw.sprite(PERSON, PERSON_PAL, x, SY + 40, 18, { anchor: 'center' });
    game.draw.rect(x - 92, SY - 132, 184, 264, 'transparent');
    // 枠線
    game.draw.line(x - 92, SY - 132, x + 92, SY - 132, C.ink, 4);
    game.draw.line(x - 92, SY - 132, x - 92, SY + 132, C.ink, 4);
    game.draw.line(x + 92, SY - 132, x + 92, SY + 132, C.ink, 4);
    game.draw.line(x - 92, SY + 132, x + 92, SY + 132, C.ink, 4);
    if (revealed) {
      // 証言アイコン(吹き出し)
      game.draw.circle(x, SY - 150, 40, C.paper);
      game.draw.line(x - 40, SY - 150, x + 40, SY - 150, C.ink, 3);
      game.draw.line(x, SY - 190, x, SY - 110, C.ink, 3);
      game.draw.line(x - 40, SY - 110, x, SY - 130, C.ink, 3); game.draw.line(x - 40, SY - 150, x, SY - 130, C.ink, 3);
      game.draw.line(x + 40, SY - 110, x, SY - 130, C.ink, 3); game.draw.line(x + 40, SY - 150, x, SY - 130, C.ink, 3);
      game.draw.sprite(s.claimSun ? SUN : RAIN, s.claimSun ? SUN_PAL : RAIN_PAL, x, SY - 150, 8, { anchor: 'center' });
      // 濡れ具合(足元の雫)
      if (s.wet) {
        game.draw.sprite(DROP, DROP_PAL, x - 30, SY + 150, 5, { anchor: 'center' });
        game.draw.sprite(DROP, DROP_PAL, x + 24, SY + 156, 5, { anchor: 'center' });
        dither(x - 70, SY + 130, 140, 30, 0.35);
      }
    } else {
      txt('?', x, SY - 120, 60, C.mid);
    }
  }

  function decide(i) {
    if (phase !== 'decide') return;
    ok = i === culprit;
    reactTime = decideT;
    hitStop = 0.15; shake = ok ? 0.1 : 0.25;
    if (ok) { game.feedback.good(SX[i], SY, { text: 'HIT', color: C.good }); game.fx.burst(SX[i], SY, { color: C.ink, count: 14, speed: 340 }); game.audio.play('se_success', 0.5); }
    else { game.feedback.bad(SX[i], SY, { text: 'MISS' }); game.audio.play('se_bad', 0.5); }
    finish();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || ready > 0 || phase !== 'decide') return;
    var idx = -1, best = 999;
    for (var i = 0; i < 3; i++) { var d = Math.abs(x - SX[i]); if (d < best) { best = d; idx = i; } }
    if (best < 140) decide(idx);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure');
    endWait = 1.4;
  }

  // ── ATTRACT ゴースト実演: 全員出そろってから、矛盾した1人を指す ──
  var demo = { t: 0, gx: SX[1], gy: SY + 300, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.5;
    if (revealIdx === undefined || demo.t < dt) newRound();
    if (cyc < 0.05 && demo.t > 0.06) newRound();
    var revN = Math.min(3, Math.floor(cyc / REVEAL_STEP) + (cyc > 3 ? 3 : 0));
    for (var i = 0; i < 3; i++) drawSuspect(i, SX[i], cyc > i * REVEAL_STEP + 0.3);
    if (cyc > 3.2) {
      var tx = SX[culprit];
      demo.gx += (tx - demo.gx) * Math.min(1, dt * 6);
      demo.gy += (SY - demo.gy) * Math.min(1, dt * 6);
      demo.press = cyc > 3.7 && cyc < 3.9;
      if (cyc > 3.7 && cyc < 3.73) { game.feedback.good(tx, SY, { text: 'HIT', color: C.good }); game.fx.burst(tx, SY, { color: C.ink, count: 10, speed: 300 }); }
    } else {
      demo.gx += (SX[1] - demo.gx) * Math.min(1, dt * 4);
      demo.gy += ((SY + 320) - demo.gy) * Math.min(1, dt * 4);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (suspects === undefined) newRound();
      paperBg();
      stepDemo(dt);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.10, 64, C.ink);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.15, 32, C.mid);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 50, C.ink);
        txt('TAP TO START', W / 2, H * 0.95, 40, C.ink);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 34, C.mid);
      }
      return;
    }

    if (state === S.RESULT) {
      paperBg();
      for (var i = 0; i < 3; i++) drawSuspect(i, SX[i], true);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.10, 58, C.ink);
      txt(ok ? reactTime.toFixed(1) + 's' : '---', W / 2, H * 0.17, 44, C.ink);
      var best = game.best;
      if (ok && (best === 0 || reactTime < best)) txt('NEW RECORD', W / 2, H * 0.24, 38, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.90, 38, C.mid);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success({ time: reactTime.toFixed(1) });
        else game.end.failure({ time: reactTime > 0 ? reactTime.toFixed(1) : 'TIMEUP' });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (phase === 'reveal') {
      revealT += dt;
      var idx2 = Math.floor(revealT / REVEAL_STEP);
      if (idx2 > revealIdx && revealIdx < 3) { revealIdx = idx2; game.audio.tone(440 + revealIdx * 80, 0.12, { wave: 'square', volume: 0.15 }); if (revealIdx === 3) game.fx.popup('3 / 3', W / 2, H * 0.62, { color: C.ink, size: 46 }); }
      if (revealT > 3 * REVEAL_STEP + 0.3) { phase = 'decide'; decideT = 0; }
    } else if (phase === 'decide') {
      decideT += dt;
      if (decideT > DECIDE_TIME) { ok = false; reactTime = 0; finish(); }
    }
    if (shake > 0) shake -= dt;

    paperBg();
    for (var s2 = 0; s2 < 3; s2++) drawSuspect(s2, SX[s2], phase === 'decide' || revealT > s2 * REVEAL_STEP + 0.3);

    txt(phase === 'reveal' ? '証言中...' : '矛盾した人物をタップ', W / 2, H * 0.68, 34, C.mid);
    var barFrac = phase === 'reveal' ? Math.min(1, revealT / (3 * REVEAL_STEP + 0.3)) : Math.max(0, 1 - decideT / DECIDE_TIME);
    game.draw.rect(60, H * 0.72, W - 120, 16, C.mid, 0.3);
    game.draw.rect(60, H * 0.72, (W - 120) * barFrac, 16, C.ink);
    txt(Math.min(3, revealIdx) + ' / ' + 3, W / 2, H * 0.06, 40, C.ink);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.30, 76, C.ink);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
