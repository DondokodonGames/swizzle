// K-DS-0044-echo-verse-relay.js
// エコーヴァースリレー — 呼びかけ役が発した節回しを、同じリズムで返す掛け合い
// 操作: 呼びかけ役の光る合図(節)が鳴った直後、同じ拍でタップして節を返す
// 終わり: 規定本数(6節)を全てタイミングよく返せば成功。3回外せば失敗
// @mechanic: rhythm
// @theme: call_and_response_duet
// 世界観: 広場の即興掛け合い。呼びかけ役が節を投げ、返し役(プレイヤー)は同じ拍で節を打ち返し続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + PERFECTで返した節の数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 明るいパステルグラデ背景、太い白縁取り文字、光の柱と星
  var C = {
    bg1: '#fff4e0', bg2: '#ffd9ec', pillar: '#ffffff',
    caller: '#ff7a3d', callerDark: '#c8501a', responder: '#3d8bff', responderDark: '#1a4fa8',
    note: '#ffd400', noteGlow: '#fff3b0', good: '#33d17a', bad: '#ff4d6a',
    gold: '#ff9f1c', white: '#ffffff', ink: '#3a2a12',
  };

  var GAME_TITLE = 'ECHO VERSE';
  var TOTAL = 6;
  var MISS_LIMIT = 3;
  var CX = W * 0.5;
  var HIT_Y = H * 0.62;
  var CALL_Y = H * 0.24;
  var TRAVEL = 1.05; // 秒: 発生から判定ラインまでの到達時間
  var WINDOW_PERFECT = 0.11;
  var WINDOW_GOOD = 0.22;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CALLER_S = ['.####.', '#.##.#', '######', '.####.', '..##..'];
  var RESP_S = ['.####.', '#.##.#', '######', '.####.', '.#..#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    for (var i = 0; i < 5; i++) {
      var px = W * (0.12 + i * 0.19);
      game.draw.rect(px - 14, 0, 28, H, C.pillar, 0.08);
    }
  }

  var seq, idx, hits, misses, hitScores, done, endWait, finished;
  var ready, hitStop, shake, noteT, curJudge, judgeT, callerPulse, callerPulseT;

  function buildSeq() {
    // 呼びかけの節パターン: 間隔がだんだんタイトに/ばらつくよう作る
    var out = [];
    var gaps = [0.95, 0.62, 0.9, 0.55, 0.78, 0.5];
    var t = 0.9;
    for (var i = 0; i < TOTAL; i++) {
      t += gaps[i % gaps.length];
      out.push(t);
    }
    return out;
  }

  function initGame() {
    seq = buildSeq(); idx = 0; hits = 0; misses = 0; hitScores = [];
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; noteT = 0;
    curJudge = ''; judgeT = 0; callerPulse = 0; callerPulseT = -1;
  }

  function currentCallTime() { return idx < seq.length ? seq[idx] : 1e9; }

  function resolveMiss() {
    misses++;
    hitStop = 0.3;
    game.feedback.bad(CX, HIT_Y, { text: 'MISS' });
    shake = 0.22;
    game.audio.play('se_bad', 0.4);
    idx++;
    if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); }
  }

  function resolveHit(judgeStr) {
    hits++;
    hitScores.push(judgeStr);
    hitStop = judgeStr === 'PERFECT' ? 0.08 : 0.05;
    game.feedback.good(CX, HIT_Y, { text: judgeStr, color: judgeStr === 'PERFECT' ? C.gold : C.good });
    game.fx.burst(CX, HIT_Y, { color: judgeStr === 'PERFECT' ? C.gold : C.good, count: judgeStr === 'PERFECT' ? 16 : 10, speed: 300 });
    game.audio.play('se_good', 0.4);
    if (hits === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, HIT_Y - 200, { color: C.gold, size: 40 });
    idx++;
    if (idx >= TOTAL) { ok = true; finished = true; finish(); }
  }

  function tryTap() {
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    var callT = currentCallTime();
    var dt2 = noteT - callT;
    if (Math.abs(dt2) <= WINDOW_PERFECT) { resolveHit('PERFECT'); }
    else if (Math.abs(dt2) <= WINDOW_GOOD) { resolveHit('GOOD'); }
    else { /* 早すぎ/遅すぎタップは反応だけ返し判定は流さない */ game.audio.play('se_tap', 0.15); }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    tryTap();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawCaller(pulse) {
    var s = 1 + pulse * 0.25;
    game.draw.circle(CX, CALL_Y, 96 * s, C.callerDark, 0.35);
    game.draw.sprite(CALLER_S, { '#': C.caller }, CX, CALL_Y, 24 * s, { anchor: 'center' });
  }

  function drawResponder(hitPulse) {
    var s = 1 + hitPulse * 0.2;
    game.draw.circle(CX, HIT_Y + 210, 90 * s, C.responderDark, 0.3);
    game.draw.sprite(RESP_S, { '#': C.responder }, CX, HIT_Y + 210, 24 * s, { anchor: 'center' });
  }

  function drawTrack() {
    game.draw.line(CX, CALL_Y + 70, CX, HIT_Y + 60, '#00000018', 40);
    game.draw.line(CX - 130, HIT_Y, CX + 130, HIT_Y, C.responder, 8);
    game.draw.circle(CX, HIT_Y, 20, C.white, 0.6);
  }

  function drawNotes(nowT, lookAhead) {
    for (var i = idx; i < seq.length; i++) {
      var callT = seq[i];
      if (callT > nowT + lookAhead) break;
      if (callT < nowT - 0.35 && i === idx) continue;
      var p = 1 - Math.min(1, Math.max(0, (callT - nowT) / TRAVEL));
      var y = CALL_Y + 70 + (HIT_Y - CALL_Y - 70) * p;
      var glow = callT - nowT < 0.5 && callT - nowT > -0.3;
      game.draw.circle(CX, y, glow ? 26 : 20, C.noteGlow, glow ? 0.9 : 0.5);
      game.draw.circle(CX, y, 16, C.note);
    }
  }

  var demo = { t: 0, gx: CX, gy: HIT_Y + 460, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt || demo.t <= dt) { idx = 0; hits = 0; misses = 0; noteT = 0; }
    noteT = cyc;
    var callT = currentCallTime();
    callerPulseT = callT;
    callerPulse = Math.max(0, 1 - Math.abs(noteT - (callT - TRAVEL * 0.15)) * 6);
    if (noteT >= callT - 0.02 && noteT <= callT + 0.02 && idx < seq.length) {
      demo.press = true;
      game.feedback.good(CX, HIT_Y, { text: 'PERFECT', color: C.gold, sound: 'se_good', volume: 0.25 });
      game.fx.burst(CX, HIT_Y, { color: C.gold, count: 12, speed: 260 });
      idx++;
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (seq === undefined) initGame();
      bg();
      stepDemo(dt);
      drawTrack();
      drawNotes(noteT, TRAVEL + 0.1);
      drawCaller(callerPulse);
      drawResponder(demo.press ? 1 : 0);
      game.draw.hand(CX, HIT_Y + 460, { press: demo.press, scale: 20 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.responderDark);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.responderDark);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawTrack();
      drawCaller(0);
      drawResponder(0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(hits + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - hits) + '節!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var perfects = hitScores.filter(function(s) { return s === 'PERFECT'; }).length;
        if (ok) game.end.success(hits, { hits: hits, total: TOTAL, perfects: perfects });
        else game.end.failure({ hits: hits, total: TOTAL, perfects: perfects });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) { game.audio.play('se_tap'); noteT = 0; }
    } else if (!finished) {
      noteT += dt;
      var callT = currentCallTime();
      callerPulse = Math.max(0, 1 - Math.abs(noteT - callT) * 6);
      if (noteT > callT + WINDOW_GOOD) resolveMiss();
    }
    if (shake > 0) shake -= dt;

    bg();
    drawTrack();
    if (!finished) drawNotes(noteT, TRAVEL + 0.1);
    drawCaller(callerPulse);
    drawResponder(hitStop > 0 && hitStop > 0.02 ? 1 : 0);

    txt(hits + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.responderDark);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.15);
    game.draw.rect(60, 150, (W - 120) * (hits / TOTAL), 16, C.gold);
    for (var m = 0; m < MISS_LIMIT; m++) {
      game.draw.circle(W - 90 - m * 44, 120, 14, m < misses ? C.bad : '#00000022');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.5], ['G4', 0.5], ['A4', 0.5], ['E5', 1]], { tempo: 118, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
