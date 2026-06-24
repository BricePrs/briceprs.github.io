// Copy/fade pass: lerps the previous frame toward dark grey to create the
// persistence-of-vision "remanence" trail behind the points.

precision mediump float;

uniform sampler2D raw_scene;
uniform float erase_speed;

varying vec2 uv;

void main() {
    gl_FragColor = vec4(mix(vec3(0.1), texture2D(raw_scene, uv).rgb, erase_speed), 1.);
}
