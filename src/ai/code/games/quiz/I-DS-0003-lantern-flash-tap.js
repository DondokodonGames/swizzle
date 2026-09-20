// I-DS-0003-lantern-flash-tap.js
// ランタン・フラッシュ — 夜店の提灯が灯った一瞬だけを指で叩く反射神経の出店
// 操作: 提灯が消えている間は触らない。パッと灯った瞬間だけ画面をタップする。早すぎても遅すぎても失格
// 終わり: 3回連続で灯った瞬間に正しくタップできれば成功。フライング/反応遅れが1回でもあれば失敗
// @mechanic: reaction_duel
// @theme: night_stall_lantern_booth
// 世界観: 夜店の片隅、覆面の店主が吊るす提灯の出店。提灯がパッと灯る一瞬だけが当たりで、客はその瞬間だけを狙って叩く
// 残るもの: 正誤(CLEAR/GAME OVER) + 灯した回数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 黒地に白の濃淡2階調、輪郭は太い墨線。差し色は赤1色のみ
  var C = {
    bg: '#050505', bg2: '#0d0d0d', ink: '#000000', paper: '#e8e4d8',
    paperDim: '#3a3630', lit: '#fff6dc', red: '#ff2d2d',
    good: '#ffffff', bad: '#ff2d2d', gold: '#ffe14d', white: '#ffffff',
  };

  var GAME_TITLE = 'LANTERN FLASH';
  var TOTAL = 3;
  var CX = W * 0.5, CY = H * 0.42;
  var REACT_WINDOW = 0.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, failReason = 'GAME OVER';

  var round, phase, phaseT, waitDur, cleared, done, endWait, finished;
  var ready, hitStop, shake, litFlash;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var LANT_OFF = ['.####.', '######', '######', '######', '.####.', '..##..'];
  var LANT_ON_A = ['.####.', '#####.', '######', '.#####', '.####.', '..##..'];
  var LANT_ON_B = ['.####.', '######', '#####.', '######', '.####.', '..##..'];

  function alleyBg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 4; i++) game.draw.rect(80 + i * 280, H * 0.15, 20, H * 0.55, C.ink);
    game.draw.line(CX, H * 0.16, CX, H * 0.30, C.paperDim, 6);
  }

  function drawLantern(lit, frame, flash) {
    var glowA = lit ? 0.55 + 0.25 * Math.sin(game.time.elapsed * 20) : 0;
    if (lit) game.draw.circle(CX, CY, 170, C.lit, glowA * 0.5);
    var art = !lit ? LANT_OFF : (frame ? LANT_ON_A : LANT_ON_B);
    var col = flash > 0 ? C.white : (lit ? C.lit : C.paperDim);
    game.draw.sprite(art, { '#': col }, CX, CY, 26, { anchor: 'center' });
    game.draw.circle(CX, CY - 118, 8, C.ink);
  }

  function newRound() {
    return { waitDur: 0.8 + Math.random() * 1.0 };
  }

  function initGame() {
    round = 0; cleared = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; ok = false; failReason = 'GAME OVER';
    phase = 'wait'; phaseT = 0; waitDur = newRound().waitDur; litFlash = 0;
  }

  function fail(reason, x, y) {
    ok = false; finished = true; failReason = reason; hitStop = 0.35; shake = 0.3;
    game.feedback.bad(x, y, { text: reason === 'GAME OVER' ? 'MISS' : reason });
    game.audio.play('se_bad', 0.4);
    finish();
  }

  function succeedTap(x, y, reactT) {
    cleared++;
    litFlash = 0.15;
    game.feedback.good(x, y, { text: 'NICE', color: C.good });
    game.fx.burst(x, y, { color: C.gold, count: 14, speed: 300 });
    game.audio.play('se_good', 0.4);
    if (cleared === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, CY - 220, { color: C.gold, size: 40 });
    if (cleared >= TOTAL) { ok = true; finished = true; finish(); return; }
    round++; phase = 'wait'; phaseT = 0; waitDur = newRound().waitDur;
  }

  function handleTap(x, y) {
    if (state !== S.PLAYING || done || ready > 0 || finished) return;
    if (phase === 'wait') { fail('GAME OVER', x, y); return; }
    if (phase === 'lit') { succeedTap(x, y, phaseT); return; }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) {
      game.audio.play('se_tap', 0.15);
      game.fx.burst(x, y, { color: C.white, count: 4, speed: 90 });
      handleTap(x, y);
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepCore(dt) {
    phaseT += dt;
    if (phase === 'wait' && phaseT >= waitDur) {
      phase = 'lit'; phaseT = 0;
      game.audio.play('se_tap', 0.1);
    } else if (phase === 'lit' && phaseT >= REACT_WINDOW) {
      return 'timeout';
    }
    return null;
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt) initGame();
    var r = stepCore(dt);
    if (phase === 'lit' && phaseT > 0.12 && phaseT < 0.22) {
      demo.press = true;
      succeedTap(CX, CY, phaseT);
    } else {
      demo.press = false;
    }
    if (r === 'timeout' || finished) initGame();
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      alleyBg();
      stepDemo(dt);
      var frame = Math.floor(game.time.elapsed * 10) % 2 === 0;
      drawLantern(phase === 'lit', frame, litFlash);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.10, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.145, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.90, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      alleyBg();
      drawLantern(false, true, 0);
      txt(ok ? 'CLEAR' : failReason, W / 2, H * 0.10, 48, ok ? C.good : C.bad);
      txt(cleared + ' / ' + TOTAL, W / 2, H * 0.145, 32, C.gold);
      if (!ok && cleared >= 1) txt('あと' + (TOTAL - cleared) + '回!', W / 2, H * 0.19, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.90, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, total: TOTAL }); else game.end.failure({ cleared: cleared, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      var r = stepCore(dt);
      if (r === 'timeout') fail('GAME OVER', CX, CY);
    }
    if (shake > 0) shake -= dt;
    if (litFlash > 0) litFlash -= dt;

    alleyBg();
    var frameP = Math.floor(game.time.elapsed * 10) % 2 === 0;
    if (!finished) drawLantern(phase === 'lit', frameP, litFlash);
    else drawLantern(false, true, litFlash);

    txt(cleared + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (cleared / TOTAL), 16, C.good);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.70, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.4], ['C4', 0.4], ['E4', 0.8]], { tempo: 90, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);
