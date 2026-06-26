// 411-ninja-scroll.js
// 忍者の巻物 — 飛んでくる手裏剣を紙一重でかわして縦断
// 操作: タップで左右に瞬間移動して手裏剣を回避
// 成功: 30秒生き残る  失敗: 3回被弾

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0808',
    night:  '#150f10',
    ninja:  '#1a1a2e',
    ninjaHi:'#312e81',
    shuriken:'#94a3b8',
    shurikenHi:'#e2e8f0',
    trail:  '#475569',
    hit:    '#ef4444',
    safe:   '#22c55e',
    dodge:  '#fbbf24',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var LANES = [W*0.2, W*0.5, W*0.8];
  var ninjaLane = 1;  // 0, 1, 2
  var ninjaY = H * 0.78;
  var ninjaTargetX = LANES[1];
  var ninjaX = LANES[1];
  var dodgeAnim = 0;

  var shurikens = [];
  var spawnTimer = 0.6;
  var spawnInterval = 0.6;

  var hits = 0;
  var MAX_HITS = 3;
  var survived = 0;
  var NEEDED_TIME = 30;
  var done = false;
  var elapsed = 0;
  var timeLeft = NEEDED_TIME;
  var particles = [];
  var streakAnim = 0;
  var lastDodgeTime = -10;

  game.onTap(function(tx, ty) {
    if (done) return;
    // Move ninja to tapped lane
    if (tx < W/3) ninjaLane = 0;
    else if (tx < W*2/3) ninjaLane = 1;
    else ninjaLane = 2;
    ninjaTargetX = LANES[ninjaLane];
    dodgeAnim = 0.3;
    game.audio.play('se_tap', 0.3);
    lastDodgeTime = elapsed;
  });

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'left') ninjaLane = Math.max(0, ninjaLane-1);
    else if (dir === 'right') ninjaLane = Math.min(2, ninjaLane+1);
    ninjaTargetX = LANES[ninjaLane];
    dodgeAnim = 0.3;
    game.audio.play('se_tap', 0.3);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      survived = elapsed;
      if (timeLeft <= 0) { done = true; game.audio.play('se_success', 0.8); game.end.success(Math.ceil(survived*100)+hits*(-200)); return; }
    }

    if (dodgeAnim > 0) dodgeAnim -= dt * 3;
    if (streakAnim > 0) streakAnim -= dt * 2;

    // Smooth ninja movement
    ninjaX += (ninjaTargetX - ninjaX) * 12 * dt;

    // Spawn shurikens
    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      var lane = Math.floor(Math.random()*3);
      var rot = Math.random()*Math.PI*2;
      var rotSpeed = (Math.random()<0.5?1:-1) * (3+Math.random()*5);
      shurikens.push({ x:LANES[lane], y:-60, vy:500+Math.random()*300, lane:lane, rot:rot, rotSpeed:rotSpeed, hit:false });
      spawnInterval = Math.max(0.35, 0.65 - elapsed*0.004);
      spawnTimer = spawnInterval * (0.7+Math.random()*0.6);
    }

    // Update shurikens
    for (var si = shurikens.length-1; si >= 0; si--) {
      var s = shurikens[si];
      s.y += s.vy * dt;
      s.rot += s.rotSpeed * dt;

      // Check hit
      if (!s.hit && Math.abs(s.x - ninjaX) < 60 && Math.abs(s.y - ninjaY) < 60) {
        s.hit = true;
        hits++;
        game.audio.play('se_failure', 0.5);
        for (var pi = 0; pi < 12; pi++) {
          var ang = Math.random()*Math.PI*2;
          particles.push({ x:ninjaX, y:ninjaY, vx:Math.cos(ang)*200, vy:Math.sin(ang)*200, life:0.5, col:C.hit });
        }
        if (hits >= MAX_HITS && !done) { done = true; setTimeout(function(){ game.end.failure(); }, 500); }
      }

      // Remove off screen
      if (s.y > H + 60) shurikens.splice(si, 1);
    }

    for (var pp = particles.length-1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx*dt;
      particles[pp].y += particles[pp].vy*dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp,1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H, C.night, 0.6);

    // Lane markers
    for (var li = 0; li < 3; li++) {
      game.draw.line(LANES[li], 0, LANES[li], H, C.ui, 1);
    }

    // Shurikens
    for (var si2 = 0; si2 < shurikens.length; si2++) {
      var s2 = shurikens[si2];
      if (s2.hit) continue;
      // Shuriken shape: 4 blades
      for (var blade = 0; blade < 4; blade++) {
        var ba = s2.rot + blade*Math.PI/2;
        var bx1 = s2.x + Math.cos(ba)*30;
        var by1 = s2.y + Math.sin(ba)*30;
        var bx2 = s2.x + Math.cos(ba+Math.PI/4)*18;
        var by2 = s2.y + Math.sin(ba+Math.PI/4)*18;
        game.draw.line(s2.x, s2.y, bx1, by1, C.shurikenHi, 6);
        game.draw.line(s2.x, s2.y, bx2, by2, C.shuriken, 4);
      }
      game.draw.circle(s2.x, s2.y, 12, C.shuriken, 0.9);
      game.draw.circle(s2.x, s2.y, 6, '#fff', 0.9);
      // Trail
      game.draw.line(s2.x, s2.y, s2.x, s2.y-40, C.trail, 3);
    }

    // Ninja
    var dashX = dodgeAnim > 0 ? (ninjaX - ninjaTargetX)*dodgeAnim*30 : 0;
    if (dodgeAnim > 0) {
      game.draw.circle(ninjaX+dashX*2, ninjaY, 28, C.dodge, dodgeAnim*0.4);
    }
    // Body
    game.draw.circle(ninjaX, ninjaY, 42, C.ninja, 0.9);
    game.draw.circle(ninjaX, ninjaY, 36, C.ninjaHi, 0.5);
    // Head
    game.draw.circle(ninjaX, ninjaY-24, 26, C.ninja, 0.95);
    // Mask slit (eyes)
    game.draw.rect(ninjaX-18, ninjaY-30, 36, 12, '#fff', 0.85);
    game.draw.circle(ninjaX-8, ninjaY-24, 6, '#222', 0.9);
    game.draw.circle(ninjaX+8, ninjaY-24, 6, '#222', 0.9);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 9*p.life, p.col, p.life*0.8);
    }

    // Hit dots
    for (var hi = 0; hi < MAX_HITS; hi++) {
      game.draw.circle(W/2-(MAX_HITS-1)*44+hi*88, H*0.935, 18, hi < hits ? C.hit : C.ui, 0.9);
    }

    // Time progress
    var progress = survived / NEEDED_TIME;
    game.draw.rect(0, H*0.92, W*progress, 8, C.safe, 0.7);

    game.draw.text(Math.ceil(timeLeft)+'秒', W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft/NEEDED_TIME);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*(1-ratio), 72, ratio > 0.3 ? C.safe : C.hit);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
  });
})(game);
