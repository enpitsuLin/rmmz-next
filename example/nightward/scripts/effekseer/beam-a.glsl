
float3 worldPositionOffset = float3(0.0, 0.0, 0.0);
float3 baseColor = float3(0.0, 0.0, 0.0);
float metallic = 0.0;
float roughness = 1.0;
float ambientOcclusion = 1.0;
float3 normalDir = float3(0.0, 0.0, 1.0);
float refraction = 0.0;
float3 emissive = float3(0.0, 0.0, 0.0);
float opacity = 1.0;
float opacityMask = 1.0;

#ifndef FRAGCOLOR

float3 other = mod(floor(customData1.x / float3(65536.0, 256.0, 1.0)), 256.0) / 255.0;
vcolor = mix(float4(pow(vcolor.rgb, float3(2.2)), vcolor.a), float4(pow(other, float3(2.2)), customData1.y), uv2.y);

#else
float2 atlasUv = atlasFrame.xy + float2(uv2.x + 1.0 - uv2.y, 0.5) * atlasFrame.zw;
float4 texel = $TEX_P0$atlasUv$TEX_S0$;
emissive = pow(texel.rgb / max(texel.a, 0.001), float3(2.2)) * vcolor.rgb * nightwardGlobals.x;
opacity = texel.a * vcolor.a;

float fogDepth = v_PosP.w;
float fogD = nightwardFog.w * customData1.z * fogDepth;
float fogFactor = 1.0 - exp(-fogD * fogD);
emissive = mix(emissive, nightwardFog.rgb, fogFactor);

float pulledDepth = max(fogDepth - nightwardGlobals.w, 0.0001); float nearPlane = nightwardGlobals.y; float farPlane = nightwardGlobals.z; gl_FragDepth = 0.5 + 0.5 * ((farPlane + nearPlane) / (farPlane - nearPlane) - 2.0 * farPlane * nearPlane / ((farPlane - nearPlane) * pulledDepth));
#endif
