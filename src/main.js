require('file-loader?name=[name].[ext]!../index.html');

const THREE = require('three');
const OrbitControls = require('three-orbit-controls')(THREE)

import DAT from 'dat-gui'
import Stats from 'stats-js'
import RenderShader from './render-shader'

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

    scene.add(new THREE.AxisHelper(20));
    scene.add(new THREE.DirectionalLight(0xffffff, 1));

    camera.position.set(128, 128, 128);
    camera.lookAt(new THREE.Vector3(32,0,32));
    
    controls.target.set(0,0,0);
    var renderShader = new RenderShader(renderer, scene, camera, window.innerWidth, window.innerHeight);

    window.addEventListener('resize', function() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderShader.setSize(window.innerWidth, window.innerHeight);
    });

    (function tick() {
        controls.update();
        stats.begin();
        renderShader.update(camera);
        renderShader.render();
        stats.end();
        requestAnimationFrame(tick);
    })();
});