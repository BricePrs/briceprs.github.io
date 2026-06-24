"use strict";

(async function () {

const canvas = document.getElementById('my_Canvas');
if (!canvas) return;

// --- Shader loading helpers -------------------------------------------------
// Shaders live in /shaders/*.{vert,frag} so they can be edited and debugged
// without touching this file. Compile/link errors are logged with file names
// and line-numbered source so they are easy to track down in DevTools.

async function loadShaderFile(url) {
    let resp;
    try {
        resp = await fetch(url, { cache: "no-cache" });
    } catch (e) {
        // Most common cause: page opened via file:// — browsers refuse fetch() then.
        const hint = (location.protocol === "file:")
            ? " (the page is being served via file://, which blocks fetch — run a local server, e.g. `python3 -m http.server` in the project root)"
            : "";
        throw new Error("Could not fetch " + url + ": " + (e && e.message ? e.message : e) + hint);
    }
    if (!resp.ok) {
        throw new Error("Failed to load shader " + url + " — HTTP " + resp.status + " " + resp.statusText);
    }
    return await resp.text();
}

function compileShader(gl, type, source, label) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader) || "(no info log)";
        // Pretty-print the source with line numbers next to the error
        const numbered = source.split("\n").map((l, i) => String(i + 1).padStart(3, " ") + " | " + l).join("\n");
        console.error("[shader compile error] " + label + "\n" + info + "\n--- source ---\n" + numbered);
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function linkProgram(gl, vs, fs, label) {
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error("[program link error] " + label + "\n" + (gl.getProgramInfoLog(prog) || ""));
        gl.deleteProgram(prog);
        return null;
    }
    return prog;
}

const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

canvas.setAttribute('width', canvas.offsetWidth.toString());
canvas.setAttribute('height', canvas.offsetHeight.toString());

// Try to get a WebGL2 context; fall back gracefully on failure.
let gl = null;
try {
    gl = canvas.getContext('webgl2', {
        antialias: false,
        depth: false,
        powerPreference: "high-performance",
        preserveDrawingBuffer: true,
    });
} catch (e) {
    gl = null;
}

// Detect mobile up-front so consumers can use window.siteIsMobile from any script
window.siteIsMobile = !!(navigator.userAgent && navigator.userAgent.toLowerCase().match(/mobile/i));

// If WebGL2 or reduced-motion is unavailable / requested, paint a static fallback and exit.
if (!gl || reducedMotion) {
    canvas.classList.add('canvas-fallback');
    return;
}

// Hide the native cursor only on desktop devices that have a fine pointer
const hasFinePointer = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
if (hasFinePointer) {
    document.documentElement.classList.add('canvas-cursor-hidden');
}

const renderQuad = new Float32Array([
    -0.5, -0.5, 0.0, 0.0,
     0.5, -0.5, 1.0, 0.0,
     0.5,  0.5, 1.0, 1.0,
    -0.5, -0.5, 0.0, 0.0,
     0.5,  0.5, 1.0, 1.0,
    -0.5,  0.5, 0.0, 1.0
]);


// --- Load all shader sources in parallel -----------------------------------
const SHADER_FILES = [
    "shaders/post_process.vert",
    "shaders/post_process.frag",
    "shaders/copy.vert",
    "shaders/copy.frag",
    "shaders/raw_points.vert",
    "shaders/raw_points.frag",
];
const shaderResults = await Promise.allSettled(SHADER_FILES.map(loadShaderFile));
const shaderErrors = shaderResults
    .map((r, i) => r.status === "rejected" ? { file: SHADER_FILES[i], err: r.reason } : null)
    .filter(Boolean);
if (shaderErrors.length > 0) {
    console.error(
        "[canvas] " + shaderErrors.length + " shader file(s) failed to load — falling back to static background."
    );
    shaderErrors.forEach(({ file, err }) => {
        const msg = (err && err.message) ? err.message : String(err);
        console.error("  - " + file + " : " + msg);
    });
    canvas.classList.add("canvas-fallback");
    return;
}
const [
    post_process_vertex_code, post_process_fragment_code,
    copy_vertex_code,         copy_fragment_code,
    vertex_code,              fragment_code,
] = shaderResults.map(r => r.value);

// --- Post-process program --------------------------------------------------
const post_process_vertex_shader   = compileShader(gl, gl.VERTEX_SHADER,   post_process_vertex_code,   "post_process.vert");
const post_process_fragment_shader = compileShader(gl, gl.FRAGMENT_SHADER, post_process_fragment_code, "post_process.frag");
const POST_PROCESS_PROGRAM = linkProgram(gl, post_process_vertex_shader, post_process_fragment_shader, "post_process");
gl.deleteShader(post_process_fragment_shader);
gl.deleteShader(post_process_vertex_shader);
if (!POST_PROCESS_PROGRAM) {
    canvas.classList.add("canvas-fallback");
    return;
}

let accumulation_texture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, accumulation_texture);
set_up_texture()

// Setting up copy buffers/shaders

let copy_tex = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, copy_tex);
set_up_texture()


let copy_framebuffer = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, copy_framebuffer);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, copy_tex, 0);

gl.bindTexture(gl.TEXTURE_2D, null);

// --- Copy/fade program -----------------------------------------------------
const copy_vertex_shader   = compileShader(gl, gl.VERTEX_SHADER,   copy_vertex_code,   "copy.vert");
const copy_fragment_shader = compileShader(gl, gl.FRAGMENT_SHADER, copy_fragment_code, "copy.frag");
const COPY_SHADER_PROGRAM = linkProgram(gl, copy_vertex_shader, copy_fragment_shader, "copy");
gl.deleteShader(copy_fragment_shader);
gl.deleteShader(copy_vertex_shader);
if (!COPY_SHADER_PROGRAM) {
    canvas.classList.add("canvas-fallback");
    return;
}

gl.useProgram(COPY_SHADER_PROGRAM);

let uLoc_copy_uv = gl.getAttribLocation(COPY_SHADER_PROGRAM, "a_uv");
let uLoc_copy_render_tex = gl.getUniformLocation(COPY_SHADER_PROGRAM, "raw_scene");
let uLoc_copy_quadPos = gl.getAttribLocation(COPY_SHADER_PROGRAM, "a_quadPos");
let uLoc_erase_speed = gl.getUniformLocation(COPY_SHADER_PROGRAM, "erase_speed");

// Setting up raw_point framebuffer

const RAW_POINTS_FRAMEBUFFER = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, RAW_POINTS_FRAMEBUFFER);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, accumulation_texture, 0);

gl.bindTexture(gl.TEXTURE_2D, null);

// --- Raw-points program ----------------------------------------------------
const vertex_shader   = compileShader(gl, gl.VERTEX_SHADER,   vertex_code,   "raw_points.vert");
const fragment_shader = compileShader(gl, gl.FRAGMENT_SHADER, fragment_code, "raw_points.frag");
const RAW_POINT_SHADER_PROGRAM = linkProgram(gl, vertex_shader, fragment_shader, "raw_points");
gl.deleteShader(vertex_shader);
gl.deleteShader(fragment_shader);
if (!RAW_POINT_SHADER_PROGRAM) {
    canvas.classList.add("canvas-fallback");
    return;
}

gl.useProgram(RAW_POINT_SHADER_PROGRAM);


// Creating a buffer with 10_000 random points
const VERTICES_COUNT = 10000;
let vertices = [];

for (let i = 0; i < 3*VERTICES_COUNT; i++) {
    vertices.push(Math.random()*2.-1.);
}

const RAW_POINTS_BUFFER = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, RAW_POINTS_BUFFER);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);


const uLoc_RP_projection = gl.getUniformLocation(RAW_POINT_SHADER_PROGRAM, "projection");
const uLoc_RP_view = gl.getUniformLocation(RAW_POINT_SHADER_PROGRAM, "view");
const uLoc_RP_model = gl.getUniformLocation(RAW_POINT_SHADER_PROGRAM, "model");
const uLoc_RP_mouse_pos = gl.getUniformLocation(RAW_POINT_SHADER_PROGRAM, "mouse_pos");

const uLoc_RP_time = gl.getUniformLocation(RAW_POINT_SHADER_PROGRAM, "time");
const uLoc_RP_scroll_amount = gl.getUniformLocation(RAW_POINT_SHADER_PROGRAM, "scroll_amount");
const uLoc_RP_isMobile = gl.getUniformLocation(RAW_POINT_SHADER_PROGRAM, "isMobile");

const uLoc_RP_vertexPos = gl.getAttribLocation(RAW_POINT_SHADER_PROGRAM, "a_vertexPos");


gl.bindFramebuffer(gl.FRAMEBUFFER, null);
gl.bindBuffer(gl.ARRAY_BUFFER, null);


let view_matrix = [1, 0, 0, 0,  0, 1, 0, 0,  0, 0, 1, 0,  0, 0, 0, 1];
let model_matrix = [1, 0, 0, 0,  0, 1, 0, 0,  0, 0, 1, 0,  0, 0, 0, 1];

view_matrix[14] = view_matrix[14]-1;

const QUAD_BUFFER = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, QUAD_BUFFER);
gl.bufferData(gl.ARRAY_BUFFER, renderQuad, gl.STATIC_DRAW);


gl.useProgram(POST_PROCESS_PROGRAM);

const uLoc_PPG_quadPos = gl.getAttribLocation(POST_PROCESS_PROGRAM, "a_quadPos");
const uLoc_PPG_uv = gl.getAttribLocation(POST_PROCESS_PROGRAM, "a_uv");
const uLoc_PPG_render_tex = gl.getUniformLocation(POST_PROCESS_PROGRAM, "raw_scene");
const uLoc_PPG_aspect_ratio = gl.getUniformLocation(POST_PROCESS_PROGRAM, "aspect_ratio");
const uLoc_PPG_radius = gl.getUniformLocation(POST_PROCESS_PROGRAM, "radius");
const uLoc_PPG_mouse_pos = gl.getUniformLocation(POST_PROCESS_PROGRAM, "mouse_pos");
const uLoc_PPG_time = gl.getUniformLocation(POST_PROCESS_PROGRAM, "time");
const uLoc_PPG_isMobile = gl.getUniformLocation(POST_PROCESS_PROGRAM, "isMobile");

gl.useProgram(null);
gl.bindBuffer(gl.ARRAY_BUFFER, null);

// Setting up useful vars to control animation behaviour

let min_dt_frame = 16; // ~60fps

let scroll_speed = 0;
let scroll_amount = 0;
let scroll_drag = 0.98;
let max_scroll_speed = 5.;

let mouse_pos = [0, 0];

let max_attenuation = 0.85;
let attenuation = 0.0;
let attenuation_sensitivity = 0.003;
let attenuation_drag = 0.999;

let scroll_sensitivity = 0.01;
let previous_time = 0;

gl.disable(gl.DEPTH_TEST);

gl.clearColor(0.1, 0.1, 0.1, 1.);
gl.bindFramebuffer(gl.FRAMEBUFFER, RAW_POINTS_FRAMEBUFFER);
gl.clear(gl.COLOR_BUFFER_BIT);

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Pause the animation when the tab is hidden to save battery / GPU
let isVisible = !document.hidden;
document.addEventListener("visibilitychange", function () {
    isVisible = !document.hidden;
});

let animate = async function(time) {

    if (!isVisible) {
        // Skip a frame; come back on the next requestAnimationFrame tick.
        previous_time = time;
        window.requestAnimationFrame(animate);
        return;
    }

    let dt = time - previous_time;
    if (dt < min_dt_frame) {
        await sleep(min_dt_frame-dt);
    }

    previous_time = time;

    // REMANENCE EFFECT
    attenuation = Math.min(max_attenuation * Math.abs(scroll_speed) * attenuation_sensitivity + (1. - attenuation_sensitivity) * attenuation * attenuation_drag, max_attenuation);
    let attenuation_correction = Math.max(1., dt/min_dt_frame);

    // COMPUTING CAMERA MATRICES
    let zoom = 0.45 +Math.sin(time*0.001)*0.03;
    let aspect_ratio = canvas.offsetWidth/canvas.offsetHeight;
    let proj_matrix = get_perspective(zoom*aspect_ratio, zoom, 1., 10);
    model_matrix = rotateZ(Math.sin(time*0.00001+scroll_amount)*0.05);

    update_scroll(min_dt_frame);

    gl.viewport(0.0, 0.0, canvas.offsetWidth, canvas.offsetHeight);

    // Copying previous rendered frame to add a remanence effect
    bindCopy(copy_framebuffer, Math.pow(attenuation, attenuation_correction), accumulation_texture);
    bindCopy(RAW_POINTS_FRAMEBUFFER, 1., copy_tex);
    // Drawing raw points cloud
    draw_raw_points(time, proj_matrix, view_matrix, model_matrix);
    // Adding post-processing effects
    post_process(time, aspect_ratio, scroll_speed, mouse_pos, accumulation_texture);

    window.requestAnimationFrame(animate);
}

function draw_raw_points(time, proj_matrix, view_matrix, model_matrix) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, RAW_POINTS_FRAMEBUFFER);

    gl.bindBuffer(gl.ARRAY_BUFFER, RAW_POINTS_BUFFER);

    gl.useProgram(RAW_POINT_SHADER_PROGRAM);
    gl.vertexAttribPointer(uLoc_RP_vertexPos, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(uLoc_RP_vertexPos);

    gl.uniformMatrix4fv(uLoc_RP_projection, false, proj_matrix);
    gl.uniformMatrix4fv(uLoc_RP_view, false, view_matrix);
    gl.uniformMatrix4fv(uLoc_RP_model, false, model_matrix);
    gl.uniform2f(uLoc_RP_mouse_pos, mouse_pos[0], mouse_pos[1]);

    gl.uniform1f(uLoc_RP_time, time*0.001);
    gl.uniform1f(uLoc_RP_scroll_amount, scroll_amount);
    gl.uniform1i(uLoc_RP_isMobile, isMobile);


    gl.drawArrays(gl.POINTS, 0, VERTICES_COUNT);
}

function post_process(time, aspect_ratio, mouse_radius, mouse_pos, raw_texture) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.bindBuffer(gl.ARRAY_BUFFER, QUAD_BUFFER);
    gl.useProgram(POST_PROCESS_PROGRAM);

    gl.uniform1i(uLoc_PPG_render_tex, 0);
    gl.uniform1f(uLoc_PPG_aspect_ratio, aspect_ratio);
    gl.uniform1f(uLoc_PPG_radius, 0.15+mouse_radius/60.);
    gl.uniform1f(uLoc_PPG_time, time*0.001);
    gl.uniform2f(uLoc_PPG_mouse_pos, mouse_pos[0], mouse_pos[1]);
    gl.uniform1i(uLoc_PPG_isMobile, isMobile);

    gl.vertexAttribPointer(uLoc_PPG_quadPos, 2, gl.FLOAT, false, 4*4, 0);
    gl.enableVertexAttribArray(uLoc_PPG_quadPos);
    gl.vertexAttribPointer(uLoc_PPG_uv, 2, gl.FLOAT, false, 4*4, 2*4);
    gl.enableVertexAttribArray(uLoc_PPG_uv);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, raw_texture);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function bindCopy(framebuffer, fade, tex_to_copy) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

    gl.bindBuffer(gl.ARRAY_BUFFER, QUAD_BUFFER);

    gl.useProgram(COPY_SHADER_PROGRAM);

    gl.uniform1i(uLoc_copy_render_tex, 0);
    gl.uniform1f(uLoc_erase_speed, fade);

    gl.vertexAttribPointer(uLoc_copy_quadPos, 2, gl.FLOAT, false, 4*4, 0);
    gl.enableVertexAttribArray(uLoc_copy_quadPos);
    gl.vertexAttribPointer(uLoc_copy_uv, 2, gl.FLOAT, false, 4*4, 2*4);
    gl.enableVertexAttribArray(uLoc_copy_uv);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex_to_copy);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

// UTILITY FUNC for WebGL

function set_up_texture() {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.offsetWidth, canvas.offsetHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

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

function rotateZ(angle) {
    var ct = Math.cos(angle);
    var st = Math.sin(angle);
    return [ct, -st, 0, 0,  st, ct, 0, 0,  0, 0, 1, 0,  0, 0, 0, 1];
}

function sign(a) {
    if (a < 0) return -1;
    if (a > 0) return 1;
    return 0;
}

function update_scroll_computer(dt) {
    scroll_amount += scroll_speed * dt*0.001;
    scroll_speed *= scroll_drag;
}

function update_scroll_mobile(dt) {
    let goal = window.scrollY/window.outerHeight*9;
    let dst_to_goal = goal - scroll_amount;
    let direction = sign(dst_to_goal);
    let scroll_acceleration_dist = 10.;
    let scroll_acceleration_amount = Math.min(scroll_acceleration_dist, Math.abs(dst_to_goal))/scroll_acceleration_dist;
    scroll_speed = Math.min(max_scroll_speed, scroll_speed+scroll_acceleration_amount);
    scroll_amount += direction * 0.2*Math.min(scroll_speed * dt*0.001, Math.abs(dst_to_goal));
    scroll_speed *= scroll_drag;
}

let update_scroll = function() {};

function onWindowResize() {
    canvas.setAttribute('width', canvas.offsetWidth.toString());
    canvas.setAttribute('height', canvas.offsetHeight.toString());

    gl.deleteTexture(accumulation_texture);
    accumulation_texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, accumulation_texture);
    set_up_texture();

    gl.deleteTexture(copy_tex);
    copy_tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, copy_tex);
    set_up_texture();

    gl.bindFramebuffer(gl.FRAMEBUFFER, RAW_POINTS_FRAMEBUFFER);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, accumulation_texture, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, copy_framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, copy_tex, 0);
}

document.addEventListener('wheel', mouseScroll, { passive: true });

function mouseScroll(e) {
    scroll_speed += e.deltaY*scroll_sensitivity;
    scroll_speed = Math.max(Math.min(scroll_speed, max_scroll_speed), -max_scroll_speed);
}

window.addEventListener("resize", onWindowResize);

function handleMouseMove(event) {
    mouse_pos = [(event.x) / canvas.offsetHeight, 1. - event.y / canvas.offsetHeight];
}

let isMobile = window.siteIsMobile;
if (isMobile) {
    min_dt_frame = 64;
    update_scroll = update_scroll_mobile;
} else {
    document.onmousemove = handleMouseMove;
    update_scroll = update_scroll_computer;
}

animate(0);

})();
