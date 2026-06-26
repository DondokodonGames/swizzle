// 408-fishing-line.js
// 釣り糸 — 深さを調整して目標の魚がいる層に糸を垂らす
// 操作: タップ長押しで深く、離すと上昇、適切な深さで魚が当たる
// 成功: 10匹釣る  失敗: 3匹逃す or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020c1a',
    water:  '#0c2a4a',
    waterHi:'#1e3a5f',
    surface:'#1d4ed8',
    surfHi: '#3b82f6',
    fish0:  '#f97316',
    fish1:  '#22c55e',
    fish2:  '#a855f7',
    fish3:  '#ef4444',
    fish4:  '#fbbf24',
    line:   '#e2e8f0',
    hook:   '#94a3b8',
    hookHi: '#f1f5f9',
    bubble: '#7dd3fc',
    caught: '#22c55e',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var FISH_COLORS = [C.fish0,C.fish1,C.fish2,C.fish3,C.fish4];

  var ROD_X = W/2;
  var ROD_Y = H*0.12;
  var WATER_Y = H*0.22;
  var MAX_DEPTH = H - WATER_Y - 60;

  var hookY = WATER_Y + 40;
  var hookTarget = WATER_Y + 40;
  var HOOK_SPEED_DOWN = 600;
  var HOOK_SPEED_UP = 300;
  var pressing = false;

  var fishes = [];
  var spawnTimer = 1.5;
  var caught = 0;
  var NEEDED = 10;
  var missed = 0;
  var MAX_MISSED = 3;
  var done = false;
  var timeLeft = 50;
  var elapsed = 0;
  var particles = [];
  var bubbles = [];
  var catchAnim = 0;
  var catchTimer = 0;

  function spawnFish() {
    var depth = WATER_Y + 80 + Math.random() * (MAX_DEPTH - 80);
    var col = FISH_COLORS[Math.floor(Math.random()*FISH_COLORS.length)];
    fishes.push({
      x: Math.random() < 0.5 ? -80 : W+80,
      y: depth,
      vx: Math.random() < 0.5 ? 80+Math.random()*60 : -(80+Math.random()*60),
      col: col,
      size: 30+Math.random()*20,
      wobble: Math.random()*Math.PI*2,
      caught: false,
      escaped: false
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    pressing = !pressing;
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (catchAnim > 0) catchAnim -= dt * 2;

    // Hook movement
    if (pressing) {
      hookY = Math.min(WATER_Y + MAX_DEPTH, hookY + HOOK_SPEED_DOWN * dt);
    } else {
      hookY = Math.max(WATER_Y + 20, hookY - HOOK_SPEED_UP * dt);
    }

    // Spawn
    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      spawnFish();
      if (Math.random() < 0.3) spawnFish();
      spawnTimer = 1.8 + Math.random()*1.5;
    }

    // Fish update
    for (var fi = fishes.length-1; fi >= 0; fi--) {
      var f = fishes[fi];
      if (f.caught || f.escaped) continue;
      f.x += f.vx * dt;
      f.wobble += dt * 3;

      // Check hook collision
      if (Math.abs(f.x - ROD_X) < f.size + 20 && Math.abs(f.y - hookY) < f.size + 24) {
        f.caught = true;
        caught++;
        catchAnim = 0.6;
        catchTimer = 0.8;
        game.audio.play('se_success', 0.5);
        for (var pi = 0; pi < 10; pi++) {
          var ang = Math.random()*Math.PI*2;
          particles.push({ x:f.x, y:f.y, vx:Math.cos(ang)*180, vy:Math.sin(ang)*180, life:0.6, col:f.col });
        }
        if (caught >= NEEDED && !done) { done = true; setTimeout(function(){ game.end.success(caught*400+Math.ceil(timeLeft)*80); }, 700); return; }
        // Pull fish up
        setTimeout(function(){ fishes.splice(fishes.indexOf(f), 1); }, 800);
        continue;
      }

      // Off screen = escaped
      if (f.x < -160 || f.x > W+160) {
        f.escaped = true;
        missed++;
        game.audio.play('se_failure', 0.2);
        fishes.splice(fi, 1);
        if (missed >= MAX_MISSED && !done) { done = true; setTimeout(function(){ game.end.failure(); }, 500); }
      }
    }

    // Bubbles
    if (Math.random() < 0.2) {
      bubbles.push({ x:ROD_X+(Math.random()-0.5)*60, y:hookY, vy:-40-Math.random()*80, life:1.5, r:4+Math.random()*8 });
    }
    for (var bi = bubbles.length-1; bi >= 0; bi--) {
      bubbles[bi].y += bubbles[bi].vy*dt;
      bubbles[bi].x += Math.sin(elapsed*3+bi)*8*dt;
      bubbles[bi].life -= dt;
      if (bubbles[bi].life <= 0 || bubbles[bi].y < WATER_Y) bubbles.splice(bi,1);
    }

    for (var pp = particles.length-1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx*dt;
      particles[pp].y += particles[pp].vy*dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp,1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Water
    game.draw.rect(0, WATER_Y, W, H-WATER_Y, C.water, 0.9);
    // Surface ripple
    for (var wx = 0; wx < W; wx += 60) {
      game.draw.circle(wx+30, WATER_Y, 30, C.surfHi, 0.15+Math.sin(elapsed*2+wx*0.02)*0.08);
    }
    game.draw.line(0, WATER_Y, W, WATER_Y, C.surface, 4);

    // Bubbles
    for (var bi2 = 0; bi2 < bubbles.length; bi2++) {
      var b = bubbles[bi2];
      game.draw.circle(b.x, b.y, b.r, C.bubble, b.life*0.4);
    }

    // Fish
    for (var fi2 = 0; fi2 < fishes.length; fi2++) {
      var f2 = fishes[fi2];
      if (f2.caught || f2.escaped) continue;
      var wobY = Math.sin(f2.wobble)*6;
      var facingRight = f2.vx > 0;
      // Body
      game.draw.circle(f2.x, f2.y+wobY, f2.size, f2.col, 0.9);
      // Tail
      var tailX = f2.x + (facingRight ? -f2.size : f2.size);
      game.draw.circle(tailX, f2.y+wobY, f2.size*0.55, f2.col, 0.7);
      // Eye
      var eyeX = f2.x + (facingRight ? f2.size*0.35 : -f2.size*0.35);
      game.draw.circle(eyeX, f2.y+wobY-8, 9, '#fff', 0.9);
      game.draw.circle(eyeX+2, f2.y+wobY-8, 5, '#333', 0.9);
    }

    // Fishing line
    game.draw.line(ROD_X, ROD_Y, ROD_X, hookY, C.line, 3);
    // Hook
    game.draw.circle(ROD_X, hookY, 16, C.hookHi, 0.9);
    game.draw.circle(ROD_X, hookY+20, 10, C.hookHi, 0.7);

    // Rod
    game.draw.line(ROD_X-80, ROD_Y+20, ROD_X, ROD_Y, C.hookHi, 8);
    game.draw.circle(ROD_X-80, ROD_Y+20, 16, C.hookHi, 0.9);

    // Depth indicator
    var depthRatio = (hookY - WATER_Y) / MAX_DEPTH;
    game.draw.rect(W-48, WATER_Y, 16, MAX_DEPTH, '#0c1a2a', 0.8);
    game.draw.rect(W-48, WATER_Y, 16, MAX_DEPTH*depthRatio, C.surface, 0.8);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 9*p.life, p.col, p.life*0.8);
    }

    if (catchAnim > 0) game.draw.rect(0, 0, W, H, C.caught, catchAnim*0.1);

    // Missed dots
    for (var mi = 0; mi < MAX_MISSED; mi++) {
      game.draw.circle(W/2-(MAX_MISSED-1)*44+mi*88, H*0.935, 18, mi < missed ? C.fish3 : C.ui, 0.9);
    }

    game.draw.text(pressing ? '↓深く' : '↑上昇中', W/2, ROD_Y+60, { size: 40, color: C.surfHi, bold: true });
    game.draw.text(caught + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft/50);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.surface : C.fish3);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
    spawnFish();
  });
})(game);
