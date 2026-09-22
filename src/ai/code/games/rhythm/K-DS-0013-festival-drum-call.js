// K-DS-0013-festival-drum-call.js
// 祭り太鼓連打 — 祭囃子の拍に合わせて太鼓を打ち続ける
// 操作: 太鼓の上に光る打点マーカーが来た瞬間に画面をタップして打つ
// 終わり: 規定打数(10打)を拍に合わせて打ち切れば成功。3回外せば失敗
// @mechanic: rhythm
// @theme: festival_drum_stage
// 世界観: 夜祭りの櫓の上。囃子方の見習いが大太鼓の前に立ち、笛と鉦の拍に合わせて撥を打ち下ろす。ズレれば観客がどよめく
// 残るもの: 正誤(大当たり/不揃い)+ 打てた拍数と最大連続数
// スタイル: MODERN AD-GAME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 高彩度・高コントラスト、太い縁取り、飛ぶ数字
  var C = {
    bg: '#ff7a1a', bg2: '#ff3d1a', drumBody: '#3a1608', drumFace: '#f4d9a0', drumRim: '#8a3a10',
    marker: '#ffe600', markerGlow: '#fff6c0', good: '#25e07a', bad: '#ff2255',
    gold: '#ffffff', white: '#ffffff', ink: '#1a0800',
  };

  var GAME_TITLE = 'DRUM CALL';
  var TOTAL = 10;
  var MISS_LIMIT = 3;
  var CX = W * 0.5, CY = H * 0.5;
  var BEAT = 0.72; // 1拍の秒数(テンポ)

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DRUMMER_UP = ['.#.', '###', '.#.', '#.#'];
  var DRUMMER_DOWN = ['.#.', '###', '###', '#.#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 6; i++) game.draw.rect(0, H * 0.05 + i * 70, W, 6, '#ffffff18');
  }

  function drawDrum(hit) {
    game.draw.circle(CX, CY, 260, C.drumRim);
    game.draw.circle(CX, CY, 220, C.drumFace);
    game.draw.circle(CX, CY, 220, hit ? C.marker : '#00000000', hit ? 0.35 : 0);
    for (var i = 0; i < 12; i++) {
      var a = (i / 12) * Math.PI * 2;
      game.draw.circle(CX + Math.cos(a) * 236, CY + Math.sin(a) * 236, 10, C.drumBody);
    }
    game.draw.sprite(hit ? DRUMMER_DOWN : DRUMMER_UP, { '#': C.drumBody }, CX, CY - 340, 30, { anchor: 'center' });
  }

  var beatT, hitCount, missCount, maxCombo, combo, windowOpen, resolvedThis, done, endWait, finished;
  var ready, hitStop, shake, flashHit;

  function initGame() {
    hitCount = 0; missCount = 0; maxCombo = 0; combo = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; flashHit = 0;
    beatT = 0; windowOpen = false; resolvedThis = false;
  }

  function hitDrum() {
    if (resolvedThis || ready > 0 || done || finished) return;
    var phase = beatT / BEAT;
    var dist = Math.min(phase, 1 - phase);
    var inWindow = dist < 0.22;
    resolvedThis = true;
    if (inWindow) {
      hitCount++; combo++; if (combo > maxCombo) maxCombo = combo;
      flashHit = 0.15;
      game.feedback.good(CX, CY, { text: combo >= 5 ? 'PERFECT' : 'GOOD', color: C.good });
      game.audio.play('se_good', 0.35);
      hitStop = 0.06;
      if (hitCount === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, CY - 300, { color: C.white, size: 42 });
    } else {
      missCount++; combo = 0;
      game.feedback.bad(CX, CY, { text: 'MISS' });
      shake = 0.22;
      game.audio.play('se_bad', 0.35);
      hitStop = 0.1;
    }
    if (missCount >= MISS_LIMIT) { ok = false; finished = true; finish(); return; }
    if (hitCount >= TOTAL) { ok = true; finished = true; finish(); return; }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING) return;
    game.audio.play('se_tap', 0.1);
    hitDrum();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: CY, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (BEAT * 4);
    if (cyc < dt || demo.t <= dt) { hitCount = 0; combo = 0; }
    beatT = cyc % BEAT;
    var missThis = Math.floor(cyc / BEAT) === 2; // 4拍中1回だけ外す実演
    var phase = beatT / BEAT;
    demo.press = phase < 0.18;
    if (Math.floor(cyc / BEAT) !== demo._lastBeat) {
      demo._lastBeat = Math.floor(cyc / BEAT);
      if (!missThis) {
        game.feedback.good(CX, CY, { text: 'GOOD', color: C.good });
        game.audio.play('se_good', 0.18);
        hitCount++;
      } else {
        game.feedback.bad(CX, CY, { text: 'MISS' });
        game.audio.play('se_bad', 0.18);
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawDrum(demo.press);
      game.draw.hand(demo.gx, demo.gy - 260, { press: demo.press, scale: 22 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawDrum(false);
      txt(ok ? '大当たり' : '不揃い', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(hitCount + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.white);
      if (!ok) txt('あと' + (TOTAL - hitCount) + '打!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var score = hitCount * 100 + maxCombo * 20;
        if (ok) game.end.success(score, { hits: hitCount, misses: missCount, maxCombo: maxCombo });
        else game.end.failure({ hits: hitCount, misses: missCount });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      beatT += dt;
      if (beatT >= BEAT) {
        beatT -= BEAT;
        if (!resolvedThis) {
          missCount++; combo = 0;
          game.feedback.bad(CX, CY, { text: 'MISS' });
          shake = 0.22;
          game.audio.play('se_bad', 0.35);
          if (missCount >= MISS_LIMIT) { ok = false; finished = true; finish(); }
        }
        resolvedThis = false;
      }
    }
    if (flashHit > 0) flashHit -= dt;
    if (shake > 0) shake -= dt;

    bg();
    // telegraph: 打点窓が近づくと縁が点滅
    var phase2 = beatT / BEAT;
    var near = Math.min(phase2, 1 - phase2) < 0.3;
    if (near && !finished) game.draw.circle(CX, CY, 250, C.marker, 0.25 + 0.15 * Math.sin(game.time.elapsed * 20));
    drawDrum(flashHit > 0);

    txt(hitCount + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    txt('x' + combo, W / 2, H * 0.115, 24, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.4);
    game.draw.rect(60, 150, (W - 120) * (hitCount / TOTAL), 16, C.good);
    for (var i = 0; i < MISS_LIMIT; i++) {
      game.draw.circle(W - 80 - i * 44, H * 0.06, 14, i < missCount ? C.bad : '#ffffff55');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.72, 58, C.white);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.25], ['E4', 0.25], ['G4', 0.25], ['A4', 0.25]], { tempo: 166, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
