precision highp float;
precision highp int;
uniform sampler2D uGlow;
uniform vec2 uFramebufferSize;
uniform int uSmoothUpsample;
out vec4 fragColor;
// Positive cubic B-spline reconstruction: four bilinear fetches instead of
// one. No negative lobes/black ringing around bright low-resolution light.
vec3 cubicLight(vec2 uv){
    vec2 size=vec2(textureSize(uGlow,0));
    vec2 p=uv*size-.5,base=floor(p),f=p-base;
    vec2 w0=pow(1.-f,vec2(3.))/6.;
    vec2 w1=(3.*f*f*f-6.*f*f+4.)/6.;
    vec2 w2=(-3.*f*f*f+3.*f*f+3.*f+1.)/6.;
    vec2 w3=f*f*f/6.;
    vec2 g0=w0+w1,g1=w2+w3;
    vec2 a=(base-.5+w1/g0)/size,b=(base+1.5+w3/g1)/size;
    return texture(uGlow,a).rgb*g0.x*g0.y
         + texture(uGlow,vec2(b.x,a.y)).rgb*g1.x*g0.y
         + texture(uGlow,vec2(a.x,b.y)).rgb*g0.x*g1.y
         + texture(uGlow,b).rgb*g1.x*g1.y;
}
void main(){vec2 uv=gl_FragCoord.xy/uFramebufferSize;
    fragColor=vec4(uSmoothUpsample!=0?cubicLight(uv):texture(uGlow,uv).rgb,1.);
}
