// K-X-0005-drum-crack-break.js
// ドラムクラックブレイク — 光る割符マークが出ている間に太鼓を連打し、時間内に叩き割る
// 操作: 太鼓の面に割符マークが浮かぶと、その場を連打して規定回数叩き割る。マーク自身の制限時間内に割り切る
// 終わり: 3枚の割符マークをすべて時間内に叩き割れば成功。1枚でも間に合わなければ失敗
// @mechanic: mash
// @theme: sealstone_drum_shatter
// 世界観: 儀式の太鼓に封じられた割符の石。浮かび上がる印を、限られた刻限のうちに連打で叩き割り封を解く
// 残るもの: 正誤(CLEAR/GAME OVER) + 叩き割った枚数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い黒縁、フラットな面塗り、2段階の簡易陰影
  var C = {
    bg: '#3a2a1a', bg2: '#241608', drumBody: '#c8863c', drumBodyDark: '#8a5c22',
    seal: '#e0d0a0', sealCrack: '#5a4020', good: '#5ad86a', bad: '#e04858',
    gold: '#ffcf3a', white: '#fff8e8', ink: '#1a1006',
  };

  var GAME_TITLE = 'CRACK BREAK';
  var DX = W * 0.5, DY = H * 0.5;
  var R = 220;
  var MARKS = 3;
  var HITS_NEEDED = [5, 6, 7];
  var MARK_LIMIT = [2.6, 2.5, 2.4];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SEAL_SPRITE = ['.#####.', '#..#..#', '###.###', '#..#..#', '.#####.'];
  var SEAL_CRACKED = ['.#.#.#.', '#.....#', '.#...#.', '#.....#', '.#.#.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 6; i++) game.draw.rect(0, H * 0.1 + i * 40, W, 3, '#00000010');
    // 常時アニメ(ATTRACTが静止して見えないようにする明滅)
    var pulse = 0.5 + 0.5 * Math.sin(game.time.elapsed * 1.8);
    game.draw.rect(0, 0, W, H, C.gold, 0.015 + 0.03 * pulse);
  }

  function drawDrum(flash) {
    game.draw.circle(DX, DY + 14, R + 18, '#00000040');
    game.draw.circle(DX, DY, R, flash ? C.white : C.drumBodyDark);
    game.draw.circle(DX, DY, R - 34, flash ? C.white : C.drumBody);
  }

  var markIdx, hits, needHits, markT, limit, done, endWait, finished, flashT;
  var ready, hitStop, shake, milestoneShown;

  function newMark() {
    hits = 0; needHits = HITS_NEEDED[markIdx]; markT = 0; limit = MARK_LIMIT[markIdx];
  }

  function initGame() {
    markIdx = 0; done = false; endWait = 0; finished = false; flashT = 0;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
    newMark();
  }

  function onHit(x, y) {
    if (done || ready > 0 || finished) { return; }
    var d = Math.hypot(x - DX, y - DY);
    if (d > R) { game.audio.play('se_tap', 0.05); return; }
    hits++;
    flashT = 0.08;
    game.feedback.good(DX, DY, { text: null, color: C.good, count: 3 });
    game.audio.play('se_tap', 0.15);
    if (hits >= needHits) {
      hitStop = 0.14;
      game.feedback.good(DX, DY, { text: 'BREAK', color: C.gold });
      game.fx.burst(DX, DY, { color: C.gold, count: 20, speed: 380 });
      game.audio.play('se_break', 0.45);
      markIdx++;
      if (markIdx >= MARKS) { ok = true; finished = true; finish(); return; }
      game.fx.popup(markIdx + ' / ' + MARKS, DX, H * 0.18, { color: C.gold, size: 36 });
      game.audio.play('se_milestone', 0.3);
      newMark();
    }
  }

  game.onPress(function(x, y) { if (state === S.PLAYING) onHit(x, y); });

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

  function drawSeal() {
    var p = hits / needHits;
    game.draw.sprite(p > 0.5 ? SEAL_CRACKED : SEAL_SPRITE, { '#': C.seal }, DX, DY, 20, { anchor: 'center' });
    var timeP = Math.max(0, 1 - markT / limit);
    game.draw.rect(DX - 140, DY + R + 40, 280, 14, C.sealCrack, 0.6);
    game.draw.rect(DX - 140, DY + R + 40, 280 * timeP, 14, timeP < 0.3 ? C.bad : C.gold);
  }

  var demo = { t: 0, gx: DX, gy: DY, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.4;
    if (cyc < dt || demo.t <= dt) { hits = 0; needHits = 5; markT = 0; limit = 2.4; }
    markT += dt;
    demo.press = Math.floor(demo.t * 8) % 2 === 0;
    if (demo.press && !demo.did && hits < needHits) { demo.did = true; hits++; game.audio.play('se_tap', 0.06); }
    if (!demo.press) demo.did = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (hits === undefined) initGame();
      bg();
      stepDemo(dt);
      drawDrum(demo.press);
      drawSeal();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 22 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawDrum(false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(markIdx + ' / ' + MARKS, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと少し!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(markIdx, { broken: markIdx, total: MARKS });
        else game.end.failure({ broken: markIdx, total: MARKS });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      markT += dt;
      if (markT >= limit) {
        hitStop = 0.3; shake = 0.26;
        game.feedback.bad(DX, DY, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (flashT > 0) flashT -= dt;
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawDrum(flashT > 0);
    if (!finished) drawSeal();

    txt(markIdx + ' / ' + MARKS, W / 2, H * 0.06, 30, C.white);
    txt(hits + ' / ' + needHits, W / 2, H * 0.10, 24, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.24, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.12], ['A4', 0.12], ['D5', 0.12], ['A4', 0.24]], { tempo: 158, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
