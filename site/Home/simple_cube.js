
"use strict";

const body_main = document.getElementsByTagName("main")[0];
/* CANVAS SET UP */

var canvas = document.getElementById('my_Canvas');

canvas.setAttribute('width', canvas.offsetWidth.toString());
canvas.setAttribute('height', canvas.offsetHeight.toString());

function set_up_texture() {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.offsetWidth, canvas.offsetHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

// Get context
let gl = canvas.getContext('webgl2', {
    antialias: false,
    depth: false,
    failIfMajorPerformanceCaveat: true,
    powerPreference: "high-performance",
    preserveDrawingBuffer: true,
});

/* Framebuffer */

var renderQuad = new Float32Array([-0.5, -0.5, 0.0, 0.0,
                    0.5, -0.5, 1.0, 0.0,
                    0.5, 0.5, 1.0, 1.0,
                    -0.5, -0.5, 0.0, 0.0,
                    0.5, 0.5, 1.0, 1.0,
                    -0.5, 0.5, 0.0, 1.0]);


var render_vertex_code = "" +
    "attribute vec2 a_quadPos;" +
    "attribute vec2 a_uv;" +
    "" +
    "varying vec2 uv;" +
    "" +
    "void main() {" +
    "   gl_Position = vec4(a_quadPos*2., 0., 1.);" +
    "   uv = a_uv;" +
    "}";

var render_fragment_code = "" +
    "precision mediump float;" +
    "uniform sampler2D raw_scene;" +
    "uniform float aspect_ratio;" +
    "uniform vec2 mouse_pos;" +
    "uniform float radius;" +
    "uniform float time;" +
    "varying vec2 uv;" +
    "" +
    "vec3 get_color(vec2 pos) {" +
    "   vec3 color = texture2D(raw_scene, pos).rgb;" +
    "   vec3 invert_color = vec3(1.)-color;" +
    "   vec3 raw_color = mix(color, 1.2*invert_color, smoothstep(radius+0.01, radius, .04*sin(time)+length(vec2(aspect_ratio, 1.)*pos-mouse_pos)*3.));" +
    "   return raw_color;" +
    "}" +
    "" +
    "void main() {" +
    "   float dist = pow(length(uv-vec2(.5)), 4.)/20.;" +
    "   vec2 red = uv+vec2(.4, .1)*dist;" +
    "   vec2 blue = uv+vec2(-.2, -.5)*dist;" +
    "   vec2 green = uv+vec2(-.4, .2)*dist;" +
    "   vec3 aber_chrom = vec3(get_color(red).r,get_color(blue).b,get_color(green).g);" +
    "   gl_FragColor = vec4(aber_chrom, 1.);" +
    "}";

var render_vertex_shader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(render_vertex_shader, render_vertex_code)
gl.compileShader(render_vertex_shader);

var render_fragment_shader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(render_fragment_shader, render_fragment_code)
gl.compileShader(render_fragment_shader);

var renderProgram = gl.createProgram();
gl.attachShader(renderProgram, render_vertex_shader);
gl.attachShader(renderProgram, render_fragment_shader);
gl.linkProgram(renderProgram);

var tex = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, tex);
set_up_texture()


var framebuffer = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

gl.bindTexture(gl.TEXTURE_2D, null);

/* COPY BUFFER */

var copy_tex = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, copy_tex);
set_up_texture()


var copy_framebuffer = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, copy_framebuffer);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, copy_tex, 0);

gl.bindTexture(gl.TEXTURE_2D, null);

var copy_vertex_code = "" +
    "attribute vec2 a_quadPos;" +
    "attribute vec2 a_uv;" +
    "" +
    "varying vec2 uv;" +
    "" +
    "void main() {" +
    "   gl_Position = vec4(a_quadPos*2., 0., 1.);" +
    "   uv = a_uv;" +
    "}";

var copy_fragment_code = "" +
    "precision mediump float;" +
    "uniform sampler2D raw_scene;" +
    "uniform float erase_speed;" +
    "varying vec2 uv;" +
    "" +
    "void main() {" +
    "   gl_FragColor = vec4(mix(vec3(0.1), texture2D(raw_scene, uv).rgb, erase_speed), 1.);" +
    "}";

var copy_vertex_shader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(copy_vertex_shader, copy_vertex_code)
gl.compileShader(copy_vertex_shader);

var copy_fragment_shader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(copy_fragment_shader, copy_fragment_code)
gl.compileShader(copy_fragment_shader);

var copy_shaderProgram = gl.createProgram();
gl.attachShader(copy_shaderProgram, copy_vertex_shader);
gl.attachShader(copy_shaderProgram, copy_fragment_shader);
gl.linkProgram(copy_shaderProgram);

gl.useProgram(copy_shaderProgram);

var uLoc_copy_uv = gl.getAttribLocation(copy_shaderProgram, "a_uv");
var uLoc_copy_render_tex = gl.getUniformLocation(copy_shaderProgram, "raw_scene");
var uLoc_copy_quadPos = gl.getAttribLocation(copy_shaderProgram, "a_quadPos");
var uLoc_erase_speed = gl.getUniformLocation(copy_shaderProgram, "erase_speed");


/* SHADERS */
var vertex_code = "uniform vec2 mouse_pos;\n" +
    "uniform mat4 projection;\n" +
    "uniform mat4 view;\n" +
    "uniform mat4 model;\n" +
    "\n" +
    "uniform float time;\n" +
    "uniform float scroll_amount;\n" +
    "\n" +
    "attribute vec3 a_vertexPos;\n" +
    "\n" +
    "#define PI 3.141592\n" +
    "#define NBR_OF_ANIM 6\n" +
    "\n" +
    "mat2 rotate(float ang) {\n" +
    "   return mat2(cos(ang), sin(ang), -sin(ang), cos(ang));\n" +
    "}\n" +
    "\n" +
    "float local_anim_time(float time, float anim_start, float anim_end) {\n" +
    "    return (time - anim_start)/(anim_end - anim_start);\n" +
    "}\n" +
    "\n" +
    "vec3 swap_vec3(vec3 a, vec3 b, float anim_time, float swp_time, float swap_area) {\n" +
    "    return mix(a, b, smoothstep(swp_time-swap_area, swp_time+swap_area, anim_time));\n" +
    "}\n" +
    "\n" +
    "vec3 project_onto_torus(vec3 p) {\n" +
    "   vec3 pp = vec3(p.x, 0, p.z);\n" +
    "   pp = normalize(pp);\n" +
    "   return pp+0.3*normalize(p-pp);\n" +
    "}\n" +
    "\n" +
    "vec3 dust_cloud(vec3 vertex_pos, float anim_time) {\n" +
    "   vec3 mod_vertexPos = mod(vertex_pos+vec3(0, anim_time*4., 0),2.)-1.;\n" +
    "   return mod_vertexPos;\n" +
    "}\n" +
    "\n" +
    "\n" +
    "\n" +
    "vec3 weird_circle(vec3 vertex_pos, float anim_time) {\n" +
    "    vec3 anchor_pos = vertex_pos;\n" +
    "    anchor_pos.xy = (floor(vertex_pos.xy)+vec2(.5))*0.6;\n" +
    "\n" +
    "    float angle = vertex_pos.z*(anim_time-.5)*50.;\n" +
    "    float mix_amount = mix(0., vertex_pos.z*.2, smoothstep(0., 0.1, (anim_time-.5)*(anim_time-.5)));\n" +
    "    anchor_pos.xy = rotate(angle) * anchor_pos.xy;\n" +
    "\n" +
    "    float sign = anchor_pos.y/abs(anchor_pos.y);\n" +
    "    angle = atan(anchor_pos.x/ anchor_pos.y)+PI*(1.+sign)*.5;\n" +
    "\n" +
    "    float max_spike_count = 9.;\n" +
    "    float spike_count = max(0., floor((anim_time-.5)*2.*max_spike_count));\n" +
    "\n" +
    "    float prev_ray_mult = 1.+(0.1*sin(1.*time+angle*spike_count));\n" +
    "    float next_ray_mult = 1.+(0.1*sin(1.*time+angle*(spike_count+1.)));\n" +
    "    float ray = mix(prev_ray_mult, next_ray_mult, smoothstep(0., 1., fract(max(0., anim_time-.5)*2.*max_spike_count)));\n" +
    "\n" +
    "    anchor_pos.xy *= ray;\n" +
    "\n" +
    "    vec3 mod_vertex_pos = mix(anchor_pos, vertex_pos, mix_amount);\n" +
    "\n" +
    "   return mod_vertex_pos;\n" +
    "}\n" +
    "\n" +
    "\n" +
    "\n" +
    "vec3 torus(vec3 vertex_pos, float anim_time) {\n" +
    "    vec3 torus_pos = project_onto_torus(vertex_pos * 1.8);\n" +
    "    torus_pos.yz *= rotate(10. * anim_time);\n" +
    "    torus_pos.xy *= rotate(7. * anim_time * 0.2 + time * 0.1);\n" +
    "    return torus_pos*.4+vec3(0, 0, -0.5);\n" +
    "}\n" +
    "\n" +
    "void main() {\n" +
    "\n" +
    "    float ANIM_DUR[NBR_OF_ANIM];\n" +
    "    ANIM_DUR[0] = 5.0;\n" +
    "    ANIM_DUR[1] = 13.0;\n" +
    "    ANIM_DUR[2] = 6.0;\n" +
    "    ANIM_DUR[3] = 6.0;\n" +
    "    ANIM_DUR[4] = 0.0;\n" +
    "\n" +
    "    float anim_swp_area[NBR_OF_ANIM];\n" +
    "    anim_swp_area[0] = 0.5;\n" +
    "    anim_swp_area[1] = 1.0;\n" +
    "    anim_swp_area[2] = 1.5;\n" +
    "    anim_swp_area[3] = 1.3;\n" +
    "    anim_swp_area[4] = 0.5;\n" +
    "\n" +
    "    float anim_swp_time[NBR_OF_ANIM];\n" +
    "\n" +
    "    float total_duration = 0.;\n" +
    "    for (int i = 0; i < NBR_OF_ANIM; i++) {\n" +
    "        anim_swp_time[i] = total_duration;\n" +
    "        total_duration += ANIM_DUR[i];\n" +
    "    }\n" +
    "\n" +
    "    float anim_time = fract((0.03 * time + scroll_amount) / total_duration) * total_duration;\n" +
    "\n" +
    "    vec3 dust_cloud_pos = dust_cloud(a_vertexPos, local_anim_time(anim_time, anim_swp_time[0], anim_swp_time[1]));\n" +
    "    vec3 mod_vertexPos = dust_cloud_pos;\n" +
    "\n" +
    "    float weird_circle_time = local_anim_time(anim_time, anim_swp_time[1], anim_swp_time[2]);\n" +
    "    vec3 weird_circle_pos = weird_circle(dust_cloud_pos, weird_circle_time);\n" +
    "    mod_vertexPos = swap_vec3(dust_cloud_pos, weird_circle_pos, anim_time, anim_swp_time[1], anim_swp_area[1]);\n" +
    "\n" +
    "    float torus_time = local_anim_time(anim_time, anim_swp_time[2], anim_swp_time[3]);\n" +
    "    vec3 torus_pos = torus(a_vertexPos, torus_time);\n" +
    "    mod_vertexPos = swap_vec3(mod_vertexPos, torus_pos, anim_time, anim_swp_time[2], anim_swp_area[2]);\n" +
    "\n" +
    "    mod_vertexPos = swap_vec3(mod_vertexPos, dust_cloud_pos, anim_time, anim_swp_time[3], anim_swp_area[3]);\n" +
    "\n" +
    "    mod_vertexPos.xz *= rotate(mouse_pos.x * 0.1);\n" +
    "    mod_vertexPos.yz *= rotate(mouse_pos.y * 0.1);\n" +
    "\n" +
    "    gl_Position = projection * view * vec4(mod_vertexPos, 1.);\n" +
    "    gl_PointSize = 5. * pow((mod_vertexPos.z + 1.) * .5, 1.);\n" +
    "}\n" +
    "\n" +
    "\n";

// MAKE SPARKS

var fragment_code = "" +
    "precision mediump float;" +
    "" +
    "void main() {" +
    "   gl_FragColor = vec4(1.);" +
    "}";

var vertex_shader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertex_shader, vertex_code)
gl.compileShader(vertex_shader);

var fragment_shader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragment_shader, fragment_code)
gl.compileShader(fragment_shader);

var shaderProgram = gl.createProgram();
gl.attachShader(shaderProgram, vertex_shader);
gl.attachShader(shaderProgram, fragment_shader);
gl.linkProgram(shaderProgram);

/* Computing shaders uniforms */

gl.useProgram(shaderProgram);


const VERTICES_COUNT = 10_000;
let vertices = [];

for (let i = 0; i < 3*VERTICES_COUNT; i++) {
    vertices.push(Math.random()*2.-1.);
}

var vertex_buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);


var uLoc_projection = gl.getUniformLocation(shaderProgram, "projection");
var uLoc_view = gl.getUniformLocation(shaderProgram, "view");
var uLoc_model = gl.getUniformLocation(shaderProgram, "model");
var uLoc_mouseposrender = gl.getUniformLocation(shaderProgram, "mouse_pos");

var uLoc_time = gl.getUniformLocation(shaderProgram, "time");
var uLoc_scroll_amount = gl.getUniformLocation(shaderProgram, "scroll_amount");

var uLoc_vertexPos = gl.getAttribLocation(shaderProgram, "a_vertexPos");


gl.bindFramebuffer(gl.FRAMEBUFFER, null);
gl.bindBuffer(gl.ARRAY_BUFFER, null);

function get_perspective(width, height, near, far) {
    let a = near/width;
    let b = near/height;
    let c = -(far+near)/(far-near);
    let d = -2.*far*near/(far-near);
    return [a, 0, 0, 0,
            0, b, 0, 0,
            0, 0, c, -1,
            0, 0, d, 0];
}

function rotateX(angle) {
    var ct = Math.cos(angle);
    var st = Math.sin(angle);
    return [1, 0, 0, 0,  0, ct, -st, 0,  0, st, ct, 0,  0, 0, 0, 1];
}

function rotateY(angle) {
    var ct = Math.cos(angle);
    var st = Math.sin(angle);
    return [ct, 0, -st, 0,  0, 1, 0, 0,  st, 0, ct, 0,  0, 0, 0, 1];
}

function rotateZ(angle) {
    var ct = Math.cos(angle);
    var st = Math.sin(angle);
    return [ct, -st, 0, 0,  st, ct, 0, 0,  0, 0, 1, 0,  0, 0, 0, 1];
}

let aspect_ratio = canvas.offsetWidth/canvas.offsetHeight;
let proj_matrix = get_perspective(3., 3./aspect_ratio, 0.01, 10);
let view_matrix = [1, 0, 0, 0,  0, 1, 0, 0,  0, 0, 1, 0,  0, 0, 0, 1];
let model_matrix = [1, 0, 0, 0,  0, 1, 0, 0,  0, 0, 1, 0,  0, 0, 0, 1];

view_matrix[14] = view_matrix[14]-1;

var quadBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
gl.bufferData(gl.ARRAY_BUFFER, renderQuad, gl.STATIC_DRAW);


gl.useProgram(renderProgram);

var uLoc_quadPos = gl.getAttribLocation(renderProgram, "a_quadPos");
var uLoc_uv = gl.getAttribLocation(renderProgram, "a_uv");
var uLoc_render_tex = gl.getUniformLocation(renderProgram, "raw_scene");
var uLoc_aspect_ratio = gl.getUniformLocation(renderProgram, "aspect_ratio");
var uLoc_radius = gl.getUniformLocation(renderProgram, "radius");
var uLoc_mouse_pos = gl.getUniformLocation(renderProgram, "mouse_pos");
var uLoc_quadtime = gl.getUniformLocation(renderProgram, "time");

gl.useProgram(null);
gl.bindBuffer(gl.ARRAY_BUFFER, null);
/* Render Loop */

let scroll_speed = 0;
let scroll_amount = 0;
let scroll_drag = 0.98;
let max_scroll_speed = 5.;

let mouse_pos = [0, 0];

let max_attenuation = 0.91;
let attenuation = 0.0;
let attenuation_sensitivity = 0.003;
let attenuation_drag = 0.999;

let scroll_sensitivity = 0.01;
var previous_time = 0;

gl.clearColor(0.1, 0.1, 0.1, 1.);
gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
gl.clear(gl.COLOR_BUFFER_BIT);
gl.disable(gl.DEPTH_TEST);

var animate = function(time) {

    gl.clearColor(0.1, 0.1, 0.1, 1.0);

    var dt = time - previous_time;
    previous_time = time;

    attenuation = Math.min(max_attenuation * Math.abs(scroll_speed) * attenuation_sensitivity + (1. - attenuation_sensitivity) * attenuation * attenuation_drag, max_attenuation);
    console.log(attenuation);
    // COPY BUFFER

    gl.bindFramebuffer(gl.FRAMEBUFFER, copy_framebuffer);
    gl.viewport(0.0, 0.0, canvas.offsetWidth, canvas.offsetHeight);

    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);

    gl.useProgram(copy_shaderProgram);

    gl.uniform1i(uLoc_copy_render_tex, 0);
    gl.uniform1f(uLoc_erase_speed, attenuation);

    gl.vertexAttribPointer(uLoc_copy_quadPos, 2, gl.FLOAT, false, 4*4, 0);
    gl.enableVertexAttribArray(uLoc_copy_quadPos);
    gl.vertexAttribPointer(uLoc_copy_uv, 2, gl.FLOAT, false, 4*4, 2*4);
    gl.enableVertexAttribArray(uLoc_copy_uv);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);

    gl.drawArrays(gl.TRIANGLES, 0, 6);



    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(0.0, 0.0, canvas.offsetWidth, canvas.offsetHeight);

    gl.clear(gl.COLOR_BUFFER_BIT);


    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);

    gl.useProgram(copy_shaderProgram);

    gl.uniform1i(uLoc_copy_render_tex, 0);
    gl.uniform1f(uLoc_erase_speed, 1.);

    gl.vertexAttribPointer(uLoc_copy_quadPos, 2, gl.FLOAT, false, 4*4, 0);
    gl.enableVertexAttribArray(uLoc_copy_quadPos);
    gl.vertexAttribPointer(uLoc_copy_uv, 2, gl.FLOAT, false, 4*4, 2*4);
    gl.enableVertexAttribArray(uLoc_copy_uv);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, copy_tex);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // END COPY

    // Setting up draw context

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(0.0, 0.0, canvas.offsetWidth, canvas.offsetHeight);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);

    gl.useProgram(shaderProgram);
    gl.vertexAttribPointer(uLoc_vertexPos, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(uLoc_vertexPos);

    let zoom = 0.5;
    let aspect_ratio = canvas.offsetWidth/canvas.offsetHeight;
    let proj_matrix = get_perspective(zoom*aspect_ratio, zoom, 1., 10);
    model_matrix = rotateZ(time*0.00001);


    gl.uniformMatrix4fv(uLoc_projection, false, proj_matrix);
    gl.uniformMatrix4fv(uLoc_view, false, view_matrix);
    gl.uniformMatrix4fv(uLoc_model, false, model_matrix);
    gl.uniform2f(uLoc_mouseposrender, mouse_pos[0], mouse_pos[1]);


    scroll_amount += scroll_speed * dt*0.001;
    scroll_speed *= scroll_drag;
    gl.uniform1f(uLoc_time, time*0.001);
    gl.uniform1f(uLoc_scroll_amount, scroll_amount);

    gl.drawArrays(gl.POINTS, 0, VERTICES_COUNT);



    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0.0, 0.0, canvas.offsetWidth, canvas.offsetHeight);

    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.useProgram(renderProgram);

    gl.uniform1i(uLoc_render_tex, 0);
    gl.uniform1f(uLoc_aspect_ratio, aspect_ratio);
    gl.uniform1f(uLoc_radius, 0.15+scroll_speed/60.);
    gl.uniform1f(uLoc_quadtime, time*0.001);
    gl.uniform2f(uLoc_mouse_pos, mouse_pos[0], mouse_pos[1]);

    gl.vertexAttribPointer(uLoc_quadPos, 2, gl.FLOAT, false, 4*4, 0);
    gl.enableVertexAttribArray(uLoc_quadPos);
    gl.vertexAttribPointer(uLoc_uv, 2, gl.FLOAT, false, 4*4, 2*4);
    gl.enableVertexAttribArray(uLoc_uv);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    window.requestAnimationFrame(animate);
}

function onWindowResize(event) {
    canvas.setAttribute('width', body_main.offsetWidth.toString());
    canvas.setAttribute('height', body_main.offsetHeight.toString());

    gl.deleteTexture(tex);
    tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    set_up_texture();

    gl.deleteTexture(copy_tex);
    copy_tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, copy_tex);
    set_up_texture();

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, copy_framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, copy_tex, 0);

}

window.onmousewheel=document.onmousewheel=mouseScroll;

if(document.addEventListener){
      document.addEventListener('wheel',mouseScroll,false);
 }

function mouseScroll(e) {
    scroll_speed += e.deltaY*scroll_sensitivity;
    scroll_speed = Math.max(Math.min(scroll_speed, max_scroll_speed), -max_scroll_speed);
    console.log(e.deltaY*scroll_sensitivity);
}

// Resize canvas event
window.addEventListener("resize", onWindowResize)

document.onmousemove = handleMouseMove;
function handleMouseMove(event) {
    var eventDoc, doc, body;

    event = event || window.event; // IE-ism

    // If pageX/Y aren't available and clientX/Y are,
    // calculate pageX/Y - logic taken from jQuery.
    // (This is to support old IE)
    if (event.pageX == null && event.clientX != null) {
        eventDoc = (event.target && event.target.ownerDocument) || document;
        doc = eventDoc.documentElement;
        body = eventDoc.body;

        event.pageX = event.clientX +
          (doc && doc.scrollLeft || body && body.scrollLeft || 0) -
          (doc && doc.clientLeft || body && body.clientLeft || 0);
        event.pageY = event.clientY +
          (doc && doc.scrollTop  || body && body.scrollTop  || 0) -
          (doc && doc.clientTop  || body && body.clientTop  || 0 );
    }
    mouse_pos = [(event.x)/canvas.offsetHeight, 1.-event.y/canvas.offsetHeight];
    // Use event.pageX / event.pageY here
}

animate(0);
