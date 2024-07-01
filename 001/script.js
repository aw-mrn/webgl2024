// 【課題】
// ・BoxGeometryを使用する
// ・Boxが画面上に100個以上表示される


import * as THREE from '../lib/three.module.js';
import { OrbitControls } from '../lib/OrbitControls.js';


window.addEventListener('DOMContentLoaded', () => {

  const wrapper = document.querySelector('#webgl');

  const app = new ThreeApp(wrapper);

  app.render();

}, false);


class ThreeApp {

  /*/ レンダラ定義 /*/
  static RENDERER_PARAM = {
    clearColor: 0x251D3A,       // 画面をクリアする色
    width: window.innerWidth,   // レンダラーに設定する幅
    height: window.innerHeight, // レンダラーに設定する高さ
  };

  /*/ カメラ定義 /*/
  static CAMERA_PARAM = {
    // 視野角
    fovy: 45,
    // 描画する空間のアスペクト比（縦横比）
    aspect: window.innerWidth / window.innerHeight,
    // 描画する空間のニアクリップ面（最近面）
    near: 0.1,
    // 描画する空間のファークリップ面（最遠面）
    far: 1100.0,
    // カメラの座標
    position: new THREE.Vector3(0.0, 0.0, 1000.0),
    // カメラの注視点
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  };

  /*/ マテリアル定義 /*/
  static MATERIAL_PARAM = {
    color: 0xffff00,
  };

  /*/ 平行光源定義 /*/
  static DIRECTIONAL_LIGHT_PARAM = {
    color: 0xffffff,                            // 光の色
    intensity: 3.0,                             // 光の強度
    position: new THREE.Vector3(1.0, 1.0, 1.0), // 光の向き(XYZ)
  };

  /*/ 環境光 /*/
  static AMBIENT_LIGHT_PARAM = {
    color: 0xeeeeee, // 光の色
    intensity: 1,  // 光の強度
  };

  /*/ インスタンス変数の宣言 /*/
  renderer; // レンダラ
  scene;    // シーン
  camera;   // カメラ
  geometry; // ジオメトリ
  material; // マテリアル
  box;      // ボックスメッシュ
  controls; // オービットコントロール
  // axesHelper; // 軸ヘルパー
  isDown;     // キーの押下状態用フラグ
  directionalLight; // 平行光源（ディレクショナルライト）
  ambientLight; // 環境光（アンビエントライト）

  firstMesh;
  meshCount;
  firstPos;
  group;
  randomPos;



  constructor(wrapper) {

    // = ①レンダラの初期化 =====
    const color = new THREE.Color(ThreeApp.RENDERER_PARAM.clearColor);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(color);
    this.renderer.setSize(ThreeApp.RENDERER_PARAM.width, ThreeApp.RENDERER_PARAM.height);
    wrapper.appendChild(this.renderer.domElement);

    // = ②シーンの初期化 =====
    this.scene = new THREE.Scene();

    // = ③カメラの初期化 =====
    this.camera = new THREE.PerspectiveCamera(
      ThreeApp.CAMERA_PARAM.fovy,
      ThreeApp.CAMERA_PARAM.aspect,
      ThreeApp.CAMERA_PARAM.near,
      ThreeApp.CAMERA_PARAM.far,
    );
    this.camera.position.copy(ThreeApp.CAMERA_PARAM.position);
    this.camera.lookAt(ThreeApp.CAMERA_PARAM.lookAt);


    // = 平行光源 =====
    this.directionalLight = new THREE.DirectionalLight(
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.color,
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.intensity
    );
    this.directionalLight.position.copy(ThreeApp.DIRECTIONAL_LIGHT_PARAM.position);
    this.scene.add(this.directionalLight);

    // =環境光 =====
    this.ambientLight = new THREE.AmbientLight(
      ThreeApp.AMBIENT_LIGHT_PARAM.color,
      ThreeApp.AMBIENT_LIGHT_PARAM.intensity,
    );
    this.scene.add(this.ambientLight);


    // // = ジオメトリとマテリアル =====
    this.createBox();


    // = 軸ヘルパー =====
    // const axesBarLength = 10.0;
    // this.axesHelper = new THREE.AxesHelper(axesBarLength);
    // this.scene.add(this.axesHelper);


    // = コントロール =====
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.render = this.render.bind(this); //thisのバインド


    // = キーによっての操作 =====
    this.isDown = false;
    window.addEventListener('keydown', (keyEvent) => {
      switch (keyEvent.key) {
        case ' ':
          this.isDown = true;
          break;
        default:
      }
    }, false);
    window.addEventListener('keyup', (keyEvent) => {
      this.isDown = false;
    }, false);


    // = リサイズイベント =====
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }, false);
  }


  createBox() {
    // グループを作成
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // オブジェクト設定
    this.geometry = new THREE.BoxGeometry(5.0, 5.0 ,5.0)
    this.material = new THREE.MeshPhongMaterial(ThreeApp.MATERIAL_PARAM);

    // パーティクルを箱形に並べる
    //Box型のジオメトリの頂点座標を取得する(四角い形)
    const firstGeometry = new THREE.BoxGeometry(200, 200, 200, 10, 10, 10); //幅200 高さ200 奥行き200 それぞれの方向に10セグメントずつ分割
    this.firstMesh = new THREE.Mesh(firstGeometry, this.material);
    this.firstPos = this.firstMesh.geometry.attributes.position; //firstMeshジオメトリの頂点座標情報を取得。.geometry.attributes.positionはジオメトリの頂点の位置情報を持つ属性

    // パーティクルの数
    this.meshCount = 726;
    // パーティクルを生成
    for(let i = 0; i < this.meshCount; i++) {
      // メッシュ生成
      this.mesh = new THREE.Mesh(this.geometry, this.material);

      // 四角い形になるように配置 XYZをはこの頂点座標に変更
      this.mesh.position.x = this.firstPos.getX(i);
      this.mesh.position.y = this.firstPos.getY(i);
      this.mesh.position.z = this.firstPos.getZ(i);

      // シーンに追加
      this.group.add(this.mesh);
    }

    // フォグを設定
    this.scene.fog = new THREE.Fog(ThreeApp.RENDERER_PARAM.clearColor, 400, 1500) //色, 開始距離near, 終点距離far
  
    //ランダムな頂点座標を入れるための配列
    this.randomPos = [];
    // ランダムな頂点座標を配列に格納
    for (let i = 0; i < this.meshCount; i++) {
      const x = (Math.random() - 0.5) * 800;
      const y = (Math.random() - 0.5) * 800;
      const z = (Math.random() - 0.5) * 800;
      
      const randomPosObj = { x: x, y: y, z: z };
      this.randomPos.push(randomPosObj); //配列に入れる
    }
  }


  /*/ 描画処理 /*/
  render() {

    // 全体が回る
    this.group.rotation.x += 0.002;
    this.group.rotation.y += 0.002;
    
    // = requestAnimationFrame で描画する =====
    requestAnimationFrame(this.render);


    // = キーによっての操作 =====
    if (this.isDown === true) {
      for (let i = 0; i < this.meshCount; i++) {
        // バラバラにする
        this.group.children[i].position.x = this.firstPos.getX(i) + this.randomPos[i].x;
        this.group.children[i].position.y = this.firstPos.getX(i) + this.randomPos[i].y;
        this.group.children[i].position.z = this.firstPos.getX(i) + this.randomPos[i].z;
      }
    }
    this.renderer.render(this.scene, this.camera);
  }
}
