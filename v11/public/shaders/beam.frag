precision highp float;
precision highp int;
uniform float uPeriod;
uniform int uMonochrome;
uniform float uPhase,uOpacity,uSpread,uSoftness;
in vec2 vBeam;
in float vEnergy,vBirth;
in float vVisibility;
flat in int vClipIndex;
uniform sampler2D uClipTable,uClipLimits;
uniform int uUseClipLimits;
uniform int uClipEnabled,uClipWidth,uAreaMode;
out vec4 fragColor;
uniform int uGapEnabled;
uniform float uGapWidth;
bool missingSource(float birth){
    float d=abs(birth-uPhase);d=min(d,uPeriod-d);
    return uGapEnabled!=0&&birth>=0.&&d<uGapWidth*.5;
}

vec4 clipCell(int index){return texelFetch(uClipTable,ivec2(index%uClipWidth,index/uClipWidth),0);}
float laneLimit(int lane){
    if(uUseClipLimits!=0){int index=vClipIndex+lane;return texelFetch(uClipLimits,ivec2(index%uClipWidth,index/uClipWidth),0).r;}
    vec4 header=clipCell(vClipIndex+lane);
    int start=int(header.x+.5),count=int(header.y+.5);float nearest=1.;
    for(int i=0;i<count;++i){vec4 hit=clipCell(start+i);if(uGapEnabled==0&&hit.x>=uPhase)break;if(!missingSource(hit.x))nearest=min(nearest,hit.y);}
    return nearest;
}
vec3 spectrum(float t){
    float widthFactor=mix(.28,1.,uSoftness);
    vec3 band=(vec3(t)-vec3(.57,.34,.13))/(vec3(.22,.18,.1175)*widthFactor);
    vec3 c=exp(-.5*band*band)*mix(vec3(.95,1.,2.),vec3(1.),uSoftness)/sqrt(widthFactor);
    // White width halfway between the narrow and earlier broad shoulders.
    c=mix(vec3(1.8),c,smoothstep(.0085,mix(.0385,.0825,uSoftness),t));
    return c*exp(-1.8*t)*(1.-smoothstep(.65,1.,t));
}
void main(){
    float beamPixelWidth=abs(dFdx(vBeam.y))+abs(dFdy(vBeam.y));
    if((uGapEnabled==0&&uPhase<=vBirth)||missingSource(vBirth)||vBeam.y<0.||vBeam.y>=1.)discard;
    float sigma=uAreaMode!=0?max(2.,vEnergy*1.8)+vBeam.y*uSpread:max(.8,vEnergy*1.8)+.27*vBeam.y*uSpread;
    float q=abs(vBeam.x)/sigma;
    if(q>=4.)discard;
    float density=vEnergy/(2.506628275*sigma)*exp(-.5*q*q)*(1.-smoothstep(3.,4.,q));
    // Broad cosine lobe of a one-sided wall emitter, integrated along the
    // curve. Finite support fades smoothly; no visible wall or receiving plane.
    if(uAreaMode!=0){
        float angular=pow(1.+q*q,-1.5);
        density=vEnergy/(2.*sigma)*angular*(1.-smoothstep(2.5,4.,q));
    }
    float collisionFade=1.;
    if(uClipEnabled!=0){
        float lane=clamp((vBeam.x/(4.*sigma)+1.)*.5,0.,1.)*16.;
        int left=int(floor(lane)),right=min(left+1,16);
        float limit=min(laneLimit(left),laneLimit(right));
        if(vBeam.y>=limit)discard;
        if(limit<.99999){float edge=max(beamPixelWidth*3.,10./max(uSpread,1.));collisionFade=1.-smoothstep(max(0.,limit-edge),limit,vBeam.y);}
    }
    float distanceFraction=uAreaMode!=0?length(vec2(vBeam.y,vBeam.x/max(uSpread,1.))):vBeam.y;
    vec3 profile=spectrum(distanceFraction);
    if(uMonochrome!=0)profile=vec3(dot(profile,vec3(.2126,.7152,.0722)));
    // Pixel-footprint prefilter of the one-sided source edge, before the
    // low-resolution target is enlarged. MSAA alone does not filter shader
    // discontinuities or the overlapping source domains. Stay inside +N.
    float sourceAA=max(2.*beamPixelWidth,1e-7);
    float sourceCoverage=smoothstep(0.,sourceAA,vBeam.y);
    vec3 energy=max(profile*density*uOpacity*collisionFade*vVisibility*sourceCoverage*smoothstep(0.,4.,uSpread),vec3(0.));
    fragColor=vec4(vec3(1.)-exp(-energy),1.);
}
