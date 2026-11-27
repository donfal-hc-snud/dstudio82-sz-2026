precision highp float;
precision highp int;
uniform vec2 uScreenSize;
in vec4 position;
in vec2 texcoord;
in vec3 normal;
in vec4 color;
out vec2 vLocal;
out vec3 vShape;
out float vFade;
out vec2 vTime;
void main() {
    // Segment quads carry actual local pixel coordinates, including their caps.
    vTime=color.rg; vLocal=texcoord; vShape=normal; vFade=color.a;
    gl_Position=vec4(position.x/uScreenSize.x*2.0-1.0,1.0-position.y/uScreenSize.y*2.0,0.0,1.0);
}
