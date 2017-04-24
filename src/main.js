require('file-loader?name=[name].[ext]!../index.html');

const THREE = require('three');
const OrbitControls = require('three-orbit-controls')(THREE)

import DAT from 'dat-gui'
import Stats from 'stats-js'
import FluidSolver from './fluid_solver'

window.addEventListener('load', function() {
    var stats = new Stats();
    stats.setMode(1);
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.left = '0px';
    stats.domElement.style.top = '0px';
    document.body.appendChild(stats.domElement);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );
    var renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x999999, 1.0);
    document.body.appendChild(renderer.domElement);

    var controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enableZoom = true;
    controls.rotateSpeed = 0.3;
    controls.zoomSpeed = 1.0;
    controls.panSpeed = 2.0;

    var gui = new DAT.GUI();

    camera.position.set(70, 70, 70);
    var lookAt = new Float32Array([32, 0, 32])
    camera.lookAt(new THREE.Vector3(lookAt[0],lookAt[1],lookAt[2]));
    
    controls.target.set(lookAt[0],lookAt[1],lookAt[2]);

    var fluid = new FluidSolver(64, 64, 64, 0);
    fluid.add_flow(0.47, 0.53, 0.0, 0.05, 0.47, 0.53, 0.8, 0, 1, 0)
    fluid.add_flow(0.47, 0.53, 0.47, 0.53, 0.0, 0.05, 0.8, 0, 0, 1)
    fluid.update(0.05)

    var dataTex = new THREE.DataTexture(fluid.denseUI8, fluid.width, fluid.height*fluid.tall, THREE.LuminanceFormat, THREE.UnsignedByteType);
    dataTex.magFilter = THREE.LinearFilter;
    dataTex.needsUpdate = true;

    var myPlaneMaterial = new THREE.ShaderMaterial({
        uniforms:{
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
                value: new THREE.Vector3(lookAt[0],lookAt[1],lookAt[2])
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
                value: window.innerWidth
            },
            u_screen_height: {
                type: 'f',
                value: window.innerHeight
            },
            u_texture:{
                type: 't',
                value: dataTex
            }
        },
        vertexShader: require('./glsl/pass-vert.glsl'),
        fragmentShader: require('./glsl/render-frag.glsl')
    })
    var myPlaneGeo = new THREE.PlaneBufferGeometry(2, 2);
    var myPlane = new THREE.Mesh(myPlaneGeo, myPlaneMaterial);
    myPlane.position.set(0, 0, 5);
    scene.add(myPlane);

    window.addEventListener('resize', function() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        myPlaneMaterial.uniforms.u_screen_width.value = window.innerWidth;
        myPlaneMaterial.uniforms.u_screen_height.value = window.innerHeight;
    });

    (function tick() {
        controls.update();
        stats.begin();
        myPlaneMaterial.uniforms.u_cam_pos.value = camera.position;

        fluid.add_flow(0.47, 0.53, 0.0, 0.05, 0.47, 0.53, 1, 0, 1, 0)
        fluid.add_flow(0.47, 0.53, 0.47, 0.53, 0.0, 0.05, 0.8, 0, 0, 1)
        fluid.update(0.05)
        dataTex.needsUpdate = true;

        renderer.render(scene, camera);
        stats.end();
        requestAnimationFrame(tick);
    })();
});