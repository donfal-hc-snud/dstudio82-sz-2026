precision highp float;
precision highp int;
uniform vec2 uScreenSize;
uniform int uWorldSpace;
uniform mat4 uViewProjection;
in vec4 position;
in vec2 texcoord;
in vec3 normal;
in vec4 color;
out vec2 vBeam;
out float vEnergy;
out float vBirth;
out float vVisibility;
flat out int vClipIndex;
void main(){
    vClipIndex=int(normal.z+.5);vBeam=texcoord;vEnergy=color.a;vBirth=normal.x;
    vVisibility=clamp(normal.y,0.,1.);
    if(uWorldSpace!=0){gl_Position=uViewProjection*vec4(position.xyz,1.);return;}
    float w=position.z>0.?position.z:1.;
    gl_Position=vec4((position.x/uScreenSize.x*2.-1.)*w,(1.-position.y/uScreenSize.y*2.)*w,0.,w);
}
