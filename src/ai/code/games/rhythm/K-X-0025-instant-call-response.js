// K-X-0025-instant-call-response.js
// インスタントコールレスポンス — 問いかけられた合図の直後、間を置かずに答えて返す
// 操作: 呼びかけの合図(吹き出し)が出た瞬間、すぐに画面をタップして答える。合図の前に押すと失格
// 終わり: 規定回数(6回)を間を置かず答えられれば成功。1回でも早押し/遅れれば失敗
// @mechanic: reaction_duel
// @theme: call_response_instant
// 世界観: 稽古場の問答。師が不定の間を置いて問いを投げ、弟子(プレイヤー)は合図が出た瞬間だけ間を置かずに答え返す
// 残るもの: 正誤(CLEAR/GAME OVER) + 答えられた回数とSCORE
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 紙のような明るい下地に濃い墨色、差し色は朱一色のみ
  var C = {
    bg: '#f2ece0', bg2: '#e6ddc9', ink: '#171310', paper: '#f7f1e4',
    accent: '#b23a2c', good: '#2f6b3a', bad: '#b23a2c', gold: '#8a6d1f',
  };

  var GAME_TITLE = 'CALL BACK';
  var ROUNDS = 6;
  var CX = W * 0.5;
  var CUE_Y = H * 0.30, RESP_Y = H * 0.82;
  var CUE_LIMIT = 0.7;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var roundIdx, hits, score, phase, waitT, waitDur, cueT;
  var done, endWait, finished, ready, hitStop, shake, flashCue;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.paper, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CALLER = ['.##.', '####', '.##.', '###.', '#.#.'];
  var RESPONDER = ['.##.', '####', '.##.', '.##.', '#.#.'];
  var BUBBLE = ['.###.', '#...#', '#####', '..#..'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 5; i++) game.draw.rect(0, i * (H / 5), W, 2, '#00000006');
  }

  function drawScene(cueOn, sway) {
    game.draw.sprite(CALLER, { '#': C.ink }, CX + (sway ? Math.sin(game.time.elapsed * 2.2) * 8 : 0), CUE_Y, 20, { anchor: 'center' });
    if (cueOn) game.draw.sprite(BUBBLE, { '#': C.accent }, CX + 140, CUE_Y - 60, 14, { anchor: 'center' });
    game.draw.sprite(RESPONDER, { '#': cueOn ? C.accent : C.ink }, CX, RESP_Y, 20, { anchor: 'center' });
  }

  function initGame() {
    roundIdx = 0; hits = 0; score = 0;
    phase = 'wait'; waitT = 0; waitDur = game.random(0.9, 2.1); cueT = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; flashCue = 0;
  }

  function advance() {
    if (roundIdx >= ROUNDS) { ok = true; finished = true; finish(); return; }
    phase = 'wait'; waitT = 0; waitDur = game.random(0.85, 2.0); cueT = 0;
  }

  function fail(x, y) {
    hitStop = 0.3; shake = 0.3;
    game.feedback.bad(x, y, { text: 'MISS' });
    ok = false; finished = true; finish();
  }

  function resolveTap(x, y) {
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    if (phase === 'wait') { fail(CX, RESP_Y); return; }
    if (phase === 'cue') {
      hits++;
      score += cueT <= 0.25 ? 200 : 100;
      flashCue = 0.15; hitStop = 0.08;
      game.feedback.good(CX, RESP_Y, { text: cueT <= 0.25 ? 'PERFECT' : 'GOOD', color: cueT <= 0.25 ? C.gold : C.good });
      if (hits === Math.ceil(ROUNDS / 2)) { game.fx.popup('HALFWAY!', CX, H * 0.55, { color: C.gold, size: 34 }); game.audio.play('se_milestone', 0.4); }
      roundIdx++;
      phase = 'gap';
      advance();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) { game.audio.play('se_tap', 0.04); resolveTap(x, y); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: RESP_Y, press: false, phase: 'wait', wT: 0, wDur: 1.0, cT: 0, did: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 1.9;
    if (cyc < dt || demo.t <= dt) { demo.phase = 'wait'; demo.wT = 0; demo.wDur = 1.0; demo.cT = 0; demo.did = false; }
    demo.gx = CX + Math.sin(game.time.elapsed * 2.4) * 12;
    demo.gy = RESP_Y + Math.cos(game.time.elapsed * 2.0) * 8;
    demo.press = false;
    if (demo.phase === 'wait') {
      demo.wT += dt;
      if (demo.wT >= demo.wDur) { demo.phase = 'cue'; demo.cT = 0; }
    } else {
      demo.cT += dt;
      if (!demo.did) {
        demo.did = true;
        game.feedback.good(CX, RESP_Y, { text: 'PERFECT', color: C.gold, sound: 'se_good', volume: 0.2 });
      }
      demo.press = true;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (roundIdx === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene(demo.phase === 'cue', true);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.accent);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.accent);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene(false, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(hits + ' / ' + ROUNDS, W / 2, H * 0.13, 30, C.gold);
      txt('SCORE ' + score, W / 2, H * 0.18, 22, C.ink);
      if (!ok) txt('あと' + (ROUNDS - hits) + '!', W / 2, H * 0.23, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(score, { hits: hits, total: ROUNDS });
        else game.end.failure({ hits: hits, total: ROUNDS });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (phase === 'wait') {
        waitT += dt;
        if (waitT >= waitDur) { phase = 'cue'; cueT = 0; }
      } else if (phase === 'cue') {
        cueT += dt;
        if (cueT > CUE_LIMIT) { fail(CX, RESP_Y); }
      }
    }
    if (flashCue > 0) flashCue -= dt;
    if (shake > 0) shake -= dt;

    bg();
    drawScene(!finished && phase === 'cue', false);

    txt(hits + ' / ' + ROUNDS, W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.15);
    game.draw.rect(60, 150, (W - 120) * (hits / ROUNDS), 16, C.accent);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.56, 56, C.accent);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
