precision highp float;
precision highp int;
uniform vec2 uScreenSize;
in vec4 position;
in vec2 texcoord;
in vec4 color;
in vec3 normal;
out vec2 vRadial;
out float vEnergy;
out float vBirth;
void main() {
    vRadial=texcoord; vEnergy=color.a;vBirth=normal.x;
    gl_Position=vec4(position.x/uScreenSize.x*2.0-1.0,1.0-position.y/uScreenSize.y*2.0,0.0,1.0);
}
