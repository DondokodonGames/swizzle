// J-3DSDSDSTOP10-0025-festival-trampoline-grab.js
// 祭りのトランポリン取り — 押している長さでばねを沈め、跳ぶ高さを吊り下げられた景品袋にぴたり合わせて掴み取る
// 操作: 押し続けるほど深く沈み高く跳ぶ。袋の高さに届く長さで指を離す(押しすぎると天井を越えて空振り)
// 終わり: 制限時間内に景品袋を5つ掴めば成功。時間切れで失敗
// @mechanic: hold_duration
// @theme: festival_trampoline_grab
// 世界観: 夜祭りの軽業師が、竿から吊るされた高さのばらばらな景品袋を、トランポリンの沈め具合ひとつで跳ぶ高さを合わせて次々と掴み取る
// 残るもの: 正誤(CLEAR/GAME OVER) + 掴んだ袋の数とPERFECT数
// スタイル: MODERN AD-GAME

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 高彩度・高コントラスト、太い縁取り、飛ぶ数字
  var STYLE = { bg: ['#28d7ff', '#ff5fc8', '#6a3cff'], main: ['#ffe600', '#ff3355'], accent: ['#00e38c', '#111111'] };
  var COL = {
    top: STYLE.bg[2], mid: STYLE.bg[1], low: STYLE.bg[0], yellow: STYLE.main[0], red: STYLE.main[1],
    green: STYLE.accent[0], ink: STYLE.accent[1], white: '#ffffff', net: '#2b2b6e'
  };

  var GAME_TITLE = 'TRAMPO GRAB';
  var TIME_LIMIT = 15;
  var NEEDED = 5;
  var FULL = 1.4;          // この秒数押すと最大の高さ
  var OVER = 1.7;          // これ以上は押しすぎで自動ジャンプ(天井越え)
  var WAIT = 3.0;          // 押さずに待つと袋が引っ込む(ジェスチャー待ちの上限)
  var TRAMP_Y = H * 0.76;
  var MIN_J = 160, SPAN_J = 900;
  var TOL = 95, PERFECT_TOL = 30;
  var FLY = 0.38;

  var ACRO_IDLE = ['.kkkk.', 'kyyyyk', 'kyffyk', '.kffk.', 'krrrrk', 'krrrrk', '.kbbk.', 'kb..bk'];
  var ACRO_CROUCH = ['......', '.kkkk.', 'kyyyyk', 'kyffyk', 'krrrrk', 'krrrrk', 'kbbbbk', 'kb..bk'];
  var ACRO_UP = ['k....k', 'kkkkkk', '.kyyk.', '.kffk.', '.krrk.', '.krrk.', '.kbbk.', '.k..k.'];
  var PAL_ACRO = { k: COL.ink, y: '#ffd9a8', f: '#222222', r: COL.red, b: '#1f5fff' };
  var BAG_A = ['..kk..', '.kyyk.', 'kyyyyk', 'kyggyk', 'kyyyyk', '.kkkk.'];
  var BAG_B = ['..kk..', '.kyyk.', 'kyyyyk', 'kyyyyk', 'kyggyk', '.kkkk.'];
  var PAL_BAG = { k: COL.ink, y: COL.yellow, g: COL.green };
  var LANTERN = ['.kk.', 'krrk', 'kyyk', 'krrk', '.kk.'];
  var PAL_LANTERN = { k: COL.ink, r: COL.red, y: COL.yellow };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var grabs, perfects, tries, timeLeft, ready, finished, ok, hitStop, endWait, hl, prize, holdT, holding, jump, waitT, nextN, prizeN;
  var silent = false;

  function big(str, x, y, sz, color) {
    game.draw.text(str, x - 4, y, { size: sz, color: COL.ink, bold: true, align: 'center' });
    game.draw.text(str, x + 4, y, { size: sz, color: COL.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y + 5, { size: sz, color: COL.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function newPrize() {
    prizeN++;
    var rise = game.random(260, 1000);
    var bob = prizeN >= 3 ? 50 + prizeN * 8 : 0;           // 3つ目から袋が上下に揺れる
    prize = { base: TRAMP_Y - rise, bob: bob, ph: game.random(0, 6), sp: 1.8 + prizeN * 0.15, x: W / 2 + game.random(-60, 60), gone: 0 };
    waitT = 0;
  }

  function prizeY() { return prize.base + Math.sin(prize.ph) * prize.bob; }

  function initGame() {
    grabs = 0; perfects = 0; tries = 0; timeLeft = TIME_LIMIT; ready = 0.8; finished = false; ok = false;
    hitStop = 0; endWait = 0; hl = null; holdT = 0; holding = false; jump = null; prizeN = 0; nextN = 0;
    newPrize();
  }

  function finishRound(success, x, y) {
    if (finished) return;
    finished = true; ok = success; hitStop = 0.45; hl = { x: x, y: y, t: 0 };
    if (!silent) game.audio.stopBgm();
  }

  function charge() { return Math.min(1, holdT / FULL); }
  function chargeY(c) { return TRAMP_Y - (MIN_J + c * SPAN_J); }

  function startHold() {
    if (finished || jump) return false;
    holding = true; holdT = 0;
    return true;
  }

  function releaseHold(over) {
    if (!holding) return false;
    holding = false; tries++;
    var c = over ? 1.12 : charge();
    jump = { t: 0, apex: TRAMP_Y - (MIN_J + c * SPAN_J), judged: false };
    holdT = 0;
    return true;
  }

  function stepWorld(dt) {
    if (finished) return;
    prize.ph += prize.sp * dt;
    if (prize.gone > 0) {
      prize.gone -= dt;
      if (prize.gone <= 0) newPrize();
      return;
    }
    if (holding) {
      holdT += dt;
      var step = Math.floor(holdT * 10);
      if (step !== nextN) { nextN = step; if (!silent) game.audio.tone(200 + charge() * 500, 0.05, { wave: 'square', volume: 0.05 }); }
      if (holdT >= OVER) { releaseHold(true); if (!silent) game.audio.play('se_jump', 0.4); }
    } else if (!jump) {
      waitT += dt;
      if (waitT >= WAIT) {
        tries++;
        game.feedback.bad(prize.x, prizeY(), { text: 'MISS', sound: silent ? 'se_tap' : 'se_bad', volume: silent ? 0 : 0.45 });
        prize.gone = 0.4;
      }
    }
    if (jump) {
      jump.t += dt;
      if (!jump.judged && jump.t >= FLY) {
        jump.judged = true;
        var d = Math.abs(jump.apex - prizeY());
        if (d <= TOL) {
          grabs++;
          var perfect = d <= PERFECT_TOL;
          if (perfect) perfects++;
          game.feedback.good(prize.x, prizeY(), { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? COL.yellow : COL.green, sound: silent ? 'se_tap' : 'se_coin', volume: silent ? 0 : 0.55, size: 72 });
          game.fx.popup(perfect ? '+200' : '+100', prize.x + 160, prizeY() - 40, { color: COL.white, size: 64 });
          if (grabs === 3) { game.fx.popup(grabs + ' / ' + NEEDED, W / 2, H * 0.3, { color: COL.yellow, size: 70 }); if (!silent) game.audio.play('se_milestone', 0.45); }
          if (grabs >= NEEDED) { finishRound(true, prize.x, prizeY()); return; }
          prize.gone = FLY + 0.15;
        } else {
          game.feedback.bad(prize.x, jump.apex, { text: jump.apex < prizeY() ? 'MISS' : 'MISS', sound: silent ? 'se_tap' : 'se_bad', volume: silent ? 0 : 0.45 });
        }
      }
      if (jump.t >= FLY * 2) { jump = null; waitT = 0; if (!silent) game.audio.tone('C4', 0.06, { wave: 'triangle', volume: 0.1 }); }
    }
  }

  // ── 描画 ─────────────────────────────────────────────
  function drawBack() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, COL.top], [0.5, COL.mid], [1, COL.low]]);
    game.draw.rect(0, 0, W, H, COL.white, 0.04 + 0.04 * Math.sin(t * 1.6));
    // 光の筋と提灯
    for (var i = 0; i < 5; i++) {
      var lx = W * (0.1 + i * 0.2) + Math.sin(t * 0.8 + i) * 20;
      game.draw.rect(lx - 20, 0, 40, H * 0.8, COL.white, 0.06);
      game.draw.sprite(LANTERN, PAL_LANTERN, lx, H * 0.2 + Math.sin(t * 2 + i) * 8, 12, { anchor: 'center' });
    }
    game.draw.line(0, H * 0.17, W, H * 0.21, COL.ink, 6);
  }

  function drawGauge() {
    var x = W * 0.1, top = chargeY(1), bot = chargeY(0);
    game.draw.rect(x - 22, top - 6, 44, bot - top + 12, COL.ink);
    game.draw.rect(x - 14, top, 28, bot - top, COL.net);
    if (holding) {
      var cy = chargeY(charge());
      game.draw.rect(x - 14, cy, 28, bot - cy, charge() >= 1 ? COL.red : COL.yellow);
      game.draw.line(x + 30, cy, W - 60, cy, COL.white, 4);
    }
    if (prize.gone <= 0) {
      var py = prizeY();
      game.draw.rect(x - 34, py - 6, 68, 12, COL.green);
    }
  }

  function drawPrize() {
    if (prize.gone > 0 && !(jump && jump.judged)) return;
    var t = game.time.elapsed;
    var py = prizeY();
    if (prize.gone > 0) py -= (0.55 - prize.gone) * 400;
    game.draw.line(prize.x, H * 0.19, prize.x, py - 40, COL.ink, 6);
    var blink = !holding && !jump && waitT > WAIT - 0.8 && Math.floor(t * 10) % 2 === 0;
    game.draw.sprite(Math.floor(t * 4) % 2 ? BAG_A : BAG_B, blink ? { k: COL.red, y: COL.white, g: COL.red } : PAL_BAG, prize.x, py, 16, { anchor: 'center' });
  }

  function drawTrampoline() {
    var t = game.time.elapsed;
    var sink = holding ? charge() * 60 : 0;
    game.draw.rect(W / 2 - 250, TRAMP_Y + 30, 30, 170, COL.ink);
    game.draw.rect(W / 2 + 220, TRAMP_Y + 30, 30, 170, COL.ink);
    game.draw.line(W / 2 - 240, TRAMP_Y + 30, W / 2, TRAMP_Y + 30 + sink, COL.ink, 22);
    game.draw.line(W / 2, TRAMP_Y + 30 + sink, W / 2 + 240, TRAMP_Y + 30, COL.ink, 22);
    game.draw.line(W / 2 - 240, TRAMP_Y + 30, W / 2, TRAMP_Y + 30 + sink, COL.net, 12);
    game.draw.line(W / 2, TRAMP_Y + 30 + sink, W / 2 + 240, TRAMP_Y + 30, COL.net, 12);
    // 軽業師
    var ay, fr;
    if (jump) {
      var k = jump.t / FLY;
      var up = k <= 1 ? 1 - (1 - k) * (1 - k) : 1 - (k - 1) * (k - 1);
      ay = TRAMP_Y - 60 - (TRAMP_Y - 60 - jump.apex) * up;
      fr = ACRO_UP;
    } else if (holding) {
      ay = TRAMP_Y - 50 + sink; fr = ACRO_CROUCH;
    } else {
      ay = TRAMP_Y - 60 - Math.abs(Math.sin(t * 4)) * 40; fr = ACRO_IDLE;
    }
    game.draw.circle(W / 2, TRAMP_Y + 34, 60, COL.ink, 0.25);
    game.draw.sprite(fr, PAL_ACRO, W / 2 + Math.sin(t * 1.5) * 8, ay, 18, { anchor: 'center' });
  }

  function drawThumb() {
    var t = game.time.elapsed;
    game.draw.rect(0, H * 0.87, W, H * 0.13, COL.ink, 0.35);
    var r = 90 + (holding ? charge() * 30 : 6 * Math.sin(t * 3));
    game.draw.circle(W / 2, H * 0.93, r + 10, COL.ink);
    game.draw.circle(W / 2, H * 0.93, r, holding ? COL.yellow : COL.red);
    game.draw.circle(W / 2, H * 0.93, r * 0.45, COL.white, 0.6);
  }

  function drawHud() {
    big(grabs + ' / ' + NEEDED, W / 2, H * 0.05, 64, COL.yellow);
    var low = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(76, 156, W - 152, 30, COL.ink);
    game.draw.rect(80, 160, (W - 160) * Math.max(0, timeLeft / TIME_LIMIT), 22, low ? COL.red : COL.green);
    for (var i = 0; i < NEEDED; i++) game.draw.sprite(i < grabs ? BAG_A : BAG_B, i < grabs ? PAL_BAG : { k: COL.ink, y: '#8888aa', g: '#666688' }, W * 0.3 + i * 110, 230, 7, { anchor: 'center' });
  }

  function drawHighlight(dt) {
    if (!hl) return;
    hl.t += dt;
    game.draw.circle(hl.x, hl.y, 70 + hl.t * 320, COL.white, Math.max(0, 0.7 - hl.t));
    game.draw.sprite(ok ? BAG_A : ACRO_CROUCH, ok ? PAL_BAG : PAL_ACRO, hl.x, hl.y, 20 + hl.t * 16, { anchor: 'center' });
  }

  // ── ATTRACT ゴースト実演(実ロジック) ─────────────────
  var demo = { t: 0, gx: W / 2, gy: H * 0.93, press: false, n: 0, target: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) {
      initGame(); ready = 0; prizeN = 1; newPrize(); prize.bob = 0;
      demo.n++;
      var over = demo.n % 3 === 0;   // 失敗例: 押しすぎて空振り
      var need = (TRAMP_Y - prize.base - MIN_J) / SPAN_J;
      demo.target = Math.max(0.05, Math.min(1, need)) * FULL + (over ? 0.35 : 0);
    }
    silent = true;
    if (cyc > 0.4 && !holding && !jump && prize.gone <= 0 && tries === 0) startHold();
    if (holding && holdT >= demo.target) releaseHold(false);
    demo.press = holding;
    demo.gx = W / 2 + Math.sin(demo.t * 2) * 16; demo.gy = holding ? H * 0.93 : H * 0.9;
    stepWorld(dt);
    silent = false;
  }

  // ── 入力 ─────────────────────────────────────────────
  game.onTap(function () {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function (x, y) {
    if (state !== S.PLAYING || ready > 0) return;
    if (startHold()) { game.audio.play('se_tap', 0.4); game.fx.burst(W / 2, TRAMP_Y + 30, { color: COL.yellow, count: 6, speed: 200 }); }
    else game.audio.tone('A3', 0.05, { wave: 'triangle', volume: 0.08 });
  });
  game.onRelease(function (x, y) {
    if (state !== S.PLAYING) return;
    if (releaseHold(false)) { game.audio.play('se_jump', 0.5); game.fx.burst(W / 2, TRAMP_Y + 30, { color: COL.white, count: 12, speed: 320 }); }
  });

  // ── ループ(唯一の onUpdate) ───────────────────────────
  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (prize === undefined) initGame();
      stepDemo(dt);
      drawBack(); drawGauge(); drawPrize(); drawTrampoline(); drawThumb();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      big(GAME_TITLE, W / 2, H * 0.07, 84, COL.yellow);
      big('HI-SCORE ' + (game.best || 0), W / 2, H * 0.125, 36, COL.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) big('► 100円 投入 ◄', W / 2, H * 0.975, 44, COL.yellow);
      else big('INSERT COIN', W / 2, H * 0.975, 38, COL.white);
      return;
    }

    if (state === S.RESULT) {
      drawBack(); drawTrampoline(); drawThumb();
      var sc = grabs * 100 + perfects * 100 + (ok ? Math.round(timeLeft * 30) : 0);
      big(ok ? 'CLEAR' : 'TIME UP', W / 2, H * 0.1, 110, ok ? COL.yellow : COL.red);
      big(grabs + ' / ' + NEEDED, W / 2, H * 0.17, 60, COL.white);
      big('SCORE ' + sc, W / 2, H * 0.225, 48, COL.white);
      if (ok && sc > (game.best || 0)) big('NEW RECORD', W / 2, H * 0.28, 52, COL.yellow);
      else big('BEST ' + (game.best || 0), W / 2, H * 0.28, 40, COL.white);
      if (!ok) big('あと' + (NEEDED - grabs) + '個!', W / 2, H * 0.45, 76, COL.yellow);
      if (!ok) big('GAME OVER', W / 2, H * 0.36, 60, COL.red);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) big('TAP TO CONTINUE', W / 2, H * 0.975, 40, COL.white);
      return;
    }

    if (finished) {
      if (hitStop > 0) {
        hitStop -= dt;
        if (hitStop <= 0) {
          if (ok) { game.feedback.good(hl.x, hl.y, { text: 'CLEAR', color: COL.yellow, count: 28, size: 80 }); game.audio.play('se_success', 0.6); }
          else { game.feedback.bad(hl.x, hl.y, { text: 'TIME UP' }); game.audio.play('se_failure', 0.5); }
          endWait = 1.1;
        }
      } else {
        endWait -= dt;
        if (endWait <= 0) {
          state = S.RESULT;
          var stats = { grabs: grabs, needed: NEEDED, perfects: perfects, tries: tries };
          if (ok) game.end.success(grabs * 100 + perfects * 100 + Math.round(timeLeft * 30), stats);
          else game.end.failure(stats);
        }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.5);
    } else {
      timeLeft -= dt;
      if (timeLeft <= 0) { timeLeft = 0; holding = false; finishRound(false, W / 2, TRAMP_Y - 60); }
      else {
        if (game.input.pressing && !holding && !jump) startHold();   // 着地前から押しっぱなしの指を拾う
        stepWorld(dt);
      }
    }

    drawBack(); drawGauge(); drawPrize(); drawTrampoline(); drawThumb(); drawHud();
    if (finished) drawHighlight(dt);
    if (ready > 0) big(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 120, COL.yellow);
  });

  game.onStart(function () {
    game.audio.melody([['C5', 0.5], ['C5', 0.25], ['E5', 0.25], ['G5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 1]],
      { tempo: 144, wave: 'square', volume: 0.05, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
