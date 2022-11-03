uniform vec2 mouse_pos;
uniform mat4 projection;
uniform mat4 view;
uniform mat4 model;

uniform float time;
uniform float scroll_amount;

attribute vec3 a_vertexPos;

#define PI 3.141592
#define NBR_OF_ANIM 3

#define modulo(x, m) x-x/m*m

vec3 random_pos(vec3 pos) {
    return fract(vec3(192.426, 128.123, 183.123)*sin(pos*vec3(453.12, 264.174, 198.42)))*2.-1.;
}

mat2 rotate(float ang) {
   return mat2(cos(ang), sin(ang), -sin(ang), cos(ang));
}

float local_anim_time(float time, float anim_start, float anim_end) {
    return (time - anim_start)/(anim_end - anim_start);
}

vec3 swap_vec3(vec3 a, vec3 b, float anim_time, float swp_time, float swap_area) {
    return mix(a, b, smoothstep(swp_time-swap_area, swp_time, anim_time));
}

float hash_spark(float x, float a, float b, float delta_time) {
    return fract(824.223*sin(293.124*x))*(b-a-delta_time)+a;
}

vec3 swap_spark_vec3(vec3 a, vec3 b, float anim_time, float swp_time, float swap_area, float delta_time) {
    float spark_delta_time = delta_time * a_vertexPos.z;
    float spark_swp_time = hash_spark(a_vertexPos.x+a_vertexPos.y+a_vertexPos.z, swp_time-swap_area, swp_time, delta_time);
    return mix(mix(a, 2.*b, smoothstep(spark_swp_time-delta_time, spark_swp_time, anim_time)), mix(2.*b, b, smoothstep(spark_swp_time-delta_time, spark_swp_time, anim_time))
    , smoothstep(spark_swp_time-delta_time, spark_swp_time, anim_time));
}

vec3 project_onto_torus(vec3 p) {
   vec3 pp = vec3(p.x, 0, p.z);
   pp = normalize(pp);
   return pp+0.3*normalize(p-pp);
}

vec3 dust_cloud(vec3 vertex_pos, float anim_time) {
   vec3 mod_vertexPos = mod(vertex_pos+vec3(0, anim_time*9., 0),2.)-1.;
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
    float spike_count = max(0., floor((anim_time-.5)*4.*max_spike_count));

    float prev_ray_mult = 1.+(0.1*sin(1.*time+angle*spike_count));
    float next_ray_mult = 1.+(0.1*sin(1.*time+angle*(spike_count+1.)));
    float ray = mix(prev_ray_mult, next_ray_mult, smoothstep(0., 1., fract(max(0., anim_time-.5)*4.*max_spike_count)));

    anchor_pos.xy *= ray;

    vec3 mod_vertex_pos = mix(anchor_pos, vertex_pos, mix_amount);

   return mod_vertex_pos;
}



vec3 torus(vec3 vertex_pos, float anim_time) {
    vec3 torus_pos = project_onto_torus(vertex_pos * 1.8);
    torus_pos.yz *= rotate(20. * anim_time);
    torus_pos.xy *= rotate(14. * anim_time * 0.2 + time * 0.1);
    return torus_pos*.35+vec3(0, 0, -0.5);
}

void main() {

    float anim_dur[NBR_OF_ANIM];
    anim_dur[0] = 12.0;
    anim_dur[1] = 18.0;
    anim_dur[2] = 10.0;

    float anim_swp_area[NBR_OF_ANIM];
    anim_swp_area[0] = 2.;
    anim_swp_area[1] = 4.;
    anim_swp_area[2] = 3.;

    float anim_swp_time[NBR_OF_ANIM+1];

    float total_duration = 0.;
    for (int i = 0; i < NBR_OF_ANIM; i++) {
        anim_swp_time[i] = total_duration;
        total_duration += anim_dur[i];
    }
    anim_swp_time[NBR_OF_ANIM] = total_duration;


    float anim_time = fract((0.03 * time + scroll_amount) / total_duration) * total_duration;

    int curr_anim_nbr = NBR_OF_ANIM;
    for (int i = 0; i < NBR_OF_ANIM+1; i++) {
        if (anim_time < anim_swp_time[i]) {
            curr_anim_nbr = i-1;
            break;
        }
    }

    vec3 start_pos;
    vec3 end_pos;
    vec3 mod_vertexPos;

    const int ANIM_0 = 0;
    if (ANIM_0 == curr_anim_nbr || ANIM_0 == curr_anim_nbr+1 || curr_anim_nbr+1 == NBR_OF_ANIM) {
        vec3 local_pos = dust_cloud(a_vertexPos, local_anim_time(anim_time, anim_swp_time[ANIM_0], anim_swp_time[ANIM_0 + 1]));
        if (ANIM_0 == curr_anim_nbr) {
            start_pos = local_pos;
        } else {
            end_pos = local_pos;
        }
    }

    const int ANIM_1 = 1;
    if (ANIM_1 == curr_anim_nbr || ANIM_1 == curr_anim_nbr+1) {
        float weird_circle_time = local_anim_time(anim_time, anim_swp_time[ANIM_1], anim_swp_time[ANIM_1 +1]);
        vec3 local_pos = weird_circle(a_vertexPos, weird_circle_time);
        if (ANIM_1 == curr_anim_nbr+1) {
            end_pos = local_pos;
            mod_vertexPos = swap_vec3(start_pos, end_pos, anim_time, anim_swp_time[ANIM_1], anim_swp_area[ANIM_1]);
        } else {
            start_pos = local_pos;
        }
    }

    const int ANIM_2 = 2;
    if (ANIM_2 == curr_anim_nbr || ANIM_2 == curr_anim_nbr+1) {
        float torus_time = local_anim_time(anim_time, anim_swp_time[ANIM_2], anim_swp_time[ANIM_2 + 1]);
        vec3 local_pos = torus(a_vertexPos, torus_time);
        if (ANIM_2 == curr_anim_nbr+1) {
            end_pos = local_pos;
            mod_vertexPos = swap_vec3(start_pos, end_pos, anim_time, anim_swp_time[ANIM_2], anim_swp_area[ANIM_2]);
        } else {
            start_pos = local_pos;
        }
    }

    if (curr_anim_nbr == NBR_OF_ANIM-1) {
        mod_vertexPos = mix(start_pos, end_pos, 1.-pow(min(1., (total_duration-anim_time)/anim_swp_area[0]), 2.));
    }


    mod_vertexPos.xz *= rotate(mouse_pos.x * 0.1);
    mod_vertexPos.yz *= rotate(mouse_pos.y * 0.1);


    gl_Position = projection * view * vec4(mod_vertexPos, 1.);
    gl_PointSize = min(5., 5. * pow((mod_vertexPos.z + 1.) * .5, 1.));
}
