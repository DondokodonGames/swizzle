// K-X-0019-ring-altar-pulse.js
// リングアルターパルス — 石の祭壇に広がる光の輪を、広がりきった瞬間に手をかざして灯す
// 操作: 中央から広がっていく光の輪を、最大まで広がった瞬間に画面タップする
// 終わり: 規定回数(5回)灯し切れば成功。タイミングを外せば失敗
// @mechanic: timing_one_shot
// @theme: ring_altar_pulse
// 世界観: 石造りの祭壇の前に立つ守り手。祭壇が放つ光の輪は徐々に広がり、広がりきった一瞬だけ手をかざすと灯が宿る
// 残るもの: 正誤(CLEAR/GAME OVER) + 灯せた回数とSCORE
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 黒に近い背景+発光する原色リング、太いネオン管の縁取り
  var C = {
    bg: '#0a0410', bg2: '#170a24', ring: '#ffb300', ringGlow: '#4a2c00',
    perfect: '#ff2ec4', good: '#39ff6a', bad: '#ff3355', gold: '#ffe600',
    white: '#ffffff', ink: '#05020a',
  };

  var GAME_TITLE = 'RING PULSE';
  var TOTAL = 5;
  var CX = W * 0.5, CY = H * 0.46;
  var DURS = [2.2, 2.0, 1.8, 1.7, 1.6];
  var R = 260;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var hits, score, round, ringT, resolved, done, endWait, finished;
  var ready, hitStop, shake, flashRing;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var IDOL = ['.##.', '####', '.##.', '####', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) game.draw.circle(CX, CY, 60 + i * 90, C.ringGlow, 0.05);
  }

  function drawIdol(bob) {
    game.draw.sprite(IDOL, { '#': C.gold }, CX, H * 0.86 + bob, 20, { anchor: 'center' });
  }

  function ringAt(x, y, r, color, w) {
    if (r <= (w || 12)) { game.draw.circle(x, y, Math.max(2, r), color, 0.9); return; }
    game.draw.circle(x, y, r + (w || 12), color, 0.9);
    game.draw.circle(x, y, r - (w || 12), C.bg, 1);
  }

  function initGame() {
    hits = 0; score = 0; round = 0; ringT = 0; resolved = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; flashRing = 0;
  }

  function resolveTap() {
    if (state !== S.PLAYING || ready > 0 || done || finished || resolved) return;
    resolved = true;
    var dur = DURS[round];
    var ratio = ringT / dur;
    var golden = round === TOTAL - 1;
    if (ratio >= 0.92 && ratio <= 1.1) {
      hits++;
      score += golden ? 300 : 150;
      hitStop = 0.12; flashRing = 0.2;
      game.feedback.good(CX, CY, { text: 'PERFECT', color: C.perfect });
      game.fx.burst(CX, CY, { color: golden ? C.gold : C.perfect, count: 20, speed: 380 });
      if (hits === Math.ceil(TOTAL / 2)) { game.fx.popup('HALFWAY!', CX, CY - 300, { color: C.gold, size: 36 }); game.audio.play('se_milestone', 0.4); }
    } else if (ratio >= 0.72 && ratio <= 1.35) {
      hits++;
      score += golden ? 160 : 80;
      hitStop = 0.1; flashRing = 0.15;
      game.feedback.good(CX, CY, { text: 'GOOD', color: C.good });
    } else {
      hitStop = 0.3; shake = 0.3;
      game.feedback.bad(CX, CY, { text: 'MISS' });
      ok = false; finished = true; finish();
      return;
    }
    round++;
    if (round >= TOTAL) { ok = true; finished = true; finish(); return; }
    ringT = 0; resolved = false;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) { game.audio.play('se_tap', 0.05); resolveTap(); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: CY, press: false, did: false };
  function stepDemo(dt) {
    demo.t += dt;
    var dur = 1.8;
    var cyc = demo.t % dur;
    if (cyc < dt || demo.t <= dt) { round = 0; hits = 0; demo.did = false; }
    ringT = cyc;
    demo.gx = CX + Math.sin(game.time.elapsed * 2.2) * 14;
    demo.gy = CY + Math.cos(game.time.elapsed * 1.7) * 10;
    demo.press = (cyc / dur) > 0.85;
    if (demo.press && !demo.did) {
      demo.did = true;
      game.feedback.good(CX, CY, { text: 'PERFECT', color: C.perfect, sound: 'se_good', volume: 0.2 });
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      var dr = R * Math.min(1.35, ringT / 1.8);
      ringAt(CX, CY, dr, C.ring, 12);
      drawIdol(Math.sin(game.time.elapsed * 3) * 6);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
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
      drawIdol(0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(hits + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      txt('SCORE ' + score, W / 2, H * 0.18, 26, C.white);
      if (!ok) txt('あと' + (TOTAL - hits) + '!', W / 2, H * 0.23, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(score, { hits: hits, total: TOTAL });
        else game.end.failure({ hits: hits, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      ringT += dt;
      var curDur = DURS[round];
      if (ringT / curDur > 1.35 && !resolved) {
        resolved = true;
        hitStop = 0.3; shake = 0.3;
        game.feedback.bad(CX, CY, { text: 'MISS' });
        ok = false; finished = true; finish();
      }
    }
    if (flashRing > 0) flashRing -= dt;
    if (shake > 0) shake -= dt;

    bg();
    var ringR = R * Math.min(1.35, (ringT || 0) / DURS[Math.min(round, TOTAL - 1)]);
    ringAt(CX, CY, ringR, flashRing > 0 ? C.white : (round === TOTAL - 1 ? C.gold : C.ring), 12);
    drawIdol(0);

    txt(hits + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (hits / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.3], ['E4', 0.3], ['G4', 0.3], ['C5', 0.6]], { tempo: 140, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
