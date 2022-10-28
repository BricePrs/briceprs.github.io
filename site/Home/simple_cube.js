
"use strict";

const body_main = document.getElementsByTagName("main")[0];
/* CANVAS SET UP */

var canvas = document.getElementById('my_Canvas');
document.querySelector('canvas').style.cursor = "none";

canvas.setAttribute('width', body_main.offsetWidth.toString());
canvas.setAttribute('height', body_main.offsetHeight.toString());


// Get context
let gl = canvas.getContext('experimental-webgl');

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
    "void main() {" +
    "   vec3 color = texture2D(raw_scene, uv).rgb;" +
    "   vec3 invert_color = vec3(1.)-color;" +
    "   gl_FragColor = vec4(mix(color, 1.2*invert_color, smoothstep(radius+0.01, radius, .04*sin(time)+length(vec2(aspect_ratio, 1.)*uv-vec2(0.98, 0.56)-mouse_pos)*3.)), 1.);" +
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
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.offsetWidth, canvas.offsetHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);


var framebuffer = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

gl.bindTexture(gl.TEXTURE_2D, null);


/* GEOMETRY */



/* SHADERS */
var vertex_code = "" +
    "uniform vec2 mouse_pos;" +
    "uniform mat4 projection;" +
    "uniform mat4 view;" +
    "uniform mat4 model;" +
    "" +
    "uniform float time;" +
    "uniform float scroll_amount;" +
    "" +
    "attribute vec3 a_vertexPos;" +
    "" +
    "mat2 rotate(float ang) {" +
    "   return mat2(cos(ang), sin(ang), -sin(ang), cos(ang));" +
    "}" +
    "" +
    "vec3 project_onto_torus(vec3 p) {" +
    "   vec3 pp = vec3(p.x, 0, p.z);" +
    "   pp = normalize(pp);" +
    "   return pp+0.3*normalize(p-pp);" +
    "}" +
    "" +
    "void main() {" +
    "   float transi1 = -1.5;" +
    "   float transi2 = 6.5;" +
    "   float transi3 = 12.5;" +
    "   float transi4 = 19.5;" +
    "   float space_pos = fract((0.03*time+scroll_amount)/24.)*24.;" +
    "   vec3 mod_vertexPos = mod(a_vertexPos+vec3(0, space_pos, 0),2.)-1.;" +
    "   float mix_amount = pow(smoothstep(transi1, transi1+5., space_pos),8.);" +
    "   vec3 anchor_pos = mod_vertexPos;" +
    "   anchor_pos.xy = (floor(anchor_pos.xy)+vec2(.5))*0.6;" +
    "   float angle = anchor_pos.z*((space_pos-transi1-8.)*5.);" +
    "   anchor_pos.xy = rotate(angle) * anchor_pos.xy;" +
    "   float mix_regu = smoothstep(0., 2., angle*angle);" +
    "" +
    "" +
    "   float PI = 3.141592;" +
    "   float sign = anchor_pos.y/abs(anchor_pos.y);" +
    "   angle = atan(anchor_pos.x/anchor_pos.y)+PI*(1.+sign)*.5;" +
    "   float ray_mult = 1.+(0.1*sin(5.*time+2.85*PI*angle))*smoothstep(transi2, transi2+2., space_pos);" +
    "   mod_vertexPos.xy = mix(mod_vertexPos.xy, anchor_pos.xy*ray_mult, mix_amount*((1.-mix_regu)+mix_regu*pow(1.-0.5*anchor_pos.z, .4)));" +
    "" +
    "   vec3 torus = project_onto_torus(a_vertexPos*1.8);" +
    "   torus.yz *=rotate(3.*space_pos);" +
    "   torus.xy *=rotate(2.*space_pos*0.2+time*0.1);" +
    "   mod_vertexPos = mix(mod_vertexPos, torus*0.35+vec3(0, 0, -0.5), smoothstep(transi3, transi3+2., space_pos));" +
    "   vec3 mod_vertexPos2 = mod(a_vertexPos+vec3(0, space_pos, 0),2.)-1.;" +
    "   mod_vertexPos = mix(mod_vertexPos, mod_vertexPos2, smoothstep(transi4, transi4+2., space_pos));" +
    "   mod_vertexPos.xz *= rotate(mouse_pos.x*0.3);" +
    "   mod_vertexPos.yz *= rotate(mouse_pos.y*0.3);" +
    "   gl_Position = projection * view * vec4(mod_vertexPos, 1.);" +
    "   gl_PointSize = 5.*pow((mod_vertexPos.z+1.)*.5, 1.);" +
    "}";

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


const VERTICES_COUNT = 30_000;
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
let mouse_pos = [0, 0];

let scroll_sensitivity = 0.003;
var previous_time = 0;

var animate = function(time) {


    var dt = time - previous_time;
    previous_time = time;

    // Setting up draw context

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);


    gl.clearColor(0.1, 0.1, 0.1, 1.0);

    gl.viewport(0.0, 0.0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(shaderProgram);
    gl.vertexAttribPointer(uLoc_vertexPos, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(uLoc_vertexPos);

    let zoom = 0.5;
    let aspect_ratio = canvas.width/canvas.height;
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
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.useProgram(renderProgram);

    gl.uniform1i(uLoc_render_tex, 0);
    gl.uniform1f(uLoc_aspect_ratio, aspect_ratio);
    gl.uniform1f(uLoc_radius, 0.35+scroll_speed/30.);
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
}

window.onmousewheel=document.onmousewheel=mouseScroll;

if(document.addEventListener){
      document.addEventListener('wheel',mouseScroll,false);
 }

function mouseScroll(e) {
    scroll_speed += e.deltaY*scroll_sensitivity;
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
    mouse_pos = [(event.pageX-canvas.offsetWidth/2.)/canvas.offsetHeight, 0.5-event.pageY/canvas.offsetHeight];
    // Use event.pageX / event.pageY here
}

animate(0);
