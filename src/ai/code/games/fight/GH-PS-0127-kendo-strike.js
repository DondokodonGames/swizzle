// GH-PS-0127-kendo-strike.js
// ケンドーストライク — 相手が打ち込む瞬間に出る。早いと空振り、遅いと打たれる
// 操作: 相手の竹刀が振り下ろされる瞬間にタップして打ち返す
// 終わり: 先に2本取れば勝ち。取られれば負け
// @mechanic: timing_window
// @theme: dojo_duel
// 世界観: 道場での一本勝負。相手は構えてから打ち込む。早すぎれば空振り、遅ければ一本取られる
// 残るもの: 勝敗(CLEAR/GAME OVER) + 何本目で決まったか
// スタイル: 90s HANDHELD COLOR

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 90s HANDHELD COLOR: 低彩度・少色。小画面前提の太い形、密度を抑える
  var C = {
    bg1: '#d8d0c0', bg2: '#c0b8a8', floor: '#a89878', p1: '#3a5a7a', p2: '#7a3a3a',
    good: '#4a8a5a', bad: '#a83a3a', gold: '#c89a30', white: '#f0ece0', ink: '#282018',
  };

  var GAME_TITLE = 'KENDO STRIKE';
  var WIN_SCORE = 2;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, myScore = 0, oppScore = 0, bouts = 0;

  var phase, phaseT, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CX = W / 2, P1Y = H * 0.64, P2Y = H * 0.32;

  function dojoBg() {
    game.draw.gradient(0, H * 0.5, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(0, H * 0.5, W, H * 0.5, C.floor);
    for (var i = 1; i < 6; i++) game.draw.rect(0, H * 0.5 + i * (H * 0.5 / 6), W, 4, '#00000022');
  }

  var P1_SPRITE = ['.##.', '####', '.##.', '#.#.'];
  var P2_SPRITE = ['.##.', '####', '.##.', '.#.#'];
  var SWORD_UP = ['.#', '.#', '.#', '##'];
  var SWORD_DOWN = ['##', '.#', '.#', '.#'];

  function drawDuel() {
    game.draw.circle(CX - 60, P1Y + 130, 90, '#00000022');
    game.draw.circle(CX + 60, P2Y + 130, 90, '#00000022');
    game.draw.sprite(P1_SPRITE, { '#': C.p1 }, CX - 60, P1Y, 44, { anchor: 'center' });
    game.draw.sprite(P2_SPRITE, { '#': C.p2 }, CX + 60, P2Y, 44, { anchor: 'center' });
    var swing = phase === 'strike';
    game.draw.sprite(swing ? SWORD_DOWN : SWORD_UP, { '#': C.ink }, CX + 150, P2Y - 40, 30, { anchor: 'center' });
    if (phase === 'strike') game.draw.line(CX + 80, P2Y - 100, CX - 50, P1Y - 70, C.bad, 8);
  }

  function newBout() {
    phase = 'ready'; phaseT = 0.6 + Math.random() * 0.7;
  }

  function initGame() {
    myScore = 0; oppScore = 0; bouts = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    newBout();
  }

  function resolveBout(playerTapped) {
    bouts++;
    hitStop = 0.1;
    if (phase === 'strike' && playerTapped) {
      myScore++;
      game.feedback.good(CX, H * 0.46, { text: 'IPPON', color: C.good });
      game.fx.burst(CX, H * 0.46, { color: C.gold, count: 14, speed: 340 });
      game.audio.play('se_success', 0.4);
    } else {
      oppScore++;
      game.feedback.bad(CX, H * 0.46, { text: playerTapped ? 'EARLY' : 'HIT' });
      shake = 0.16;
      game.audio.play('se_bad', 0.35);
    }
    if (myScore >= WIN_SCORE) { ok = true; finished = true; finish(); }
    else if (oppScore >= WIN_SCORE) { ok = false; finished = true; finish(); }
    else { newBout(); game.fx.popup(myScore + '-' + oppScore, W / 2, H * 0.16, { color: C.gold, size: 44 }); }
  }

  function tapNow() {
    if (done || ready > 0 || hitStop > 0 || finished) return;
    if (phase === 'ready') { resolveBout(true); return; }
    if (phase === 'strike') { resolveBout(true); }
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (ok) game.audio.play('se_success', 0.5); else game.audio.play('se_failure', 0.4);
    endWait = 1.3;
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); return; }
    tapNow();
  });

  // ── ATTRACT ゴースト実演: 打ち込みの瞬間だけタップ ──
  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false, phase: 'ready', phaseT: 1.0 };
  function stepDemo(dt) {
    demo.t += dt;
    demo.phaseT -= dt;
    phase = demo.phase;
    if (demo.phase === 'ready' && demo.phaseT <= 0) { demo.phase = 'strike'; demo.phaseT = 0.24; }
    else if (demo.phase === 'strike') {
      demo.press = demo.phaseT < 0.16 && demo.phaseT > 0.08;
      if (demo.press && demo.phaseT < 0.16 && demo.phaseT > 0.14) { game.feedback.good(CX, H * 0.46, { text: 'IPPON', color: C.good }); game.fx.burst(CX, H * 0.46, { color: C.gold, count: 10, speed: 300 }); }
      if (demo.phaseT <= 0) { demo.phase = 'ready'; demo.phaseT = 1.2; demo.press = false; }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      dojoBg();
      stepDemo(dt);
      drawDuel();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.08, 52, C.ink);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.12, 26, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 44, C.gold);
        txt('TAP TO START', W / 2, H * 0.95, 34, C.ink);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 30, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      dojoBg();
      drawDuel();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 54, ok ? C.good : C.bad);
      txt(myScore + ' - ' + oppScore, W / 2, H * 0.14, 40, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 30, C.ink);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success({ score: myScore + '-' + oppScore });
        else game.end.failure({ score: myScore + '-' + oppScore });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      phaseT -= dt;
      if (phase === 'ready' && phaseT <= 0) { phase = 'strike'; phaseT = 0.24; game.audio.tone(660, 0.08, { wave: 'square', volume: 0.15 }); }
      else if (phase === 'strike' && phaseT <= 0) { resolveBout(false); }
    }
    if (shake > 0) shake -= dt;

    dojoBg();
    drawDuel();

    txt(myScore + ' - ' + oppScore, W / 2, H * 0.10, 40, C.ink);
    game.draw.rect(60, 40, W - 120, 18, C.ink, 0.5);
    game.draw.rect(60, 40, (W - 120) * (bouts / 3), 18, C.gold);
    txt(bouts + ' / ' + 3, W / 2, 104, 30, C.ink);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.86, 62, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
