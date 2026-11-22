precision highp float;
precision highp int;
uniform float uPeriod;
in vec2 vLocal;
in vec3 vShape;
in float vFade;
in vec2 vTime;
uniform float uPhase;
uniform int uPoint;
uniform float uWhiteBrightness;
uniform int uTintEnabled;uniform vec3 uSourceColor;
vec3 sourceColor(){return uTintEnabled!=0?uSourceColor:vec3(1.);}
out vec4 fragColor;
uniform int uGapEnabled;
uniform float uGapWidth;
bool missingSource(float birth){
    float d=abs(birth-uPhase);d=min(d,uPeriod-d);
    return uGapEnabled!=0&&birth>=0.&&d<uGapWidth*.5;
}


// GLSL 150 has no erf(). This approximation is accurate to about 1.5e-7.
float erfFast(float x) {
    float a = abs(x);
    float t = 1.0 / (1.0 + 0.3275911 * a);
    float p = (((((1.061405429 * t - 1.453152027) * t
                + 1.421413741) * t - 0.284496736) * t
                + 0.254829592) * t);
    return sign(x) * (1.0 - p * exp(-a * a));
}

float lineWeight(float x, float segmentLength, float sigma) {
    float invSigma = 0.70710678118 / sigma;
    return max(0.0, 0.5 * (erfFast(x * invSigma)
                         - erfFast((x - segmentLength) * invSigma)));
}

float visibleLineWeight(float x,float len,float sigma){
    float weight=lineWeight(x,len,sigma);
    if(uGapEnabled!=0&&vTime.x>=0.)for(int k=-1;k<=1;++k){
        float begin=uPhase+float(k)*uPeriod-uGapWidth*.5,end=begin+uGapWidth;
        float t0=clamp((begin-vTime.x)/max(vTime.y-vTime.x,.000001),0.,1.);
        float t1=clamp((end-vTime.x)/max(vTime.y-vTime.x,.000001),0.,1.);
        if(t1>t0)weight-=lineWeight(x-len*t0,len*(t1-t0),sigma);
    }
    return max(0.,weight);
}
void main() {
    if(uGapEnabled==0&&(uPhase<vTime.x || (uPoint==0 && uPhase<=vTime.x))) discard;
    if(uPoint==1&&missingSource(vTime.x))discard;
    float scale = max(vShape.z, 0.0001);
    float radius = max(vShape.y, 0.0);
    if (uPoint == 1) {
        // Preserve the existing brightness and shape of the planet points.
        float d = length(vLocal);
        float aa = max(fwidth(d) * 1.5, 0.75);
        float core = 1.0 - smoothstep(max(0.0, radius - aa * 0.5),
                                     radius + aa * 0.5, d);
        core *= min(1.0, 2.0 * radius / aa);
        float worldDistance = d / scale;
        float glow = .85 * exp(-worldDistance * worldDistance / 24.5)
                   + .18 * exp(-worldDistance * worldDistance / 98.0);
        glow *= 1.0 - smoothstep(10., 14., worldDistance);
        float hot = .85 * exp(-.5 * worldDistance * worldDistance / (1.25*1.25));
        float halo = glow * (.30*(1.-exp(-1.03*uWhiteBrightness/.30))/1.03);
        fragColor = vec4(sourceColor()*((core * uWhiteBrightness + hot * uWhiteBrightness + halo) * vFade), 1.0);
        return;
    }

    // Integrate each Gaussian along the finite segment. Adjacent collinear
    // segments sum to one continuous light, even when subdivided very finely.
    // A zero-length segment contributes no energy, avoiding bright cap piles.
    float visible=uGapEnabled!=0?1.:clamp((uPhase-vTime.x)/max(vTime.y-vTime.x,0.000001),0.0,1.0);
    float segmentLength = max(vShape.x, 0.0)*visible;
    float pixelSize = max(length(dFdx(vLocal)), length(dFdy(vLocal)));
    // Convolve the intrinsic core with the pixel footprint, avoiding subpixel
    // brightness teeth without widening the world-space glow.
    float coreSigma = max(length(vec2(radius * 0.8, pixelSize * 0.65)), 0.0001);
    float coreCoverage = min(1.0, 2.0 * radius / (2.506628275 * coreSigma));
    float coreDistance = vLocal.y / coreSigma;
    float core = coreCoverage * exp(-0.5 * coreDistance * coreDistance)
               * visibleLineWeight(vLocal.x, segmentLength, coreSigma);

    float glowSigma = 3.5 * scale;
    float glowDistance = vLocal.y / glowSigma;
    float glow = .85 * exp(-0.5 * glowDistance * glowDistance)
               * visibleLineWeight(vLocal.x, segmentLength, glowSigma);
    float auraSigma=8.*scale,auraDistance=vLocal.y/auraSigma;
    glow += .18*exp(-.5*auraDistance*auraDistance)*visibleLineWeight(vLocal.x,segmentLength,auraSigma);
    vec2 capOffset = vec2(vLocal.x - clamp(vLocal.x, 0.0, segmentLength), vLocal.y);
    float capDistance = length(capOffset) / scale;
    glow *= 1.0 - smoothstep(22., 28., capDistance);

    // Separate the narrow bright tube from the restored wide halo. The soft
    // exposure shoulder keeps the halo from clipping into a thick white band
    // at brightness 3; its spatial width is independent of the tube width.
    float hotSigma=1.25*scale,hotDistance=vLocal.y/hotSigma;
    float hot=.85*exp(-.5*hotDistance*hotDistance)*visibleLineWeight(vLocal.x,segmentLength,hotSigma);
    // Tone compression must follow segment integration: use a constant gain
    // derived from an infinite unit-density line, so subdivision does not
    // accumulate nonlinear halos once per tiny segment.
    float haloGain=.30*(1.-exp(-1.03*uWhiteBrightness/.30))/1.03;
    fragColor=vec4(sourceColor()*((core*uWhiteBrightness+hot*uWhiteBrightness+glow*haloGain)*vFade),1.);

}
