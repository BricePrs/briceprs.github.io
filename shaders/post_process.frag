// Post-process fragment shader: chromatic-aberration "lens" with an
// inverted-color circle that follows the mouse on desktop.

precision mediump float;

uniform sampler2D raw_scene;
uniform float aspect_ratio;
uniform vec2 mouse_pos;
uniform float radius;
uniform float time;
uniform bool isMobile;

varying vec2 uv;

vec3 get_color(vec2 pos) {
    vec2 mouse_dir = vec2(aspect_ratio, 1.)*pos - mouse_pos;
    float mouse_dist = smoothstep(radius+0.01, radius, .04*sin(time)+length(mouse_dir)*3.);
    float rp = .04*sin(time) + length(mouse_dir)*3.;
    float rc = max(0., (rp - radius));
    rc = smoothstep(0., 1., pow(smoothstep(0.05, 0.9, rc), .3));
    if (rc > 1.) { rc = 1.; }
    vec3 color = texture2D(raw_scene, (mouse_pos + mouse_dir*rc*1.)/vec2(aspect_ratio, 1.)).rgb;
    vec3 invert_color = vec3(1.) - color;
    if (rc < 0.01) { return vec3(0.9); }
    return mix(color, 1.2*invert_color, mouse_dist);
}

void main() {
    vec3 aber_chrom = vec3(0.);
    if (isMobile) {
        aber_chrom = texture2D(raw_scene, uv).rgb;
    } else {
        float dist = pow(length(uv-vec2(.5)), 4.)/20.;
        vec2 red   = uv + vec2( .4,  .1)*dist;
        vec2 blue  = uv + vec2(-.2, -.5)*dist;
        vec2 green = uv + vec2(-.4,  .2)*dist;
        aber_chrom = vec3(get_color(red).r, get_color(blue).b, get_color(green).g);
    }
    gl_FragColor = vec4(aber_chrom, 1.);
}
