// K-DS-0054-ring-charge-push.js
// リングチャージプッシュ — 立ち合いの合図と同時に連打で力をため、土俵際まで相手を押し出す
// 操作: 合図(GO!)が出るまでは待ち、出た瞬間から連打して相手を押し出す。合図前の連打は反則
// 終わり: 相手を土俵の外まで押し出せば成功。押し返されるか時間切れなら失敗
// @mechanic: push_out
// @theme: courtyard_ring_push
// 世界観: 土俵のような円の広場。立ち合いの合図と同時に連打で力を込め、相手を円の外まで押し出す力比べ
// 残るもの: 正誤(CLEAR/GAME OVER) + 押し切った時点での押し込み度
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 画面の1/3を占める巨大キャラ、床に楕円影、横1層の背景
  var C = {
    bg1: '#e8c98a', bg2: '#c8955a', ring: '#b8783a', ringEdge: '#7a4a20',
    p1: '#3d6bff', p1Dark: '#1a3a9e', p2: '#ff5a3d', p2Dark: '#a52a10',
    good: '#33cc66', bad: '#ff4d5e', gold: '#ffcc33', white: '#fff6e0', ink: '#2a1808',
  };

  var GAME_TITLE = 'RING CHARGE';
  var RING_CX = W * 0.5, RING_CY = H * 0.52, RING_R = 340;
  var TIME_LIMIT = 20;
  var MASH_GAIN = 7.5;
  var CPU_GAIN_BASE = 3.2;
  var DECAY = 5.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var P1_S = ['.####.', '######', '.####.', '##..##'];
  var P2_S = ['.####.', '######', '.####.', '##..##'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.circle(RING_CX, RING_CY, RING_R, C.ringEdge);
    game.draw.circle(RING_CX, RING_CY, RING_R - 16, C.ring);
  }

  var power, foul, timeLeft, done, endWait, finished;
  var ready, hitStop, shake, milestoneShown;

  function initGame() {
    power = 50; foul = 0; timeLeft = TIME_LIMIT;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
  }

  function mash() {
    if (state !== S.PLAYING || done || finished) return;
    if (ready > 0) {
      // 合図前の連打は反則
      foul++;
      hitStop = 0.18;
      game.feedback.bad(RING_CX, RING_CY, { text: 'FOUL' });
      shake = 0.15;
      game.audio.play('se_bad', 0.3);
      power = Math.max(15, power - 8);
      return;
    }
    power = Math.min(100, power + MASH_GAIN);
    game.audio.play('se_tap', 0.12);
    game.fx.burst(RING_CX + 120, RING_CY, { color: C.p1, count: 6, speed: 180 });
    if (!milestoneShown && power >= 75) { milestoneShown = true; game.fx.popup('あと少し!', RING_CX, RING_CY - 260, { color: C.gold, size: 38 }); game.audio.play('se_milestone', 0.4); }
    if (power >= 100) {
      ok = true; finished = true; hitStop = 0.15;
      game.feedback.good(RING_CX, RING_CY, { text: 'PUSH OUT', color: C.gold });
      game.fx.burst(RING_CX, RING_CY, { color: C.gold, count: 22, speed: 400 });
      game.audio.play('se_good', 0.5);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    mash();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawFighters(pw) {
    var t = pw / 100; // 0=p1が土俵際, 1=p2が押し出される
    var p1x = RING_CX - 40 + t * 170;
    var p2x = RING_CX + 40 + t * 170;
    game.draw.circle(p1x, RING_CY + 170, 100, '#00000025');
    game.draw.circle(p2x, RING_CY + 170, 100, '#00000025');
    game.draw.sprite(P1_S, { '#': C.p1 }, p1x, RING_CY, 34, { anchor: 'center' });
    game.draw.sprite(P2_S, { '#': C.p2 }, p2x, RING_CY, 34, { anchor: 'center', flipX: true });
  }

  function drawBar(pw) {
    var bx = 90, bw = W - 180, by = H * 0.78;
    game.draw.rect(bx, by, bw, 34, C.ink, 0.25);
    game.draw.rect(bx, by, bw * (pw / 100), 34, C.p1);
    game.draw.rect(bx + bw * (pw / 100) - 4, by, 8, 34, C.gold);
    game.draw.circle(bx, by + 17, 22, C.p2Dark);
    game.draw.circle(bx + bw, by + 17, 22, C.p1Dark);
  }

  var demo = { t: 0, gx: RING_CX, gy: RING_CY + 470, press: false, pw: 50 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { demo.pw = 50; }
    demo.press = cyc > 0.7 && cyc < 3.0 && Math.floor(cyc * 8) % 2 === 0;
    if (demo.press) demo.pw = Math.min(100, demo.pw + 60 * dt * 2.4);
    else demo.pw = Math.max(20, demo.pw - 10 * dt);
    power = demo.pw;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (power === undefined) initGame();
      bg();
      stepDemo(dt);
      drawFighters(power);
      drawBar(power);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 22 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawFighters(power);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(Math.round(power) + ' / 100', W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + Math.max(1, Math.round(100 - power)) + '!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(Math.round(power), { power: Math.round(power), fouls: foul });
        else game.end.failure({ power: Math.round(power), fouls: foul });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      var cpuGain = CPU_GAIN_BASE + Math.sin(game.time.elapsed * 3) * 1.2;
      power = Math.max(0, power - cpuGain * dt - DECAY * 0 * dt);
      if (power <= 0) {
        ok = false; finished = true; hitStop = 0.3;
        game.feedback.bad(RING_CX, RING_CY, { text: 'PUSHED' });
        shake = 0.25;
        game.audio.play('se_bad', 0.4);
        finish();
      } else if (timeLeft <= 0) {
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawFighters(power);
    drawBar(power);

    txt(Math.round(timeLeft) + 's', W / 2, H * 0.06, 30, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G3', 0.3], ['B3', 0.3], ['D4', 0.3], ['G4', 0.6]], { tempo: 140, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
