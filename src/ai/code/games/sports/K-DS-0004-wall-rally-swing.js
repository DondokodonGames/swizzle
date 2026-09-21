// K-DS-0004-wall-rally-swing.js
// ウォールラリー — 壁から跳ね返ってくる球に合わせて道具を振り、リズムよく打ち返し続ける
// 操作: 球が手元に戻ってきた瞬間にタップして道具を振り、打ち返す
// 終わり: 規定回数(8回)連続で打ち返せば成功。一度でもタイミングを外せば失敗
// @mechanic: timing_window
// @theme: backwall_rally_court
// 世界観: 裏庭の壁打ちコート。壁に当たって跳ね返ってくる球を、戻ってきた瞬間にラケットで打ち返し続ける練習
// 残るもの: 正誤(CLEAR/GAME OVER) + 連続で打ち返した回数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い黒縁取り+フラットな明色
  var C = {
    bg: '#8fd6ff', bg2: '#5fb8e8', wall: '#f2e8c8', wallEdge: '#1a1a1a',
    court: '#6bc25a', courtEdge: '#1a1a1a',
    ball: '#fff23d', ballEdge: '#1a1a1a',
    good: '#2ecc55', bad: '#ff3b3b', gold: '#ffcc00', white: '#ffffff', ink: '#1a1a1a',
  };

  var GAME_TITLE = 'WALL RALLY';
  var TOTAL = 8;
  var CX = W * 0.5, PADDLE_Y = H * 0.62, WALL_Y = H * 0.22;
  var WIN_HALF = 0.14;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PLAYER = ['..##..', '.####.', '..##..', '#####.', '.##.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, WALL_Y - 40, W, 70, C.wallEdge);
    game.draw.rect(0, WALL_Y - 34, W, 58, C.wall);
    game.draw.rect(0, H * 0.72, W, H * 0.3, C.courtEdge);
    game.draw.rect(0, H * 0.73, W, H * 0.28, C.court);
  }

  var round, roundDur, ballT, wallX, resolved, done, endWait, finished, ready, hitStop, shake, flashT, flashOk, swingT;

  function initGame() {
    round = 0; roundDur = 1.0; ballT = 0; wallX = CX;
    resolved = false; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; flashT = 0; flashOk = true; swingT = 0;
  }

  function ballPos(t) {
    // t: 0..1, 0=leaves paddle, 0.5=hits wall, 1=back at paddle
    var x = CX + (wallX - CX) * Math.sin(t * Math.PI);
    var y = t <= 0.5 ? PADDLE_Y + (WALL_Y - PADDLE_Y) * (t / 0.5) : WALL_Y + (PADDLE_Y - WALL_Y) * ((t - 0.5) / 0.5);
    return { x: x, y: y };
  }

  function swing() {
    if (ready > 0 || done || finished || hitStop > 0) return;
    swingT = 0.15;
    var open = ballT >= (1 - WIN_HALF / roundDur) && ballT <= 1;
    if (open && !resolved) {
      resolved = true;
      round++;
      hitStop = 0.08;
      flashT = 0.15; flashOk = true;
      var p = ballPos(1);
      game.feedback.good(p.x, p.y, { text: 'NICE' });
      game.audio.play('se_tap', 0.2);
      if (round === Math.floor(TOTAL / 2)) { game.fx.popup(round + ' / ' + TOTAL, CX, PADDLE_Y - 260, { color: C.gold, size: 36 }); game.audio.play('se_milestone', 0.3); }
      if (round >= TOTAL) { ok = true; finished = true; finish(); return; }
      roundDur = Math.max(0.62, roundDur * 0.94);
      ballT = 0; resolved = false; wallX = CX + (Math.random() * 2 - 1) * W * 0.22;
    } else {
      resolved = true;
      hitStop = 0.35; shake = 0.25;
      flashT = 0.25; flashOk = false;
      var p2 = ballPos(ballT);
      game.feedback.bad(p2.x, p2.y, { text: 'MISS' });
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) swing();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.2;
  }

  function stepRound(dt) {
    ballT += dt / roundDur;
    if (ballT >= 1 && !resolved) {
      resolved = true;
      hitStop = Math.max(hitStop, 0.35); shake = 0.25;
      flashT = 0.25; flashOk = false;
      var p = ballPos(1);
      game.feedback.bad(p.x, p.y, { text: 'MISS' });
      ok = false; finished = true; finish();
    }
  }

  var demo = { t: 0, gx: CX, gy: PADDLE_Y - 60, press: false, bt: 0, dur: 1.0, wx: CX, resolved: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) { demo.bt = 0; demo.resolved = false; demo.wx = CX - W * 0.15; }
    demo.bt += dt / demo.dur;
    demo.press = false;
    if (demo.bt >= 1 && !demo.resolved) {
      demo.resolved = true; demo.press = true;
      game.feedback.good(CX, PADDLE_Y, { text: 'NICE' });
      game.audio.play('se_tap', 0.1);
    }
    ballT = Math.min(1, demo.bt); wallX = demo.wx;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      var p = ballPos(ballT);
      game.draw.circle(p.x, p.y, 24, C.ballEdge);
      game.draw.circle(p.x, p.y, 18, C.ball);
      game.draw.sprite(PLAYER, { '#': C.ink }, CX, PADDLE_Y + 60, 16, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      game.draw.sprite(PLAYER, { '#': C.ink }, CX, PADDLE_Y + 60, 16, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(round + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.ink);
      if (!ok && TOTAL - round <= 3) txt('あと' + (TOTAL - round) + '回!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(round, { rallies: round, total: TOTAL });
        else game.end.failure({ rallies: round, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepRound(dt);
    }
    if (flashT > 0) flashT -= dt;
    if (shake > 0) shake -= dt;
    if (swingT > 0) swingT -= dt;

    bg();
    var p2 = ballPos(ballT);
    if (flashT > 0) game.draw.circle(p2.x, p2.y, 44, flashOk ? C.good : C.bad, 0.35);
    game.draw.circle(p2.x, p2.y, 24, C.ballEdge);
    game.draw.circle(p2.x, p2.y, 18, C.ball);
    game.draw.sprite(PLAYER, { '#': swingT > 0 ? C.gold : C.ink }, CX, PADDLE_Y + 60, 16, { anchor: 'center' });

    txt(round + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, '#ffffffa0');
    game.draw.rect(60, 150, (W - 120) * (round / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.44, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.3], ['C5', 0.3], ['E5', 0.3]], { tempo: 140, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
