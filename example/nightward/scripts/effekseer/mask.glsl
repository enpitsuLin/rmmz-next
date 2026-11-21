
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

float heat = customData1.x;
float3 fire = clamp(float3(heat * 2.5, (heat - 0.32) * 1.5, (heat - 0.72) * 3.6), 0.0, 1.0);
vcolor = float4(pow(vcolor.rgb * fire, float3(2.2)), vcolor.a * customData1.y);

#else
float2 atlasUv = atlasFrame.xy + uv2 * atlasFrame.zw;
float4 texel = $TEX_P0$atlasUv$TEX_S0$;
emissive = pow(texel.rgb / max(texel.a, 0.001), float3(2.2)) * vcolor.rgb * nightwardGlobals.x;
opacity = texel.a * vcolor.a;
opacityMask = opacity - 0.5; opacity = 1.0;
float fogDepth = v_PosP.w;
float fogD = nightwardFog.w * customData1.z * fogDepth;
float fogFactor = 1.0 - exp(-fogD * fogD);
emissive = mix(emissive, nightwardFog.rgb, fogFactor);


#endif
