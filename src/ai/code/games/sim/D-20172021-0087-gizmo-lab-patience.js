// D-20172021-0087-gizmo-lab-patience.js
// ギズモ・ラボ・ペイシェンス — 試験台の人形に道具を次々当て、チャージが満ちた瞬間だけボタンを押して反応(音・光・動き)を引き出す
// 操作: ボタン周りのチャージリングが満ちて光った瞬間だけタップする。満ちる前の連打は不合格
// 終わり: 規定個数の道具の反応を我慢して引き出せば成功。満ちる前にタップするか時間切れで失敗
// @mechanic: cooldown_tap
// @theme: toy_lab_reaction_tester
// 世界観: おもちゃ研究所の検査員見習いが、試験台の人形に次々と無害なギミック道具を当て、チャージが満ちるまで我慢して待ち、最良のタイミングで作動させて反応を記録していく
// 残るもの: 正誤(CLEAR/GAME OVER) + 作動させた道具数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 質感のあるパネル、内側に沈んだボタン、金属フレーム風のハイライト
  var C = {
    bg: '#2b2620', bg2: '#181410', panel: '#3f382e', panelEdge: '#6b5c46',
    doll: '#e8c9a0', dollDark: '#c79a68', gizmo: '#8a9bb0',
    ringOff: '#55493a', ringOn: '#ffce4a',
    good: '#39ff9e', bad: '#ff3355', gold: '#ffce4a', ink: '#120e0a', white: '#f5ece0',
  };

  var GAME_TITLE = 'GIZMO LAB';
  var TOTAL = 5;
  var TIME_LIMIT = 13;
  var BTN_X = W * 0.5, BTN_Y = H * 0.78, BTN_R = 90;
  var DOLL_X = W * 0.5, DOLL_Y = H * 0.36;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DOLL_SPRITE = ['.###.', '#####', '.#.#.', '.#.#.'];
  var GIZMO_SPRITES = [
    ['.#.', '###', '.#.'],       // ベル
    ['#.#', '.#.', '#.#'],       // ぜんまい
    ['###', '#.#', '###'],       // ファン
    ['.#.', '#.#', '.#.'],       // ランプ
  ];
  var GIZMO_COLOR = ['#ff8a3d', '#4ad0ff', '#39ff9e', '#ff5ad0'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffce4a', pulse * 0.3);
    game.draw.rect(W * 0.08, H * 0.16, W * 0.84, H * 0.46, C.panel, 0.9);
    game.draw.rect(W * 0.08, H * 0.16, W * 0.84, 8, C.panelEdge, 0.8);
  }

  var gizmoIdx, cooldownT, cooldownDur, dollBounce, dollFlashT, dollFlashColor;
  var progress, done, endWait, finished, ready, hitStop, shake, roundClock, halfCalled;

  function nextCooldown() { return 0.9 + game.random(0, 0.8); }

  function initGame() {
    gizmoIdx = 0; cooldownT = 0; cooldownDur = nextCooldown();
    dollBounce = 0; dollFlashT = 0; dollFlashColor = C.white;
    progress = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; roundClock = 0; halfCalled = false;
  }

  function drawDoll() {
    var bob = Math.sin(game.time.elapsed * 2.2) * 6 + (dollBounce > 0 ? Math.sin(dollBounce * 40) * 14 * dollBounce : 0);
    if (dollFlashT > 0) game.draw.circle(DOLL_X, DOLL_Y, 130, dollFlashColor, Math.min(0.5, dollFlashT));
    game.draw.circle(DOLL_X, DOLL_Y + 60, 90, C.dollDark, 0.4);
    game.draw.sprite(DOLL_SPRITE, { '#': C.doll }, DOLL_X, DOLL_Y + bob, 26, { anchor: 'center' });
  }

  function drawGizmoBadge() {
    var col = GIZMO_COLOR[gizmoIdx % GIZMO_COLOR.length];
    game.draw.circle(W * 0.2, H * 0.26, 54, C.gizmo, 0.5);
    game.draw.sprite(GIZMO_SPRITES[gizmoIdx % GIZMO_SPRITES.length], { '#': col }, W * 0.2, H * 0.26, 12, { anchor: 'center' });
  }

  function drawButton(pct, glowing) {
    game.draw.circle(BTN_X, BTN_Y, BTN_R + 18, C.ringOff, 1);
    var col = glowing ? C.ringOn : C.gizmo;
    // リング(横ストリップ走査で円弧近似):チャージ割合に応じた扇形は矩形3本の簡易表現
    game.draw.circle(BTN_X, BTN_Y, BTN_R + 18, col, 0.25 + 0.55 * pct);
    game.draw.circle(BTN_X, BTN_Y, BTN_R, glowing ? C.ringOn : C.panelEdge, 1);
    game.draw.circle(BTN_X, BTN_Y, BTN_R - 14, C.panel, 1);
    if (glowing) game.draw.circle(BTN_X, BTN_Y, BTN_R - 14, C.ringOn, 0.35 + 0.25 * Math.sin(game.time.elapsed * 12));
  }

  function reactGood() {
    var col = GIZMO_COLOR[gizmoIdx % GIZMO_COLOR.length];
    dollBounce = 1; dollFlashT = 0.35; dollFlashColor = col;
    game.fx.burst(DOLL_X, DOLL_Y, { color: col, count: 18, speed: 360 });
    game.audio.tone(440 + gizmoIdx * 90, 0.18, { wave: 'square', volume: 0.12 });
    game.feedback.good(BTN_X, BTN_Y, { text: 'NICE', color: C.good });
    progress++;
    gizmoIdx = (gizmoIdx + 1) % GIZMO_SPRITES.length;
    cooldownT = 0; cooldownDur = nextCooldown();
    if (!halfCalled && progress >= Math.ceil(TOTAL / 2)) {
      halfCalled = true;
      game.fx.popup('あと' + (TOTAL - progress) + '!', BTN_X, BTN_Y - 220, { color: C.gold, size: 34 });
      game.audio.play('se_milestone', 0.3);
    }
    if (progress >= TOTAL) {
      ok = true; finished = true; hitStop = 0.2;
      game.fx.burst(BTN_X, BTN_Y, { color: C.gold, count: 24, speed: 420 });
      finish();
    }
  }

  function failEarly() {
    ok = false; finished = true; hitStop = 0.35; shake = 0.3;
    dollFlashT = 0.3; dollFlashColor = C.bad;
    game.feedback.bad(BTN_X, BTN_Y, { text: 'MISS' });
    game.audio.play('se_bad', 0.4);
    finish();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || ready > 0 || finished) return;
    if (!game.hit.circle(x, y, 1, BTN_X, BTN_Y, BTN_R + 18)) { game.audio.play('se_tap', 0.1); return; }
    game.audio.play('se_tap', 0.15);
    if (cooldownT >= cooldownDur) reactGood();
    else failEarly();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: BTN_X, gy: BTN_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.0;
    if (cyc < dt || demo.t <= dt) initGame();
    cooldownT += dt;
    demo.gx += (BTN_X - demo.gx) * Math.min(1, dt * 6);
    demo.gy += (BTN_Y - demo.gy) * Math.min(1, dt * 6);
    demo.press = false;
    if (cooldownT >= cooldownDur) {
      demo.press = true;
      reactGood();
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      bg();
      stepDemo(dt);
      drawGizmoBadge();
      drawDoll();
      drawButton(Math.min(1, cooldownT / cooldownDur), cooldownT >= cooldownDur);
      if (dollFlashT > 0) dollFlashT -= dt;
      if (dollBounce > 0) dollBounce -= dt * 2.4;
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawGizmoBadge();
      drawDoll();
      drawButton(1, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(progress + ' / ' + TOTAL, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + (TOTAL - progress) + '個!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(progress, { gizmos: progress, total: TOTAL });
        else game.end.failure({ gizmos: progress, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      cooldownT += dt;
      roundClock += dt;
      if (roundClock >= TIME_LIMIT) {
        roundClock = TIME_LIMIT;
        failEarly();
      }
    }
    if (dollFlashT > 0) dollFlashT -= dt;
    if (dollBounce > 0) dollBounce -= dt * 2.4;
    if (shake > 0) shake -= dt;

    bg();
    drawGizmoBadge();
    drawDoll();
    drawButton(Math.min(1, cooldownT / cooldownDur), cooldownT >= cooldownDur && !finished);

    txt(progress + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    var barPct = Math.max(0, 1 - roundClock / TIME_LIMIT);
    game.draw.rect(60, 150, W - 120, 16, '#181410', 1);
    game.draw.rect(60, 150, (W - 120) * barPct, 16, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.3], ['C4', 0.3], ['E4', 0.3], ['A4', 0.6]], { tempo: 110, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
