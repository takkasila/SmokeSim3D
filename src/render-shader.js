const THREE = require('three');
const EffectComposer = require('three-effectcomposer')(THREE)

// change to class
export default class RenderShader{
    constructor(renderer, scene, camera, width, height)
    {
        this.composer = new EffectComposer(renderer);
        this.shaderPass = new EffectComposer.ShaderPass({
            uniforms: {
                u_buffer: {
                    type: '4fv',
                    value: undefined
                },
                u_count: {
                    type: 'i',
                    value: 0
                },
                u_cam_pos: {
                    type: '3fv',
                    value: camera.position
                },
                u_cam_up: {
                    type: '3fv',
                    value: new THREE.Vector3(0,1,0)
                },
                u_cam_lookAt: {
                    type: '3fv',
                    value: new THREE.Vector3(0,0,0)
                },
                u_cam_vfov: {
                    type: 'f',
                    value: camera.fov
                },
                u_cam_near: {
                    type: 'f',
                    value: camera.near
                },
                u_cam_far: {
                    type: 'f',
                    value: camera.far
                },
                u_screen_width: {
                    type: 'f',
                    value: width
                },
                u_screen_height: {
                    type: 'f',
                    value: height
                }
            },
            vertexShader: require('./glsl/pass-vert.glsl'),
            fragmentShader: require('./glsl/render-frag.glsl')
        });
        this.shaderPass.renderToScreen = true;
        this.composer.addPass(this.shaderPass);
    }

    render()
    {
        this.composer.render();
    }

    setSize(width, height) {
        this.shaderPass.material.uniforms.u_screen_width.value = width;
        this.shaderPass.material.uniforms.u_screen_height.value = height;
    }

    update(camera){
        this.shaderPass.material.uniforms.u_cam_pos.value = camera.position;
    }
};