uniform vec2 mouse_pos;
uniform mat4 projection;
uniform mat4 view;
uniform mat4 model;

uniform float time;
uniform float scroll_amount;

attribute vec3 a_vertexPos;

#define PI 3.141592
#define NBR_OF_ANIM 6

mat2 rotate(float ang) {
   return mat2(cos(ang), sin(ang), -sin(ang), cos(ang));
}

float local_anim_time(float time, float anim_start, float anim_end) {
    return (time - anim_start)/(anim_end - anim_start);
}

vec3 swap_vec3(vec3 a, vec3 b, float anim_time, float swp_time, float swap_area) {
    return mix(a, b, smoothstep(swp_time-swap_area, swp_time+swap_area, anim_time));
}

vec3 project_onto_torus(vec3 p) {
   vec3 pp = vec3(p.x, 0, p.z);
   pp = normalize(pp);
   return pp+0.3*normalize(p-pp);
}

vec3 dust_cloud(vec3 vertex_pos, float anim_time) {
   vec3 mod_vertexPos = mod(vertex_pos+vec3(0, anim_time*4., 0),2.)-1.;
   return mod_vertexPos;
}



vec3 weird_circle(vec3 vertex_pos, float anim_time) {
    vec3 anchor_pos = vertex_pos;
    anchor_pos.xy = (floor(vertex_pos.xy)+vec2(.5))*0.6;

    float angle = vertex_pos.z*(anim_time-.5)*50.;
    float mix_amount = mix(0., vertex_pos.z*.2, smoothstep(0., 0.1, (anim_time-.5)*(anim_time-.5)));
    anchor_pos.xy = rotate(angle) * anchor_pos.xy;

    float sign = anchor_pos.y/abs(anchor_pos.y);
    angle = atan(anchor_pos.x/ anchor_pos.y)+PI*(1.+sign)*.5;

    float max_spike_count = 9.;
    float spike_count = max(0., floor((anim_time-.5)*2.*max_spike_count));

    float prev_ray_mult = 1.+(0.1*sin(1.*time+angle*spike_count));
    float next_ray_mult = 1.+(0.1*sin(1.*time+angle*(spike_count+1.)));
    float ray = mix(prev_ray_mult, next_ray_mult, smoothstep(0., 1., fract(max(0., anim_time-.5)*2.*max_spike_count)));

    anchor_pos.xy *= ray;

    vec3 mod_vertex_pos = mix(anchor_pos, vertex_pos, mix_amount);

   return mod_vertex_pos;
}



vec3 torus(vec3 vertex_pos, float anim_time) {
    vec3 torus_pos = project_onto_torus(vertex_pos * 1.8);
    torus_pos.yz *= rotate(10. * anim_time);
    torus_pos.xy *= rotate(7. * anim_time * 0.2 + time * 0.1);
    return torus_pos*.4+vec3(0, 0, -0.5);
}

void main() {

    float ANIM_DUR[NBR_OF_ANIM];
    ANIM_DUR[0] = 5.0;
    ANIM_DUR[1] = 13.0;
    ANIM_DUR[2] = 6.0;
    ANIM_DUR[3] = 6.0;
    ANIM_DUR[4] = 0.0;

    float anim_swp_area[NBR_OF_ANIM];
    anim_swp_area[0] = 0.5;
    anim_swp_area[1] = 1.0;
    anim_swp_area[2] = 1.5;
    anim_swp_area[3] = 1.3;
    anim_swp_area[4] = 0.5;

    float anim_swp_time[NBR_OF_ANIM];

    float total_duration = 0.;
    for (int i = 0; i < NBR_OF_ANIM; i++) {
        anim_swp_time[i] = total_duration;
        total_duration += ANIM_DUR[i];
    }

    float anim_time = fract((0.03 * time + scroll_amount) / total_duration) * total_duration;

    vec3 dust_cloud_pos = dust_cloud(a_vertexPos, local_anim_time(anim_time, anim_swp_time[0], anim_swp_time[1]));
    vec3 mod_vertexPos = dust_cloud_pos;

    float weird_circle_time = local_anim_time(anim_time, anim_swp_time[1], anim_swp_time[2]);
    vec3 weird_circle_pos = weird_circle(dust_cloud_pos, weird_circle_time);
    mod_vertexPos = swap_vec3(dust_cloud_pos, weird_circle_pos, anim_time, anim_swp_time[1], anim_swp_area[1]);

    float torus_time = local_anim_time(anim_time, anim_swp_time[2], anim_swp_time[3]);
    vec3 torus_pos = torus(a_vertexPos, torus_time);
    mod_vertexPos = swap_vec3(mod_vertexPos, torus_pos, anim_time, anim_swp_time[2], anim_swp_area[2]);

    mod_vertexPos = swap_vec3(mod_vertexPos, dust_cloud_pos, anim_time, anim_swp_time[3], anim_swp_area[3]);

    mod_vertexPos.xz *= rotate(mouse_pos.x * 0.1);
    mod_vertexPos.yz *= rotate(mouse_pos.y * 0.1);

    gl_Position = projection * view * vec4(mod_vertexPos, 1.);
    gl_PointSize = 5. * pow((mod_vertexPos.z + 1.) * .5, 1.);
}


