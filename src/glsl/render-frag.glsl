uniform vec3 u_cam_pos;
uniform vec3 u_cam_up;
uniform vec3 u_cam_lookAt;
uniform float u_cam_vfov;
uniform float u_cam_near;
uniform float u_cam_far;

uniform float u_screen_width;
uniform float u_screen_height;

varying vec2 f_uv;

#define SCENEBB_POS vec3(0.0, -0.5, 0.0)
#define SCENEBB_SIZE vec3(5.0, 0.5, 5.0)
#define SMOKEBB_POS vec3(0.5)
#define SMOKEBB_SIZE vec3(0.5)

struct Ray {
    vec3 start;
    vec3 dir;
    float depth;
};

vec3 absorb(vec3 originColor, float amount)
{
    float fogAmount = 1.0 - exp(-amount * 1.0);
    vec3 fogColor = vec3(0.5, 0.6, 0.7);
    return mix(originColor, fogColor, fogAmount);
}

vec3 If(bvec3 cond, vec3 resT, vec3 resF)
{
    vec3 res;
    res.x = cond.x ? resT.x : resF.x;
    res.y = cond.y ? resT.y : resF.y;
    res.z = cond.z ? resT.z : resF.z;    

    return res;
}

float intersectRayCube(vec3 rp, vec3 rd, vec3 cp, vec3 cth, out vec2 t)
{	
	rp -= cp;
	
	vec3 m = 1.0 / -rd;
	vec3 o = If(lessThan(rd, vec3(0.0)), -cth, cth);
	
	vec3 uf = (rp + o) * m;
	vec3 ub = (rp - o) * m;
	
	t.x = max(uf.x, max(uf.y, uf.z));
	t.y = min(ub.x, min(ub.y, ub.z));
	
	// if(ray start == inside cube) 
	if(t.x < 0.0 && t.y > 0.0) {t.xy = t.yx;  return 1.0;}
	
	return t.y < t.x ? 0.0 : (t.x > 0.0 ? 1.0 : -1.0);
}

vec3 rayDirection()
{
    // Creat camera plane
    vec2 uv = f_uv * 2.0 - 1.0;
    vec3 view_n = normalize(u_cam_pos - u_cam_lookAt);
    vec3 view_u = normalize(cross(u_cam_up, view_n));
    vec3 view_v = normalize(cross(view_n, view_u));

    vec3 plane_top = view_v * u_cam_near * tan(radians(u_cam_vfov)/2.0);
    vec3 plane_right = view_u * (u_screen_width/u_screen_height) * length(plane_top);
    return normalize(-view_n * u_cam_near + plane_right * uv.x + plane_top * uv.y);
}

float densityTrace(Ray ray)
{
    vec2 tt;
    if(intersectRayCube(ray.start, ray.dir, SMOKEBB_POS, SMOKEBB_SIZE, tt) > 0.0)
    {
        return abs(tt.x-tt.y);
    }
    else
    {
        return 0.0;
    }
}

vec3 renderScene(Ray ray)
{
    vec2 tt;
    if(intersectRayCube(ray.start, ray.dir, SCENEBB_POS, SCENEBB_SIZE, tt) > 0.0)
    {
        return vec3(250.0/255.0, 208.0/255.0, 192.0/255.0);
    }
    else
    {
        return vec3(0.75);
    }
}

vec3 renderSkyBox(Ray ray)
{
    return vec3(0.75);
}

vec3 render(Ray ray)
{
    vec2 sceneDist;
    vec2 smokeDist;

    if (intersectRayCube(ray.start, ray.dir, SCENEBB_POS, SCENEBB_SIZE, sceneDist) > 0.0)
    {
        vec3 sceneColor = renderScene(ray);
        if(intersectRayCube(ray.start, ray.dir, SMOKEBB_POS, SMOKEBB_SIZE, smokeDist) > 0.0)
        {
            // Hit both
            if(sceneDist.x <= smokeDist.x)
            {
                return sceneColor;
            }
            else
            {
                float totalDense = densityTrace(ray);
                return absorb(sceneColor, totalDense);
            }
        }
        else
        {
            // Hit only scene
            return sceneColor;
        }
    }
    else
    {
        vec3 skyboxColor = renderSkyBox(ray);
        if(intersectRayCube(ray.start, ray.dir, SMOKEBB_POS, SMOKEBB_SIZE, smokeDist) > 0.0)
        {
            // Hit smoke
            float totalDense = densityTrace(ray);
            return absorb(skyboxColor, totalDense);
        }
        else
        {
            // Hit only skybox
            return skyboxColor;
        }
    }
}

void main() {
    Ray ray;
    ray.start = u_cam_pos;
    ray.dir = rayDirection();
    ray.depth = 0.0;

    vec3 sceneColor = renderScene(ray);

    gl_FragColor = vec4(render(ray), 1.0);
}