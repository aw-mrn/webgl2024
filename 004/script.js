// ============================================================================
// 課題：Raycaster と Plane（板）を使ってなにか作ってみる

// 【手順】
// ・Plane（板）を円状に並べる
// → planeをまず表示
//   for文で表示
// ・円状に並べたものを、グループにして見える位置をかえる
// ・円状に並べたPlane（板）に画像を貼り付ける
// 
// ============================================================================

import * as THREE from '../lib/three.module.js';

window.addEventListener('DOMContentLoaded', async () => {
  const wrapper = document.querySelector('#webgl');
  const app = new ThreeApp(wrapper);
  // await app.load();
  app.init();
  app.render();
}, false);


class ThreeApp {

  /**
   * レンダラー定義のための定数
   */
  static RENDERER_PARAM = {
    clearColor: 0xffffff,
    width: window.innerWidth,
    height: window.innerHeight,
  };
  /**
   * カメラ定義のための定数
   */
  static CAMERA_PARAM = {
    fovy: 60,
    aspect: window.innerWidth / window.innerHeight,
    near: 0.1,
    far: 50.0,
    position: new THREE.Vector3(0.0, 0.0, 10.0),
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  };
  /**
   * 平行光源定義のための定数
   */
  static DIRECTIONAL_LIGHT_PARAM = {
    color: 0xffffff,
    intensity: 1.0,
    position: new THREE.Vector3(1.0, 1.0, 1.0),
  };
  /**
   * アンビエントライト定義のための定数
   */
  static AMBIENT_LIGHT_PARAM = {
    color: 0xffffff,
    intensity: 0.1,
  };

  wrapper;          // canvas の親要素
  renderer;         // レンダラ
  scene;            // シーン
  camera;           // カメラ
  directionalLight; // 平行光源（ディレクショナルライト）
  ambientLight;     // 環境光（アンビエントライト）

  group;
  plane;            // 板ポリゴン


  /**
   * コンストラクタ
   */
  constructor(wrapper) {
    // 初期化時に canvas を append できるようにプロパティに保持
    this.wrapper = wrapper;

    // this のバインド
    this.render = this.render.bind(this);

    // ウィンドウのリサイズを検出できるようにする
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }, false);

  }


  /**
   * 初期化処理
   */
  init() {

    /**
     * レンダラー
     */
    const color = new THREE.Color(ThreeApp.RENDERER_PARAM.clearColor);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(color);
    this.renderer.setSize(ThreeApp.RENDERER_PARAM.width, ThreeApp.RENDERER_PARAM.height);
    this.wrapper.appendChild(this.renderer.domElement);

    /**
     * シーン
     */
    this.scene = new THREE.Scene();

    /**
     * カメラ
     */
    this.camera = new THREE.PerspectiveCamera(
      ThreeApp.CAMERA_PARAM.fovy,
      ThreeApp.CAMERA_PARAM.aspect,
      ThreeApp.CAMERA_PARAM.near,
      ThreeApp.CAMERA_PARAM.far,
    );
    this.camera.position.copy(ThreeApp.CAMERA_PARAM.position);
    this.camera.lookAt(ThreeApp.CAMERA_PARAM.lookAt);

    /**
     * ディレクショナルライト（平行光源）
     */
    this.directionalLight = new THREE.DirectionalLight(
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.color,
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.intensity
    );
    this.directionalLight.position.copy(ThreeApp.DIRECTIONAL_LIGHT_PARAM.position);
    this.scene.add(this.directionalLight);

    /**
     * アンビエントライト（環境光）
     */
    this.ambientLight = new THREE.AmbientLight(
      ThreeApp.AMBIENT_LIGHT_PARAM.color,
      ThreeApp.AMBIENT_LIGHT_PARAM.intensity,
    );
    this.scene.add(this.ambientLight);


    /**
     * 板ポリゴン
     */

    this.group = new THREE.Group(); 

    const planeGeometry = new THREE.PlaneGeometry(0.30, 0.30);
    const planeMaterial = new THREE.MeshBasicMaterial({color: 0x000000});
    const numPlanes = 30.0;
    const radius = 2.0; // 円の半径

    for(let i = 0; i < numPlanes; i++){
      const angle = i * (2 * Math.PI / numPlanes); // 各ポリゴンの角度を計算
      const x = radius * Math.cos(angle); // x座標
      const y = radius * Math.sin(angle); // y座標

      const plane = new THREE.Mesh(planeGeometry, planeMaterial);
      plane.position.set(x, y, 0); // 計算した座標にポリゴンを配置

      // ポリゴンを中心に向ける（optional）
      plane.lookAt(0, 0, 0);
      // plane.rotation.z = angle;

      // this.scene.add(plane);
      // console.log(plane);

      this.group.add(plane);

      this.group.rotation.x = -50;

      this.scene.add(this.group);
    }

  }


  /**
   * 描画処理
   */
  render() {

    // 恒常ループ
    requestAnimationFrame(this.render);

    // コントロールを更新
    // this.controls.update();

    // レンダラーで描画
    this.renderer.render(this.scene, this.camera);

  }

}