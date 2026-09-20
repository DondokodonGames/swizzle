// I-GBA-0001-blade-lean-dodge.js
// ブレードリーン — 飛来する投げナイフの軌道を見切り、寸前で体を反らしてよける
// 操作: ナイフが自分の左右どちらから来るかを見て、来た側と逆にスワイプして体を反らす
// 終わり: 規定本数(5本)を全てかわせば成功。1本でも当たれば失敗
// @mechanic: swipe_direction
// @theme: carnival_knife_target
// 世界観: 旅回りの見世物小屋。的板の前に立つ演者が、次々飛んでくる投げナイフを体を反らしてかわす花形芸
// 残るもの: 正誤(CLEAR/GAME OVER) + かわした本数
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 黒背景に発光する原色のライン、太いネオン管のような縁取り
  var C = {
    bg: '#0a0018', bg2: '#1a0030', tent: '#ff2e88', tentDark: '#7a1042',
    blade: '#00e5ff', bladeGlow: '#0a3a44', good: '#39ff6a', bad: '#ff3355',
    gold: '#ffe600', white: '#ffffff', ink: '#050008',
  };

  var GAME_TITLE = 'BLADE LEAN';
  var TOTAL = 5;
  var CX = W * 0.5, TY = H * 0.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var thrown, dodged, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PERFORMER = ['..##..', '.####.', '..##..', '.####.', '#.##.#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 5; i++) {
      game.draw.line(W * (0.15 + i * 0.18), H * 0.08, W * (0.5), H * 0.95, C.tentDark, 6);
    }
    game.draw.circle(CX, TY, 300, C.tentDark, 0.25);
    game.draw.circle(CX, TY, 220, C.tent, 0.12);
  }

  function drawPerformer(lean) {
    game.draw.sprite(PERFORMER, { '#': C.gold }, CX + lean, TY, 26, { anchor: 'center' });
  }

  // 一本の投げナイフのライフサイクル: dir=-1(左から)/1(右から)。逃げるべき方向は dir と逆
  function newKnife() {
    var dir = Math.random() < 0.5 ? -1 : 1;
    return { dir: dir, t: 0, dur: Math.max(0.55, 0.95 - round * 0.06), telegraphed: false, resolved: false };
  }

  var round, knife, lean, leanVel;

  function initGame() {
    thrown = 0; dodged = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    round = 0; lean = 0; leanVel = 0;
    knife = newKnife();
  }

  function resolveDodge(swipeDir) {
    if (!knife || knife.resolved || ready > 0 || done || finished) return;
    // telegraph前(未予告)の入力も許容するが、正誤判定は方向のみで見る
    knife.resolved = true;
    var correct = (swipeDir === -knife.dir);
    hitStop = correct ? 0.12 : 0.35;
    if (correct) {
      dodged++;
      leanVel = -knife.dir * 26;
      game.feedback.good(CX, TY, { text: 'DODGE', color: C.good });
      game.fx.burst(CX, TY, { color: C.gold, count: 14, speed: 320 });
      game.audio.play('se_good', 0.4);
      if (dodged === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, TY - 180, { color: C.gold, size: 40 });
    } else {
      game.feedback.bad(CX, TY, { text: 'HIT' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
    }
    thrown++;
    if (!correct) { ok = false; finished = true; finish(); return; }
    if (thrown >= TOTAL) { ok = true; finished = true; finish(); return; }
    round++;
    knife = newKnife();
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING) return;
    if (dir === 'left') resolveDodge(-1);
    else if (dir === 'right') resolveDodge(1);
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

  function drawKnife(k) {
    if (!k) return;
    var startX = k.dir < 0 ? -80 : W + 80;
    var p = Math.min(1, k.t / k.dur);
    var x = startX + (CX - startX) * p;
    // telegraph: 0.5〜0.8秒前に警告ライン+点滅
    if (p > 0.35) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) game.draw.line(x, TY - 140, x, TY + 140, C.bad, 6);
    }
    game.draw.line(startX, TY, x, TY, C.bladeGlow, 14);
    game.draw.circle(x, TY, 16, C.blade);
    game.draw.line(x - k.dir * 40, TY, x + k.dir * 6, TY, C.white, 5);
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false, phase: 'wait', phaseT: 0.6, k: null, dir: 1 };
  function stepDemo(dt) {
    demo.t += dt;
    if (round === undefined || round === null) initGame();
    if (!demo.k) { demo.k = newKnife(); demo.k.dur = 0.9; round = 0; }
    demo.k.t += dt;
    knife = demo.k; lean += (0 - lean) * Math.min(1, dt * 4);
    var p = demo.k.t / demo.k.dur;
    if (p > 0.55 && p < 0.68 && !demo.k.telegraphed) {
      demo.k.telegraphed = true;
      var swipeDir = -demo.k.dir;
      demo.gx = CX + swipeDir * 220;
      demo.press = true;
      lean = swipeDir * 30;
      game.feedback.good(CX, TY, { text: 'DODGE', color: C.good });
      game.audio.play('se_good', 0.25);
    }
    if (p >= 1) {
      demo.k = null; demo.press = false; demo.gx = CX; lean = 0;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawPerformer(lean);
      drawKnife(knife);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawPerformer(0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(dodged + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - dodged) + '本!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(dodged, { dodged: dodged, total: TOTAL });
        else game.end.failure({ dodged: dodged, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      knife.t += dt;
      if (knife.t / knife.dur >= 1 && !knife.resolved) {
        // 見切れず当たった
        knife.resolved = true;
        hitStop = 0.35;
        game.feedback.bad(CX, TY, { text: 'HIT' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (leanVel !== 0) { lean += leanVel * dt; leanVel *= 0.9; if (Math.abs(leanVel) < 1) leanVel = 0; if (Math.abs(lean) < 1) lean = 0; }
    else if (lean !== 0) lean *= 0.85;
    if (shake > 0) shake -= dt;

    bg();
    drawPerformer(lean);
    if (!finished) drawKnife(knife);

    txt(dodged + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (dodged / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.5], ['E4', 0.5], ['G4', 0.5], ['C5', 1]], { tempo: 130, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
