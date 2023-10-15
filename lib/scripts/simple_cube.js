
"use strict";


const body_main = document.getElementsByTagName("main")[0];
var canvas = document.getElementById('my_Canvas');

canvas.setAttribute('width', canvas.offsetWidth.toString());
canvas.setAttribute('height', canvas.offsetHeight.toString());

// Get GL context
let gl = canvas.getContext('webgl2', {
    antialias: false,
    depth: false,
    failIfMajorPerformanceCaveat: true,
    powerPreference: "high-performance",
    preserveDrawingBuffer: true,
});


let renderQuad = new Float32Array([-0.5, -0.5, 0.0, 0.0,
                    0.5, -0.5, 1.0, 0.0,
                    0.5, 0.5, 1.0, 1.0,
                    -0.5, -0.5, 0.0, 0.0,
                    0.5, 0.5, 1.0, 1.0,
                    -0.5, 0.5, 0.0, 1.0]);


// Setting up post-processing Buffers/Shader

let post_process_vertex_code = "" +
    "attribute vec2 a_quadPos;" +
    "attribute vec2 a_uv;" +
    "" +
    "varying vec2 uv;" +
    "" +
    "void main() {" +
    "   gl_Position = vec4(a_quadPos*2., 0., 1.);" +
    "   uv = a_uv;" +
    "}";

let post_process_fragment_code = "" +
    "precision mediump float;" +
    "uniform sampler2D raw_scene;" +
    "uniform float aspect_ratio;" +
    "uniform vec2 mouse_pos;" +
    "uniform float radius;" +
    "uniform float time;" +
    "uniform bool isMobile;" +
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
    "   vec3 aber_chrom = vec3(0.);" +
    "   if (isMobile) {" +
    "       aber_chrom = texture2D(raw_scene, uv).rgb;" +
    "   } else {" +
    "       float dist = pow(length(uv-vec2(.5)), 4.)/20.;" +
    "       vec2 red = uv+vec2(.4, .1)*dist;" +
    "       vec2 blue = uv+vec2(-.2, -.5)*dist;" +
    "       vec2 green = uv+vec2(-.4, .2)*dist;" +
    "       aber_chrom = vec3(get_color(red).r,get_color(blue).b,get_color(green).g);" +
    "   }" +
    "   gl_FragColor = vec4(aber_chrom, 1.);" +
    "}";



let post_process_vertex_shader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(post_process_vertex_shader, post_process_vertex_code)
gl.compileShader(post_process_vertex_shader);

let post_process_fragment_shader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(post_process_fragment_shader, post_process_fragment_code)
gl.compileShader(post_process_fragment_shader);

const POST_PROCESS_PROGRAM = gl.createProgram();
gl.attachShader(POST_PROCESS_PROGRAM, post_process_vertex_shader);
gl.attachShader(POST_PROCESS_PROGRAM, post_process_fragment_shader);
gl.linkProgram(POST_PROCESS_PROGRAM);

gl.deleteShader(post_process_fragment_shader);
gl.deleteShader(post_process_vertex_shader);

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

const copy_vertex_code = "" +
    "attribute vec2 a_quadPos;" +
    "attribute vec2 a_uv;" +
    "" +
    "varying vec2 uv;" +
    "" +
    "void main() {" +
    "   gl_Position = vec4(a_quadPos*2., 0., 1.);" +
    "   uv = a_uv;" +
    "}";

const copy_fragment_code = "" +
    "precision mediump float;" +
    "uniform sampler2D raw_scene;" +
    "uniform float erase_speed;" +
    "varying vec2 uv;" +
    "" +
    "void main() {" +
    "   gl_FragColor = vec4(mix(vec3(0.1), texture2D(raw_scene, uv).rgb, erase_speed), 1.);" +
    "}";

let copy_vertex_shader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(copy_vertex_shader, copy_vertex_code)
gl.compileShader(copy_vertex_shader);

let copy_fragment_shader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(copy_fragment_shader, copy_fragment_code)
gl.compileShader(copy_fragment_shader);

const COPY_SHADER_PROGRAM = gl.createProgram();
gl.attachShader(COPY_SHADER_PROGRAM, copy_vertex_shader);
gl.attachShader(COPY_SHADER_PROGRAM, copy_fragment_shader);
gl.linkProgram(COPY_SHADER_PROGRAM);

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

let vertex_code = "uniform vec2 mouse_pos;\n" +
    "uniform mat4 projection;\n" +
    "uniform mat4 view;\n" +
    "uniform mat4 model;\n" +
    "\n" +
    "uniform float time;\n" +
    "uniform float scroll_amount;\n" +
    "uniform bool isMobile;\n" +
    "\n" +
    "attribute vec3 a_vertexPos;\n" +
    "\n" +
    "#define PI 3.141592\n" +
    "#define NBR_OF_ANIM 3\n" +
    "\n" +
    "#define modulo(x, m) x-x/m*m\n" +
    "\n" +
    "vec3 random_pos(vec3 pos) {\n" +
    "    return fract(vec3(192.426, 128.123, 183.123)*sin(pos*vec3(453.12, 264.174, 198.42)))*2.-1.;\n" +
    "}\n" +
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
    "    return mix(a, b, smoothstep(swp_time-swap_area, swp_time, anim_time));\n" +
    "}\n" +
    "\n" +
    "float hash_spark(float x, float a, float b, float delta_time) {\n" +
    "    return fract(824.223*sin(293.124*x))*(b-a-delta_time)+a;\n" +
    "}\n" +
    "\n" +
    "vec3 swap_spark_vec3(vec3 a, vec3 b, float anim_time, float swp_time, float swap_area, float delta_time) {\n" +
    "    float spark_delta_time = delta_time * a_vertexPos.z;\n" +
    "    float spark_swp_time = hash_spark(a_vertexPos.x+a_vertexPos.y+a_vertexPos.z, swp_time-swap_area, swp_time, delta_time);\n" +
    "    return mix(mix(a, 2.*b, smoothstep(spark_swp_time-delta_time, spark_swp_time, anim_time)), mix(2.*b, b, smoothstep(spark_swp_time-delta_time, spark_swp_time, anim_time))\n" +
    "    , smoothstep(spark_swp_time-delta_time, spark_swp_time, anim_time));\n" +
    "}\n" +
    "\n" +
    "vec3 project_onto_torus(vec3 p) {\n" +
    "   vec3 pp = vec3(p.x, 0, p.z);\n" +
    "   pp = normalize(pp);\n" +
    "   return pp+0.3*normalize(p-pp);\n" +
    "}\n" +
    "\n" +
    "vec3 dust_cloud(vec3 vertex_pos, float anim_time) {\n" +
    "   vec3 mod_vertexPos = mod(vertex_pos+vec3(0, anim_time*3., 0),2.)-1.;\n" +
    "   return mod_vertexPos;\n" +
    "}\n" +
    "\n" +
    "\n" +
    "\n" +
    "vec3 weird_circle(vec3 vertex_pos, float anim_time) {\n" +
    "    float mid_transi = .5;" +
    "    vec3 anchor_pos = vertex_pos;\n" +
    "    anchor_pos.xy = (floor(vertex_pos.xy)+vec2(.5))*0.6;\n" +
    "\n" +
    "    float angle = vertex_pos.z*(anim_time-mid_transi)*50.;\n" +
    "    float mix_amount = mix(0., vertex_pos.z*.2, smoothstep(0., 0.1, (anim_time-mid_transi)*(anim_time-mid_transi)));\n" +
    "    anchor_pos.xy = rotate(angle) * anchor_pos.xy;\n" +
    "\n" +
    "    float sign = anchor_pos.y/abs(anchor_pos.y);\n" +
    "    angle = atan(anchor_pos.x/ anchor_pos.y)+PI*(1.+sign)*.5;\n" +
    "\n" +
    "    float max_spike_count = 7.;\n" +
    "    float spike_count = max(0., floor((anim_time-mid_transi)*2.*max_spike_count/(1.-mid_transi)));\n" +
    "\n" +
    "    float prev_ray_mult = 1.+(0.1*sin(1.*time+angle*spike_count));\n" +
    "    float next_ray_mult = 1.+(0.1*sin(1.*time+angle*(spike_count+1.)));\n" +
    "    float ray = mix(prev_ray_mult, next_ray_mult, smoothstep(0., 1., fract(max(0., anim_time-mid_transi)*2.*max_spike_count/(1.-mid_transi))));\n" +
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
    "    torus_pos.yz *= rotate(20. * anim_time);\n" +
    "    torus_pos.xy *= rotate(14. * anim_time * 0.2 + time * 0.1);\n" +
    "    return torus_pos*.35+vec3(0, 0, -0.5);\n" +
    "}\n" +
    "\n" +
    "void main() {\n" +
    "\n" +
    "    float anim_dur[NBR_OF_ANIM];\n" +
    "    anim_dur[0] = 12.0;\n" +
    "    anim_dur[1] = 18.0;\n" +
    "    anim_dur[2] = 10.0;\n" +
    "\n" +
    "    float anim_swp_area[NBR_OF_ANIM];\n" +
    "    anim_swp_area[0] = 2.;\n" +
    "    anim_swp_area[1] = 4.;\n" +
    "    anim_swp_area[2] = 3.;\n" +
    "\n" +
    "    float anim_swp_time[NBR_OF_ANIM+1];\n" +
    "\n" +
    "    float total_duration = 0.;\n" +
    "    for (int i = 0; i < NBR_OF_ANIM; i++) {\n" +
    "        anim_swp_time[i] = total_duration;\n" +
    "        total_duration += anim_dur[i];\n" +
    "    }\n" +
    "    anim_swp_time[NBR_OF_ANIM] = total_duration;\n" +
    "\n" +
    "\n" +
    "    float anim_time = fract((0.03 * time + scroll_amount) / total_duration) * total_duration;\n" +
    "\n" +
    "    int curr_anim_nbr = NBR_OF_ANIM;\n" +
    "    for (int i = 0; i < NBR_OF_ANIM+1; i++) {\n" +
    "        if (anim_time < anim_swp_time[i]) {\n" +
    "            curr_anim_nbr = i-1;\n" +
    "            break;\n" +
    "        }\n" +
    "    }\n" +
    "\n" +
    "    vec3 start_pos;\n" +
    "    vec3 end_pos;\n" +
    "    vec3 mod_vertexPos;\n" +
    "\n" +
    "    const int ANIM_0 = 0;\n" +
    "    if (ANIM_0 == curr_anim_nbr || ANIM_0 == curr_anim_nbr+1 || curr_anim_nbr+1 == NBR_OF_ANIM) {\n" +
    "        vec3 local_pos = dust_cloud(a_vertexPos, local_anim_time(anim_time, anim_swp_time[ANIM_0], anim_swp_time[ANIM_0 + 1]));\n" +
    "        if (ANIM_0 == curr_anim_nbr) {\n" +
    "            start_pos = local_pos;\n" +
    "        } else {\n" +
    "            end_pos = local_pos;\n" +
    "        }\n" +
    "    }\n" +
    "\n" +
    "    const int ANIM_1 = 1;\n" +
    "    if (ANIM_1 == curr_anim_nbr || ANIM_1 == curr_anim_nbr+1) {\n" +
    "        float weird_circle_time = local_anim_time(anim_time, anim_swp_time[ANIM_1], anim_swp_time[ANIM_1 +1]);\n" +
    "        vec3 local_pos = weird_circle(a_vertexPos, weird_circle_time);\n" +
    "        if (ANIM_1 == curr_anim_nbr+1) {\n" +
    "            end_pos = local_pos;\n" +
    "            mod_vertexPos = swap_vec3(start_pos, end_pos, anim_time, anim_swp_time[ANIM_1], anim_swp_area[ANIM_1]);\n" +
    "        } else {\n" +
    "            start_pos = local_pos;\n" +
    "        }\n" +
    "    }\n" +
    "\n" +
    "    const int ANIM_2 = 2;\n" +
    "    if (ANIM_2 == curr_anim_nbr || ANIM_2 == curr_anim_nbr+1) {\n" +
    "        float torus_time = local_anim_time(anim_time, anim_swp_time[ANIM_2], anim_swp_time[ANIM_2 + 1]);\n" +
    "        vec3 local_pos = torus(a_vertexPos, torus_time);\n" +
    "        if (ANIM_2 == curr_anim_nbr+1) {\n" +
    "            end_pos = local_pos;\n" +
    "            mod_vertexPos = swap_vec3(start_pos, end_pos, anim_time, anim_swp_time[ANIM_2], anim_swp_area[ANIM_2]);\n" +
    "        } else {\n" +
    "            start_pos = local_pos;\n" +
    "        }\n" +
    "    }\n" +
    "\n" +
    "    if (curr_anim_nbr == NBR_OF_ANIM-1) {\n" +
    "        mod_vertexPos = mix(start_pos, end_pos, 1.-pow(min(1., (total_duration-anim_time)/anim_swp_area[0]), 2.));\n" +
    "    }\n" +
    "\n" +
    "    if (!isMobile) {\n" +
    "        mod_vertexPos.xz *= rotate(mouse_pos.x * 0.1);\n" +
    "        mod_vertexPos.yz *= rotate(mouse_pos.y * 0.1);\n" +
    "    }\n" +
    "\n" +
    "    gl_Position = projection * view * vec4(mod_vertexPos, 1.);\n" +
    "    gl_PointSize = min(4., 5. * pow((mod_vertexPos.z + 1.) * .5, 1.));\n" +
    "}\n";

// MAKE SPARKS

let fragment_code = "" +
    "precision mediump float;" +
    "" +
    "void main() {" +
    "   gl_FragColor = vec4(1.);" +
    "}";

let vertex_shader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertex_shader, vertex_code)
gl.compileShader(vertex_shader);

let fragment_shader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragment_shader, fragment_code)
gl.compileShader(fragment_shader);

const RAW_POINT_SHADER_PROGRAM = gl.createProgram();
gl.attachShader(RAW_POINT_SHADER_PROGRAM, vertex_shader);
gl.attachShader(RAW_POINT_SHADER_PROGRAM, fragment_shader);
gl.linkProgram(RAW_POINT_SHADER_PROGRAM);


gl.useProgram(RAW_POINT_SHADER_PROGRAM);


// Creating a buffer with 10_000 random points
const VERTICES_COUNT = 10_000;
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


let aspect_ratio = canvas.offsetWidth/canvas.offsetHeight;
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

let min_dt_frame = 16; // 64fps

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

let animate = async function(time) {


    let dt = time - previous_time;
    if (dt < min_dt_frame) {
        await sleep(min_dt_frame-dt);
    }

    previous_time = time;

    // REMANENCE EFFECT
    attenuation = Math.min(max_attenuation * Math.abs(scroll_speed) * attenuation_sensitivity + (1. - attenuation_sensitivity) * attenuation * attenuation_drag, max_attenuation);
    let attenuation_correction = Math.max(1., dt/min_dt_frame);

    // COMPUTING CAMERA MATRICES
    let zoom = 0.5;
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

function sign(a) {
    if (a < 0) {
        return -1;
    } else if (a > 0) {
        return 1;
    }
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

function onWindowResize(event) {
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

if(document.addEventListener){
      document.addEventListener('wheel',mouseScroll,false);
 }


function mouseScroll(e) {
    scroll_speed += e.deltaY*scroll_sensitivity;
    scroll_speed = Math.max(Math.min(scroll_speed, max_scroll_speed), -max_scroll_speed);
}

// Resize canvas event
window.addEventListener("resize", onWindowResize)

function handleMouseMove(event) {
    var eventDoc, doc, body;
    mouse_pos = [(event.x) / canvas.offsetHeight, 1. - event.y / canvas.offsetHeight];
}

let isMobile = true;
window.addEventListener("load", () => {
    isMobile = navigator.userAgent.toLowerCase().match(/mobile/i);

    if (isMobile) {
        min_dt_frame = 64;
        update_scroll = update_scroll_mobile;
    }
    else {
        document.onmousemove = handleMouseMove;
        update_scroll = update_scroll_computer;
    }
});



animate(0);
