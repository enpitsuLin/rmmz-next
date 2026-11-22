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
