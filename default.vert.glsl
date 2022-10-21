#version 300 es
in vec4 a_position;
in vec3 a_normal;
in vec2 aTextureCoord;
uniform mat4 u_cameraMatrix;
out vec3 v_normal;
out highp vec2 vTextureCoord;

void main(){
    gl_Position=u_cameraMatrix*a_position;
    v_normal=a_normal;
    vTextureCoord=aTextureCoord;
}