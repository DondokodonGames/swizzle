// K-DS-0032-one-on-one-nod.js
// ワンオンワンノッド — 対話相手のひと言が終わった直後の合図にだけ頷く
// 操作: 相手が話し終え、ふきだしが弾けた瞬間だけタップして頷く。話している最中や早すぎるタップは失敗
// 終わり: 規定回数(6回)全て正しい間合いで頷ければ成功。1回でも失敗すれば終わり
// @mechanic: cooldown_tap
// @theme: one_on_one_nod_exchange
// 世界観: 独自デザインの聞き手が、対座する相手の話に相槌を打つ一対一の対話。話の切れ目でだけ頷くのが礼儀
// 残るもの: 正誤(CLEAR/GAME OVER) + 呼吸を合わせられた回数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 白背景に黒の線画のみ、差し色1色だけ許容
  var C = {
    bg: '#f4f0e8', bg2: '#e8e2d4', ink: '#181414', accent: '#e0333a',
    good: '#1a8a3a', bad: '#c9222a', gold: '#c99a1a', white: '#f4f0e8',
  };

  var GAME_TITLE = 'ONE ON ONE';
  var TOTAL = 6;
  var TALK_X = W * 0.5, TALK_Y = H * 0.34, ME_Y = H * 0.6;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var nods, done, endWait, finished;
  var ready, hitStop, shake, round, phase, phaseT, talkDur, gapDur, nodFlash;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SPEAKER = ['.##.', '####', '.##.'];
  var LISTENER_STILL = ['.##.', '####'];
  var LISTENER_NOD = ['####', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.line(80, H * 0.5, W - 80, H * 0.5, C.ink, 2);
  }

  function newTalkDur() {
    var n = Math.min(round, TOTAL - 1);
    return Math.max(0.7, 1.25 - n * 0.08);
  }

  function initGame() {
    nods = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; round = 0; nodFlash = 0;
    phase = 'talk'; phaseT = 0; talkDur = 1.25; gapDur = 0.55;
  }

  function resolveNod() {
    if (finished || ready > 0 || done) return;
    game.audio.play('se_tap', 0.05);
    if (phase === 'gap' && phaseT < gapDur * 0.75) {
      nods++; hitStop = 0.06; nodFlash = 0.18;
      game.feedback.good(W * 0.5, ME_Y, { text: 'NICE', color: C.good });
      game.fx.burst(W * 0.5, ME_Y, { color: C.gold, count: 12, speed: 260 });
      game.audio.play('se_good', 0.35);
      if (nods === Math.ceil(TOTAL / 2)) game.fx.popup('SYNC!', W / 2, ME_Y - 220, { color: C.gold, size: 36 });
      if (nods >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++;
      phase = 'talk'; phaseT = 0; talkDur = newTalkDur();
    } else {
      failNod();
    }
  }

  function failNod() {
    hitStop = 0.3;
    game.feedback.bad(W / 2, ME_Y, { text: phase === 'talk' ? 'TOO SOON' : 'MISS' });
    shake = 0.28;
    game.audio.play('se_bad', 0.4);
    ok = false; finished = true; finish();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) resolveNod();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawScene(ph, listenerNod) {
    var talking = ph === 'talk';
    game.draw.sprite(SPEAKER, { '#': C.ink }, TALK_X, TALK_Y, 30, { anchor: 'center' });
    if (talking) game.draw.circle(TALK_X + 90, TALK_Y - 60, 22, C.accent, 0.8);
    if (ph === 'gap') {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) game.draw.circle(W * 0.5, ME_Y - 60, 60, C.gold, 0.3);
    }
    game.draw.sprite(listenerNod ? LISTENER_NOD : LISTENER_STILL, { '#': C.accent }, W * 0.5, ME_Y, 30, { anchor: 'center' });
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.85, press: false, ph: 'talk', pt: 0, td: 1.0, gd: 0.55 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.4;
    if (cyc < dt || demo.t <= dt) { round = 0; demo.ph = 'talk'; demo.pt = 0; demo.hit = false; }
    demo.pt += dt;
    phase = demo.ph; phaseT = demo.pt; talkDur = demo.td; gapDur = demo.gd; nodFlash = demo.hit ? 0.2 : nodFlash;
    if (demo.ph === 'talk' && demo.pt >= demo.td) { demo.ph = 'gap'; demo.pt = 0; demo.hit = false; }
    if (demo.ph === 'gap' && !demo.hit && demo.pt > 0.05) {
      demo.hit = true; demo.press = true; nodFlash = 0.2;
      game.feedback.good(W * 0.5, ME_Y, { text: 'NICE', color: C.good });
      game.audio.play('se_good', 0.2);
    }
    if (demo.ph === 'gap' && demo.pt >= demo.gd) { demo.ph = 'talk'; demo.pt = 0; demo.press = false; }
  }

  game.onUpdate(function(dt) {
    if (nodFlash > 0) nodFlash -= dt;

    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene(phase, nodFlash > 0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 20 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.accent);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.accent);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene('talk', false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(nods + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.accent);
      if (!ok) txt('あと' + (TOTAL - nods) + '回!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(nods, { nods: nods, total: TOTAL });
        else game.end.failure({ nods: nods, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      phaseT += dt;
      if (phase === 'talk' && phaseT >= talkDur) { phase = 'gap'; phaseT = 0; }
      else if (phase === 'gap' && phaseT >= gapDur) failNod();
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene(phase, nodFlash > 0);

    txt(nods + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.15);
    game.draw.rect(60, 150, (W - 120) * (nods / TOTAL), 16, C.accent);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.75, 58, C.accent);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_cute', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
