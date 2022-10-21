#version 300 es

precision mediump float;
uniform vec3 u_reverseLightDirection;
uniform sampler2D uSampler;
in vec3 v_normal;
in highp vec2 vTextureCoord;
out vec4 outColor;

void main(){
    vec3 normal=normalize(v_normal);
    vec4 textureColor=texture(uSampler,vTextureCoord);
    float light=dot(normal,u_reverseLightDirection);
    outColor=vec4(light*textureColor.rgb,1);
}