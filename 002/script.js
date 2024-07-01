// 【課題】
// ・Groupを使用して「首振り機能付きの扇風機」を実装
// ・「回転する羽」「首振り」を再現する

import * as THREE from '../lib/three.module.js';
import { OrbitControls } from '../lib/OrbitControls.js';

window.addEventListener('DOMContentLoaded', () => {
  const wrapper = document.querySelector('#webgl');
  const app = new ThreeApp(wrapper);
  app.render();
}, false);

class ThreeApp {
  // カメラ定義
  static CAMERA_PARAM = {
    fovy: 60,
    aspect: window.innerWidth / window.innerHeight,
    near: 0.1,
    far: 30.0,
    position: new THREE.Vector3(0.0, 5.0, 20.0),
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  };

  // レンダラー定義
  static RENDERER_PARAM = {
    clearColor: 0x666666,
    width: window.innerWidth,
    height: window.innerHeight,
  };

  // ディレクショナルライト定義
  // → 平行光源 特定の方向に放射される光
  static DIRECTIONAL_LIGHT_PARAM = {
    color: 0xffffff,
    intensity: 1.0,
    position: new THREE.Vector3(1.0, 1.0, 1.0),
  };

  // アンビエントライト定義
  // → 環境光源 3D空間全体に均等に光を当てる
  static AMBIENT_LIGHT_PARAM = {
    color: 0xffffff,
    intensity: 0.1,
  };

  // マテリアル定義のための定数
  static MATERIAL_PARAM = {
    color: 0x3399ff,
    side: THREE.DoubleSide,
    // sideについて
    // → https://gupuru.hatenablog.jp/entry/2013/12/08/215106 プロパティを設定でさまざまな質感を表現
  };

  // 扇風機 
  static FAN_GEOM_PARAM = {
    // シャフト
    SHAFT: {
      radiusTop: 0.4,
      radiusBottom: 0.4,
      height: 0.5,
      radialSegments: 64,
    },
    // シャフトの軸
    CENTER: {
      radiusTop: 0.2,
      radiusBottom: 0.2,
      height: 1.5,
      radialSegments: 64,
    },
    // はね
    WING: {
      innerRadius: 0.3,
      outerRadius: 2.0,
      thetaSegments: 30,
      phiSegments: 1,
      thetaStart: 0.0,
      thetaLength: 1.0,
      num: 4, // はねの枚数
    },
    // 脚
    LEG: {
      radiusTop: 0.1,
      radiusBottom: 0.1,
      height: 7,
      radialSegments: 64,
    },
    // 台座
    STAND: {
      radiusTop: 1,
      radiusBottom: 2,
      height: 0.5,
      radialSrgments: 10,
      heightSegments: 1,
    }
  }

  // 扇風機 首振りの変数(回転制御用)
  static LATION_PARAM = {
    lationAngle: 0,
    lationSpeed: 0.01,
    lationDirection: 1,
  }
  

  renderer;         // レンダラ
  scene;            // シーン
  camera;           // カメラ
  directionalLight; // 平行光源（ディレクショナルライト）
  ambientLight;     // 環境光（アンビエントライト）
  material;         // マテリアル
  torusGeometry;    // トーラスジオメトリ
  torusArray;       // トーラスメッシュの配列
  controls;         // オービットコントロール
  axesHelper;       // 軸ヘルパー
  isDown;           // キーの押下状態用フラグ

  shaftGeometry;    // シャフトジオメトリ
  centerGeometry;   // 軸ジオメトリ
  wingGeometry;     // はねジオメトリ
  legGeometry;      // 脚ジオメトリ
  standGeometry;    // 台座ジオメトリ

  shaft;            // シャフトメッシュ
  center;           // 軸メッシュ
  wing;             // はねメッシュ
  leg;              // 脚メッシュ
  stand;            // 台座メッシュ

  fanGroup;         // はねグループ
  allShaftGroup;    // シャフト全体グループ


  constructor(wrapper) {

    // レンダラー
    const color = new THREE.Color(ThreeApp.RENDERER_PARAM.clearColor);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(color);
    this.renderer.setSize(ThreeApp.RENDERER_PARAM.width, ThreeApp.RENDERER_PARAM.height);
    wrapper.appendChild(this.renderer.domElement);

    // シーン
    this.scene = new THREE.Scene();

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

    // マテリアル side加えたので、それを忘れない
    this.material = new THREE.MeshPhongMaterial(ThreeApp.MATERIAL_PARAM, ThreeApp.MATERIAL_PARAM.side);

    // ジオメトリ&メッシュとグループ
    // シャフト
    this.shaftGeometry = new THREE.CylinderGeometry(
      ThreeApp.FAN_GEOM_PARAM.SHAFT.radiusTop,
      ThreeApp.FAN_GEOM_PARAM.SHAFT.radiusBottom,
      ThreeApp.FAN_GEOM_PARAM.SHAFT.height,
      ThreeApp.FAN_GEOM_PARAM.SHAFT.radialSegments
    ); 
    this.shaft = new THREE.Mesh(this.shaftGeometry, this.material);
    this.shaft.rotation.x = Math.PI / 2; // Math.PI = 円周と直径の比率、およそ 3.14159
    this.shaft.position.z = 1;

    // シャフトの軸
    this.centerGeometry = new THREE.CylinderGeometry(
      ThreeApp.FAN_GEOM_PARAM.CENTER.radiusTop,
      ThreeApp.FAN_GEOM_PARAM.CENTER.radiusBottom,
      ThreeApp.FAN_GEOM_PARAM.CENTER.height,
      ThreeApp.FAN_GEOM_PARAM.CENTER.radialSegments
    );
    this.center =  new THREE.Mesh(this.centerGeometry, this.material);
    this.center.rotation.x = Math.PI / 2;
    this.center.position.z = 0.5;

    // はね
    this.wingGeometry = new THREE.RingGeometry(
      ThreeApp.FAN_GEOM_PARAM.WING.innerRadius,
      ThreeApp.FAN_GEOM_PARAM.WING.outerRadius,
      ThreeApp.FAN_GEOM_PARAM.WING.thetaSegments,
      ThreeApp.FAN_GEOM_PARAM.WING.phiSegments,
      ThreeApp.FAN_GEOM_PARAM.WING.thetaStart,
      ThreeApp.FAN_GEOM_PARAM.WING.thetaLength
    );
    // メッシュはfor文以降

    // 脚
    this.legGeometry = new THREE.CylinderGeometry(
      ThreeApp.FAN_GEOM_PARAM.LEG.radiusTop,
      ThreeApp.FAN_GEOM_PARAM.LEG.radiusBottom,
      ThreeApp.FAN_GEOM_PARAM.LEG.height,
      ThreeApp.FAN_GEOM_PARAM.LEG.radialSegments
    );
    this.leg = new THREE.Mesh(this.legGeometry, this.material);
    this.leg.position.y = 1;

    // 台座
    this.standGeometry = new THREE.CylinderGeometry(
      ThreeApp.FAN_GEOM_PARAM.STAND.radiusTop,
      ThreeApp.FAN_GEOM_PARAM.STAND.radiusBottom,
      ThreeApp.FAN_GEOM_PARAM.STAND.height,
      ThreeApp.FAN_GEOM_PARAM.STAND.radialSegments,
      ThreeApp.FAN_GEOM_PARAM.STAND.heightSegments
    ); 
    this.stand = new THREE.Mesh(this.standGeometry, this.material);
    this.stand.position.y = -2;


    // グループ
    this.allShaftGroup = new THREE.Group();
    this.fanGroup = new THREE.Group();


    // はねのメッシュ
    for (let i = 0; i < ThreeApp.FAN_GEOM_PARAM.WING.num; i++) {
      // ↑ 扇風機の羽の数（ThreeApp.FAN_GEOM_PARAM.WING.num）だけループを回して、羽を生成

      const group = new THREE.Group();
      // ↑ 羽を複数持つグループを作成。このグループは、個々の羽をまとめて回転させるために使用

      this.wing = new THREE.Mesh(this.wingGeometry, this.material);
      // メッシュ作成

      group.add(this.wing);
      // 作成した羽をグループに追加
      
      group.rotation.z = (Math.PI / 2) * i;
      // 羽のグループ全体を90度ずつ回転させて配置。4つの羽が均等に配置されるようにする（360度を4つに分けるために、90度ずつ回転）

      this.fanGroup.add(group);
      // 羽を複数持つグループをさらにグループに追加

      this.fanGroup.position.z = 1;
      // ファングループ全体をz軸方向に1の位置に配置。羽がシャフトの先端に来るように調整
    }

    // グループに追加
    this.allShaftGroup.add(this.fanGroup);
    this.allShaftGroup.add(this.shaft);
    this.allShaftGroup.add(this.center);
    // ↑ 上記3つをまとめることで、首振りにつなげる

    this.allShaftGroup.position.y = 4.5;
    // ↑ 位置調整

    // シーンに追加
    this.scene.add(this.allShaftGroup);
    this.scene.add(this.leg);
    this.scene.add(this.stand);


    // コントロール
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // this のバインド
    this.render = this.render.bind(this);

    // ウィンドウのリサイズを検出できるようにする
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }, false);
  }


  // 描画処理
  render() {

    // 恒常ループ
    requestAnimationFrame(this.render);

    // コントロールを更新
    this.controls.update();
    
    // 羽の回転
    this.fanGroup.rotation.z += 0.05;

    // 首振り機能の実装
    ThreeApp.LATION_PARAM.lationAngle += ThreeApp.LATION_PARAM.lationSpeed * ThreeApp.LATION_PARAM.lationDirection;
    // == 解説 =====
    // lationAngle(0)：扇風機の首振りの現在の角度
    // lationSpeed(0.01)：首振りの速さを表す定数で、1フレームあたりの回転角度の増加量
    // lationDirection(1)：回転の方向を制御するためのフラグで、1または-1の値を取る。1は正方向（時計回り）、-1は逆方向（反時計回り）
    // 上記の式により、現在の角度に速さと方向を掛けた値を加算する。これによって扇風機の角度が更新される
    // =============

    if (ThreeApp.LATION_PARAM.lationAngle >= Math.PI / 2 || ThreeApp.LATION_PARAM.lationAngle <= -Math.PI / 2) {
      ThreeApp.LATION_PARAM.lationDirection *= -1;
    }
    // == 解説 =====
    // lationAngle >= Math.PI / 2 ：現在の角度が90度（ラジアンでπ/2）以上かどうかをチェック。90度以上になると、扇風機は右端まで首を振ったことになる。
    // lationAngle <= -Math.PI / 2 ：現在の角度が-90度（ラジアンで-π/2）以下かどうかをチェック。-90度以下になると、扇風機は左端まで首を振ったことになる。
    // これらの条件のどちらかが満たされると、ThreeApp.LATION_PARAM.lationDirection *= -1 によって、首振りの方向が反転する。正方向（1）から逆方向（-1）に、またはその逆に切り替わる。
    // =============

    this.allShaftGroup.rotation.y = ThreeApp.LATION_PARAM.lationAngle;
    // == 解説 =====
    // this.allShaftGroup.rotation.y は、扇風機の首振り角度を表す
    // ThreeApp.LATION_PARAM.lationAngle; に更新された角度を代入することで、扇風機の首振りの角度が反映。
    // =============


    // レンダラーで描画
    this.renderer.render(this.scene, this.camera);
  }
}