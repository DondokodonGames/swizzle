// D-20092012-0018-ink-blade-standoff.js
// インクブレード・スタンドオフ — 墨絵の剣士と対峙し、斬撃はスワイプで斬り返し、突きはタップでかわす一騎討ち
// 操作: 敵が横に構えたら斬り返す方向へスワイプ、敵が突いてきたら素早くタップしてかわす
// 終わり: 規定回数(4合)を凌ぎ切れば勝利。1回でも取りこぼせば敗北
// @mechanic: turn_attack
// @theme: ink_blade_standoff
// 世界観: 墨一色の野原に立つ二人の剣士。交互に繰り出される斬撃と突きを見切り、最後まで立っていた方が勝つ一騎討ち
// 残るもの: 正誤(CLEAR/GAME OVER) + 凌いだ合数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 白黒2値。中間色はディザ、線の太さで距離と力を語る
  var C = {
    bg1: '#f8f4ea', bg2: '#e8e0d0', ink: '#141210', dither: '#00000022',
    good: '#141210', bad: '#141210', gold: '#141210', white: '#f4f0e8',
  };

  var GAME_TITLE = 'INK STANDOFF';
  var TOTAL = 4;
  var CX = W * 0.5;
  var PY = H * 0.56, EY = H * 0.30;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var PLAYER = ['.##.', '####', '.##.', '#..#'];
  var ENEMY = ['.##.', '####', '.##.', '#..#'];

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function ditherRect(x, y, w, h, alpha) {
    var step = 6;
    for (var yy = 0; yy < h; yy += step) {
      for (var xx = (yy / step) % 2 === 0 ? 0 : step; xx < w; xx += step * 2) {
        game.draw.rect(x + xx, y + yy, step, step, C.dither, alpha);
      }
    }
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.line(0, H * 0.72, W, H * 0.72, C.ink, 5);
    ditherRect(0, H * 0.72, W, H * 0.14, 0.6);
  }

  // 合(あい): type='slash' or 'thrust'。slash は方向(dir:-1/1)、thrust はタップのみ
  var bouts, idx, done, endWait, finished, pTilt, eTilt, bout, bt;
  var ready, hitStop, shake, milestoneDone;

  function newBout(i) {
    var type = Math.random() < 0.55 ? 'slash' : 'thrust';
    var dir = Math.random() < 0.5 ? -1 : 1;
    return { type: type, dir: dir, t: 0, telegraphed: false, resolved: false, windup: 0.85 - i * 0.05 };
  }

  function initGame() {
    bouts = 0; idx = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneDone = false;
    pTilt = 0; eTilt = 0;
    bout = newBout(0); bt = 0;
  }

  function resolveInput(kind, dir) {
    if (!bout || bout.resolved || ready > 0 || finished) return;
    var need = bout.type === 'slash' ? 'slash' : 'thrust';
    var correct = kind === need && (need === 'thrust' || dir === -bout.dir);
    bout.resolved = true;
    hitStop = correct ? 0.1 : 0.35;
    if (correct) {
      bouts++;
      pTilt = need === 'slash' ? -bout.dir * 24 : 0;
      game.feedback.good(CX, PY, { text: 'PARRY', color: C.good });
      game.audio.play('se_good', 0.35);
      if (bouts === Math.ceil(TOTAL / 2) && !milestoneDone) {
        milestoneDone = true;
        game.fx.popup('あと半分!', CX, H * 0.4, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.35);
      }
      if (bouts >= TOTAL) { ok = true; finished = true; finish(); return; }
      idx++;
      bout = newBout(idx); bt = 0;
    } else {
      shake = 0.3;
      game.feedback.bad(CX, PY, { text: 'HIT' });
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING) return;
    game.audio.play('se_tap', 0.08);
    if (dir === 'left') resolveInput('slash', -1);
    else if (dir === 'right') resolveInput('slash', 1);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.1); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) { game.audio.play('se_tap', 0.08); resolveInput('thrust', 0); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function updateGame(dt) {
    if (!bout || finished) return;
    bt += dt;
    var p = bt / bout.windup;
    if (p > 0.45 && !bout.telegraphed) bout.telegraphed = true;
    if (p >= 1 && !bout.resolved) {
      bout.resolved = true;
      hitStop = 0.35; shake = 0.3;
      game.feedback.bad(CX, PY, { text: 'HIT' });
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; }
    if (!finished) updateGame(dt);
    if (bout && bout.telegraphed && !bout.resolved && bt / bout.windup > 0.55 && bt / bout.windup < 0.85) {
      if (bout.type === 'slash') {
        demo.gx = CX + (-bout.dir) * 220;
        demo.press = true;
        resolveInput('slash', -bout.dir);
      } else {
        demo.gx = CX; demo.press = true;
        resolveInput('thrust', 0);
      }
    } else if (!bout || bout.resolved) {
      demo.press = false;
    }
    demo.gy = H * 0.86 + Math.sin(game.time.elapsed * 3) * 14;
    if (!bout || bout.resolved) demo.gx = CX + Math.cos(game.time.elapsed * 2) * 30;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (bouts === undefined) initGame();
      bg();
      stepDemo(dt);
      drawFighters();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.ink, 'center');
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.ink, 'center');
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.ink, 'center');
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink, 'center');
      }
      return;
    }

    if (state === S.RESULT) {
      bg(); drawFighters();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, C.ink, 'center');
      txt(bouts + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.ink, 'center');
      if (!ok) txt('あと' + (TOTAL - bouts) + '合!', W / 2, H * 0.18, 26, C.ink, 'center');
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink, 'center');
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(bouts, { bouts: bouts, total: TOTAL });
        else game.end.failure({ bouts: bouts, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else {
      updateGame(dt);
    }
    if (shake > 0) shake -= dt;
    if (pTilt !== 0) pTilt *= 0.88;

    bg();
    drawFighters();

    txt(bouts + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.ink, 'center');
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.15);
    game.draw.rect(60, 150, (W - 120) * (bouts / TOTAL), 16, C.ink, 0.8);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.ink, 'center');
  });

  function drawFighters() {
    var eBob = Math.sin(game.time.elapsed * 3) * 8;
    var pBob = Math.sin(game.time.elapsed * 3 + 1) * 6;
    game.draw.circle(CX, EY + 60, 50, C.dither, 0.5);
    game.draw.sprite(ENEMY, { '#': C.ink }, CX + eTilt, EY + eBob, 15, { anchor: 'center' });
    // 合図(telegraph): 斬撃=横線が点滅/突き=中央に光点が点滅
    if (bout && bout.telegraphed && !bout.resolved) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (bout.type === 'slash') {
        game.draw.line(CX - bout.dir * 260, EY + 40, CX + bout.dir * 40, EY + 40, C.ink, blink ? 10 : 4);
      } else {
        game.draw.circle(CX, (EY + PY) / 2, blink ? 34 : 20, C.ink, 0.8);
      }
    }
    game.draw.circle(CX, PY + 70, 55, C.dither, 0.5);
    game.draw.sprite(PLAYER, { '#': C.ink }, CX + pTilt, PY + pBob, 16, { anchor: 'center' });
  }

  game.onStart(function() {
    game.audio.melody([['A3', 0.4], ['A3', 0.2], ['C4', 0.4], ['E4', 0.6]], { tempo: 100, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
