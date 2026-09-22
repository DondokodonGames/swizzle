// K-X-0033-lane-flag-dispatch.js
// レーンフラッグ発信 — 光る側のレールへ、素早く指を払って旗を振り分ける
// 操作: 左右どちらかのレールが光ったら、光った側へ指を払う(左右スワイプ)
// 終わり: 規定7回を光った側へ振り分けられれば成功。逆側へ払えば/間に合わなければ失敗
// @mechanic: swipe_direction
// @theme: rail_lane_dispatcher
// 世界観: 分岐駅の操車係。左右どちらかのレールが光って合図を出すたび、旗を光った側へ払って列車を導く
// 残るもの: 正誤(CLEAR/GAME OVER) + 振り分けられた回数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 明るい原色、太いアウトライン、光沢っぽいハイライト帯
  var C = {
    bg: '#101830', bg2: '#1c2850', rail: '#2a3a66', railLit: '#ffdd33',
    laneL: '#ff5588', laneR: '#33ccff', flag: '#ffffff',
    good: '#39ff6a', bad: '#ff4455', gold: '#ffe066', white: '#ffffff', ink: '#04040c',
  };

  var GAME_TITLE = 'LANE FLAG';
  var TOTAL = 7;
  var CX = W * 0.5, CY = H * 0.44;
  var LANE_L_X = W * 0.26, LANE_R_X = W * 0.74;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var solved, done, endWait, finished, cue, cueDur, round, flagLean;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DISPATCHER = ['..##..', '.####.', '..##..', '.####.', '#.##.#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.line(LANE_L_X, H * 0.18, LANE_L_X, H * 0.75, C.rail, 26);
    game.draw.line(LANE_R_X, H * 0.18, LANE_R_X, H * 0.75, C.rail, 26);
  }

  function newCue(dur) { return { side: Math.random() < 0.5 ? -1 : 1, t: 0, dur: dur, resolved: false, expired: false }; }

  function initGame() {
    solved = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; round = 0; cueDur = 1.1; flagLean = 0;
    cue = newCue(cueDur);
  }

  function resolveSwipe(side) {
    if (!cue || cue.resolved || ready > 0 || done || finished) return;
    cue.resolved = true;
    var correct = side === cue.side;
    var laneX = cue.side < 0 ? LANE_L_X : LANE_R_X;
    if (correct) {
      solved++; hitStop = 0.1; flagLean = cue.side * 30;
      game.feedback.good(laneX, CY, { text: 'GOOD', color: C.good });
      game.fx.burst(laneX, CY, { color: C.gold, count: 14, speed: 300 });
      game.audio.play('se_good', 0.35);
      if (solved === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, CY - 200, { color: C.gold, size: 40 });
      if (solved >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++; cueDur = Math.max(0.6, cueDur - 0.06);
      cue = newCue(cueDur);
    } else {
      hitStop = 0.35; shake = 0.3;
      game.feedback.bad(laneX, CY, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING) return;
    game.audio.play('se_tap', 0.1);
    if (dir === 'left') resolveSwipe(-1);
    else if (dir === 'right') resolveSwipe(1);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawCue(c) {
    if (!c) return;
    var laneX = c.side < 0 ? LANE_L_X : LANE_R_X;
    var p = c.t / c.dur;
    var glow = p > 0.4 ? (0.5 + 0.3 * Math.sin(game.time.elapsed * 16)) : 0.25;
    game.draw.line(laneX, H * 0.18, laneX, H * 0.75, C.railLit, 26 * (1 - Math.abs(0.5 - Math.min(1,p*2))*0) );
    game.draw.circle(laneX, CY, 60, c.side < 0 ? C.laneL : C.laneR, glow);
    game.draw.circle(laneX, CY, 34, C.white, 0.7);
  }

  function drawDispatcher(lean) {
    game.draw.sprite(DISPATCHER, { '#': C.gold }, CX, H * 0.62, 22, { anchor: 'center' });
    game.draw.line(CX, H * 0.62, CX + lean, H * 0.62 - 90, C.flag, 8);
    game.draw.circle(CX + lean, H * 0.62 - 90, 20, lean < 0 ? C.laneL : (lean > 0 ? C.laneR : C.flag));
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false, c: null };
  function stepDemo(dt) {
    demo.t += dt;
    if (round === undefined || round === null) initGame();
    if (!demo.c) { demo.c = newCue(0.9); }
    demo.c.t += dt;
    cue = demo.c;
    var p = demo.c.t / demo.c.dur;
    if (p > 0.5 && p < 0.62 && !demo.c.telegraphed) {
      demo.c.telegraphed = true;
      var laneX = demo.c.side < 0 ? LANE_L_X : LANE_R_X;
      demo.gx = laneX; demo.press = true; flagLean = demo.c.side * 30;
      game.feedback.good(laneX, CY, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.2);
    }
    if (p >= 1) { demo.c = null; demo.press = false; demo.gx = CX; flagLean = 0; }
  }

  game.onUpdate(function(dt) {
    if (flagLean !== 0 && state === S.PLAYING) flagLean *= 0.9;

    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawDispatcher(flagLean);
      drawCue(cue);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
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
      drawDispatcher(0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(solved + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - solved) + '回!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(solved * 12, { solved: solved, total: TOTAL });
        else game.end.failure({ solved: solved, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      cue.t += dt;
      if (cue.t / cue.dur >= 1 && !cue.resolved) {
        cue.resolved = true;
        var laneX = cue.side < 0 ? LANE_L_X : LANE_R_X;
        hitStop = 0.35; shake = 0.3;
        game.feedback.bad(laneX, CY, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawDispatcher(flagLean);
    if (!finished) drawCue(cue);

    txt(solved + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (solved / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.3], ['F#4', 0.3], ['A4', 0.3], ['D5', 0.3]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
