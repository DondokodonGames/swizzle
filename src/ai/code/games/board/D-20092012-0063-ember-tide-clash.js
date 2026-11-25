// D-20092012-0063-ember-tide-clash.js
// エンバータイド・クラッシュ — 敵が見せる属性に対して、相性で勝てる札を瞬時に選んで一撃を返す
// 操作: 敵の掲げる属性(炎/水/嵐)を見て、それに勝つ属性の札を3枚から選んでタップ
// 終わり: 3ラウンド連続で正しい属性を選び切れば成功。1回でも間違えれば失敗
// @mechanic: judge
// @theme: elemental_relay_duel
// 世界観: 小さな祠に伝わる属性札の使い手。対面する敵は毎回違う元素を掲げてくる。それに打ち勝つ属性を一瞬で選び、札を叩きつける
// 残るもの: 正誤(CLEAR/GAME OVER) + 連続正答数
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 多色+光、パララックス層、統一光源
  var C = {
    bg: '#101830', bg2: '#182448', arenaGlow: '#2a3a68',
    fire: '#ff5a3a', water: '#3aa8ff', storm: '#c060ff',
    good: '#4dff9a', bad: '#ff4d5e', gold: '#ffd23f', white: '#f4f6ff', ink: '#06080f',
  };
  var ELEM = ['fire', 'water', 'storm'];
  var ELEM_COL = { fire: C.fire, water: C.water, storm: C.storm };
  // 三すくみ: fire<water<storm<fire
  var BEATS = { fire: 'storm', water: 'fire', storm: 'water' };

  var GAME_TITLE = 'EMBER TIDE';
  var TOTAL = 3;
  var CX = W * 0.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var round, enemyElem, cards, streak, done, endWait, finished;
  var ready, hitStop, shake, milestoneShown;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ENEMY = ['.####.', '######', '.####.', '.#..#.'];
  var CARD = ['####', '#..#', '#..#', '####'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    game.draw.circle(CX, H * 0.32, 240, C.arenaGlow, 0.3);
  }

  function drawEnemy(elem, flashT) {
    var bob = Math.sin(game.time.elapsed * 1.6) * 6;
    var col = flashT > 0 ? C.white : ELEM_COL[elem];
    game.draw.circle(CX, H * 0.30 + bob, 90, col, 0.22);
    game.draw.sprite(ENEMY, { '#': col }, CX, H * 0.30 + bob, 20, { anchor: 'center' });
  }

  function cardPos(i) { return { x: W * (0.22 + i * 0.28), y: H * 0.82 }; }

  function drawCards(list, disabled) {
    for (var i = 0; i < list.length; i++) {
      var p = cardPos(i);
      var col = ELEM_COL[list[i]];
      game.draw.rect(p.x - 90, p.y - 110, 180, 220, C.ink, 0.5);
      game.draw.sprite(CARD, { '#': disabled ? '#444a5c' : col }, p.x, p.y, 24, { anchor: 'center' });
    }
  }

  function shuffled() {
    var arr = ELEM.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(game.random(0, i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function newRound() {
    enemyElem = ELEM[Math.floor(game.random(0, ELEM.length))];
    cards = shuffled();
  }

  function initGame() {
    round = 0; streak = 0; newRound();
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
  }

  function pickCard(x, y) {
    if (ready > 0 || finished) return;
    for (var i = 0; i < cards.length; i++) {
      var p = cardPos(i);
      if (Math.abs(x - p.x) < 100 && Math.abs(y - p.y) < 130) {
        var correct = BEATS[cards[i]] === enemyElem;
        hitStop = correct ? 0.15 : 0.3;
        if (correct) {
          streak++;
          game.feedback.good(p.x, p.y, { text: 'GOOD', color: C.good });
          game.fx.burst(CX, H * 0.30, { color: ELEM_COL[cards[i]], count: 16, speed: 340 });
          game.audio.play('se_good', 0.4);
          if (!milestoneShown && streak >= Math.ceil(TOTAL / 2)) {
            milestoneShown = true;
            game.fx.popup('HALFWAY!', CX, H * 0.5, { color: C.gold, size: 38 });
            game.audio.play('se_milestone', 0.4);
          }
          round++;
          if (round >= TOTAL) { ok = true; finished = true; finish(); }
          else newRound();
        } else {
          game.feedback.bad(p.x, p.y, { text: 'MISS' });
          shake = 0.3;
          game.audio.play('se_bad', 0.4);
          ok = false; finished = true; finish();
        }
        return;
      }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) pickCard(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: 0, gy: 0, press: false, phase: 'show' };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.8;
    if (cyc < dt || demo.t <= dt) { newRound(); demo.phase = 'show'; demo.press = false; }
    if (demo.phase === 'show' && cyc > 0.7) {
      var idx = 0;
      for (var i = 0; i < cards.length; i++) if (BEATS[cards[i]] === enemyElem) idx = i;
      var p = cardPos(idx);
      demo.gx = p.x; demo.gy = p.y; demo.press = true;
      demo.phase = 'pick';
      game.feedback.good(p.x, p.y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.2);
    }
    if (demo.phase === 'pick' && cyc > 2.2) demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      drawEnemy(enemyElem, 0);
      drawCards(cards, false);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.14, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('TAP TO START', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawEnemy(enemyElem, 0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 50, ok ? C.good : C.bad);
      txt(streak + ' / ' + TOTAL, W / 2, H * 0.14, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - streak) + '!', W / 2, H * 0.185, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(streak, { streak: streak, total: TOTAL });
        else game.end.failure({ streak: streak, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    }
    if (shake > 0) shake -= dt;

    bg();
    drawEnemy(enemyElem, hitStop);
    if (!finished) drawCards(cards, false);

    txt(streak + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.3], ['E4', 0.3], ['G4', 0.3], ['C5', 0.6]], { tempo: 128, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
