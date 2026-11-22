precision highp float;
precision highp int;
uniform float uPeriod;
uniform int uMonochrome;
uniform sampler2D uProfile;
uniform float uOpacity;
uniform float uSpread,uPhase;
in float vBirth;
in vec2 vRadial;
in float vEnergy;
out vec4 fragColor;
uniform int uGapEnabled;
uniform float uGapWidth;
bool missingSource(float birth){
    float d=abs(birth-uPhase);d=min(d,uPeriod-d);
    return uGapEnabled!=0&&birth>=0.&&d<uGapWidth*.5;
}

void main() {
    if((uGapEnabled==0&&(uPhase<vBirth || (uPhase<=vBirth && vBirth<uPeriod)))||missingSource(vBirth))discard;
    float r=length(vRadial);
    if(r>=1.0) discard;
    vec3 profile=texture(uProfile,vec2(r,0.5)).rgb;
    if(uMonochrome!=0)profile=vec3(dot(profile,vec3(.2126,.7152,.0722)));
    vec3 energy=max(profile*vEnergy*uOpacity*smoothstep(0.0,4.0,uSpread),vec3(0.0));
    // Keep Screen inputs in [0,1). The exponential preserves total energy when
    // a trail is split into more samples: multiplying transmittances adds energy.
    vec3 light=vec3(1.0)-exp(-energy);
    fragColor=vec4(light,1.0);
}
