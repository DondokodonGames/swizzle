// D-20222026-0003-cipher-word-hunt.js
// サイファー・ワードハント — 色のヒント列を読み解き、3つの候補語から暗号の正解を見つけ出す
// 操作: 上の色ヒント列を見て、下の3つの候補語のうち矛盾しない1語をタップする
// 終わり: 規定回数以内に正解を当てれば成功。当てられなければ失敗
// @mechanic: spot
// @theme: cipher_word_hunt
// 世界観: 暗号解読室の捜査官が、緑・黄・灰の色ヒント列を読み解いて矛盾のない候補語を見つけ出し、規定回数以内に暗号の正解語を当てる
// 残るもの: 正誤(CLEAR/GAME OVER) + 正解までに使った回数
// スタイル: 70s MONO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s MONO: セピア寄りモノクロ+差し色1色、粒状ノイズ感の平面
  var C = {
    bg: '#e8e0cf', bg2: '#cfc4a8', panel: '#3a342a', tile: '#4a4436',
    hit: '#5ea86a', near: '#d0a83a', miss: '#6a6458',
    good: '#5ea86a', bad: '#c1503f', gold: '#d0a83a', ink: '#201c14', white: '#f4efdf',
  };

  var GAME_TITLE = 'WORD HUNT';
  var WORDS = ['LAMP', 'SHIP', 'GOLD', 'MOON', 'FROG', 'KING', 'BOAT', 'FISH'];
  var LEN = 4;
  var MAX_TRY = 3;
  var TRY_TIME = 3.6;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#100c06', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SLEUTH_F = [
    ['.##.', '####', '.##.', '#..#'],
    ['.##.', '####', '.##.', '.##.'],
  ];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, H * 0.24, W, H * 0.2, C.panel);
  }

  function pick(exclude) {
    var w;
    do { w = WORDS[Math.floor(Math.random() * WORDS.length)]; } while (w === exclude);
    return w;
  }

  function hintFor(secret, guess) {
    var res = [];
    for (var i = 0; i < LEN; i++) {
      if (guess[i] === secret[i]) res.push(2);
      else if (secret.indexOf(guess[i]) >= 0) res.push(1);
      else res.push(0);
    }
    return res;
  }
  function consistent(word, hint, guess) {
    var h2 = hintFor(word, guess);
    for (var i = 0; i < LEN; i++) if (h2[i] !== hint[i]) return false;
    return true;
  }

  var secret, guessWord, hint, candidates, correctIdx, tryIdx, tryT, resolved;
  var done, endWait, finished, ready, hitStop, shake, milestoneShown;

  function newTry() {
    secret = pick(null);
    guessWord = pick(secret);
    hint = hintFor(secret, guessWord);
    var others = [];
    for (var i = 0; i < WORDS.length && others.length < 2; i++) {
      var w = WORDS[i];
      if (w === secret) continue;
      if (!consistent(w, hint, guessWord)) others.push(w);
    }
    while (others.length < 2) others.push(pick(secret));
    candidates = [secret, others[0], others[1]];
    for (var s = candidates.length - 1; s > 0; s--) {
      var j = Math.floor(Math.random() * (s + 1));
      var t = candidates[s]; candidates[s] = candidates[j]; candidates[j] = t;
    }
    correctIdx = candidates.indexOf(secret);
    tryT = 0; resolved = false;
  }

  function initGame() {
    tryIdx = 0; milestoneShown = false;
    newTry();
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function CBTN(i) { return { x: W * 0.5, y: H * (0.58 + i * 0.13) }; }

  function pickCandidate(i) {
    if (resolved || finished) return;
    resolved = true;
    var b = CBTN(i);
    if (i === correctIdx) {
      game.feedback.good(b.x, b.y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.4);
      succeedNow();
    } else {
      hitStop = 0.24; shake = 0.2;
      game.feedback.bad(b.x, b.y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      tryIdx++;
      if (tryIdx >= MAX_TRY) failNow();
      else {
        if (tryIdx === 1 && !milestoneShown) {
          milestoneShown = true;
          game.fx.popup('NICE', W / 2, H * 0.18, { color: C.gold, size: 32 });
          game.audio.play('se_milestone', 0.3);
        }
        newTry();
      }
    }
  }

  function succeedNow() {
    if (finished) return;
    ok = true; finished = true; hitStop = 0.22;
    game.fx.burst(W / 2, H * 0.34, { color: C.gold, count: 22, speed: 400 });
    game.audio.play('se_success', 0.5);
    finish();
  }
  function failNow() {
    if (finished) return;
    ok = false; finished = true; hitStop = 0.3;
    game.audio.play('se_failure', 0.4);
    finish();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished && !resolved) {
      for (var i = 0; i < 3; i++) {
        var b = CBTN(i);
        if (Math.abs(y - b.y) < 56 && Math.abs(x - b.x) < 220) { game.audio.play('se_tap', 0.12); pickCandidate(i); return; }
      }
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function drawScene() {
    var tileW = 90;
    var startX = W / 2 - (LEN * tileW) / 2;
    for (var i = 0; i < LEN; i++) {
      var col = hint[i] === 2 ? C.hit : hint[i] === 1 ? C.near : C.miss;
      game.draw.rect(startX + i * tileW + 6, H * 0.28, tileW - 12, tileW - 12, col);
      txt(guessWord[i], startX + i * tileW + tileW / 2, H * 0.28 + tileW / 2 + 14, 34, C.white);
    }
    for (var c = 0; c < 3; c++) {
      var b = CBTN(c);
      game.draw.rect(b.x - 220, b.y - 56, 440, 112, resolved && c === correctIdx ? C.good : C.tile);
      txt(candidates[c], b.x, b.y + 14, 40, C.white);
    }
    var sf = Math.floor(game.time.elapsed * 4) % 2;
    game.draw.sprite(SLEUTH_F[sf], { '#': C.ink }, W * 0.14, H * 0.14, 12, { anchor: 'center' });
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.58, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.5;
    if (cyc < dt || demo.t <= dt) resetDemo();
    if (ready > 0) { ready -= dt; if (ready < 0) ready = 0; return; }
    if (finished) return;
    var b = CBTN(correctIdx);
    demo.gx += (b.x - demo.gx) * Math.min(1, dt * 6);
    demo.gy += (b.y - demo.gy) * Math.min(1, dt * 6);
    demo.press = !resolved;
    if (!resolved && Math.hypot(demo.gx - b.x, demo.gy - b.y) < 14) pickCandidate(correctIdx);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (secret === undefined) initGame();
      stepDemo(dt);
      bg();
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.1, 36, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.14, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.96, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.96, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.1, 42, ok ? C.good : C.bad);
      txt((tryIdx + 1) + ' / ' + MAX_TRY, W / 2, H * 0.14, 26, C.gold);
      if (!ok) txt('あと1回!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var used = tryIdx + 1;
        if (ok) game.end.success(used, { tries: used, max: MAX_TRY });
        else game.end.failure({ tries: used, max: MAX_TRY });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      tryT += dt;
      if (tryT >= TRY_TIME && !resolved) {
        resolved = true;
        hitStop = 0.24; shake = 0.2;
        game.feedback.bad(W / 2, H * 0.58, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        tryIdx++;
        if (tryIdx >= MAX_TRY) failNow(); else newTry();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt((tryIdx + 1) + ' / ' + MAX_TRY, W / 2, H * 0.06, 26, C.ink);
    var barPct = Math.max(0, 1 - tryT / TRY_TIME);
    game.draw.rect(60, 130, W - 120, 14, '#00000030', 1);
    game.draw.rect(60, 130, (W - 120) * barPct, 14, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.48, 50, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.3], ['C4', 0.3], ['E4', 0.6]], { tempo: 110, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
