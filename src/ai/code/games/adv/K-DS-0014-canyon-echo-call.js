// K-DS-0014-canyon-echo-call.js
// 谷間の鳴き交わし — 対岸の生き物の合図に、間髪入れず鳴き返す
// 操作: 対岸の影が喉を光らせて鳴いた瞬間、間を置かずタップして鳴き返す(光る前のフライングは失敗)
// 終わり: 規定回数(5回)を正しい間合いで鳴き返せば成功。フライングか遅れが1回でもあれば失敗
// @mechanic: reaction_duel
// @theme: canyon_call_and_response
// 世界観: 夕暮れの深い谷。対岸の岩棚に潜む生き物と、こちら岸の若い個体が縄張りの鳴き交わしをする。相手の合図より早くても遅くても群れに認められない
// 残るもの: 正誤(仲間入り/はぐれ)+ 応えられた回数と平均反応の速さ
// スタイル: 90s PRE-RENDER

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s PRE-RENDER: 暗め・金属質、粒状ノイズと擬似奥行き
  var C = {
    bg: '#0a1420', bg2: '#050a12', cliffFar: '#1a2a38', cliffNear: '#243a4c',
    call: '#ffb040', callGlow: '#3a2410', good: '#3dffb0', bad: '#ff4d6a',
    gold: '#ffd97a', white: '#e8f0f4', ink: '#040608',
  };

  var GAME_TITLE = 'ECHO CALL';
  var TOTAL = 5;
  var FAR_X = W * 0.72, NEAR_X = W * 0.28, CY = H * 0.5;
  var REACT_WINDOW = 0.48;
  var GAP_MIN = 0.9, GAP_MAX = 1.7;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CREATURE = ['.##.', '####', '.##.', '#..#'];
  var CREATURE_CALL = ['.##.', '####', '.OO.', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 24; i++) {
      var nx = (i * 137) % W, ny = (i * 271) % H;
      game.draw.rect(nx, ny, 2, 2, '#ffffff10');
    }
    game.draw.rect(0, H * 0.55, W, H * 0.45, C.cliffNear, 0.6);
    game.draw.rect(0, H * 0.35, W, H * 0.2, C.cliffFar, 0.4);
    game.draw.line(0, H * 0.6, W, H * 0.6, '#00000040', 6);
  }

  var round, gap, callT, calling, callDone, waitingResponse, reactT, done, endWait, finished, falseStart;
  var ready, hitStop, shake, avgReact, reactSum;

  function initGame() {
    round = 0; done = false; endWait = 0; finished = false; reactSum = 0; avgReact = 0;
    ready = 0.8; hitStop = 0; shake = 0;
    gap = game.random(GAP_MIN, GAP_MAX); callT = 0; calling = false; callDone = false;
    waitingResponse = false; reactT = 0; falseStart = false;
  }

  function respond() {
    if (ready > 0 || done || finished) return;
    if (!waitingResponse) {
      // フライング(合図前のタップ)
      falseStart = true;
      game.feedback.bad(NEAR_X, CY, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      hitStop = 0.3;
      ok = false; finished = true; finish();
      return;
    }
    waitingResponse = false;
    var success = reactT <= REACT_WINDOW;
    hitStop = success ? 0.1 : 0.3;
    if (success) {
      round++; reactSum += reactT; avgReact = reactSum / round;
      game.feedback.good(NEAR_X, CY, { text: 'CALL', color: C.good });
      game.fx.burst(NEAR_X, CY, { color: C.gold, count: 14, speed: 300 });
      game.audio.play('se_good', 0.4);
      if (round === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', W * 0.5, CY - 220, { color: C.gold, size: 40 });
    } else {
      game.feedback.bad(NEAR_X, CY, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
    }
    if (!success) { ok = false; finished = true; finish(); return; }
    if (round >= TOTAL) { ok = true; finished = true; finish(); return; }
    gap = Math.max(0.6, game.random(GAP_MIN, GAP_MAX) - round * 0.06);
    callT = 0; calling = false; callDone = false;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING) return;
    game.audio.play('se_tap', 0.1);
    respond();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: NEAR_X, gy: CY + 220, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { round = 0; gap = 1.0; callT = 0; calling = false; callDone = false; waitingResponse = false; reactT = 0; }
    callT += dt;
    calling = callT >= gap && callT < gap + 0.35;
    if (callT >= gap && !waitingResponse && !callDone) { waitingResponse = true; reactT = 0; callDone = true; }
    if (waitingResponse) reactT += dt;
    if (waitingResponse && reactT > 0.25 && demo.press === false) {
      demo.press = true;
      game.feedback.good(NEAR_X, CY, { text: 'CALL', color: C.good });
      game.audio.play('se_good', 0.25);
      waitingResponse = false;
    }
    if (callT > gap + 0.6) { callT = 0; gap = 1.0; calling = false; callDone = false; demo.press = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      game.draw.sprite(calling ? CREATURE_CALL : CREATURE, { '#': C.gold, 'O': C.call }, FAR_X, CY, 26, { anchor: 'center', flipX: true });
      if (calling) game.draw.circle(FAR_X, CY, 90 + 40 * Math.sin(game.time.elapsed * 10), C.call, 0.2);
      game.draw.sprite(demo.press ? CREATURE_CALL : CREATURE, { '#': C.white, 'O': C.call }, NEAR_X, CY, 26, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 22 });
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
      game.draw.sprite(CREATURE, { '#': C.gold, 'O': C.call }, FAR_X, CY, 26, { anchor: 'center', flipX: true });
      game.draw.sprite(CREATURE, { '#': C.white, 'O': C.call }, NEAR_X, CY, 26, { anchor: 'center' });
      txt(ok ? '仲間入り' : 'はぐれ', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(round + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt(falseStart ? 'フライング!' : 'あと' + (TOTAL - round) + '回!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var score = round * 100;
        if (ok) game.end.success(score, { answered: round, total: TOTAL, avgReact: Math.round(avgReact * 1000) });
        else game.end.failure({ answered: round, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      callT += dt;
      calling = callT >= gap && callT < gap + 0.35;
      if (callT >= gap && !waitingResponse && !callDone) {
        waitingResponse = true; reactT = 0; callDone = true;
        game.audio.play('se_milestone', 0.3);
      }
      if (waitingResponse) {
        reactT += dt;
        if (reactT > REACT_WINDOW + 0.35) {
          waitingResponse = false;
          game.feedback.bad(NEAR_X, CY, { text: 'MISS' });
          shake = 0.3;
          game.audio.play('se_bad', 0.4);
          hitStop = 0.3;
          ok = false; finished = true; finish();
        }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    // telegraph: 合図の0.5秒前から対岸がうっすら光る
    var pre = callT >= gap - 0.5 && callT < gap;
    if (pre) game.draw.circle(FAR_X, CY, 70, C.call, 0.12 + 0.08 * Math.sin(game.time.elapsed * 14));
    game.draw.sprite(calling ? CREATURE_CALL : CREATURE, { '#': C.gold, 'O': C.call }, FAR_X, CY, 26, { anchor: 'center', flipX: true });
    if (calling) game.draw.circle(FAR_X, CY, 90 + 40 * Math.sin(game.time.elapsed * 10), C.call, 0.22);
    game.draw.sprite(waitingResponse ? CREATURE_CALL : CREATURE, { '#': C.white, 'O': C.call }, NEAR_X, CY, 26, { anchor: 'center' });

    txt(round + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.4);
    game.draw.rect(60, 150, (W - 120) * (round / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.72, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_dark', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
