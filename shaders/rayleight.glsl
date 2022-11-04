precision mediump float;

#define MAX_STEPS 500
#define SURF_DIST .001
#define MAX_DIST 10000.
#define PI 3.141592
#define NBR_PTS 30.
#define NBR_PTS_INT 10.
#define DIST_C 15.
#define PH_STR_INT .1
#define PH_STR .04

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

struct Ray {
    vec3 o;
    vec3 d;
};

float hash(float th) {
    return fract(654139.*sin(9875445.*th));
}

mat2 rot(float th) {
    return mat2(cos(th), sin(th), -sin(th), cos(th));
}

vec3 col_ladder(float t) {
    vec3 aa = mix(vec3(0., 1., 0.), vec3(0., 0., 1.), (t-1./3.)*3./2.);
    return mix(vec3(1., 0., 0.), aa, t*3./2.);
}

float sphere_sdf(vec3 p, float rd) {
    return length(p) - rd;
}

float smin( float d1, float d2, float k ) {
    float h = clamp( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 );
    return mix( d2, d1, h ) - k*h*(1.0-h); }

float map(vec3 p) {
    float atms = sphere_sdf(p-vec3(400., 0., 0.), 250.);
    return atms;
}

vec2 mapIA(vec3 p) {
    float atms = -sphere_sdf(p-vec3(400., 0., 0.), 250.);
    float planet = sphere_sdf(p-vec3(400., 0., 0.)+sin(p.x/40.)*sin(p.y/18.)*sin(p.z/9.), 200.);
    if (atms < planet) {
        return vec2(atms, 0.);
    }
    return vec2(planet, 1.);
}

vec3 getNormal(vec3 p) {
    vec2 e = vec2(.001, 0.);
    return normalize(vec3(mapIA(p+e.xyy).x - mapIA(p-e.xyy).x, 
                          mapIA(p+e.yxy).x - mapIA(p-e.yxy).x, 
                          mapIA(p+e.yyx).x - mapIA(p-e.yyx).x));
}

float rayMarch(Ray ray) {
    float d = 0.;
    for (int i = 0 ; i < MAX_STEPS ; i++) {
        vec3 p = ray.o + d * ray.d;
        float dd = map(p);
        d += dd;
        if (d > MAX_DIST) { return -1.; }
        if (dd < SURF_DIST) { break; }
    }
    return max(0., d);
}

vec2 rayMarchIA(Ray ray) {
    vec2 d = vec2(0., 0.);
    for (int i = 0 ; i < MAX_STEPS ; i++) {
        vec3 p = ray.o + d.x * ray.d;
        vec2 dd = mapIA(p);
        d.x += dd.x;
        d.y = dd.y;
        if (dd.x < SURF_DIST) { break; }
    }
    return d;
}


float getShadow(Ray ray, float tmin, float tmax) {
    float t = tmin;
    for (int i = 0 ; i < MAX_STEPS ; i++) {
        vec2 dt = mapIA(ray.o + t * ray.d);
        t += dt.x;
        if (dt.x < SURF_DIST) { return (-dt.y); }
    }
    return 1.;
}

float density(vec3 p) {
    return (length(p-vec3(400., 0., 0.)) - 200.)/200.;
}

vec3 get_int_trav(Ray ray, float dmax) {
    float step_dist = dmax / NBR_PTS_INT;
    vec3 color = vec3(1.);
    for (float i = NBR_PTS_INT ; i > 0. ; i--) {
        vec3 pt = ray.o + (i-.5) * step_dist * ray.d;
        vec3 att_col = vec3(1., 4., 16.) * 8. / 3. * PH_STR_INT / 16.;
        color *= (vec3(1.) - pow(att_col, vec3(DIST_C / step_dist)))*pow((1.-density(pt)),.05);
    }
    return color;
}

vec3 get_int_col(float costh, vec3 p) {
    return vec3(1., 4., 16.) * (1. + costh * costh) * PH_STR;
}

vec3 mld(vec3 p) {
    vec3 fwd = vec3(-.1, 0., 0.);
    fwd.xz *= rot(u_time/3.);
    vec3 mlp = vec3(400., 0., 0.) + 50000. * fwd;
   return normalize(mlp - p);
}

bool isStar(float a, float b) {
    a = hash(a);
    b = hash(b);
    return a < .00001 && b < .000001;
}

vec3 getColor(Ray ray) {

    vec3 space_black = vec3(0.0, 0.0, 0.0);
    vec3 end_color = vec3(0.0275, 0.1725, 0.2549);

    vec3 mat_col = vec3(1.);

    vec3 amb_col = vec3(0.9922, 0.9373, 0.7608);
    float amb_int = .1;

    float mldot = dot(ray.d, mld(ray.o));
    vec3 mlc = vec3(1.0, 0.9333, 0.7255);
    vec3 sun_color = vec3(1.0, 0.9647, 0.6353)*10.2;

    float lpart = .006;
    
    float dist_to_atm = rayMarch(ray);
    if (dist_to_atm < 0.) {
        return mix(space_black, sun_color, smoothstep(0.9995, 1., mldot));
    }

    ray.o = ray.o + dist_to_atm * ray.d;
    ray.o += getNormal(ray.o)*.01;
    vec2 dist_through_atm = rayMarchIA(ray);

    if (dist_through_atm.y <= 0.) {
        end_color = mix(space_black, sun_color, smoothstep(0.9995, 1., mldot));

        //if (isStar(dot(ray.d, vec3(0., 1., 0.)), dot(ray.d, vec3(1., 0., 0.)))) {
        //    end_color = vec3(1.);
        //}
    } 
    else
    {
        float d = dist_through_atm.x;
        vec3 p = ray.o + d * ray.d;
        vec3 n = getNormal(p);
        float ml_diff = max(0., dot(n, mld(p)));
        end_color = (amb_col * amb_int + ml_diff * mlc) * mat_col;
    }

    vec3 mix_color = end_color;

    float step_dist = dist_through_atm.x / NBR_PTS;

    for (float i = NBR_PTS ; i > 0. ; i--) {

        vec3 pti = ray.o + (step_dist * (i-.5)) * ray.d;
        Ray ray_to_sun = Ray(pti, mld(pti));
        vec2 dist_through_atm_to_sun = rayMarchIA(ray_to_sun);
        float pt_sha = 1.;
        if (dist_through_atm_to_sun.y > 0.) {
            pt_sha = 0.;
        }
        vec3 ltarrvl = get_int_col(dot(mld(pti), ray.d), pti) * mlc * pt_sha * get_int_trav(ray_to_sun, dist_through_atm_to_sun.x);
        mix_color += ltarrvl * lpart * step_dist;
        mix_color *= get_int_trav(ray_to_sun, step_dist);

    }
    return mix_color;
}

Ray getRay(vec3 camPos, vec3 lookAt, float zoom, vec2 uv) {
    vec3 fwd = normalize(lookAt - camPos);
    vec3 up = vec3(0., 0., 1.);
    vec3 rgt = cross(fwd, up);
    vec3 pt_on_sc = fwd * zoom + uv.x * rgt + uv.y * up;
    return Ray(camPos, normalize(pt_on_sc));
}

void main() {
    vec2 uv = (2. * gl_FragCoord.xy - u_resolution.xy) / u_resolution.y;
    vec3 camPos = vec3(0., 0., 0.);
    vec3 lookDir = vec3(1., 0., 0.);
    vec3 lookAt = camPos + lookDir;
    float zoom = 1.;
    Ray ray = getRay(camPos, lookAt, zoom, uv);
    vec3 c = getColor(ray);
    c = pow(c, vec3(.4545));
    gl_FragColor = vec4(c, 1.);
}