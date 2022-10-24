
"use strict";

const body_main = document.getElementsByTagName("main")[0];


/* CANVAS SET UP */
var canvas = document.getElementById('my_Canvas');
canvas.setAttribute('width', body_main.offsetWidth.toString());
canvas.setAttribute('height', body_main.offsetHeight.toString());


// Get context
let gl = canvas.getContext('experimental-webgl');

/* GEOMETRY */

const VERTICES_COUNT = 10000;
let vertices = [];

for (let i = 0; i < 3*VERTICES_COUNT; i++) {
    vertices.push(Math.random()*2.-1.);
}

var vertex_buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

/* SHADERS */
var vertex_code = "" +
    "uniform mat4 projection;" +
    "uniform mat4 view;" +
    "uniform mat4 model;" +
    "" +
    "uniform float time;" +
    "uniform float scroll_amount;" +
    "" +
    "attribute vec3 a_vertexPos;" +
    "" +
    "" +
    "void main() {" +
    "   vec3 mod_vertexPos = mod(a_vertexPos+vec3(0, 0.01*time+scroll_amount, 0),2.)-1.;" +
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
gl.useProgram(shaderProgram);

/* Computing shaders uniforms */

var uLoc_projection = gl.getUniformLocation(shaderProgram, "projection");
var uLoc_view = gl.getUniformLocation(shaderProgram, "view");
var uLoc_model = gl.getUniformLocation(shaderProgram, "model");

var uLoc_time = gl.getUniformLocation(shaderProgram, "time");
var uLoc_scroll_amount = gl.getUniformLocation(shaderProgram, "scroll_amount");

var uLoc_vertexPos = gl.getAttribLocation(shaderProgram, "a_vertexPos");
gl.vertexAttribPointer(uLoc_vertexPos, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(uLoc_vertexPos);

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


/* Render Loop */

let scroll_speed = 0;
let scroll_amount = 0;
let scroll_drag = 0.98;
let scroll_sensitivity = 0.003;
var previous_time = 0;

var animate = function(time) {
    var dt = time - previous_time;
    previous_time = time;

    // Setting up draw context
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);

    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.clearDepth(1.0);

    gl.viewport(0.0, 0.0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


    let zoom = 0.5;
    let aspect_ratio = canvas.width/canvas.height;
    let proj_matrix = get_perspective(zoom*aspect_ratio, zoom, 1., 10);
    model_matrix = rotateZ(time*0.00001);

    gl.uniformMatrix4fv(uLoc_projection, false, proj_matrix);
    gl.uniformMatrix4fv(uLoc_view, false, view_matrix);
    gl.uniformMatrix4fv(uLoc_model, false, model_matrix);

    scroll_amount += scroll_speed * dt*0.001;
    scroll_speed *= scroll_drag;
    gl.uniform1f(uLoc_time, time*0.001);
    gl.uniform1f(uLoc_scroll_amount, scroll_amount);

    gl.drawArrays(gl.POINTS, 0, VERTICES_COUNT);

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


animate(0);
