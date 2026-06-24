// Same pass-through as post_process.vert. Kept separate so each pipeline
// can be tweaked independently.

attribute vec2 a_quadPos;
attribute vec2 a_uv;

varying vec2 uv;

void main() {
    gl_Position = vec4(a_quadPos*2., 0., 1.);
    uv = a_uv;
}
