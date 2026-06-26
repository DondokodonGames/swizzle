// 450-bubble-sort.js
// バブルソート — 隣り合う数字を入れ替えて昇順に並べる
// 操作: 2つの隣接した泡をタップして入れ替える
// 成功: 5回ソート完成  失敗: 30ミス or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020a18',
    bubble: '#0891b2',
    bubbleHi:'#22d3ee',
    bubbleSel:'#f97316',
    bubbleSelHi:'#fed7aa',
    sorted: '#22c55e',
    sortedHi:'#bbf7d0',
    text:   '#f1f5f9',
    textDk: '#0f172a',
    ui:     '#475569',
    correct:'#22c55e',
    wrong:  '#ef4444'
  };

  var N = 6;
  var BUBBLE_R = 72;
  var GAP = 20;
  var TOTAL_W = N * (BUBBLE_R * 2 + GAP) - GAP;
  var OX = (W - TOTAL_W) / 2;
  var OY = H / 2 - 40;

  var arr = [];
  var selected = -1;
  var particles = [];
  var swapAnim = null;  // { from, to, progress }
  var sorted = 0;
  var NEEDED = 5;
  var misses = 0;
  var MAX_MISS = 30;
  var done = false;
  var timeLeft = 90;
  var flashAnim = 0;

  function shuffle() {
    arr = [];
    for (var i = 1; i <= N; i++) arr.push(i);
    for (var si = arr.length - 1; si > 0; si--) {
      var sj = Math.floor(Math.random() * (si + 1));
      var tmp = arr[si]; arr[si] = arr[sj]; arr[sj] = tmp;
    }
    // Ensure not already sorted
    var isSorted = true;
    for (var k = 1; k < arr.length; k++) {
      if (arr[k] < arr[k-1]) { isSorted = false; break; }
    }
    if (isSorted) { var t = arr[0]; arr[0] = arr[1]; arr[1] = t; }
    selected = -1;
    swapAnim = null;
  }

  function isSortedArr() {
    for (var k = 1; k < arr.length; k++) {
      if (arr[k] < arr[k-1]) return false;
    }
    return true;
  }

  function getBubbleCenter(idx) {
    return { x: OX + idx * (BUBBLE_R * 2 + GAP) + BUBBLE_R, y: OY };
  }

  game.onTap(function(tx, ty) {
    if (done || swapAnim) return;
    // Find tapped bubble
    var hit = -1;
    for (var i = 0; i < N; i++) {
      var c = getBubbleCenter(i);
      var dx = tx - c.x;
      var dy = ty - c.y;
      if (Math.sqrt(dx*dx + dy*dy) < BUBBLE_R + 15) { hit = i; break; }
    }
    if (hit < 0) { selected = -1; return; }

    if (selected < 0) {
      selected = hit;
      game.audio.play('se_tap', 0.3);
    } else {
      if (Math.abs(hit - selected) === 1) {
        // Valid adjacent swap
        swapAnim = { from: Math.min(hit, selected), to: Math.max(hit, selected), progress: 0 };
        var tmp = arr[swapAnim.from]; arr[swapAnim.from] = arr[swapAnim.to]; arr[swapAnim.to] = tmp;
        selected = -1;
        game.audio.play('se_tap', 0.5);
        if (isSortedArr()) {
          sorted++;
          flashAnim = 0.8;
          game.audio.play('se_success', 0.7);
          for (var pi = 0; pi < 12; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: W/2, y: OY, vx: Math.cos(ang)*180, vy: Math.sin(ang)*180, life: 0.7, col: C.sorted });
          }
          if (sorted >= NEEDED && !done) {
            done = true;
            setTimeout(function() { game.end.success(sorted * 500 + (MAX_MISS - misses) * 30 + Math.ceil(timeLeft) * 80); }, 700);
            return;
          }
          setTimeout(function() { shuffle(); }, 1000);
        }
      } else if (hit === selected) {
        selected = -1;
      } else {
        // Non-adjacent: penalty
        misses++;
        selected = hit;
        game.audio.play('se_failure', 0.3);
        if (misses >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 2;
    if (swapAnim) {
      swapAnim.progress += dt * 4;
      if (swapAnim.progress >= 1) swapAnim = null;
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);

    // Check if sorted for visual
    var allSorted = isSortedArr();

    for (var i = 0; i < N; i++) {
      var c = getBubbleCenter(i);
      var isSelected = i === selected;
      var bCol = allSorted ? C.sorted : (isSelected ? C.bubbleSel : C.bubble);
      var bHi = allSorted ? C.sortedHi : (isSelected ? C.bubbleSelHi : C.bubbleHi);

      // Swap animation offset
      var ox2 = 0;
      if (swapAnim) {
        var progress2 = Math.min(1, swapAnim.progress);
        var ease = progress2 < 0.5 ? 2*progress2*progress2 : -1+(4-2*progress2)*progress2;
        if (i === swapAnim.from) ox2 = (BUBBLE_R * 2 + GAP) * ease;
        if (i === swapAnim.to) ox2 = -(BUBBLE_R * 2 + GAP) * ease;
      }

      game.draw.circle(c.x + ox2, c.y, BUBBLE_R + 8, bHi, 0.1);
      game.draw.circle(c.x + ox2, c.y, BUBBLE_R, bCol, 0.85);
      game.draw.circle(c.x + ox2 - BUBBLE_R*0.3, c.y - BUBBLE_R*0.3, BUBBLE_R*0.25, '#fff', 0.25);
      game.draw.text(arr[i] + '', c.x + ox2, c.y + 22, { size: 68, color: C.textDk, bold: true });

      // Selection ring
      if (isSelected) {
        game.draw.circle(c.x, c.y, BUBBLE_R + 14, C.bubbleSel, 0.5);
      }
    }

    // Instruction
    game.draw.text('隣の泡を2回タップ', W/2, H * 0.72, { size: 42, color: C.ui });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.sorted, flashAnim * 0.12);

    // Miss counter
    game.draw.text('ミス: ' + misses + '/' + MAX_MISS, W/2, H * 0.88, { size: 42, color: misses > MAX_MISS * 0.7 ? C.wrong : C.ui });

    game.draw.text(sorted + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.bubble : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    shuffle();
  });
})(game);
