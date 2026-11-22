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
