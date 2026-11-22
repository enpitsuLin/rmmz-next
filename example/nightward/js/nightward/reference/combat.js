// Generated from the official Nightward combat presentation; regenerate with scripts/import-reference-combat.mjs.
// Source: https://goodstuff.pixijs.io/nightward/assets/start-DZtWMAL3.js
// SHA-256: 3950f8d75033c9947932717e740a75d7370f0154ddad44d215ff3d9fd0f4e8cd
import { Container3D as ce, PointLight as dh, PostEffect as eu } from '@pixi/3d'
import { EffekseerParticles as yi } from '../effekseer'
import { Texture as U, Rectangle as kt, UniformGroup as gn } from 'pixi.js'
// Atlas textures belong to ImageManager and survive scene teardown.
const gI = () => {}
function er(n18) {
  return n18 <= 0.04045 ? n18 / 12.92 : Math.pow((n18 + 0.055) / 1.055, 2.4);
}
const av = { name: "particleLifetime", attributes: { aBirth: "float32", aLife: "float32" }, bindings: { material: { uParticleTime: "f32" } }, gpu: { vertex: { beforeTransform: `
  let particleAge = material.uParticleTime - input.aBirth;
  let particleProgress = clamp(particleAge / max(input.aLife, 1e-6), 0.0, 1.0);
`, afterTransform: `
  if (particleAge < 0.0 || particleAge > input.aLife) {
    clipPosition = vec4<f32>(0.0, 0.0, 2.0, 1.0);
  }
` } }, gl: { vertex: { beforeTransform: `
  float particleAge = material.uParticleTime - aBirth;
  float particleProgress = clamp(particleAge / max(aLife, 1e-6), 0.0, 1.0);
`, afterTransform: `
  if (particleAge < 0.0 || particleAge > aLife) {
    gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
  }
` } } };
const _d = (() => {
  const n18 = new Uint8Array(256);
  for (let t = 0; t < 256; t++) n18[t] = Math.round(er(t / 255) * 255);
  return n18;
})();
function ve(n18, t) {
  const e = _d[n18 >> 16 & 255], s = _d[n18 >> 8 & 255], i = _d[n18 & 255], r = t <= 0 ? 0 : t >= 1 ? 255 : t * 255 + 0.5 | 0;
  return (e | s << 8 | i << 16 | r << 24) >>> 0;
}
const Mt = { bat: 0, skeleton: 1, ghoul: 2, wraith: 3, skull: 4, reaper: 5 };
const mt = { gemSmall: 0, gemMid: 1, gemBig: 2, coin: 3, chicken: 4, vacuum: 5, relic: 6, chest: 7 };
const Di = { wandBolt: 0, flask: 1, scytheWave: 2 };
const Zs = { enemies: 1024, pickups: 2048, projectiles: 256, events: 8192 };
const Gv = { world: 12, fx: 14 };
const Ie = 1 / 60;
const fe = ["lash", "wand", "tomes", "storm", "ward", "flask"];
const Od = 96;
const Ys = 6;
class hI {
  _lights = [];
  _requests = new Float32Array(Od * Ys);
  _count = 0;
  constructor(t, e) {
    for (let s = 0; s < e; s++) {
      const i = new dh({ label: `fx-light-${s}`, intensity: 0, range: 1 });
      i.visible = false, this._lights.push(i), t.addChild(i);
    }
  }
  set(t, e, s, i, r, o) {
    if (r <= 0.05) return;
    const a = this._requests;
    let h = this._count;
    if (h === Od) {
      let c = 0;
      for (let u = 1; u < Od; u++) a[u * Ys + 4] < a[c * Ys + 4] && (c = u);
      if (a[c * Ys + 4] >= r) return;
      h = c;
    } else this._count++;
    const l = h * Ys;
    a[l] = t, a[l + 1] = e, a[l + 2] = s, a[l + 3] = i, a[l + 4] = r, a[l + 5] = o;
  }
  flush(t) {
    const e = this._lights, s = this._requests, i = this._count;
    let r = 0;
    if (t) for (; r < e.length && r < i; r++) {
      let o = r;
      for (let l = r + 1; l < i; l++) s[l * Ys + 4] > s[o * Ys + 4] && (o = l);
      o !== r && lI(s, o, r);
      const a = r * Ys, h = e[r];
      h.position.set(s[a], s[a + 1], s[a + 2]), h.color.setValue(s[a + 3]), h.intensity = s[a + 4], h.range = s[a + 5], h.visible = true;
    }
    for (let o = r; o < e.length; o++) e[o].visible = false;
    this._count = 0;
  }
  destroy() {
    for (const t of this._lights) t.destroy();
    this._lights.length = 0, this._count = 0;
  }
}
function lI(n18, t, e) {
  const s = t * Ys, i = e * Ys;
  for (let r = 0; r < Ys; r++) {
    const o = n18[s + r];
    n18[s + r] = n18[i + r], n18[i + r] = o;
  }
}
function Wv(n18) {
  return n18 ? fI : dI;
}
const Yv = `
  let pyroT = max(particleAge, 0.0);
  let pyroDrag = input.aMotion.x;
  var pyroA = pyroT;
  var pyroB = pyroT * pyroT * 0.5;
  var pyroDecay = 1.0;

  if (pyroDrag > 1e-3) {
    pyroDecay = exp(-pyroDrag * pyroT);
    pyroA = (1.0 - pyroDecay) / pyroDrag;
    pyroB = (pyroT - pyroA) / pyroDrag;
  }

  let pyroAccel = material.uGravity * input.aMotion.y;
  let pyroVelocity = input.aVel * pyroDecay + pyroAccel * pyroA;
  let pyroTravel = input.aVel * pyroA + pyroAccel * pyroB;

  position = vec4<f32>(position.xyz + pyroTravel, 1.0);
  particleSize = mix(particleSize, input.aLook.z, 1.0 - pow(1.0 - particleProgress, material.uGrowth));
  particleRotation = particleRotation + input.aLook.w * pyroT;

  let pyroHeat = mix(input.aLook.x, input.aLook.y, pow(particleProgress, material.uCooling));
  let pyroFire = clamp(
    vec3<f32>(pyroHeat * 2.5, (pyroHeat - 0.32) * 1.5, (pyroHeat - 0.72) * 3.6),
    vec3<f32>(0.0),
    vec3<f32>(1.0)
  );
  var pyroAlpha = clamp(pyroT / material.uFadeIn, 0.0, 1.0) * (1.0 - pow(particleProgress, material.uFadeOut));

  if (input.aMotion.z > 0.0) {
    let pyroSeed = fract(dot(input.aVel, vec3<f32>(0.1031, 0.1173, 0.0973)) + floor(material.uParticleTime * 30.0) * 0.618034);
    pyroAlpha = pyroAlpha * (1.0 - input.aMotion.z * fract(pyroSeed * 97.31));
  }

  particleColor = vec4<f32>(particleColor.rgb * pyroFire, particleColor.a * pyroAlpha);
`;
const Xv = `
  float pyroT = max(particleAge, 0.0);
  float pyroDrag = aMotion.x;
  float pyroA = pyroT;
  float pyroB = pyroT * pyroT * 0.5;
  float pyroDecay = 1.0;

  if (pyroDrag > 1e-3) {
    pyroDecay = exp(-pyroDrag * pyroT);
    pyroA = (1.0 - pyroDecay) / pyroDrag;
    pyroB = (pyroT - pyroA) / pyroDrag;
  }

  vec3 pyroAccel = material.uGravity * aMotion.y;
  vec3 pyroVelocity = aVel * pyroDecay + pyroAccel * pyroA;
  vec3 pyroTravel = aVel * pyroA + pyroAccel * pyroB;

  position = vec4(position.xyz + pyroTravel, 1.0);
  particleSize = mix(particleSize, aLook.z, 1.0 - pow(1.0 - particleProgress, material.uGrowth));
  particleRotation += aLook.w * pyroT;

  float pyroHeat = mix(aLook.x, aLook.y, pow(particleProgress, material.uCooling));
  vec3 pyroFire = clamp(vec3(pyroHeat * 2.5, (pyroHeat - 0.32) * 1.5, (pyroHeat - 0.72) * 3.6), 0.0, 1.0);
  float pyroAlpha = clamp(pyroT / material.uFadeIn, 0.0, 1.0) * (1.0 - pow(particleProgress, material.uFadeOut));

  if (aMotion.z > 0.0) {
    float pyroSeed = fract(dot(aVel, vec3(0.1031, 0.1173, 0.0973)) + floor(material.uParticleTime * 30.0) * 0.618034);
    pyroAlpha *= 1.0 - aMotion.z * fract(pyroSeed * 97.31);
  }

  particleColor = vec4(particleColor.rgb * pyroFire, particleColor.a * pyroAlpha);
`;
const $v = `
  particleColor.a = particleColor.a * clamp((clipPosition.w - 0.3) / material.uNearFade, 0.0, 1.0);
`;
const qv = `
  particleColor.a *= clamp((gl_Position.w - 0.3) / material.uNearFade, 0.0, 1.0);
`;
const cI = `
  {
    let streakFlat = vec2<f32>(dot(pyroVelocity, billboardRight), dot(pyroVelocity, billboardUp));
    let streakSpeed = length(streakFlat);
    let streakReach = min(streakSpeed * (material.uShutter * input.aLook.w + input.aMotion.w), length(pyroTravel));
    var streakDir = vec2<f32>(0.0, 1.0);

    if (streakSpeed > 1e-5) {
      streakDir = streakFlat / streakSpeed;
    }

    let streakAxis = billboardRight * streakDir.x + billboardUp * streakDir.y;
    let streakSide = billboardUp * streakDir.x - billboardRight * streakDir.y;
    let streakSpan = particleSize + streakReach;

    worldPosition = vec4<f32>(
      position.xyz + streakAxis * (particleCorner.y * streakSpan - streakReach * 0.5) + streakSide * (particleCorner.x * particleSize),
      1.0
    );
    clipPosition = camera.uViewProjectionMatrix * worldPosition;
    particleColor.a = particleColor.a * pow(particleSize / streakSpan, material.uStreakFade);

    if (particleAge < 0.0 || particleAge > input.aLife) {
      clipPosition = vec4<f32>(0.0, 0.0, 2.0, 1.0);
    }
  }
`;
const uI = `
  {
    vec2 streakFlat = vec2(dot(pyroVelocity, billboardRight), dot(pyroVelocity, billboardUp));
    float streakSpeed = length(streakFlat);
    float streakReach = min(streakSpeed * (material.uShutter * aLook.w + aMotion.w), length(pyroTravel));
    vec2 streakDir = streakSpeed > 1e-5 ? streakFlat / streakSpeed : vec2(0.0, 1.0);
    vec3 streakAxis = billboardRight * streakDir.x + billboardUp * streakDir.y;
    vec3 streakSide = billboardUp * streakDir.x - billboardRight * streakDir.y;
    float streakSpan = particleSize + streakReach;

    worldPosition = vec4(
      position.xyz + streakAxis * (particleCorner.y * streakSpan - streakReach * 0.5) + streakSide * (particleCorner.x * particleSize),
      1.0
    );
    gl_Position = uViewProjectionMatrix * worldPosition;
    particleColor.a *= pow(particleSize / streakSpan, material.uStreakFade);

    if (particleAge < 0.0 || particleAge > aLife) {
      gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
    }
  }
`;
const jv = { aVel: "float32x3", aLook: "float32x4", aMotion: "float32x4" };
const Kv = { uGravity: "vec3<f32>", uGrowth: "f32", uFadeIn: "f32", uFadeOut: "f32", uNearFade: "f32", uCooling: "f32" };
const dI = { name: "pyro", attributes: jv, bindings: { material: Kv }, gpu: { vertex: { beforeTransform: Yv, afterTransform: $v } }, gl: { vertex: { beforeTransform: Xv, afterTransform: qv } } };
const fI = { name: "pyroStreak", attributes: jv, bindings: { material: { ...Kv, uShutter: "f32", uStreakFade: "f32" } }, gpu: { vertex: { beforeTransform: Yv, afterTransform: cI + $v } }, gl: { vertex: { beforeTransform: Xv, afterTransform: uI + qv } } };
const hg = 4;
class dn {
  container;
  pull;
  x = 0;
  y = 0;
  z = 0;
  vx = 0;
  vy = 0;
  vz = 0;
  birth = 0;
  life = 1;
  size = 0.1;
  sizeEnd = 0.1;
  color = 4294967295;
  rotation = 0;
  spin = 0;
  heat = 1;
  heatEnd = 1;
  drag = 0;
  gravity = 1;
  flicker = 0;
  trail = 0;
  streak = 1;
  frame = 0;
  _f32;
  _stride;
  _iBirth;
  _iLife;
  _iVel;
  _iLook;
  _iMotion;
  _capacity;
  _streak;
  _cursor = 0;
  _liveUntil = -1;
  constructor(t, e) {
    const s = e.streak ?? false, i = new yi({ label: e.label, texture: e.texture, capacity: e.capacity, blendMode: e.blendMode, billboard: "spherical", extraBits: [av, Wv(s)] }), { f32: r, floatStride: o, offsets: a } = i.data, h = i.uniforms;
    h.uGravity = e.gravity, h.uGrowth = e.growth ?? 1, h.uFadeIn = Math.max(1e-3, e.fadeIn ?? 1e-3), h.uFadeOut = e.fadeOut ?? 1, h.uNearFade = e.nearFade ?? 0.8, h.uCooling = e.cooling ?? 1, h.uParticleTime = 0, s && (h.uShutter = 0, h.uStreakFade = e.streakFade ?? 0.4), this.container = i, this.pull = e.gravity, this._f32 = r, this._stride = o, this._iBirth = a.aBirth / 4, this._iLife = a.aLife / 4, this._iVel = a.aVel / 4, this._iLook = a.aLook / 4, this._iMotion = a.aMotion / 4, this._capacity = e.capacity, this._streak = s, i.visible = false, t.addChild(i);
  }
  tint(t, e) {
    this.color = ve(t, e);
  }
  emit() {
    const t = this._cursor, e = this._f32, s = this._stride;
    let i = t * hg * s;
    this.container.writePacked(t, this.x, this.y, this.z, this.size, this.rotation, this.color, this.frame);
    for (let o = 0; o < hg; o++, i += s) {
      e[i + this._iBirth] = this.birth, e[i + this._iLife] = this.life;
      const a = i + this._iVel;
      e[a] = this.vx, e[a + 1] = this.vy, e[a + 2] = this.vz;
      const h = i + this._iLook;
      e[h] = this.heat, e[h + 1] = this.heatEnd, e[h + 2] = this.sizeEnd, e[h + 3] = this._streak ? this.streak : this.spin;
      const l = i + this._iMotion;
      e[l] = this.drag, e[l + 1] = this.gravity, e[l + 2] = this.flicker, e[l + 3] = this.trail;
    }
    this._cursor = t + 1 === this._capacity ? 0 : t + 1;
    const r = this.birth + this.life;
    r > this._liveUntil && (this._liveUntil = r);
  }
  update(t, e, s) {
    const i = this.container.uniforms, r = s && t <= this._liveUntil;
    i.uParticleTime = t, this._streak && (i.uShutter = e), r && this.container.upload(), this.container.visible = r;
  }
  clear() {
    this.container.clear(), this.container.visible = false, this._cursor = 0, this._liveUntil = -1;
  }
  destroy() {
    this.container.destroy();
  }
}
class Ud {
  container;
  _capacity;
  _count = 0;
  _last = 0;
  constructor(t, e, s, i, r, o = "add") {
    this.container = new yi({ label: e, texture: s, capacity: i, blendMode: o, billboard: r }), this.container.visible = false, this._capacity = i, t.addChild(this.container);
  }
  add(t, e, s, i, r, o, a = 0, h = 0) {
    this._count === this._capacity || i <= 0 || o <= 2e-3 || this.container.writePacked(this._count++, t, e, s, i, a, ve(r, o), h);
  }
  flush(t, e) {
    const s = this.container;
    for (let r = this._count; r < this._last; r++) s.writePacked(r, 0, 0, 0, 0, 0, 0);
    const i = t && this._count > 0;
    e && i && s.upload(), s.visible = i, this._last = this._count, this._count = 0;
  }
  clear() {
    this._count = 0, this.flush(false, false);
  }
  destroy() {
    this.container.destroy();
  }
}
class yr {
  _state = 0;
  seed(t, e) {
    let s = Math.imul(t ^ 2654435769, 2246822507) ^ Math.imul(e + 1663821211, 3266489909);
    return s ^= s >>> 15, s = Math.imul(s, 739982445), s ^= s >>> 12, this._state = s | 0, this;
  }
  next() {
    const t = this._state = this._state + 1831565813 | 0;
    let e = Math.imul(t ^ t >>> 15, t | 1);
    return e ^= e + Math.imul(e ^ e >>> 7, e | 61), ((e ^ e >>> 14) >>> 0) / 4294967296;
  }
  range(t, e) {
    return t + (e - t) * this.next();
  }
  signed() {
    return this.next() * 2 - 1;
  }
  sphere(t) {
    const e = this.signed(), s = this.next() * Math.PI * 2, i = Math.sqrt(1 - e * e);
    return t.set(i * Math.cos(s), e, i * Math.sin(s));
  }
}
const J = { glow: 0, hotGlow: 1, spark: 2, puff: 3, ring: 4, crescent: 5, bolt: 6, beam: 7, shard: 8, ember: 9, scorch: 10, rune: 11, flame: 12, halo: 13 };
class II {
  container;
  _frames = [];
  _offsets = [];
  _capacity;
  _count = 0;
  _last = 0;
  constructor(t, e, s) {
    for (const i of e) {
      this._offsets.push(this._frames.length);
      for (const r of i.textures) {
        const { x: o, y: a, width: h, height: l } = r.frame, c = Math.max(h, l), u = new kt(o + (h - c) / 2, a + (l - c) / 2, c, c);
        this._frames.push(new U({ source: r.source, frame: u, label: "fx-art" }));
      }
    }
    this.container = new yi({ label: "combat-art", texture: this._frames, capacity: s, alphaMode: "mask", alphaCutoff: 0.5, billboard: "spherical" }), this._capacity = s, this.container.visible = false, t.addChild(this.container);
  }
  frameOf(t, e) {
    return this._offsets[t] + e;
  }
  add(t, e, s, i, r, o, a) {
    this._count === this._capacity || i <= 0 || this.container.writePacked(this._count++, t, e, s, i, o, ve(r, 1), a);
  }
  flush(t) {
    const e = this.container;
    for (let i = this._count; i < this._last; i++) e.writePacked(i, 0, 0, 0, 0, 0, 0);
    const s = this._count > 0;
    t && s && e.upload(), e.visible = s, this._last = this._count, this._count = 0;
  }
  clear() {
    this._count = 0, this.flush(false);
  }
  destroy() {
    this.container.destroy();
    for (const t of this._frames) t.destroy(false);
    this._frames.length = 0;
  }
}
const jh = 4;
const DI = { name: "fxBeam", attributes: { aBeamOther: "float32x3" }, bindings: { material: { uBeamPull: "f32" } }, gpu: { vertex: { afterTransform: `
  {
    let beamSign = select(-1.0, 1.0, particleCorner.y > 0.0);
    let beamAxis = (input.aBeamOther - position.xyz) * beamSign;
    let beamFlat = vec2<f32>(dot(beamAxis, billboardRight), dot(beamAxis, billboardUp));
    let beamLength = length(beamFlat);
    var beamDir = vec2<f32>(0.0, 1.0);

    if (beamLength > 1e-5) {
      beamDir = beamFlat / beamLength;
    }

    let beamSide = billboardUp * beamDir.x - billboardRight * beamDir.y;

    worldPosition = vec4<f32>(position.xyz + beamSide * (particleCorner.x * particleSize), 1.0);
    clipPosition = camera.uViewProjectionMatrix * worldPosition;

    let beamBack = vec3<f32>(camera.uViewMatrix[0][2], camera.uViewMatrix[1][2], camera.uViewMatrix[2][2]);
    let beamNear = camera.uViewProjectionMatrix * vec4<f32>(worldPosition.xyz + beamBack * material.uBeamPull, 1.0);

    clipPosition.z = beamNear.z / max(beamNear.w, 1e-4) * clipPosition.w;
    uv = vec2<f32>(uv.x, 0.5);
  }
` } }, gl: { vertex: { afterTransform: `
  {
    float beamSign = particleCorner.y > 0.0 ? 1.0 : -1.0;
    vec3 beamAxis = (aBeamOther - position.xyz) * beamSign;
    vec2 beamFlat = vec2(dot(beamAxis, billboardRight), dot(beamAxis, billboardUp));
    float beamLength = length(beamFlat);
    vec2 beamDir = beamLength > 1e-5 ? beamFlat / beamLength : vec2(0.0, 1.0);
    vec3 beamSide = billboardUp * beamDir.x - billboardRight * beamDir.y;

    worldPosition = vec4(position.xyz + beamSide * (particleCorner.x * particleSize), 1.0);
    gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;

    vec3 beamBack = vec3(uViewMatrix[0][2], uViewMatrix[1][2], uViewMatrix[2][2]);
    vec4 beamNear = uProjectionMatrix * uViewMatrix * vec4(worldPosition.xyz + beamBack * material.uBeamPull, 1.0);

    gl_Position.z = beamNear.z / max(beamNear.w, 1e-4) * gl_Position.w;
    uv = vec2(uv.x, 0.5);
  }
` } } };
class FI {
  container;
  _capacity;
  _f32;
  _u32;
  _stride;
  _iSizeRot;
  _iColor;
  _iOther;
  _count = 0;
  _last = 0;
  constructor(t, e, s, i, r = 1.5) {
    const o = new yi({ label: e, texture: s, capacity: i, blendMode: "add", billboard: "spherical", extraBits: [DI] }), { f32: a, u32: h, floatStride: l, offsets: c } = o.data;
    o.uniforms.uBeamPull = r, this.container = o, this._capacity = i, this._f32 = a, this._u32 = h, this._stride = l, this._iSizeRot = c.aParticleSizeRot / 4, this._iColor = c.aParticleColor / 4, this._iOther = c.aBeamOther / 4, o.visible = false, t.addChild(o);
  }
  get room() {
    return this._capacity - this._count;
  }
  segment(t, e, s, i, r, o, a, h, l, c, u, d) {
    if (this._count === this._capacity || c <= 2e-3 && d <= 2e-3) return;
    const f = this._count++, p = ve(l, c), _ = u === l && d === c ? p : ve(u, d);
    let m = f * jh * this._stride;
    for (let g = 0; g < jh; g++, m += this._stride) {
      const y = g < 2;
      this._write(m, y ? i : t, y ? r : e, y ? o : s, y ? t : i, y ? e : r, y ? s : o, y ? h : a, y ? _ : p);
    }
    this.container.markDirty(f, f);
  }
  flush(t, e) {
    for (let i = this._count; i < this._last; i++) {
      let r = i * jh * this._stride;
      for (let o = 0; o < jh; o++, r += this._stride) this._f32[r + this._iSizeRot] = 0;
      this.container.markDirty(i, i);
    }
    const s = t && this._count > 0;
    e && s && this.container.upload(), this.container.visible = s, this._last = this._count, this._count = 0;
  }
  clear() {
    this._count = 0, this.flush(false, false);
  }
  destroy() {
    this.container.destroy();
  }
  _write(t, e, s, i, r, o, a, h, l) {
    const c = this._f32, u = t + this._iOther;
    c[t] = e, c[t + 1] = s, c[t + 2] = i, c[t + this._iSizeRot] = h, c[t + this._iSizeRot + 1] = 0, this._u32[t + this._iColor] = l, c[u] = r, c[u + 1] = o, c[u + 2] = a;
  }
}
const Nd = 32;
const Kh = 8;
class RI {
  _data = new Float32Array(Nd * Kh);
  _cursor = 0;
  add(t, e, s, i, r, o, a, h) {
    const l = this._cursor * Kh, c = this._data;
    c[l] = t, c[l + 1] = e, c[l + 2] = s, c[l + 3] = i, c[l + 4] = r, c[l + 5] = o, c[l + 6] = a, c[l + 7] = h, this._cursor = (this._cursor + 1) % Nd;
  }
  update(t, e) {
    const s = this._data;
    for (let i = 0; i < Nd * Kh; i += Kh) {
      const r = s[i + 6], o = e - s[i];
      r <= 0 || o < 0 || o > r * 5 || t.set(s[i + 1], s[i + 2], s[i + 3], s[i + 4], s[i + 5] * Math.exp(-o / r), s[i + 7]);
    }
  }
  reset() {
    this._data.fill(0), this._cursor = 0;
  }
}
function Ba(n18, t, e, s, i) {
  if (i <= 1e-3) return t + e * n18 + 0.5 * s * n18 * n18;
  const r = (1 - Math.exp(-i * n18)) / i;
  return t + e * r + s * ((n18 - r) / i);
}
function hu(n18, t, e, s, i) {
  if (Ba(i, n18, t, e, s) > 0.01) return -1;
  let o = 0, a = i;
  for (let h = 1; h <= 8; h++) {
    const l = i * h / 8;
    if (Ba(l, n18, t, e, s) <= 0.01) {
      a = l, o = i * (h - 1) / 8;
      break;
    }
  }
  for (let h = 0; h < 12; h++) {
    const l = (o + a) / 2;
    Ba(l, n18, t, e, s) > 0.01 ? o = l : a = l;
  }
  return a;
}
function Gd(n18, t, e, s) {
  if (s <= 1e-3) return t + e * n18;
  const i = Math.exp(-s * n18);
  return t * i + e * ((1 - i) / s);
}
function jf(n18, t) {
  return Math.sin(n18 * 31.7 + t) * 0.5 + Math.sin(n18 * 53.3 + t * 2.1) * 0.3 + Math.sin(n18 * 97.1 + t * 3.7) * 0.2;
}
function LI(n18, t, e) {
  const s = Math.min(1, Math.max(0, (e - n18) / (t - n18)));
  return s * s * (3 - 2 * s);
}
const we = { lash: 101, wand: 102, wandTrail: 103, tomes: 104, tomesTrail: 105, storm: 106, ward: 107, flask: 108, flaskTrail: 109, firePool: 110, hit: 111, kill: 112, relicKill: 113, pickup: 114, brazier: 115 };
const BI = [16765562, 10275071, 16769178, 13678847, 16773320, 16752704];
function Ni(n18, t, e) {
  const s = Math.pow(Math.min(1, t / e), 0.45454545454545453), i = Math.round((n18 >> 16 & 255) * s), r = Math.round((n18 >> 8 & 255) * s), o = Math.round((n18 & 255) * s);
  return i << 16 | r << 8 | o;
}
function Ds(n18) {
  return Math.round(n18.time * 60) * 2048 + n18.subject | 0;
}
function Ye(n18) {
  return n18 < 0 ? 0 : n18 > 1 ? 1 : n18;
}
function ft(n18, t = 0) {
  return n18.vx = n18.vy = n18.vz = 0, n18.rotation = 0, n18.spin = 0, n18.heat = 1, n18.heatEnd = 1, n18.drag = 0, n18.gravity = 1, n18.flicker = 0, n18.trail = 0, n18.streak = 1, n18.frame = t, n18;
}
const Kf = [0.3, 0.7, 0.7, 0.65, 0.3, 2.5];
const OI = [0.8, 0.9, 1, 0.9, 0.6, 4];
function oc(n18, t, e) {
  const s = n18.sim.enemies, i = t.subject, r = Kf[s.kind[i]] ?? 0.6;
  if (t.x !== 0 || t.z !== 0) {
    e.x = t.x, e.y = t.y > 0 ? t.y : r, e.z = t.z;
    return;
  }
  e.x = s.x[i], e.y = s.y[i] + r * (s.scale[i] || 1), e.z = s.z[i];
}
const Ln = Math.PI * 2;
const Zh = 40;
const Ur = 60;
const UI = 20;
const Qh = 0.6;
const NI = 2;
const Jh = 16;
const Nr = 5;
class GI {
  _kit;
  _frames;
  _artIndex;
  _pools = new Float32Array(Jh * Nr);
  _cursor = 0;
  constructor(t, e, s) {
    this._kit = t, this._frames = e, this._artIndex = s;
  }
  event(t) {
    t.kind === "flaskBurst" && this._burst(t);
  }
  update(t, e) {
    const s = this._kit, i = s.sim.projectiles, r = t.alpha, o = t.worldTime, a = this._frames, h = Ni(16777215, 1.05, s.view.exposure), l = Math.max(a.width, a.height);
    let c = 0;
    for (let d = 0; d < i.count; d++) {
      if (!i.active[d] || i.kind[d] !== Di.flask) continue;
      const f = i.prevX[d] + (i.x[d] - i.prevX[d]) * r, p = i.prevY[d] + (i.y[d] - i.prevY[d]) * r, _ = i.prevZ[d] + (i.z[d] - i.prevZ[d]) * r, m = Math.floor(o * a.fps) % a.count;
      s.art.add(f, p, _, l, h, i.age[d] * 9 * (i.vx[d] < 0 ? 1 : -1), s.art.frameOf(this._artIndex, m)), s.sprites.add(f, p, _, 0.8, 16752704, 0.3, 0, J.glow), this._trail(d, f, p, _, i.vx[d], i.vy[d], i.vz[d], i.age[d], e, o), c < NI && (s.lights.set(f, p, _, 16751168, 4, 3.5), c++);
    }
    this._remember();
    const u = this._pools;
    for (let d = 0; d < Jh * Nr; d += Nr) {
      const f = u[d + 3], p = u[d + 4];
      p <= 0 || o < f || o > p + Qh + 1.5 || this._pool(u[d], u[d + 1], u[d + 2], f, p, e, o);
    }
  }
  reset() {
    this._pools.fill(0), this._cursor = 0;
  }
  _remember() {
    const t = this._kit.sim.weapons.firePools, e = this._pools;
    for (let s = 0; s < t.count; s++) {
      const i = t.start[s];
      let r = -1;
      for (let o = 0; o < Jh * Nr; o += Nr) if (e[o + 4] > 0 && e[o + 3] === i && e[o] === t.x[s]) {
        r = o;
        break;
      }
      r < 0 && (r = this._cursor * Nr, this._cursor = (this._cursor + 1) % Jh), e[r] = t.x[s], e[r + 1] = t.z[s], e[r + 2] = t.radius[s], e[r + 3] = i, e[r + 4] = t.end[s];
    }
  }
  _trail(t, e, s, i, r, o, a, h, l, c) {
    const u = this._kit, d = u.flames, f = Math.max(Math.floor(l * Zh) + 1, Math.ceil((c - h) * Zh)), p = Math.floor(c * Zh);
    for (let _ = f; _ <= p; _++) {
      const m = _ / Zh, g = c - m, y = u.rng.seed(we.flaskTrail, _ * 64 + t);
      ft(d, J.puff).tint(16756832, 0.8), d.x = e - r * g, d.y = s - o * g + 0.05, d.z = i - a * g, d.vx = y.signed() * 0.3, d.vy = y.range(0.2, 0.7), d.vz = y.signed() * 0.3, d.birth = m, d.life = y.range(0.2, 0.35), d.size = 0.08, d.sizeEnd = 0.26, d.heat = 1.3, d.heatEnd = 0.2, d.gravity = 0.2, d.rotation = y.next() * Ln, d.emit();
    }
  }
  _pool(t, e, s, i, r, o, a) {
    const h = this._kit, l = a - i, c = Ye(l / 0.15) * Ye((r - a) / 0.4), u = Math.round(i * 60) & 65535, d = h.view.exposure, f = 1 - Ye((a - r) / (Qh + 1.5)), p = jf(a, u);
    if (h.decals.add(t, 0.04, e, s * 2.6, Ni(2759186, 0.5, d), 0.8 * Ye(l / 0.35) * f, u, J.scorch), a < r + Qh) {
      const _ = Math.max(c, 0.25 * (1 - Ye((a - r) / Qh)));
      h.ground.add(t, 0.05, e, s * 3, 16747056, _ * (0.34 + 0.08 * p), 0, J.glow), h.ground.add(t, 0.05, e, s * 1.6, 16760928, _ * (0.3 + 0.06 * p), 0, J.glow);
    }
    c > 0 && h.lights.set(t, 1.5, e, 16751162, (24 + 7 * p) * c, s + 5.5), this._flames(t, e, s, i, r, u, o, a);
  }
  _flames(t, e, s, i, r, o, a, h) {
    const l = this._kit, c = l.flames, u = l.sparks, d = Math.max(Math.floor(a * Ur) + 1, Math.ceil(i * Ur)), f = Math.min(Math.floor(h * Ur), Math.floor(r * Ur)), p = UI * Math.PI * s * s / Ur;
    const density = l.firePoolsAtFullDensity === undefined ? 1 : Math.min(1, l.firePoolsAtFullDensity / Math.max(1, l.sim.weapons.firePools.count));
    for (let _ = d; _ <= f; _++) {
      const m = _ / Ur, g = l.rng.seed(we.firePool, o * 65536 + (_ & 65535)), y = Ye((m - i) / 0.15) * Ye((r - m) / 0.5), x = Math.floor(p * density * y + g.next());
      for (let w = 0; w < x; w++) {
        const b = g.next() * Ln, T = Math.sqrt(g.next()) * s * 0.85, v = T / s;
        ft(c, J.flame).tint(v > 0.6 ? 16747056 : 16756816, 0.85), c.x = t + Math.cos(b) * T, c.y = 0.12, c.z = e + Math.sin(b) * T, c.vx = g.signed() * 0.2, c.vy = g.range(0.4, 1.1) * (1 - v * 0.4), c.vz = g.signed() * 0.2, c.birth = m, c.life = g.range(0.4, 0.75) * (1 - v * 0.35), c.size = g.range(0.3, 0.45) * (1 - v * 0.3), c.sizeEnd = g.range(0.55, 0.8) * (1 - v * 0.4), c.heat = g.range(1, 1.25), c.heatEnd = 0.1, c.drag = 0.5, c.gravity = 0.25, c.emit();
      }
      g.next() < 0.35 * y && (ft(u).tint(16760944, 1), u.x = t + g.signed() * s * 0.6, u.y = 0.3, u.z = e + g.signed() * s * 0.6, u.vx = g.signed() * 0.8, u.vy = g.range(1.5, 3.5), u.vz = g.signed() * 0.8, u.birth = m, u.life = g.range(0.6, 1.1), u.size = 0.04, u.sizeEnd = 0.02, u.heat = 1.3, u.heatEnd = 0.4, u.drag = 1.5, u.gravity = -0.08, u.flicker = 0.5, u.streak = 0.4, u.emit());
    }
  }
  _burst(t) {
    const e = this._kit, s = t.value > 0 ? t.value : 1.5, i = t.x, r = t.z, o = e.rng.seed(we.flask, Ds(t)), a = e.flames, h = e.sparks, l = e.debris, c = e.glows, u = e.view.exposure;
    for (let d = 0; d < 26; d++) {
      const f = o.next() * Ln, p = o.range(4, 9) * (0.5 + s * 0.3);
      ft(a, J.puff).tint(16756832, 0.9), a.x = i, a.y = 0.3, a.z = r, a.vx = Math.cos(f) * p, a.vy = o.range(0.5, 3.5), a.vz = Math.sin(f) * p * 0.8, a.birth = t.time, a.life = o.range(0.45, 0.8), a.size = o.range(0.25, 0.4), a.sizeEnd = o.range(0.9, 1.3), a.heat = o.range(1.4, 1.8), a.heatEnd = 0.2, a.drag = o.range(4, 5.5), a.gravity = 0.4, a.rotation = o.next() * Ln, a.spin = o.signed() * 2, a.emit();
    }
    for (let d = 0; d < 6; d++) ft(a, J.puff).tint(16777215, 1), a.x = i + o.signed() * 0.2, a.y = 0.4, a.z = r + o.signed() * 0.2, a.vy = o.range(0.5, 1.5), a.birth = t.time, a.life = o.range(0.2, 0.3), a.size = 0.4, a.sizeEnd = 1.1, a.heat = 1.6, a.heatEnd = 0.5, a.rotation = o.next() * Ln, a.emit();
    ft(h).tint(16763e3, 1), h.drag = 1.4, h.heatEnd = 0.4;
    for (let d = 0; d < 24; d++) {
      const f = o.next() * Ln, p = o.range(3, 8);
      h.x = i, h.y = 0.35, h.z = r, h.vx = Math.cos(f) * p, h.vy = o.range(2, 6), h.vz = Math.sin(f) * p, h.birth = t.time, h.life = o.range(0.35, 0.7), h.size = o.range(0.04, 0.07), h.sizeEnd = 0.03, h.heat = o.range(1.4, 1.8), h.emit();
    }
    ft(l, J.shard).tint(Ni(13167871, 1.3, u), 1), l.drag = 0.6;
    for (let d = 0; d < 16; d++) {
      const f = o.next() * Ln, p = o.range(2, 5);
      l.x = i, l.y = 0.4, l.z = r, l.vx = Math.cos(f) * p, l.vy = o.range(2, 5), l.vz = Math.sin(f) * p, l.birth = t.time, l.life = o.range(0.4, 0.7), l.size = o.range(0.05, 0.09), l.sizeEnd = l.size, l.rotation = o.next() * 6, l.spin = o.signed() * 16, l.emit();
    }
    ft(c, J.hotGlow).tint(16769200, 1), c.x = i, c.y = 0.5, c.z = r, c.birth = t.time, c.life = 0.16, c.size = 0.9, c.sizeEnd = 2.6, c.gravity = 0, c.emit(), e.pulses.add(t.time, i, r, s * 0.3, s * 1.6, 0.32, 16756832, 0.9, 0.12), e.flashes.add(t.time, i, 1.2, r, 16751168, 30, 0.12, s + 7), e.lens.shake(0.1);
  }
}
const Hd = 48;
const tl = 9;
const HI = 0.86;
class VI {
  _data = new Float32Array(Hd * tl);
  _cursor = 0;
  add(t, e, s, i, r, o, a, h, l = 0) {
    const c = this._cursor * tl, u = this._data;
    u[c] = t, u[c + 1] = e, u[c + 2] = s, u[c + 3] = i, u[c + 4] = r, u[c + 5] = o, u[c + 6] = a, u[c + 7] = h, u[c + 8] = l, this._cursor = (this._cursor + 1) % Hd;
  }
  update(t, e, s) {
    const i = this._data;
    for (let r = 0; r < Hd * tl; r += tl) {
      const o = i[r + 5], a = s - i[r];
      if (o <= 0 || a < 0 || a >= o) continue;
      const h = a / o, l = i[r + 3] + (i[r + 4] - i[r + 3]) * (1 - (1 - h) * (1 - h)), c = Math.pow(1 - h, 1.4);
      t.add(i[r + 1], 0.06, i[r + 2], l * 2 / HI, i[r + 6], i[r + 7] * c, 0, J.ring), i[r + 8] > 0 && e.shockwave(i[r + 1], 0, i[r + 2], l, i[r + 8] * c);
    }
  }
  reset() {
    this._data.fill(0), this._cursor = 0;
  }
}
const Bt = [...[12, 18, 24, 30, 36, 42].flatMap((n18) => [{ x: -2.6, z: n18 }, { x: 2.6, z: n18 }]), { x: -7.5, z: -4 }, { x: 7.5, z: -4 }, { x: -7.5, z: 4 }, { x: 7.5, z: 4 }];
const QI = 0.18;
const JI = 2.2;
const tD = 0.3;
function Ja(n18, t) {
  const e = Math.min(1, Math.max(0, t) / tD);
  return Math.min(JI, QI * n18) * e * (2 - e);
}
class Zv {
  _start = new Float32Array(Zs.pickups).fill(-1);
  track(t, e) {
    const s = this._start;
    for (let i = 0; i < t.count; i++) t.active[i] === 0 || t.attracted[i] === 0 ? s[i] = -1 : s[i] < 0 && (s[i] = e);
  }
  since(t, e) {
    return e - this._start[t];
  }
  reset() {
    this._start.fill(-1);
  }
}
const oD = 0.8;
const aD = 2.2;
const ug = 0.25;
const Hr = Math.PI * 2;
const dg = 40;
const fg = 160;
const pg = 48;
const _g = 16;
const el = 2;
const hD = 400;
const lD = 60;
const cD = -16;
const mg = [[5913210, 10119880, 16730714], [15129792, 12103316, 8024674], [7245390, 4744762, 10532984], [9083600, 13161727, 4871816], [15787728, 16751152, 16733208], [3156026, 9075354, 13682912]];
const gg = [14196991, 16773840, 13172640, 12112127, 16756832, 16736384];
const sl = [5941503, 6356880, 16732256, 16765008, 16756864, 12624127, 16773312, 16769152];
class uD {
  _kit;
  _at = { x: 0, y: 0, z: 0 };
  _flights = new Zv();
  _tick = -1;
  _tickHits = 0;
  _tickKills = 0;
  _tickSparkles = 0;
  _frameHits = 0;
  _frameKills = 0;
  _frameSparkles = 0;
  _relicTick = -1;
  _relicX = 0;
  _relicZ = 0;
  _relicTime = 0;
  constructor(t) {
    this._kit = t;
  }
  begin() {
    this._frameHits = 0, this._frameKills = 0, this._frameSparkles = 0;
  }
  event(t) {
    const e = Math.round(t.time / Ie);
    switch (e !== this._tick && (this._tick = e, this._tickHits = 0, this._tickKills = 0, this._tickSparkles = 0), t.kind) {
      case "hit":
        this._hit(t);
        break;
      case "kill":
        e === this._relicTick ? this._dissolve(t) : this._kill(t);
        break;
      case "relicBlast":
        this._relicTick = e, this._relicX = t.x !== 0 || t.z !== 0 ? t.x : this._kit.hero.x, this._relicZ = t.x !== 0 || t.z !== 0 ? t.z : this._kit.hero.z, this._relicTime = t.time;
        break;
      case "pickup":
        this._pickup(t);
        break;
      case "brazierBreak":
        this._brazier(t);
        break;
    }
  }
  update(t) {
    const e = this._kit, s = e.sim.pickups, i = t.alpha, r = e.beams, o = t.worldTime, a = this._flights, h = e.hero.x, l = e.hero.z;
    let c = 0;
    a.track(s, o);
    for (let u = 0; u < s.count && c < hD; u++) {
      if (!s.active[u] || !s.attracted[u] || s.kind[u] > mt.coin) continue;
      const d = s.x[u] - s.prevX[u], f = s.y[u] - s.prevY[u], p = s.z[u] - s.prevZ[u], _ = Math.hypot(d, f, p);
      if (_ < 0.01) continue;
      const m = s.prevX[u] + d * i, g = s.prevZ[u] + p * i, y = Math.min(1.1, _ * 3) / _, x = m - d * y, w = g - p * y, b = a.since(u, o), T = s.prevY[u] + f * i + 0.2, v = T + Ja(Math.hypot(m - h, g - l), b), M = T - f * y + Ja(Math.hypot(x - h, w - l), b), k = sl[s.kind[u]];
      r.segment(m, v, g, x, M, w, 0.14, 0.02, k, 0.55, k, 0), c++;
    }
  }
  reset() {
    this.begin(), this._tick = -1, this._relicTick = -1, this._flights.reset();
  }
  _hit(t) {
    if (this._tickHits >= fg || this._frameHits >= fg * el) return;
    const e = this._kit, s = this._at, i = t.value >= 25, r = t.extra | 0, o = BI[r] ?? 16777215, a = e.rng.seed(we.hit, Ds(t) * 8 + r);
    oc(e, t, s);
    let h = s.x - e.hero.x, l = s.z - e.hero.z;
    const c = Math.hypot(h, l) || 1;
    h /= c, l /= c;
    const u = e.glows;
    if (ft(u, i ? J.spark : J.hotGlow).tint(o, i ? 1 : 0.8), u.x = s.x - h * 0.1, u.y = s.y, u.z = s.z - l * 0.1 + 0.1, u.birth = t.time, u.life = i ? 0.16 : 0.1, u.size = i ? 0.6 : 0.35, u.sizeEnd = i ? 1.6 : 0.95, u.gravity = 0, u.rotation = a.next() * Hr, u.emit(), this._tickHits++, this._frameHits++, this._tickHits > dg || this._frameHits > dg * el) return;
    const d = e.sparks, f = 3 + Math.min(10, Math.floor(t.value / 6));
    ft(d).tint(o, 1), d.drag = 2.4, d.gravity = 0.8, d.heatEnd = 0.45;
    for (let p = 0; p < f; p++) {
      const _ = a.range(3, i ? 10 : 7), m = h + a.signed() * 0.9, g = l + a.signed() * 0.9;
      d.x = s.x, d.y = s.y + a.signed() * 0.15, d.z = s.z + 0.05, d.vx = m * _, d.vy = a.range(0, 4.5), d.vz = g * _ * 0.7, d.birth = t.time - a.next() * a.next() * 0.03, d.life = a.range(0.16, 0.36), d.size = a.range(0.035, 0.065), d.sizeEnd = 0.025, d.heat = a.range(1.3, 1.8), d.emit();
    }
    i && e.flashes.add(t.time, s.x, s.y + 0.4, s.z, o, 8, 0.08, 4);
  }
  _kill(t) {
    if (this._tickKills >= pg || this._frameKills >= pg * el) {
      this._dissolve(t);
      return;
    }
    this._tickKills++, this._frameKills++;
    const e = this._kit, s = this._at, i = Math.min(Mt.reaper, t.value | 0), r = t.extra > 0, o = r ? 1.6 : 1, a = Kf[i] * o, h = OI[i] * o, l = mg[i], c = e.view.exposure, u = e.rng.seed(we.kill, Ds(t)), d = e.debris, f = e.glows, p = e.sparks;
    oc(e, t, s);
    const _ = r ? 34 : 16;
    ft(d, J.shard), d.drag = 0.6;
    for (let g = 0; g < _; g++) {
      const y = l[g % 3], x = u.signed() * h * 0.4, w = u.signed() * a * 0.8, b = u.range(1.2, 3.8) * (r ? 1.3 : 1), T = u.next() * Hr, v = u.next() * u.next() * 0.04;
      d.tint(Ni(y, 0.8, c), 1), d.x = s.x + x, d.y = s.y + w, d.z = s.z + 0.05, d.vx = Math.cos(T) * b + x * 2, d.vy = u.range(1.5, 5) + w, d.vz = Math.sin(T) * b * 0.7, d.birth = t.time - v, d.size = u.range(0.06, 0.1) * (r ? 1.25 : 1), d.sizeEnd = d.size * 0.8, d.rotation = u.next() * 6, d.spin = u.signed() * 12, this._bounce(u.range(0.55, 0.9));
    }
    ft(f, J.ember).tint(11067647, 0.9), f.gravity = 0.25, f.flicker = 0.5;
    for (let g = 0; g < (r ? 8 : 3); g++) f.x = s.x + u.signed() * h * 0.3, f.y = s.y, f.z = s.z, f.vx = u.signed() * 0.4, f.vy = u.range(0.5, 1.1), f.vz = u.signed() * 0.2, f.birth = t.time + u.range(0, 0.12), f.life = u.range(0.9, 1.5), f.size = u.range(0.13, 0.18), f.sizeEnd = 0.05, f.emit();
    ft(f, J.hotGlow).tint(gg[i], 0.9), f.x = s.x, f.y = s.y, f.z = s.z + 0.1, f.birth = t.time, f.life = 0.14, f.size = a * 1.2, f.sizeEnd = a * 2.8, f.gravity = 0, f.emit();
    const m = r ? sl[mt.gemBig] : sl[mt.gemSmall];
    if (ft(f, J.spark).tint(m, 1), f.x = s.x, f.y = 0.4, f.z = s.z + 0.1, f.birth = t.time + 0.05, f.life = 0.32, f.size = 0.25, f.sizeEnd = 0.9, f.spin = 3, f.gravity = 0, f.emit(), !!r) {
      ft(p).tint(gg[i], 1), p.drag = 1.8, p.heatEnd = 0.4;
      for (let g = 0; g < 18; g++) {
        const y = u.next() * Hr, x = u.range(4, 10);
        p.x = s.x, p.y = s.y, p.z = s.z, p.vx = Math.cos(y) * x, p.vy = u.range(1, 6), p.vz = Math.sin(y) * x * 0.7, p.birth = t.time - u.next() * 0.02, p.life = u.range(0.3, 0.6), p.size = u.range(0.05, 0.08), p.sizeEnd = 0.03, p.heat = u.range(1.4, 1.8), p.emit();
      }
      e.pulses.add(t.time, s.x, s.z, 0.4, 3.2, 0.4, 16756896, 0.9, 0.2), e.flashes.add(t.time, s.x, s.y + 0.6, s.z, 16740432, 26, 0.15, 7), e.lens.shake(0.12);
    }
  }
  _bounce(t) {
    const e = this._kit.debris, s = cD * e.gravity, i = hu(e.y, e.vy, s, e.drag, t);
    if (i < 0 || i > t - 0.08) {
      e.life = t, e.emit();
      return;
    }
    const r = e.x, o = e.z, a = e.vx, h = e.vy, l = e.vz, c = e.birth;
    e.life = i, e.emit(), e.x = Ba(i, r, a, 0, e.drag), e.z = Ba(i, o, l, 0, e.drag), e.y = 0.02, e.vx = Gd(i, a, 0, e.drag) * 0.45, e.vy = Math.abs(Gd(i, h, s, e.drag)) * 0.3, e.vz = Gd(i, l, 0, e.drag) * 0.45, e.birth = c + i, e.life = Math.min(0.4, t - i), e.emit();
  }
  _dissolve(t) {
    const e = this._kit, s = this._at, i = Math.min(Mt.reaper, t.value | 0), r = Kf[i] * (t.extra > 0 ? 1.6 : 1), o = mg[i], a = e.view.exposure, h = e.rng.seed(we.relicKill, Ds(t)), l = e.glows, c = e.debris;
    oc(e, t, s);
    const u = Math.round(t.time / Ie) === this._relicTick, d = u ? Math.hypot(s.x - this._relicX, s.z - this._relicZ) / lD : 0, f = (u ? this._relicTime : t.time) + d, p = ug + (1 - ug) * LI(oD, aD, Math.hypot(s.x - e.hero.x, s.z - e.hero.z));
    ft(l, J.glow).tint(16769184, 0.4), l.x = s.x, l.y = s.y, l.z = s.z + 0.1, l.birth = f, l.life = 0.36, l.size = r * 0.9 * p, l.sizeEnd = r * 1.8 * p, l.gravity = 0, l.emit();
    const _ = e.sparks;
    ft(_).tint(16771248, 1), _.x = s.x + h.signed() * 0.2, _.y = s.y, _.z = s.z, _.vx = h.signed() * 0.4, _.vy = h.range(2.5, 4.5), _.vz = h.signed() * 0.2, _.birth = f, _.life = h.range(0.6, 0.95), _.size = 0.07 * p, _.sizeEnd = 0.03, _.heat = 1.5, _.heatEnd = 0.8, _.gravity = -0.35, _.emit(), ft(l, J.ember).tint(16771232, 0.9), l.gravity = 0.4, l.flicker = 0.4;
    for (let m = 0; m < 2; m++) l.x = s.x + h.signed() * 0.3, l.y = s.y + h.signed() * r * 0.5, l.z = s.z, l.vx = h.signed() * 0.5, l.vy = h.range(1, 2.5), l.vz = h.signed() * 0.3, l.birth = f + h.range(0, 0.1), l.life = h.range(0.8, 1.3), l.size = h.range(0.12, 0.17) * p, l.sizeEnd = 0.04, l.emit();
    ft(c, J.shard), c.drag = 0.8;
    for (let m = 0; m < 2; m++) {
      const g = h.next() * Hr, y = h.range(1, 2.5);
      c.tint(Ni(o[m], 1.1, a), 1), c.x = s.x, c.y = s.y, c.z = s.z + 0.05, c.vx = Math.cos(g) * y, c.vy = h.range(2, 4), c.vz = Math.sin(g) * y * 0.6, c.birth = f, c.life = h.range(0.4, 0.6), c.size = h.range(0.07, 0.11), c.sizeEnd = c.size * 0.6, c.rotation = h.next() * 6, c.spin = h.signed() * 10, c.emit();
    }
  }
  _pickup(t) {
    if (this._tickSparkles >= _g || this._frameSparkles >= _g * el) return;
    this._tickSparkles++, this._frameSparkles++;
    const e = this._kit, s = t.value | 0, i = sl[s] ?? 16777215, r = e.rng.seed(we.pickup, Ds(t)), o = e.glows, a = e.hero.x, h = e.hero.z, l = s === mt.gemBig || s >= mt.chicken;
    ft(o, J.spark).tint(i, 1), o.x = a + r.signed() * 0.3, o.y = 0.8 + r.signed() * 0.35, o.z = h + 0.15, o.birth = t.time, o.life = 0.24, o.size = l ? 0.6 : 0.3, o.sizeEnd = l ? 1.4 : 0.7, o.rotation = r.next() * Hr, o.spin = 5, o.gravity = 0, o.emit(), ft(o, J.ember).tint(i, 0.9), o.gravity = 0.3;
    for (let c = 0; c < 2; c++) o.x = a + r.signed() * 0.25, o.y = 0.7 + r.signed() * 0.3, o.z = h, o.vx = r.signed() * 0.8, o.vy = r.range(0.8, 1.6), o.vz = r.signed() * 0.3, o.birth = t.time, o.life = r.range(0.4, 0.6), o.size = 0.1, o.sizeEnd = 0.03, o.emit();
    this._tickSparkles === 1 && e.pulses.add(t.time, a, h, 0.2, l ? 1.6 : 0.8, 0.25, i, 0.6);
  }
  _brazier(t) {
    const e = { x: t.x, y: t.y, z: t.z };
    const s = this._kit, i = s.rng.seed(we.brazier, Ds(t)), r = s.sparks;
    ft(r).tint(16756832, 1), r.drag = 1.2, r.heatEnd = 0.35;
    for (let o = 0; o < 30; o++) {
      const a = i.next() * Hr, h = i.range(2, 6);
      r.x = e.x, r.y = e.y + 1, r.z = e.z, r.vx = Math.cos(a) * h, r.vy = i.range(2, 7), r.vz = Math.sin(a) * h, r.birth = t.time, r.life = i.range(0.4, 0.9), r.size = i.range(0.04, 0.07), r.sizeEnd = 0.03, r.heat = i.range(1.3, 1.7), r.emit();
    }
    s.flashes.add(t.time, e.x, e.y + 1.2, e.z, 16752720, 30, 0.15, 7);
  }
}
const Vd = 6;
const il = 4;
const Wd = 0.12;
const yg = 0.36;
const xg = 1.85;
const Yd = 16;
const wg = 16742936;
const bg = 16762976;
const vg = 16774880;
class dD {
  _kit;
  _swings = new Float32Array(Vd * il);
  _point = { x: 0, y: 0, z: 0, nx: 0, ny: 0, nz: 0, tx: 0, tz: 0 };
  _cursor = 0;
  constructor(t) {
    this._kit = t, this.reset();
  }
  event(t) {
    if (t.kind !== "lashSwing") return;
    const e = this._cursor * il, s = t.dirX < 0 ? -1 : 1, i = t.value > 0 ? t.value : 3, r = t.extra > 0 ? t.extra : 0.8;
    this._swings[e] = t.time, this._swings[e + 1] = s, this._swings[e + 2] = i, this._swings[e + 3] = r, this._cursor = (this._cursor + 1) % Vd, this._sparks(t, s, i, r);
  }
  update(t) {
    const e = t.worldTime, s = this._swings;
    for (let i = 0; i < Vd * il; i += il) {
      const r = e - s[i];
      s[i + 2] <= 0 || r < 0 || r > yg || this._draw(r, s[i + 1], s[i + 2], s[i + 3]);
    }
  }
  reset() {
    this._swings.fill(0), this._cursor = 0;
  }
  _draw(t, e, s, i) {
    const r = this._kit, o = 1 - Math.pow(1 - Ye(t / Wd), 3), a = Ye((t - 0.035) / 0.27), h = a * a * (3 - 2 * a), l = o - h;
    if (l < 0.01) return;
    const c = 1 - Math.pow(Ye((t - 0.08) / (yg - 0.08)), 1.4), u = 0.7 + s * 0.1, d = 0.3, f = 0.7, p = 0.32, _ = r.hero.x, m = r.hero.z, g = this._point, y = r.beams;
    let x = 0, w = 0, b = 0, T = 0, v = 0, M = 0, k = 0;
    for (let A = 0; A <= Yd; A++) {
      const C = A / Yd, S = h + l * C, P = Math.pow(Math.sin(Math.PI * Math.pow(C, 1.6)), 0.7);
      nl(g, _, m, e, s, i, S);
      const z = u * P, D = g.x + g.nx * z * 0.32, F = g.y + g.ny * z * 0.32, E = g.z + g.nz * z * 0.32;
      if (A > 0) {
        const R = c * Math.pow(Math.sin(Math.PI * Math.pow((A - 1) / Yd, 1.6)), 0.7), N = c * P;
        y.segment(x, w, b, g.x, g.y, g.z, k * 2.2, z * 2.2, wg, p * R, wg, p * N), y.segment(x, w, b, g.x, g.y, g.z, k, z, bg, f * R, bg, f * N), y.segment(T, v, M, D, F, E, k * d, z * d, vg, R, vg, N);
      }
      x = g.x, w = g.y, b = g.z, T = D, v = F, M = E, k = z;
    }
    nl(g, _, m, e, s, i, o), r.lights.set(g.x, 1.1, g.z, 16760944, 16 * c, 5.5), r.ground.add(_ + e * s * 0.55, 0.05, m, s * 1.7, 16752704, 0.2 * c, 0, J.glow);
  }
  _sparks(t, e, s, i) {
    const r = this._kit, o = r.rng.seed(we.lash, Ds(t)), a = r.sparks, h = r.glows, l = this._point, c = t.x !== 0 || t.z !== 0 ? t.x : r.hero.x, u = t.x !== 0 || t.z !== 0 ? t.z : r.hero.z;
    ft(a).tint(16769704, 1), a.drag = 2.2, a.gravity = 0.7, a.heatEnd = 0.45;
    for (let d = 0; d < 26; d++) {
      const f = o.range(0.05, 0.95), p = o.range(4, 9.5), _ = o.range(1, 3);
      nl(l, c, u, e, s, i, f), a.x = l.x + l.nx * 0.15, a.y = l.y, a.z = l.z + l.nz * 0.15, a.vx = l.tx * p + l.nx * _, a.vy = o.range(0.5, 3), a.vz = l.tz * p + l.nz * _, a.birth = t.time + Wd * (1 - Math.cbrt(1 - f)), a.life = o.range(0.22, 0.45), a.size = o.range(0.045, 0.08), a.sizeEnd = a.size * 0.6, a.heat = o.range(1.4, 1.8), a.emit();
    }
    ft(h, J.spark).tint(16773328, 0.9), h.gravity = 0;
    for (let d = 0; d < 5; d++) {
      const f = 0.15 + d * 0.17 + o.range(-0.05, 0.05);
      nl(l, c, u, e, s, i, f), h.x = l.x + l.nx * 0.2, h.y = l.y, h.z = l.z + l.nz * 0.2, h.vx = l.tx * 1.5, h.vy = 0, h.vz = l.tz * 1.5, h.birth = t.time + Wd * (1 - Math.cbrt(1 - f)), h.life = 0.18, h.size = o.range(0.5, 0.75), h.sizeEnd = 0.08, h.rotation = o.next() * Math.PI, h.spin = 6, h.emit();
    }
  }
}
function nl(n18, t, e, s, i, r, o) {
  const a = xg - 2 * xg * o, h = i * 0.88, l = Math.max(0.6, r * 1.15), c = Math.cos(a), u = Math.sin(a);
  let d = s * c / h, f = -u / l;
  const p = Math.hypot(d, f) || 1;
  d /= p, f /= p, n18.x = t + s * i * 0.12 + s * h * c, n18.y = 0.85 + 0.25 * u, n18.z = e - l * u, n18.nx = d, n18.ny = 0, n18.nz = f;
  let _ = s * h * u, m = l * c;
  const g = Math.hypot(_, m) || 1;
  _ /= g, m /= g, n18.tx = _, n18.tz = m;
}
const rl = 16;
const Vr = 5;
const Xd = 0.34;
const Tg = 2.2;
const Ti = 14;
const fD = 3;
const $d = 5;
const pD = 13;
const qd = 9068799;
const Mg = 13152511;
const jd = 16777215;
const kg = 1.5;
const _D = 0.35;
class mD {
  _kit;
  _strikes = new Float32Array(rl * Vr);
  _path = new Float32Array(Ti * 3);
  _branch = new Float32Array($d * 3);
  _cursor = 0;
  _share = 1;
  constructor(t) {
    this._kit = t;
  }
  event(t) {
    if (t.kind !== "lightning") return;
    const e = this._cursor * Vr, s = t.value > 0 ? t.value : 1.6, i = Ds(t);
    this._strikes[e] = t.time, this._strikes[e + 1] = t.x, this._strikes[e + 2] = t.z, this._strikes[e + 3] = s, this._strikes[e + 4] = i & 16777215, this._cursor = (this._cursor + 1) % rl, this._burst(t, s, i);
    const r = this._kit.lens;
    r.flash(0.06, 14208255, 18), r.shake(0.16), this._kit.pulses.add(t.time, t.x, t.z, 0.3, s * 1.6, 0.36, 14205183, 1.1, 0.22), this._kit.pulses.add(t.time + 0.05, t.x, t.z, 0.2, s * 1.05, 0.5, 10121471, 0.6);
  }
  update(t) {
    const e = t.worldTime, s = this._strikes, i = Math.min(1, 0.35 + t.warp);
    let r = 0;
    for (let o = 0; o < rl * Vr; o += Vr) {
      const a = e - s[o];
      s[o + 3] > 0 && a >= 0 && a / i <= Xd && r++;
    }
    this._share = r > 1 ? 1 / Math.sqrt(r) : 1;
    for (let o = 0; o < rl * Vr; o += Vr) {
      const a = e - s[o];
      s[o + 3] <= 0 || a < 0 || a > Tg || this._draw(a, i, s[o + 1], s[o + 2], s[o + 3], s[o + 4]);
    }
  }
  reset() {
    this._strikes.fill(0), this._cursor = 0;
  }
  _draw(t, e, s, i, r, o) {
    const a = this._kit, h = a.view.exposure, l = 1 - Ye((t - 1.1) / (Tg - 1.1));
    a.decals.add(s, 0.04, i, r * 2.3, Ni(2628656, 0.5, h), 0.9 * l, o, J.scorch), a.ground.add(s, 0.05, i, r * 1.5, 16738864, 0.5 * Math.exp(-t / 0.45), 0, J.glow), a.ground.add(s, 0.05, i, r * 2.8, 10121471, 0.4 * Math.exp(-t / 0.2), 0, J.glow);
    const c = t / e;
    if (c > Xd) return;
    const u = c < 0.06 ? 1 : c < 0.1 ? 0.12 : c < 0.2 ? 0.95 : 0.7 * (1 - (c - 0.2) / (Xd - 0.2)), d = c < 0.1 ? 0 : 1, f = this._share, p = s - a.hero.x, _ = i - a.hero.z, m = p * p + _ * _ < kg * kg;
    this._bolt(s, i, o, d, u, m ? _D : 1), m || (a.sprites.add(s, 0.35, i, 0.7 * f, jd, 0.7 * u, 0, J.hotGlow), a.sprites.add(s, 0.8, i, 1.8, qd, 0.1 * u, 0, J.glow), a.lens.flare(s, 0.4, i, 13152511, 0.3 * u)), a.lights.set(s, 2.2, i, 13482239, 12 * u * f, 6), a.lens.lightning(0.15 * u * f * (m ? 0.5 : 1));
  }
  _bolt(t, e, s, i, r, o) {
    const h = this._kit.rng.seed(we.storm, s * 2 + i), l = this._path, c = t + h.signed() * 2.5, u = e - h.range(1.5, 3.5);
    let d = 0, f = 0;
    for (let m = 0; m < Ti; m++) {
      const g = m / (Ti - 1);
      l[m * 3] = c + (t - c) * g + d, l[m * 3 + 1] = pD * (1 - g), l[m * 3 + 2] = u + (e - u) * g + f, d += h.signed() * 0.75 * (1 - g * 0.6), f += h.signed() * 0.35;
    }
    const p = l[(Ti - 1) * 3] - t, _ = l[(Ti - 1) * 3 + 2] - e;
    for (let m = 0; m < Ti; m++) {
      const g = m / (Ti - 1);
      l[m * 3] -= p * g, l[m * 3 + 2] -= _ * g;
    }
    this._strip(l, Ti, 2.2 * o, 0.7 * o, 0.2 * o, r * o);
    for (let m = 0; m < fD; m++) this._fork(h, r * o, o);
  }
  _fork(t, e, s) {
    const i = this._path, r = this._branch, o = 3 + Math.floor(t.next() * (Ti - 7)), a = t.next() < 0.5 ? -1 : 1;
    let h = i[o * 3], l = i[o * 3 + 1], c = i[o * 3 + 2];
    for (let u = 0; u < $d; u++) r[u * 3] = h, r[u * 3 + 1] = l, r[u * 3 + 2] = c, h += a * t.range(0.4, 1.1), l -= t.range(0.5, 1.2), c += t.signed() * 0.4, l < 0.2 && (l = 0.2);
    this._strip(r, $d, 1.2 * s, 0.38 * s, 0.1 * s, e * 0.75);
  }
  _strip(t, e, s, i, r, o) {
    const a = this._kit.beams;
    for (let h = 1; h < e; h++) {
      const l = (h - 1) * 3, c = h * 3, u = e > 2 ? 1 - (h - 1) / (e - 1) * 0.35 : 1, d = e > 2 ? 1 - h / (e - 1) * 0.35 : 1, f = t[l], p = t[l + 1], _ = t[l + 2], m = t[c], g = t[c + 1], y = t[c + 2];
      a.segment(f, p, _, m, g, y, s * u, s * d, qd, 0.32 * o, qd, 0.32 * o), a.segment(f, p, _, m, g, y, i * u, i * d, Mg, 0.7 * o, Mg, 0.7 * o), a.segment(f, p, _, m, g, y, r, r, jd, o, jd, o);
    }
  }
  _burst(t, e, s) {
    const i = this._kit, r = i.rng.seed(we.storm, s * 2 + 7), o = i.sparks, a = i.debris, h = i.glows, l = t.x, c = t.z, u = i.view.exposure;
    ft(o).tint(14733567, 1), o.drag = 1.2, o.heatEnd = 0.55;
    for (let d = 0; d < 34; d++) {
      const f = r.next() * Math.PI * 2, p = r.range(3, 9) * (0.6 + e * 0.25);
      o.x = l, o.y = 0.15, o.z = c, o.vx = Math.cos(f) * p, o.vy = r.range(2, 7.5), o.vz = Math.sin(f) * p, o.birth = t.time - r.next() * r.next() * 0.03, o.life = r.range(0.35, 0.8), o.size = r.range(0.05, 0.09), o.sizeEnd = 0.03, o.heat = r.range(1.3, 1.8), o.emit();
    }
    ft(a, J.shard).tint(Ni(3813416, 0.9, u), 1), a.drag = 0.5;
    for (let d = 0; d < 12; d++) {
      const f = r.next() * Math.PI * 2, p = r.range(1.5, 4.5);
      a.x = l + Math.cos(f) * 0.2, a.y = 0.1, a.z = c + Math.sin(f) * 0.2, a.vx = Math.cos(f) * p, a.vy = r.range(3, 6.5), a.vz = Math.sin(f) * p, a.birth = t.time, a.life = r.range(0.55, 0.8), a.size = r.range(0.07, 0.13), a.sizeEnd = a.size, a.rotation = r.next() * 6, a.spin = r.signed() * 14, a.emit();
    }
    ft(h, J.ember).tint(13152511, 0.9), h.flicker = 0.8, h.drag = 1.5, h.gravity = 0.25;
    for (let d = 0; d < 14; d++) {
      const f = r.next() * Math.PI * 2, p = r.range(0.1, e);
      h.x = l + Math.cos(f) * p, h.y = r.range(0.1, 0.6), h.z = c + Math.sin(f) * p, h.vx = r.signed() * 0.6, h.vy = r.range(0.4, 1.4), h.vz = r.signed() * 0.6, h.birth = t.time + r.range(0, 0.15), h.life = r.range(0.7, 1.2), h.size = r.range(0.1, 0.16), h.sizeEnd = 0.03, h.emit();
    }
  }
}
const Bn = Math.PI * 2;
const gD = 1.15;
const Ag = 0.16;
const Kd = 9;
const Zd = 45;
const ol = 0.95;
const Cg = 3.4;
class yD {
  _kit;
  _frames;
  _artIndex;
  _lastAngle = 0;
  _lastTick = -1;
  _spin = Cg;
  constructor(t, e, s) {
    this._kit = t, this._frames = e, this._artIndex = s;
  }
  event(t) {
    t.kind === "tomesStart" && this._burst(t);
  }
  update(t, e) {
    const s = this._kit, i = s.sim.weapons.tomes;
    this._measure(i.angle, s.sim.tick);
    const r = i.active;
    if (r <= 0.01 || i.count <= 0) return;
    const o = t.worldTime, a = i.count, h = i.radius, l = i.angle - this._spin * (1 - t.alpha) * Ie, c = s.hero.x, u = s.hero.z, d = s.view.exposure, f = Ni(16767120, 0.9, d), p = this._frames;
    s.ground.add(c, 0.05, u, h * 2 / 0.86, 16762976, 0.22 * r, 0, J.ring), s.ground.add(c, 0.05, u, h * 2.6, 16756800, 0.07 * r, 0, J.halo), s.lights.set(c, 3.6, u, 16764016, 5 * r, h + 3.5);
    for (let _ = 0; _ < a; _++) {
      const m = l + _ * Bn / a, g = c + Math.cos(m) * h, y = u + Math.sin(m) * h, x = ol + 0.07 * Math.sin(o * 5 + _ * 1.7), w = Math.floor(o * p.fps + _) % p.count, b = Math.max(p.width, p.height) * (0.6 + 0.4 * r);
      this._ribbon(c, u, h, m, x, r), s.sprites.add(g, x - 0.1, y - 0.3, 1.3, 16760928, 0.26 * r, 0, J.glow), s.art.add(g, x, y - 0.02, b, f, Math.sin(o * 3 + _) * 0.25, s.art.frameOf(this._artIndex, w)), this._flames(_, a, c, u, h, l, r, e, o);
    }
  }
  reset() {
    this._lastAngle = 0, this._lastTick = -1, this._spin = Cg;
  }
  _measure(t, e) {
    if (e !== this._lastTick) {
      if (this._lastTick >= 0 && e > this._lastTick) {
        let s = t - this._lastAngle;
        s -= Math.round(s / Bn) * Bn;
        const i = s / ((e - this._lastTick) * Ie);
        Math.abs(i) > 0.1 && Math.abs(i) < 40 && (this._spin = i);
      }
      this._lastAngle = t, this._lastTick = e;
    }
  }
  _ribbon(t, e, s, i, r, o) {
    const a = this._kit.beams, h = this._spin >= 0 ? -1 : 1, l = i + h * Ag;
    let c = t + Math.cos(l) * s, u = e + Math.sin(l) * s;
    for (let d = 1; d <= Kd; d++) {
      const f = (d - 1) / Kd, p = d / Kd, _ = l + h * gD * p, m = t + Math.cos(_) * s, g = e + Math.sin(_) * s, y = (1 - f) * o, x = (1 - p) * o, w = f < 0.2 ? 16773312 : f < 0.55 ? 16752688 : 13647888, b = p < 0.2 ? 16773312 : p < 0.55 ? 16752688 : 13647888;
      a.segment(c, r, u, m, r, g, 0.9 * (1 - f) + 0.1, 0.9 * (1 - p) + 0.1, 16744480, 0.16 * y, 16736272, 0.16 * x), a.segment(c, r, u, m, r, g, 0.34 * (1 - f) + 0.04, 0.34 * (1 - p) + 0.04, w, 0.75 * y, b, 0.75 * x), c = m, u = g;
    }
  }
  _flames(t, e, s, i, r, o, a, h, l) {
    const c = this._kit, u = c.flames, d = Math.floor(h * Zd) + 1, f = Math.floor(l * Zd), p = this._spin >= 0 ? -1 : 1;
    for (let _ = d; _ <= f; _++) {
      const m = _ / Zd, g = c.rng.seed(we.tomesTrail, _ * 16 + t);
      if (g.next() > a) continue;
      const y = o - this._spin * (l - m) + t * Bn / e + p * Ag, x = -Math.sin(y) * p, w = Math.cos(y) * p;
      ft(u, J.puff).tint(16765072, 0.9), u.x = s + Math.cos(y) * r + g.signed() * 0.08, u.y = ol + g.signed() * 0.08, u.z = i + Math.sin(y) * r + g.signed() * 0.08, u.vx = x * 1.2 + g.signed() * 0.4, u.vy = g.range(0.3, 1), u.vz = w * 1.2 + g.signed() * 0.4, u.birth = m, u.life = g.range(0.28, 0.48), u.size = g.range(0.1, 0.16), u.sizeEnd = g.range(0.28, 0.4), u.heat = g.range(1.2, 1.5), u.heatEnd = 0.2, u.drag = 2, u.gravity = 0.3, u.rotation = g.next() * Bn, u.spin = g.signed() * 3, u.emit();
    }
  }
  _burst(t) {
    const e = this._kit, s = e.sim.weapons.tomes, i = Math.max(1, t.value || s.count), r = s.radius > 0 ? s.radius : 2, o = e.hero.x, a = e.hero.z, h = e.rng.seed(we.tomes, Ds(t)), l = e.sparks, c = e.glows;
    ft(l).tint(16770728, 1), l.drag = 2.5, l.gravity = 0.6, l.heatEnd = 0.5, ft(c, J.hotGlow);
    for (let u = 0; u < i; u++) {
      const d = s.angle + u * Bn / i, f = o + Math.cos(d) * r, p = a + Math.sin(d) * r;
      for (let _ = 0; _ < 10; _++) {
        const m = h.next() * Bn, g = h.range(2.5, 6);
        l.x = f, l.y = ol, l.z = p, l.vx = Math.cos(m) * g, l.vy = h.range(0, 4), l.vz = Math.sin(m) * g, l.birth = t.time, l.life = h.range(0.25, 0.45), l.size = h.range(0.04, 0.07), l.sizeEnd = 0.03, l.heat = h.range(1.3, 1.7), l.emit();
      }
      c.tint(16773320, 1), c.x = f, c.y = ol, c.z = p, c.birth = t.time, c.life = 0.22, c.size = 0.6, c.sizeEnd = 2, c.gravity = 0, c.emit();
    }
    e.pulses.add(t.time, o, a, 0.4, r * 1.3, 0.42, 16767120, 0.85), e.flashes.add(t.time, o, 3.2, a, 16765056, 14, 0.18, r + 5);
  }
}
const xD = 4;
const al = 60;
const Qd = 5;
const wD = 1.9;
const bD = fe.indexOf("wand");
const Sg = 15660799;
const Jd = 6990079;
const Pg = 2377983;
class vD {
  _kit;
  _at = { x: 0, y: 0, z: 0 };
  constructor(t) {
    this._kit = t;
  }
  event(t) {
    t.kind === "wandFire" ? this._muzzle(t) : t.kind === "hit" && t.extra === bD && this._impact(t);
  }
  update(t, e) {
    const s = this._kit, i = s.sim.projectiles, r = t.alpha, o = t.worldTime, a = o * 7;
    let h = 0;
    for (let l = 0; l < i.count; l++) {
      if (!i.active[l] || i.kind[l] !== Di.wandBolt) continue;
      const c = i.prevX[l] + (i.x[l] - i.prevX[l]) * r, u = i.prevY[l] + (i.y[l] - i.prevY[l]) * r, d = i.prevZ[l] + (i.z[l] - i.prevZ[l]) * r, f = i.vx[l], p = i.vy[l], _ = i.vz[l], m = Math.hypot(f, p, _) || 1, g = Math.max(0.35, Ye(Math.hypot(c - s.hero.x, d - s.hero.z) / 1.5));
      s.sprites.add(c, u, d, 1.35 * g, Jd, 0.42, 0, J.glow), s.sprites.add(c, u, d, 0.42 * g, Sg, 1, 0, J.hotGlow), s.sprites.add(c, u, d, 0.9 * g, 12114175, 0.45, a + l, J.spark), this._trail(c, u, d, f / m, p / m, _ / m, Math.min(wD, i.age[l] * m)), this._embers(l, c, u, d, f, p, _, i.age[l], e, o), h < xD && g >= 0.5 && (s.lights.set(c, u, d, 8368383, 6 * g * g, 4.5), h++);
    }
  }
  reset() {
  }
  _trail(t, e, s, i, r, o, a) {
    if (a < 0.05) return;
    const h = this._kit.beams;
    let l = t, c = e, u = s;
    for (let d = 1; d <= Qd; d++) {
      const f = (d - 1) / Qd, p = d / Qd, _ = t - i * a * p, m = e - r * a * p, g = s - o * a * p, y = 1 - f, x = 1 - p;
      h.segment(l, c, u, _, m, g, 0.75 * y + 0.08, 0.75 * x + 0.08, Pg, 0.3 * y, Pg, 0.3 * x), h.segment(l, c, u, _, m, g, 0.24 * y + 0.02, 0.24 * x + 0.02, f < 0.2 ? Sg : Jd, 0.9 * y * y, Jd, 0.9 * x * x), l = _, c = m, u = g;
    }
  }
  _embers(t, e, s, i, r, o, a, h, l, c) {
    const u = this._kit, d = u.glows, f = Math.max(Math.floor(l * al) + 1, Math.ceil((c - h) * al)), p = Math.floor(c * al);
    for (let _ = f; _ <= p; _++) {
      const m = _ / al, g = c - m, y = u.rng.seed(we.wandTrail, _ * 256 + t);
      ft(d, J.ember).tint(11062527, 0.85), d.x = e - r * g + y.signed() * 0.06, d.y = s - o * g + y.signed() * 0.06, d.z = i - a * g + y.signed() * 0.06, d.vx = y.signed() * 0.6 - r * 0.05, d.vy = y.signed() * 0.6, d.vz = y.signed() * 0.6 - a * 0.05, d.birth = m, d.life = y.range(0.25, 0.45), d.size = y.range(0.08, 0.13), d.sizeEnd = 0.02, d.gravity = 0.1, d.flicker = 0.4, d.emit();
    }
  }
  _muzzle(t) {
    const e = this._kit, s = e.sim.projectiles, i = t.subject, r = e.rng.seed(we.wand, Ds(t)), o = s.x[i], a = s.y[i], h = s.z[i], l = Math.hypot(s.vx[i], s.vy[i], s.vz[i]) || 1, c = s.vx[i] / l, u = s.vy[i] / l, d = s.vz[i] / l, f = e.glows, p = e.sparks;
    ft(f, J.hotGlow).tint(14215423, 1), f.x = o + c * 0.5, f.y = a + u * 0.5, f.z = h + d * 0.5, f.birth = t.time, f.life = 0.12, f.size = 0.25, f.sizeEnd = 0.6, f.gravity = 0, f.emit(), ft(p).tint(13164799, 1), p.drag = 3, p.gravity = 0.3, p.heatEnd = 0.6;
    for (let _ = 0; _ < 6; _++) {
      const m = r.range(4, 8);
      p.x = o, p.y = a, p.z = h, p.vx = c * m + r.signed() * 2, p.vy = u * m + r.signed() * 2, p.vz = d * m + r.signed() * 2, p.birth = t.time, p.life = r.range(0.12, 0.25), p.size = 0.05, p.sizeEnd = 0.03, p.heat = 1.6, p.emit();
    }
  }
  _impact(t) {
    const e = this._kit, s = e.rng.seed(we.wand, Ds(t) + 1);
    oc(e, t, this._at);
    const { x: i, y: r, z: o } = this._at, a = e.sparks, h = e.glows, l = Math.hypot(i - e.hero.x, o - e.hero.z), c = 0.35 + 0.65 * Ye(l / 1.5), u = Ye(l / 3);
    ft(a).tint(12639487, 1), a.drag = 2, a.gravity = 0.8, a.heatEnd = 0.5;
    for (let d = 0; d < 12; d++) {
      const f = s.next() * Math.PI * 2, p = s.range(3, 8);
      a.x = i, a.y = r, a.z = o + 0.05, a.vx = Math.cos(f) * p, a.vy = s.range(-1, 5), a.vz = Math.sin(f) * p * 0.6, a.birth = t.time - s.next() * s.next() * 0.03, a.life = s.range(0.18, 0.38), a.size = s.range(0.04, 0.07), a.sizeEnd = 0.03, a.heat = s.range(1.3, 1.7), a.emit();
    }
    ft(h, J.hotGlow).tint(14216447, 1), h.x = i, h.y = r, h.z = o + 0.1, h.birth = t.time, h.life = 0.16, h.size = 0.5 * c, h.sizeEnd = 1.5 * c, h.gravity = 0, h.emit(), ft(h, J.ring).tint(9091327, 0.7), h.x = i, h.y = r, h.z = o + 0.1, h.birth = t.time, h.life = 0.22, h.size = 0.3 * c, h.sizeEnd = 1.6 * c, h.gravity = 0, h.emit(), e.flashes.add(t.time, i, r + 0.3, o, 9091327, 9 * u * u, 0.1, 4.5);
  }
}
const TD = 0.86;
const zg = 0.93;
class MD {
  _kit;
  constructor(t) {
    this._kit = t;
  }
  event(t) {
    t.kind === "wardPulse" && this._pulse(t);
  }
  update(t) {
    const e = this._kit, s = e.sim.weapons.ward, i = s.radius;
    if (i <= 0) return;
    const r = s.pulse, o = t.worldTime, a = e.hero.x, h = e.hero.z, l = e.ground;
    l.add(a, 0.05, h, i * 2.5, 16758864, 0.03 + 0.06 * r, 0, J.halo), l.add(a, 0.06, h, i * 2 / TD, 16767120, 0.25 + 0.35 * r, 0, J.ring), l.add(a, 0.07, h, i * 2 * 0.97 / zg, 16767114, 0.2 + 0.25 * r, o * 0.3, J.rune), l.add(a, 0.07, h, i * 2 * 0.55 / zg, 16769184, 0.1 + 0.18 * r, -o * 0.55, J.rune), e.lights.set(a, 3.6, h, 16767120, 3 + 6 * r, i + 3);
  }
  reset() {
  }
  _pulse(t) {
    const e = this._kit, s = t.value > 0 ? t.value : e.sim.weapons.ward.radius;
    if (s <= 0) return;
    const i = e.hero.x, r = e.hero.z, o = e.rng.seed(we.ward, Ds(t)), a = e.debris, h = e.glows, l = e.view.exposure;
    e.pulses.add(t.time, i, r, s * 0.55, s * 1.18, 0.34, 16769184, 0.6, 0.12), ft(a, J.puff).tint(Ni(9080988, 0.8, l), 0.32), a.drag = 3, a.gravity = -0.01;
    for (let c = 0; c < 18; c++) {
      const u = c / 18 * Math.PI * 2 + o.signed() * 0.15, d = o.range(2.5, 4.5);
      a.x = i + Math.cos(u) * s, a.y = 0.15, a.z = r + Math.sin(u) * s, a.vx = Math.cos(u) * d, a.vy = o.range(0.1, 0.5), a.vz = Math.sin(u) * d, a.birth = t.time, a.life = o.range(0.5, 0.8), a.size = o.range(0.25, 0.4), a.sizeEnd = o.range(0.7, 1), a.rotation = o.next() * 6, a.spin = o.signed(), a.emit();
    }
    ft(h, J.ember).tint(16769184, 0.9), h.gravity = 0.3, h.flicker = 0.4;
    for (let c = 0; c < 12; c++) {
      const u = o.next() * Math.PI * 2;
      h.x = i + Math.cos(u) * s, h.y = 0.1, h.z = r + Math.sin(u) * s, h.vx = Math.cos(u) * 0.4, h.vy = o.range(0.8, 1.8), h.vz = Math.sin(u) * 0.4, h.birth = t.time, h.life = o.range(0.5, 0.9), h.size = o.range(0.1, 0.15), h.sizeEnd = 0.03, h.emit();
    }
  }
}
const kD = 1 / 40;
const AD = -3e3;
const CD = -2e3;
const SD = -1e3;
class PD {
  lights;
  _root = new ce({ label: "combat-fx" });
  _sim;
  _kit;
  _hero = { x: 0, z: 0 };
  _pools;
  _sprites;
  _effects;
  _impacts;
  _world = 0;
  _destroyed = false;
  constructor(t, e, s, i, atlas, particleBudget) {
    const r = this._root, o = atlas, a = o.frames, h = i.frames("tome"), l = i.frames("flask");
    this._sim = e, this.lights = new hI(r, Gv.fx);
    const c = new dn(r, { label: "combat-sparks", texture: o.hotGlow, capacity: particleBudget?.sparks ?? 3072, blendMode: "add", streak: true, gravity: [0, -14, 0], fadeOut: 3, streakFade: 0.35, nearFade: 1.5 }), u = new dn(r, { label: "combat-glows", texture: a, capacity: particleBudget?.glows ?? 4096, blendMode: "add", gravity: [0, 2.5, 0], fadeIn: 0.02, fadeOut: 1.6, nearFade: 1 }), d = new dn(r, { label: "combat-flames", texture: a, capacity: particleBudget?.flames ?? 2048, blendMode: "add", gravity: [0.2, 4, 0], growth: 3, fadeIn: 0.03, fadeOut: 1.4, nearFade: 0.9, cooling: 1.6 }), f = new dn(r, { label: "combat-debris", texture: a, capacity: particleBudget?.debris ?? 3072, blendMode: "normal", gravity: [0, -16, 0], fadeOut: 6, nearFade: 1 });
    f.container.position.y = CD, d.container.position.y = SD;
    const p = new Ud(r, "combat-decals", a, 96, "horizontal", "multiply");
    p.container.position.y = AD, this._kit = { view: t, sim: e, lens: s, lights: this.lights, rng: new yr(), firePoolsAtFullDensity: particleBudget?.firePoolsAtFullDensity, sparks: c, glows: u, flames: d, debris: f, beams: new FI(r, "combat-beams", o.beam, particleBudget?.beams ?? 2048), sprites: new Ud(r, "combat-sprites", a, particleBudget?.sprites ?? 1536, "spherical"), ground: new Ud(r, "combat-ground", a, particleBudget?.ground ?? 384, "horizontal"), decals: p, art: new II(r, [h, l], 64), pulses: new VI(), flashes: new RI(), hero: this._hero };
    const _ = this._kit;
    this._pools = [c, u, d, f], this._sprites = [_.sprites, _.ground, _.decals], this._impacts = new uD(_), this._effects = [new mD(_), new GI(_, l, 1), new dD(_), new vD(_), new yD(_, h, 0), new MD(_), this._impacts], t.root.addChild(r);
  }
  update(t) {
    const e = this._kit, s = this._sim.hero, i = t.restarted ? 0 : this._world, r = t.worldTime, o = this._effects, a = t.events;
    this._world = r, this._hero.x = s.prevX + (s.x - s.prevX) * t.alpha, this._hero.z = s.prevZ + (s.z - s.prevZ) * t.alpha, this._impacts.begin();
    for (let l = 0; l < a.count; l++) {
      const c = a.at(l);
      for (let u = 0; u < o.length; u++) o[u].event(c);
    }
    for (let l = 0; l < o.length; l++) o[l].update(t, i);
    e.pulses.update(e.ground, e.lens, r), e.flashes.update(e.lights, r);
    const h = kD * t.warp;
    for (let l = 0; l < this._pools.length; l++) this._pools[l].update(r, h, true);
    for (let l = 0; l < this._sprites.length; l++) this._sprites[l].flush(true, true);
    e.beams.flush(true, true), e.art.flush(true);
  }
  reset() {
    const t = this._kit;
    this._world = 0;
    for (let e = 0; e < this._pools.length; e++) this._pools[e].clear();
    for (let e = 0; e < this._sprites.length; e++) this._sprites[e].clear();
    for (let e = 0; e < this._effects.length; e++) this._effects[e].reset();
    t.beams.clear(), t.art.clear(), t.pulses.reset(), t.flashes.reset(), this.lights.flush(false);
  }
  destroy() {
    if (this._destroyed) return;
    const t = this._kit;
    this._destroyed = true;
    for (const e of this._pools) e.destroy();
    for (const e of this._sprites) e.destroy();
    t.beams.destroy(), t.art.destroy(), this.lights.destroy(), this._root.destroy(), gI();
  }
}
const hc = 4;
const lc = 8;
const f0 = 0.24;
const oR = { gpu: `
const LUMA = vec3<f32>(0.2126, 0.7152, 0.0722);
const BLUR_TAPS: i32 = 8;
const MAX_SPLIT: f32 = 0.008;

fn lensHash(p: vec2<f32>) -> f32 {
  var p3 = fract(vec3<f32>(p.x, p.y, p.x) * 0.1031);
  p3 = p3 + dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

fn ghost(s: vec2<f32>, at: vec2<f32>, radius: f32, aspect: f32) -> f32 {
  let d = length(vec2<f32>((s.x - at.x) * aspect, s.y - at.y));
  return (1.0 - smoothstep(radius * 0.7, radius, d)) * (0.45 + 0.55 * smoothstep(0.3 * radius, radius, d));
}

fn lensFlare(s: vec2<f32>, aspect: f32, a: vec4<f32>, b: vec4<f32>) -> vec3<f32> {
  if (a.w <= 0.0) { return vec3<f32>(0.0); }
  let size = b.w;
  let to = vec2<f32>((s.x - a.x) * aspect, s.y - a.y);
  let d = length(to);
  var light = b.rgb * (0.6 * exp(-d * 22.0 / size) + 0.15 * exp(-d * 6.0 / size));
  light = light + vec3<f32>(exp(-d * 90.0 / size));
  let halo = d / (0.13 * size) - 1.0;
  light = light + b.rgb * (0.05 * exp(-halo * halo * 60.0));
  let streakTint = mix(b.rgb, vec3<f32>(0.35, 0.55, 1.0), 0.6);
  let ax = abs(to.x);
  let ay = abs(to.y);
  light = light + streakTint * (0.45 * exp(-ay * 260.0 / size - ax * 3.2 / size) + 0.1 * exp(-ay * 700.0 / size - ax * 1.6 / size));
  let axis = vec2<f32>(0.5) - a.xy;
  light = light + mix(b.rgb, vec3<f32>(1.0, 0.55, 0.25), 0.5) * (0.16 * ghost(s, a.xy + axis * 0.62, 0.022, aspect));
  light = light + mix(b.rgb, vec3<f32>(0.3, 0.9, 1.0), 0.6) * (0.1 * ghost(s, a.xy + axis * 1.38, 0.055, aspect));
  light = light + mix(b.rgb, vec3<f32>(0.7, 0.4, 1.0), 0.5) * (0.07 * ghost(s, a.xy + axis * 2.05, 0.1, aspect));
  return light * a.w;
}

fn effect(uv: vec2<f32>) -> vec4<f32> {
  let s = uv;
  let aspect = fx.uFx.z;
  let squash = fx.uGrain.w;
  var warp = vec2<f32>(0.0);
  var ringSplit = vec2<f32>(0.0);
  var glint = 0.0;

  for (var i = 0; i < 4; i = i + 1) {
    let k = fx.uShock[i];
    if (k.w > 0.001) {
      let to = vec2<f32>((s.x - k.x) * aspect, (s.y - k.y) / squash);
      let d = length(to);
      let width = 0.025 + k.z * 0.12;
      let x = (d - k.z) / width;
      if (abs(x) < 3.0) {
        let wave = x * exp(-x * x * 1.5) * k.w;
        let dir = to / max(d, 1e-4);
        let screenDir = vec2<f32>(dir.x / aspect, dir.y * squash);
        warp = warp + screenDir * (wave * width);
        ringSplit = ringSplit + screenDir * (abs(wave) * 0.012);
        glint = glint + exp(-x * x * 7.0) * k.w;
      }
    }
  }

  let ws = s + warp;
  let zdir = ws - fx.uZoom.xy;
  let zdist = length(vec2<f32>(zdir.x * aspect, zdir.y));
  let streak = fx.uZoom.z * smoothstep(fx.uZoom.w, fx.uZoom.w + 0.45, zdist);
  let cdir = ws - vec2<f32>(0.5);
  let cdist = length(vec2<f32>(cdir.x * aspect, cdir.y));
  var split = cdir * (fx.uFx.x * smoothstep(0.12, 0.85, cdist)) + ringSplit;
  let splitLength = length(vec2<f32>(split.x * aspect, split.y));
  let splitCap = max(MAX_SPLIT, fx.uFx.x * 0.6);
  if (splitLength > splitCap) { split = split * (splitCap / splitLength); }

  var col: vec3<f32>;
  if (streak > 0.002) {
    // Each tap also slides from the red end of the split to the blue end and counts toward that hue, so the
    // colour fringes smear with the streak instead of cutting sharp across it.
    let jitter = lensHash(uv / texel());
    var sum = vec3<f32>(0.0);
    var weight = vec3<f32>(0.0);
    for (var i = 0; i < BLUR_TAPS; i = i + 1) {
      let t = (f32(i) + jitter) / f32(BLUR_TAPS);
      let hue = fract((f32(i) * 3.0 + jitter) / f32(BLUR_TAPS));
      let c = sampleColor(ws - zdir * (streak * t) + split * (1.0 - 2.0 * hue)).rgb;
      let w = vec3<f32>(1.0 - hue, 1.0 - abs(2.0 * hue - 1.0), hue);
      sum = sum + c * w;
      weight = weight + w;
    }
    col = sum / max(weight, vec3<f32>(1e-4));
  } else if (dot(split, split) > 1e-10) {
    col = vec3<f32>(sampleColor(ws + split).r, sampleColor(ws).g, sampleColor(ws - split).b);
  } else {
    col = sampleColor(ws).rgb;
  }

  var rgb = col + vec3<f32>(1.0, 0.92, 0.8) * (glint * 0.24);
  for (var i = 0; i < 4; i = i + 1) {
    rgb = rgb + lensFlare(s, aspect, fx.uFlareA0[i], fx.uFlareB0[i]);
    rgb = rgb + lensFlare(s, aspect, fx.uFlareA1[i], fx.uFlareB1[i]);
  }

  rgb = rgb * fx.uTint.rgb;
  let luma = dot(rgb, LUMA);
  rgb = mix(vec3<f32>(luma), rgb, fx.uGrade.y);
  let pivot = fx.uGrain.y;
  rgb = (rgb - vec3<f32>(pivot)) * fx.uGrade.x + vec3<f32>(pivot);
  let shadows = 1.0 - smoothstep(0.0, 0.5, luma);
  let highlights = smoothstep(0.45, 1.0, luma);
  rgb = rgb + fx.uGrade.w * shadows + fx.uGrade.z * (fx.uShadowTone.rgb * shadows + fx.uHighlightTone.rgb * highlights);

  let vd = (s - vec2<f32>(0.5)) * 2.0;
  rgb = rgb * (1.0 - fx.uFx.y * smoothstep(0.12, 1.1, dot(vd, vd) * 0.5));

  let frame = floor(fx.uGrain.x * 24.0);
  let n = lensHash(uv / texel() + vec2<f32>(frame * 37.0, frame * 17.0)) - 0.5;
  rgb = rgb + vec3<f32>(n * fx.uFx.w * (2.4 - 1.4 * clamp(luma, 0.0, 1.0)));

  rgb = mix(max(rgb, vec3<f32>(0.0)), fx.uFlash.rgb, fx.uFlash.a);
  return vec4<f32>(rgb, 1.0);
}
`, gl: `
const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
const int BLUR_TAPS = 8;
const float MAX_SPLIT = 0.008;

vec4 tap(vec2 p) {
  return sampleColor(vec2(p.x, 1.0 - p.y));
}

float lensHash(vec2 p) {
  vec3 p3 = fract(vec3(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float ghost(vec2 s, vec2 at, float radius, float aspect) {
  float d = length(vec2((s.x - at.x) * aspect, s.y - at.y));
  return (1.0 - smoothstep(radius * 0.7, radius, d)) * (0.45 + 0.55 * smoothstep(0.3 * radius, radius, d));
}

vec3 lensFlare(vec2 s, float aspect, vec4 a, vec4 b) {
  if (a.w <= 0.0) return vec3(0.0);
  float size = b.w;
  vec2 to = vec2((s.x - a.x) * aspect, s.y - a.y);
  float d = length(to);
  vec3 light = b.rgb * (0.6 * exp(-d * 22.0 / size) + 0.15 * exp(-d * 6.0 / size));
  light += vec3(exp(-d * 90.0 / size));
  float halo = d / (0.13 * size) - 1.0;
  light += b.rgb * (0.05 * exp(-halo * halo * 60.0));
  vec3 streakTint = mix(b.rgb, vec3(0.35, 0.55, 1.0), 0.6);
  float ax = abs(to.x);
  float ay = abs(to.y);
  light += streakTint * (0.45 * exp(-ay * 260.0 / size - ax * 3.2 / size) + 0.1 * exp(-ay * 700.0 / size - ax * 1.6 / size));
  vec2 axis = vec2(0.5) - a.xy;
  light += mix(b.rgb, vec3(1.0, 0.55, 0.25), 0.5) * (0.16 * ghost(s, a.xy + axis * 0.62, 0.022, aspect));
  light += mix(b.rgb, vec3(0.3, 0.9, 1.0), 0.6) * (0.1 * ghost(s, a.xy + axis * 1.38, 0.055, aspect));
  light += mix(b.rgb, vec3(0.7, 0.4, 1.0), 0.5) * (0.07 * ghost(s, a.xy + axis * 2.05, 0.1, aspect));
  return light * a.w;
}

vec4 effect(vec2 uv) {
  vec2 s = vec2(uv.x, 1.0 - uv.y);
  float aspect = uFx.z;
  float squash = uGrain.w;
  vec2 warp = vec2(0.0);
  vec2 ringSplit = vec2(0.0);
  float glint = 0.0;

  for (int i = 0; i < 4; i++) {
    vec4 k = uShock[i];
    if (k.w > 0.001) {
      vec2 to = vec2((s.x - k.x) * aspect, (s.y - k.y) / squash);
      float d = length(to);
      float width = 0.025 + k.z * 0.12;
      float x = (d - k.z) / width;
      if (abs(x) < 3.0) {
        float wave = x * exp(-x * x * 1.5) * k.w;
        vec2 dir = to / max(d, 1e-4);
        vec2 screenDir = vec2(dir.x / aspect, dir.y * squash);
        warp += screenDir * (wave * width);
        ringSplit += screenDir * (abs(wave) * 0.012);
        glint += exp(-x * x * 7.0) * k.w;
      }
    }
  }

  vec2 ws = s + warp;
  vec2 zdir = ws - uZoom.xy;
  float zdist = length(vec2(zdir.x * aspect, zdir.y));
  float streak = uZoom.z * smoothstep(uZoom.w, uZoom.w + 0.45, zdist);
  vec2 cdir = ws - vec2(0.5);
  float cdist = length(vec2(cdir.x * aspect, cdir.y));
  vec2 split = cdir * (uFx.x * smoothstep(0.12, 0.85, cdist)) + ringSplit;
  float splitLength = length(vec2(split.x * aspect, split.y));
  float splitCap = max(MAX_SPLIT, uFx.x * 0.6);
  if (splitLength > splitCap) split *= splitCap / splitLength;

  vec3 col;
  if (streak > 0.002) {
    float jitter = lensHash(uv / texel());
    vec3 sum = vec3(0.0);
    vec3 weight = vec3(0.0);
    for (int i = 0; i < BLUR_TAPS; i++) {
      float t = (float(i) + jitter) / float(BLUR_TAPS);
      float hue = fract((float(i) * 3.0 + jitter) / float(BLUR_TAPS));
      vec3 c = tap(ws - zdir * (streak * t) + split * (1.0 - 2.0 * hue)).rgb;
      vec3 w = vec3(1.0 - hue, 1.0 - abs(2.0 * hue - 1.0), hue);
      sum += c * w;
      weight += w;
    }
    col = sum / max(weight, vec3(1e-4));
  } else if (dot(split, split) > 1e-10) {
    col = vec3(tap(ws + split).r, tap(ws).g, tap(ws - split).b);
  } else {
    col = tap(ws).rgb;
  }

  vec3 rgb = col + vec3(1.0, 0.92, 0.8) * (glint * 0.24);
  for (int i = 0; i < 4; i++) {
    rgb += lensFlare(s, aspect, uFlareA0[i], uFlareB0[i]);
    rgb += lensFlare(s, aspect, uFlareA1[i], uFlareB1[i]);
  }

  rgb *= uTint.rgb;
  float luma = dot(rgb, LUMA);
  rgb = mix(vec3(luma), rgb, uGrade.y);
  float pivot = uGrain.y;
  rgb = (rgb - pivot) * uGrade.x + pivot;
  float shadows = 1.0 - smoothstep(0.0, 0.5, luma);
  float highlights = smoothstep(0.45, 1.0, luma);
  rgb += uGrade.w * shadows + uGrade.z * (uShadowTone.rgb * shadows + uHighlightTone.rgb * highlights);

  vec2 vd = (s - 0.5) * 2.0;
  rgb *= 1.0 - uFx.y * smoothstep(0.12, 1.1, dot(vd, vd) * 0.5);

  float frame = floor(uGrain.x * 24.0);
  float n = lensHash(uv / texel() + vec2(frame * 37.0, frame * 17.0)) - 0.5;
  rgb += vec3(n * uFx.w * (2.4 - 1.4 * clamp(luma, 0.0, 1.0)));

  rgb = mix(max(rgb, vec3(0.0)), uFlash.rgb, uFlash.a);
  return vec4(rgb, 1.0);
}
` };
class aR extends eu {
  uniforms = new gn({ uFx: { value: new Float32Array([0, 0, 1, 0]), type: "vec4<f32>" }, uZoom: { value: new Float32Array([0.5, 0.5, 0, 0.12]), type: "vec4<f32>" }, uGrade: { value: new Float32Array([1, 1, 0, 0]), type: "vec4<f32>" }, uGrain: { value: new Float32Array([0, 0.28, 0, 1]), type: "vec4<f32>" }, uTint: { value: new Float32Array([1, 1, 1, 0]), type: "vec4<f32>" }, uShadowTone: { value: new Float32Array(4), type: "vec4<f32>" }, uHighlightTone: { value: new Float32Array(4), type: "vec4<f32>" }, uFlash: { value: new Float32Array(4), type: "vec4<f32>" }, uShock: { value: new Float32Array(16), type: "mat4x4<f32>" }, uFlareA0: { value: new Float32Array(16), type: "mat4x4<f32>" }, uFlareA1: { value: new Float32Array(16), type: "mat4x4<f32>" }, uFlareB0: { value: new Float32Array(16), type: "mat4x4<f32>" }, uFlareB1: { value: new Float32Array(16), type: "mat4x4<f32>" } });
  fragment = oR;
  setLens(t, e, s, i) {
    Ji(this._u("uFx"), 0, t, e, s, i), this.uniforms.update();
  }
  setGrade(t, e, s, i, r, o, a) {
    Ji(this._u("uGrade"), 0, t, e, s, i), Ji(this._u("uTint"), 0, cc(r), uc(r), dc(r), 0), Ty(this._u("uShadowTone"), o), Ty(this._u("uHighlightTone"), a), this.uniforms.update();
  }
  setGrain(t, e) {
    const s = this._u("uGrain");
    s[0] = t % 1e3, s[3] = e, this.uniforms.update();
  }
  setFlash(t, e) {
    Ji(this._u("uFlash"), 0, cc(t), uc(t), dc(t), e), this.uniforms.update();
  }
  setZoom(t, e, s, i) {
    Ji(this._u("uZoom"), 0, t, e, s, i), this.uniforms.update();
  }
  setShock(t, e, s, i, r) {
    Ji(this._u("uShock"), t * 4, e, s, i, r), this.uniforms.update();
  }
  setFlare(t, e, s, i, r, o) {
    const a = (t & 3) * 4;
    Ji(this._u(t < 4 ? "uFlareA0" : "uFlareA1"), a, e, s, 0, i), Ji(this._u(t < 4 ? "uFlareB0" : "uFlareB1"), a, cc(r), uc(r), dc(r), o), this.uniforms.update();
  }
  _u(t) {
    return this.uniforms.uniforms[t];
  }
}
function Ji(n18, t, e, s, i, r) {
  n18[t] = e, n18[t + 1] = s, n18[t + 2] = i, n18[t + 3] = r;
}
function cc(n18) {
  return (n18 >> 16 & 255) / 255;
}
function uc(n18) {
  return (n18 >> 8 & 255) / 255;
}
function dc(n18) {
  return (n18 & 255) / 255;
}
function Ty(n18, t) {
  const e = cc(t), s = uc(t), i = dc(t), r = e * 0.2126 + s * 0.7152 + i * 0.0722;
  n18[0] = (e - r) * f0, n18[1] = (s - r) * f0, n18[2] = (i - r) * f0;
}
const hR = 1.3;
const _l = 5;
const ml = 5;
class lR {
  shocks = new Float32Array(hc * _l);
  shockCount = 0;
  flares = new Float64Array(lc * ml);
  flareCount = 0;
  zoom = 0;
  zoomAt = { x: 0, y: 0, z: 0 };
  extraAberration = 0;
  strike = 0;
  trauma = 0;
  flashPeak = 0;
  flashColor = 16777215;
  flashDecay = 6;
  flashTime = 0;
  now = 0;
  shakeGain = 1;
  _flashPending = false;
  _pendingTrauma = 0;
  flash(t, e = 16777215, s = 6) {
    const i = this._flashPending ? this.flashPeak : this.flashAt(this.now);
    t > i && (this.flashPeak = Math.min(1, t), this.flashColor = e, this.flashDecay = s, this._flashPending = true);
  }
  shockwave(t, e, s, i, r) {
    if (!(r > 0)) return;
    const o = this.shocks;
    let a = this.shockCount;
    if (a === hc) {
      if (a = My(o, hc, _l, 4), o[a * _l + 4] >= r) return;
    } else this.shockCount++;
    const h = a * _l;
    o[h] = t, o[h + 1] = e, o[h + 2] = s, o[h + 3] = i, o[h + 4] = r;
  }
  shake(t) {
    t > 0 && (this._pendingTrauma += t * this.shakeGain);
  }
  zoomBlur(t, e, s, i) {
    t > this.zoom && (this.zoom = Math.min(1, t), this.zoomAt.x = e, this.zoomAt.y = s, this.zoomAt.z = i);
  }
  aberration(t) {
    t > this.extraAberration && (this.extraAberration = Math.min(1, t));
  }
  flare(t, e, s, i, r) {
    if (!(r > 0)) return;
    const o = this.flares;
    let a = this.flareCount;
    if (a === lc) {
      if (a = My(o, lc, ml, 4), o[a * ml + 4] >= r) return;
    } else this.flareCount++;
    const h = a * ml;
    o[h] = t, o[h + 1] = e, o[h + 2] = s, o[h + 3] = i, o[h + 4] = r;
  }
  lightning(t) {
    t > this.strike && (this.strike = Math.min(1, t));
  }
  flashAt(t) {
    return this.flashPeak <= 0 ? 0 : this.flashPeak * Math.exp(-this.flashDecay * Math.max(0, t - this.flashTime));
  }
  advance(t, e) {
    this._flashPending && (this.flashTime = t, this._flashPending = false), this.trauma = Math.min(1, Math.max(0, this.trauma - hR * e) + this._pendingTrauma), this._pendingTrauma = 0, this.now = t;
  }
  endFrame() {
    this.shockCount = 0, this.flareCount = 0, this.zoom = 0, this.extraAberration = 0, this.strike = 0;
  }
  reset() {
    this.endFrame(), this.trauma = 0, this.flashPeak = 0, this.flashTime = 0, this.now = 0, this._flashPending = false, this._pendingTrauma = 0;
  }
}
function My(n18, t, e, s) {
  let i = 0;
  for (let r = 1; r < t; r++) n18[r * e + s] < n18[i * e + s] && (i = r);
  return i;
}
function g0(n18, t) {
  return Math.sin(n18 * 37.1 + t * 1.7) * 0.5 + Math.sin(n18 * 61.7 + t * 4.1) * 0.3 + Math.sin(n18 * 97.3 + t * 2.3) * 0.2;
}
export { PD as ReferenceCombat, aR as ReferenceLensPass, lR as ReferenceLensState, g0 as lensNoise }
