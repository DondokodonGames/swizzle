// K-DS-0010-sync-dive-release.js
// シンクロダイブ — 息を溜めて構え、相方の合図とぴったり重なる瞬間に指を離して飛び込む
// 操作: 指を押さえて息を溜め、ゲージが示す合図の窓に入った瞬間に指を離して飛び込む
// 終わり: 合図の窓ぴったりで離せば成功(判定PERFECT/GOOD)。早すぎ/溜めすぎれば失敗
// @mechanic: hold_charge
// @theme: synchronized_dive_pair
// 世界観: プールサイドに並んで立つ飛び込みペア。息を溜めながら構え、相方の合図とぴったり重なる瞬間に手を離して同時に飛び込む
// 残るもの: 正誤(CLEAR/GAME OVER) + 判定(PERFECT/GOOD/MISS)
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 光沢のあるタイル、ハイライト帯で立体感
  var C = {
    bg: '#bfe3f0', bg2: '#8fc9de', tile: '#e8f4f8', tileEdge: '#c0d8e0',
    water: '#2a7fb0', waterLight: '#4fa8d8', diver: '#ff8a3d', diverGhost: '#5a7ba0',
    barBg: '#3a4a54', barFill: '#ffcc55', bracket: '#ff4757',
    good: '#2ecc71', bad: '#ff4757', gold: '#ffcc00', white: '#ffffff', ink: '#122430',
  };

  var GAME_TITLE = 'SYNC DIVE';
  var CX = W * 0.5, PLAT_Y = H * 0.42;
  var CHARGE_TIME = 1.5;
  var LO = 0.78, HI = 0.94, TIGHT_LO = 0.84, TIGHT_HI = 0.90;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;
  var grade = '';

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DIVER = ['..##..', '.####.', '..##..', '.####.'];
  var DIVER_COIL = ['.####.', '..##..', '.####.', '..##..'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, PLAT_Y + 60, W, 40, C.tileEdge);
    game.draw.rect(0, PLAT_Y + 60, W, 24, C.tile);
    game.draw.gradient(0, H, [[0.55, C.waterLight], [1, C.water]]);
    for (var i = 0; i < 5; i++) game.draw.rect(0, H * (0.75 + i * 0.04), W, 3, '#ffffff30');
  }

  var holding, charge, resolved, halfFlag, done, endWait, finished, readyIn, hitStop, shake, flashT, flashOk;

  function initGame() {
    holding = false; charge = 0; resolved = false; halfFlag = false;
    done = false; endWait = 0; finished = false;
    readyIn = 0.8; hitStop = 0; shake = 0; flashT = 0; flashOk = true; grade = '';
  }

  function beginHold() {
    if (readyIn > 0 || done || finished || hitStop > 0 || holding || resolved) return;
    holding = true;
    game.audio.tone(220, 0.5, { wave: 'sine', volume: 0.05, slide: 320 });
  }

  function release() {
    if (!holding || resolved) { holding = false; return; }
    holding = false; resolved = true;
    var c = charge;
    if (c < LO) {
      grade = 'MISS'; ok = false;
      hitStop = 0.3; shake = 0.2; flashT = 0.2; flashOk = false;
      game.feedback.bad(CX, PLAT_Y, { text: 'MISS' });
      finished = true; finish();
    } else if (c >= TIGHT_LO && c <= TIGHT_HI) {
      grade = 'PERFECT'; ok = true;
      hitStop = 0.14; flashT = 0.2; flashOk = true;
      game.feedback.good(CX, PLAT_Y, { text: 'PERFECT' });
      game.fx.burst(CX, PLAT_Y, { color: C.gold, count: 20, speed: 380 });
      game.audio.play('se_good', 0.4);
      finished = true; finish();
    } else if (c <= HI) {
      grade = 'GOOD'; ok = true;
      hitStop = 0.12; flashT = 0.2; flashOk = true;
      game.feedback.good(CX, PLAT_Y, { text: 'GOOD' });
      game.audio.play('se_good', 0.35);
      finished = true; finish();
    } else {
      grade = 'MISS'; ok = false;
      hitStop = 0.3; shake = 0.2; flashT = 0.2; flashOk = false;
      game.feedback.bad(CX, PLAT_Y, { text: 'MISS' });
      finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.12); beginHold(); } });
  game.onRelease(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.05); release(); } });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepCharge(dt) {
    if (holding) {
      charge += dt / CHARGE_TIME;
      if (charge >= 0.5 && !halfFlag) {
        halfFlag = true;
        game.fx.popup(50 + ' / ' + 100, CX, PLAT_Y - 260, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.3);
      }
      if (charge >= 1 && !resolved) {
        charge = 1; resolved = true; holding = false;
        grade = 'MISS'; ok = false;
        hitStop = 0.3; shake = 0.2; flashT = 0.2; flashOk = false;
        game.feedback.bad(CX, PLAT_Y, { text: 'MISS' });
        finished = true; finish();
      }
    }
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false, holding: false, charge: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) { demo.holding = false; demo.charge = 0; }
    if (!demo.holding && cyc > 0.2 && cyc < 0.25) demo.holding = true;
    demo.press = demo.holding;
    if (demo.holding) {
      demo.charge += dt / CHARGE_TIME;
      if (demo.charge >= TIGHT_LO && demo.charge <= TIGHT_HI + 0.02 && demo.holding) {
        // release right in the middle of the bracket
        if (demo.charge >= (TIGHT_LO + TIGHT_HI) / 2) {
          demo.holding = false;
          game.feedback.good(CX, PLAT_Y, { text: 'PERFECT' });
          game.audio.play('se_good', 0.2);
        }
      }
    }
    charge = Math.min(1, demo.charge); holding = demo.holding;
  }

  function drawScene() {
    bg();
    var lean = holding ? Math.min(1, charge) * 24 : 0;
    var spr = holding ? DIVER_COIL : DIVER;
    game.draw.sprite(spr, { '#': C.diver }, CX, PLAT_Y - 30 - lean, 20, { anchor: 'center' });
    game.draw.sprite(DIVER, { '#': C.diverGhost }, CX + 190, PLAT_Y - 30, 20, { anchor: 'center', alpha: 0.7 });
    // charge bar
    var bx = W * 0.2, by = H * 0.72, bw = W * 0.6, bh = 46;
    game.draw.rect(bx, by, bw, bh, C.barBg);
    game.draw.rect(bx, by, bw * Math.min(1, charge), bh, C.barFill);
    game.draw.rect(bx + bw * LO, by - 8, bw * (HI - LO), bh + 16, C.bracket, 0.35);
    game.draw.rect(bx + bw * TIGHT_LO, by - 8, bw * (TIGHT_HI - TIGHT_LO), bh + 16, C.gold, 0.5);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      if (grade) txt(grade, W / 2, H * 0.13, 34, ok ? C.gold : C.bad);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(grade === 'PERFECT' ? 2 : 1, { grade: grade });
        else game.end.failure({ grade: grade });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (readyIn > 0) {
      readyIn -= dt;
      if (readyIn <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepCharge(dt);
    }
    if (flashT > 0) flashT -= dt;
    if (shake > 0) shake -= dt;

    drawScene();
    if (flashT > 0) game.draw.circle(CX, PLAT_Y, 60, flashOk ? C.good : C.bad, 0.3);

    txt(Math.floor(Math.min(1, charge) * 100) + ' / ' + 100, W / 2, H * 0.06, 30, C.ink);
    if (readyIn > 0) txt(readyIn > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.24, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_cute', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
