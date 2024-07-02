// 【課題】
// ・Groupを使用して「首振り機能付きの扇風機」を実装
// ・「回転する羽」「首振り」を再現する

// 【やりたいこと】
// == はね =====
// ①まずははねを作ってみる
// ・はねの形は？ => 台形 => どうやってつくる？ => サンプルコードをいただく
// ②回転させてみる
// ・はね1枚をまず、回転させてみる => JS => 一旦台形の中心を軸として回っている => 軸をずらす
// ③はねを4枚作成する
// ・どうやって？ => JS 1枚の羽を繰り返す => for文
// ・順番は？ => groupとfor文どうやって組み合わせる？
// → 参考　https://ics.media/tutorial-three/object3d_group/
// ・for文で4枚作って、それをgroupにする
// ・もっと詳しく => for文で羽を4枚作る => メッシュ生成 => グループに入れて => シーンへ追加


import * as THREE from '../lib/three.module.js';
import { OrbitControls } from '../lib/OrbitControls.js';
import { ConvexGeometry } from '../lib/ConvexGeometry.js'; // 追加で import する @@@

window.addEventListener('DOMContentLoaded', () => {
  const wrapper = document.querySelector('#webgl');
  const app = new ThreeApp(wrapper);
  app.render();
}, false);

class ThreeApp {
  /**
   * カメラ定義のための定数
   */
  static CAMERA_PARAM = {
    fovy: 60,
    aspect: window.innerWidth / window.innerHeight,
    near: 0.1,
    far: 20.0,
    position: new THREE.Vector3(0.0, 2.0, 10.0),
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  };
  /**
   * レンダラー定義のための定数
   */
  static RENDERER_PARAM = {
    clearColor: 0x666666,
    width: window.innerWidth,
    height: window.innerHeight,
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
  /**
   * マテリアル定義のための定数
   */
  static MATERIAL_PARAM = {
    color: 0x3399ff,
  };

  renderer;         // レンダラ
  scene;            // シーン
  camera;           // カメラ
  directionalLight; // 平行光源（ディレクショナルライト）
  ambientLight;     // 環境光（アンビエントライト）
  material;         // マテリアル
  wingGeometry;     // 羽根のジオメトリ @@@
  wingMesh;         // 羽根のメッシュ @@@
  controls;         // オービットコントロール
  axesHelper;       // 軸ヘルパー
  isDown;           // キーの押下状態用フラグ

  /**
   * コンストラクタ
   * @constructor
   * @param {HTMLElement} wrapper - canvas 要素を append する親要素
   */
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

    // 軸ヘルパー
    const axesBarLength = 5.0;
    this.axesHelper = new THREE.AxesHelper(axesBarLength);
    this.scene.add(this.axesHelper);

    // メッシュを生成する処理はメソッド化して切り出す @@@
    this.createMesh();

    // コントロール
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // this のバインド
    this.render = this.render.bind(this);

    // キーの押下状態を保持するフラグ
    this.isDown = false;

    // イベントの設定を行う
    this.eventSetting();
  }

  /**
   * メッシュを生成する
   */
  createMesh() { // * createMesh()関数

    this.group = new THREE.Group();

    for(let i = 0; i < 4; i++) { // * はねを4枚作る

      // マテリアル
      // * thisとは => const app = new ThreeApp(wrapper);
      // * MATERIAL_PARAMでMeshPhongMaterialをインスタンス化し、this.materialへ
      // * MeshPhongMaterial = 鏡面ハイライトのある光沢のある表面用のマテリアルのこと
      this.material = new THREE.MeshPhongMaterial(ThreeApp.MATERIAL_PARAM);

      // 羽根のジオメトリは、点を結んで ConvexGeometry で生成する
      // ConvexGeometry を使うためには、OrbitControls と同じように別途 import が必要な点に注意
      // * 台形の形になるように、０～３までの４つの座標を指定し、ジオメトリを作成する流れ
      const points = [ // * 複数の頂点（点）をまとめて保持するために配列にする
        new THREE.Vector3(0.5, 1.0, 0.0),
        new THREE.Vector3(1.0, -1.0, 0.0),
        new THREE.Vector3(-1.0, -1.0, 0.0),
        new THREE.Vector3(-0.5, 1.0, 0.0),
      ];
      this.wingGeometry = new ConvexGeometry(points); // * pointsで台形座標を指定したものをConvexGeometryへ      

      // 羽根のジオメトリから、メッシュを生成してシーンに追加 => メッシュ生成、group化してからシーンへ追加
      this.wingMesh = new THREE.Mesh(this.wingGeometry, this.material);
      console.log(this.wingMesh);
      // * console.logの結果
        // * 4つのオブジェクトが取得できた{}
      // this.scene.add(this.wingMesh);

      this.wingMesh.position.x = 2; // 台形の軸をずらす
      this.wingMesh.rotation.z = (Math.PI / 2); //　(0, 0, 0)の方に台形の頭を向ける

      // * グループインスタンス
       // * for文で毎回this.groupを新しいTHREE.Groupインスタンスに置き換えているため、
       // * 最終的 this.groupは最後に作成されたwingMeshのグループのみを指すことになる。
       // * なので、for文の外で定義
      // this.group = new THREE.Group();

      // 重なっている4枚のはねを90度ずつずらす
      // this.wingMesh.rotation += (Math.PI / 2) * i; // z軸で90度ずつ回転させる 180÷2=90度をかける4回 ×
      // this.wingMesh.position.set(Math.PI / 2, 2, 0) * i; ×
      

      this.group.add(this.wingMesh); // * グループへ追加
    }
    
    // シーンへ追加
    this.scene.add(this.group);
  }

  /**
   * イベントの設定を行う
   */
  eventSetting() {
    // キーの押下や離す操作を検出できるようにする
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

    // ウィンドウのリサイズを検出できるようにする
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }, false);
  }

  /**
   * 描画処理
   */
  render() {
    // 恒常ループ
    requestAnimationFrame(this.render);

    // コントロールを更新
    this.controls.update();

    // はねの回転
    this.group.rotation.z += 0.05;

    // フラグに応じてオブジェクトの状態を変化させる
    if (this.isDown === true) {
      // キーが押されているときの処理
    }

    // レンダラーで描画
    this.renderer.render(this.scene, this.camera);
  }
}