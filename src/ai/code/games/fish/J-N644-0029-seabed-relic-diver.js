// J-N644-0029-seabed-relic-diver.js
// シーベッド・レリック・ダイバー — 素潜り漁師の見習いが息の続く間に海底のがれきから本物の遺物だけを探し当てる
// 操作: がれきの山に混ざった本物の遺物(縁が光る一つ)だけをタップして引き上げる
// 終わり: 息が切れる前に規定数の遺物を集めれば成功。まがい物に触れすぎるか息切れで失敗
// @mechanic: spot
// @theme: seabed_relic_search
// 世界観: 素潜り漁師の見習いが息の続く間に海底のがれきの山から本物の遺物だけを探し当て、まがい物の破片に惑わされず引き上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 回収した遺物数
// スタイル: 90s PRE-RENDER

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s PRE-RENDER: 深い青緑の水中グラデ、鈍い光沢のプリレンダ風ハイライト
  var C = {
    deep: '#03253f', deep2: '#0a5273', kelp: '#0e6b4f',
    relic: '#ffd76b', relicGlow: '#fff4c9', junk: '#5c7a80', junkDark: '#324a4f',
    diver: '#e8b98a', diverDark: '#a5784f',
    good: '#3ad67b', bad: '#ff4d5e', gold: '#ffd76b', white: '#ffffff',
  };

  var GAME_TITLE = 'RELIC DIVER';
  var TARGET = 5;
  var AIR_MAX = 12;
  var CLUSTER_GAP = 1.9;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DIVER_SPRITE = ['.##.', '####', '.##.', '#..#'];
  var RELIC_SPRITE = ['.##.', '####', '.##.'];
  var JUNK_SPRITE = ['#.#.', '.##.', '#.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.deep], [1, C.deep2]]);
    var t = game.time.elapsed;
    for (var i = 0; i < 4; i++) {
      var xx = W * (0.15 + i * 0.24);
      var sway = Math.sin(t * 1.1 + i) * 20;
      game.draw.rect(xx + sway, H * 0.60, 14, 200, C.kelp, 0.5);
    }
    game.draw.sprite(DIVER_SPRITE, { '#': C.diver }, W * 0.16, H * 0.18 + Math.sin(t * 1.6) * 6, 20, { anchor: 'center' });
  }

  var cluster, air, collected, clueClock, halfCalled;
  var done, endWait, finished, ready, hitStop, shake;

  function makeCluster() {
    var n = 3 + Math.floor(game.random(0, 2));
    var realIdx = Math.floor(game.random(0, n));
    var items = [];
    var cx = W * 0.5, cy = H * 0.52;
    for (var i = 0; i < n; i++) {
      var ang = (i / n) * Math.PI * 2 + game.random(0, 0.5);
      items.push({
        x: cx + Math.cos(ang) * 200,
        y: cy + Math.sin(ang) * 130,
        real: i === realIdx,
        dead: false,
        bob: game.random(0, 6),
      });
    }
    return { items: items, t: 0 };
  }

  function initGame() {
    cluster = makeCluster(); air = AIR_MAX; collected = 0; clueClock = 0; halfCalled = false;
    done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
  }

  function drawScene() {
    bg();
    for (var i = 0; i < cluster.items.length; i++) {
      var it = cluster.items[i];
      if (it.dead) continue;
      var bob = Math.sin(game.time.elapsed * 3 + it.bob) * 5;
      var flashOn = it.real && Math.floor(game.time.elapsed * 6) % 2 === 0;
      if (it.real) game.draw.circle(it.x, it.y + bob, 46, C.relicGlow, flashOn ? 0.5 : 0.25);
      var sprite = it.real ? RELIC_SPRITE : JUNK_SPRITE;
      var col = it.real ? C.relic : C.junk;
      game.draw.sprite(sprite, { '#': col }, it.x, it.y + bob, 24, { anchor: 'center' });
    }
  }

  function resolveHit(x, y) {
    for (var i = 0; i < cluster.items.length; i++) {
      var it = cluster.items[i];
      if (it.dead) continue;
      if (Math.hypot(x - it.x, y - it.y) < 80) {
        it.dead = true;
        if (it.real) {
          collected++;
          game.feedback.good(it.x, it.y, { text: 'GOOD', color: C.good });
          game.audio.play('se_coin', 0.35);
          if (collected === Math.ceil(TARGET / 2)) game.fx.popup('NICE', it.x, it.y - 80, { color: C.gold, size: 32 });
          if (collected >= TARGET) {
            finished = true; ok = true;
            game.feedback.good(it.x, it.y, { text: 'CLEAR', color: C.good });
            game.audio.play('se_success', 0.5);
            finish();
          } else {
            cluster = makeCluster();
          }
        } else {
          air = Math.max(0, air - 1.6);
          game.feedback.bad(it.x, it.y, { text: 'MISS' });
          game.audio.play('se_bad', 0.3);
        }
        return;
      }
    }
    game.audio.play('se_tap', 0.1);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) resolveHit(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function stepRound(dt) {
    air -= dt;
    if (!halfCalled && air <= AIR_MAX * 0.5) { halfCalled = true; }
    if (air <= 0) {
      finished = true; ok = false; hitStop = 0.3; shake = 0.2;
      game.feedback.bad(W * 0.5, H * 0.5, { text: 'TIME UP' });
      game.audio.play('se_failure', 0.4);
      finish();
    }
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.5, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % CLUSTER_GAP;
    if (cyc < dt || demo.t <= dt) {
      resetDemo();
    }
    if (cyc > CLUSTER_GAP * 0.4 && !demo.picked) {
      demo.picked = true;
      var real = null;
      for (var i = 0; i < cluster.items.length; i++) if (cluster.items[i].real && !cluster.items[i].dead) real = cluster.items[i];
      if (real) {
        demo.gx = real.x; demo.gy = real.y; demo.press = true;
        resolveHit(real.x, real.y);
      }
    } else if (cyc <= CLUSTER_GAP * 0.4) {
      demo.picked = false; demo.press = false;
      demo.gx = W * 0.5; demo.gy = H * 0.5 - 100;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!cluster) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 36, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.bad);
      txt(collected + ' / ' + TARGET, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(1, TARGET - collected) + '個!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(collected, { collected: collected });
        else game.end.failure({ collected: collected });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepRound(dt);
    }
    if (shake > 0) shake -= dt;

    drawScene();
    txt(collected + ' / ' + TARGET, W * 0.5, H * 0.07, 30, C.white);
    var pct = Math.max(0, air / AIR_MAX);
    game.draw.rect(60, 150, W - 120, 16, '#0a5273', 1);
    game.draw.rect(60, 150, (W - 120) * pct, 16, pct < 0.25 ? C.bad : C.good);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.3], ['F4', 0.3], ['A4', 0.3], ['D5', 0.6]], { tempo: 120, wave: 'sine', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
