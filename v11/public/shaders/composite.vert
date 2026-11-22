precision highp float;
precision highp int;
uniform vec2 uScreenSize;
in vec4 position;
void main(){gl_Position=vec4(position.x/uScreenSize.x*2.-1.,1.-position.y/uScreenSize.y*2.,0.,1.);}
