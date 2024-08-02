import * as THREE from '../lib/three.module.js';
import { OrbitControls } from '../lib/OrbitControls.js';

window.addEventListener('DOMContentLoaded', async () => {
  const wrapper = document.querySelector('#webgl');
  const app = new ThreeApp(wrapper);
  // 順番は以下
  await app.load();
  app.init();
  app.render();
}, false);

class ThreeApp {
  // 定義
  /**
   * レンダラー定義のための定数
   */
  static RENDERER_PARAM = {
    clearColor: 0x000000,
    width: window.innerWidth,
    height: window.innerHeight,
  };
  /**
   * フォグの定義のための定数
   */
  static FOG_PARAM = {
    color: 0xffffff,
    near: 10.0,
    far: 20.0,
  };
  /**
   * カメラ定義のための定数
   */
  static CAMERA_PARAM = {
    fovy: 60,
    aspect: window.innerWidth / window.innerHeight,
    near: 0.1,
    far: 50.0,
    position: new THREE.Vector3(0.0, 2.0, 10.0),
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
    intensity: 0.3,
  };

  // 地球・地球の周りを周回する何か(四角)・マウスに追従する衛星(円錐)・衛星についてくる何か(丸)
  /**
   * マテリアル定義のための定数
   */
  static MATERIAL_PARAM = {
    color: 0xffffff,
  };
  // 地球の周りを周回する何か(四角)
  static OBJECT_PARAM = {
    color: 0xffff00,
  };
  // ポイント
  static POINT_PARAM = {
    color: 0xff0000
  }

  wrapper;          // canvas の親要素
  renderer;         // レンダラ
  scene;            // シーン
  camera;           // カメラ
  directionalLight; // 平行光源（ディレクショナルライト）
  ambientLight;     // 環境光（アンビエントライト）
  controls;         // オービットコントロール
  axesHelper;       // 軸ヘルパー

  earthTexture;     // 地球用テクスチャ(img)
  moonTexture;      // 月用テクスチャ(img)
  sphereGeometry;   // ジオメトリ(球体)
  earthMaterial;    // 地球用マテリアル
  earth;            // 地球
  boxGeometry;      // ジオメトリ(四角)
  objectMaterial;   // 地球の周りを周回する何か用マテリアル
  object;           // 地球の周りを周回する何か
  coneGeometry;     // ジオメトリ(円錐)
  satelliteMaterial;// マウスに追従する衛星(円錐)用マテリアル
  satellite;        // マウスに追従する衛星(円錐)

  clock;            // 時間管理用



  /**
   * コンストラクタ
   * @constructor
   * @param {HTMLElement} wrapper - canvas 要素を append する親要素
   */
  constructor(wrapper) {

    // 初期化時に canvas を append できるようにプロパティに保持
    this.wrapper = wrapper;

    // 再帰呼び出しのための this 固定
    this.render = this.render.bind(this);

    // リサイズイベント
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }, false);


    // マウスカーソルの動きを検出できるようにする => マウスに追従する衛星(円錐)
    window.addEventListener('pointermove', (pointerEvent) => {
      // ポインター（マウスカーソル）のクライアント領域上の座標
      const pointerX = pointerEvent.clientX;
      const pointerY = pointerEvent.clientY;
      // 3D のワールド空間に合わせてスケールを揃える
      const scaleX = pointerX / window.innerWidth * 2.0 - 1.0; // 2倍して1引くことで、-1〜1になる
      const scaleY = pointerY / window.innerHeight * 2.0 - 1.0;
      // ベクトルを単位化する
      // カーソルの座標をvector2クラスに設定
      const vector = new THREE.Vector2( //座標なのかベクトルなのかは実装している本人にしかわからない。なので自分で何なのかわかっておく。
        scaleX,
        scaleY,
      );
      // カーソルの位置に伸びるベクトルとみなしてノーマライズ(単位化)
      vector.normalize();
      // スケールを揃えた値を月の座標に割り当てる
      this.satellite.position.set(
        vector.x * 5,
        0.0,
        vector.y * 5,
      );
    }, false);

  }

  /**
   * アセット（素材）のロードを行う Promise
   */
  load() {
    return new Promise((resolve) => {
      const earthPath = './earth.jpg';
      const loader = new THREE.TextureLoader();
      loader.load(earthPath, (earthTexture) => {
        // 地球用
        this.earthTexture = earthTexture;
        resolve();
      });
    });
  }

  /**
   * 初期化処理
   */
  init() {
    // レンダラー
    const color = new THREE.Color(ThreeApp.RENDERER_PARAM.clearColor);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(color);
    this.renderer.setSize(ThreeApp.RENDERER_PARAM.width, ThreeApp.RENDERER_PARAM.height);
    this.wrapper.appendChild(this.renderer.domElement);

    // シーン
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(
      ThreeApp.FOG_PARAM.color,
      ThreeApp.FOG_PARAM.near,
      ThreeApp.FOG_PARAM.far
    );

    // カメラ
    this.camera = new THREE.PerspectiveCamera(
      ThreeApp.CAMERA_PARAM.fovy,
      ThreeApp.CAMERA_PARAM.aspect,
      ThreeApp.CAMERA_PARAM.near,
      ThreeApp.CAMERA_PARAM.far,
    );
    this.camera.position.copy(ThreeApp.CAMERA_PARAM.position);
    this.camera.lookAt(ThreeApp.CAMERA_PARAM.lookAt);

    // ディレクショナルライト（平行光源）
    this.directionalLight = new THREE.DirectionalLight(
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.color,
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.intensity
    );
    this.directionalLight.position.copy(ThreeApp.DIRECTIONAL_LIGHT_PARAM.position);
    this.scene.add(this.directionalLight);

    // アンビエントライト（環境光）
    this.ambientLight = new THREE.AmbientLight(
      ThreeApp.AMBIENT_LIGHT_PARAM.color,
      ThreeApp.AMBIENT_LIGHT_PARAM.intensity,
    );
    this.scene.add(this.ambientLight);

    this.group = new THREE.Group(); // 地球とポイントを一緒に回す

    // 地球　マテリアルとメッシュ、シーンにアド
    // 球体のジオメトリを生成
    this.sphereGeometry = new THREE.SphereGeometry(2.5, 32, 32);

    this.earthMaterial = new THREE.MeshPhongMaterial(ThreeApp.MATERIAL_PARAM);
    this.earthMaterial.map = this.earthTexture;
    // map = マテリアルにおけるプロパティの一つで、オブジェクトの表面にテクスチャ（画像）を適用するためのもの
    // mapプロパティにテクスチャを指定することで、そのテクスチャがオブジェクトの表面に貼り付けられます。
    this.earth = new THREE.Mesh(this.sphereGeometry, this.earthMaterial);
    this.group.add(this.earth);
    // this.scene.add(this.earth);

    // ポイントの位置
    this.pointMaterial =new THREE.MeshPhongMaterial(ThreeApp.POINT_PARAM);
    this.point = new THREE.Mesh(this.sphereGeometry, this.pointMaterial);
    // this.scene.add(this.point);
    this.point.scale.setScalar(0.04);
    this.point.position.set(0.0, 0.0, 2.8);
    this.group.add(this.point);

    this.scene.add(this.group);


    // 地球の周りを周回する何か(四角)　マテリアルとメッシュ、シーンにアド
    // 四角のジオメトリを生成
    this.boxGeometry = new THREE.BoxGeometry( 0.2, 0.2, 0.2 );

    this.objectMaterial = new THREE.MeshPhongMaterial(ThreeApp.OBJECT_PARAM);
    this.objectMaterial.map = this.objectTexture;
    this.object = new THREE.Mesh(this.boxGeometry, this.objectMaterial);
    this.scene.add(this.object);
    // this.object.position.set(5.0, 0.0, 0.0); ?? これいらない 18

    // マウスに追従する衛星(円錐)　マテリアルとメッシュ、シーンにアド
    // 円錐のジオメトリを生成
    this.coneGeometry = new THREE.ConeGeometry( 0.1, 0.2, 32 );

    this.satelliteMaterial = new THREE.MeshPhongMaterial(ThreeApp.MATERIAL_PARAM);
    this.satellite = new THREE.Mesh(this.coneGeometry, this.satelliteMaterial);
    this.scene.add(this.satellite);


    // - Clock オブジェクト ---------------------------------------------------
    // three.js の Clock オブジェクトを使うと、時間の経過を効率よく取得・調査す
    // ることができます。
    // 内部的に時刻の計測を開始しているか、というフラグがあり初期値は false です
    // が、経過時間を取得する Clock.getElapsedTime などを呼び出すと同時に、自動
    // 的にタイマーがスタートするようになっています。
    // 明示的にいずれかのタイミングでスタートさせたい場合は Clock.start メソッド
    // を用いることで、タイマーのリセットを行うと同時に計測を開始できます。
    // ------------------------------------------------------------------------
    // Clock オブジェクトの生成
    this.clock = new THREE.Clock();


    // コントロール
    // ** マウス操作で次のようにカメラを制御できる
     // * オービット（周回軌道）: 左ボタンでドラッグ
     // * ズーム: マウスホイール
     // * パン: 右ボタンでドラッグ
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);


    // ヘルパー
    const axesBarLength = 8.0;
    this.axesHelper = new THREE.AxesHelper(axesBarLength);
    this.scene.add(this.axesHelper);

  }

  /**
   * 描画処理
   */
  render() {

    // 恒常ループ
    requestAnimationFrame(this.render);

    // コントロールを更新
    this.controls.update();

    // 地球をまわす
    this.group.rotation.y += 0.001;

    // マウスに追従する衛星(円錐)をまわす
    this.satellite.rotation.z += 0.01

    // 地球の周りを周回する何か　地球を周回
    this.object.rotation.x += 0.1; // まわしてみた
    // 前回のフレームからの経過時間の取得
    const time = this.clock.getElapsedTime();
    // 経過時間をそのままラジアン(=ラジアンとは「円の一周を２パイ」)としてサインとコサインを求める
      // const sin = 半径1の円の、該当するラジアンに相当する高さ
    const sin = Math.sin(time * 0.3); // ex)動きが速いと思ったらtimeを2倍にする Math.sin(time * 0.2)
      // const cos = 横移動量
    const cos = Math.cos(time * 0.3);
    // 月の座標を動かす
    this.object.position.set( //x y z
      cos * 3, // 距離を離す
      sin * 3,
      0.0,
    );

    // レンダラーで描画
    this.renderer.render(this.scene, this.camera);

  }
}