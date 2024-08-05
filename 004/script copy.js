// ============================================================================
// 課題：Raycaster と Plane（板）を使ってなにか作ってみる

// 【手順】
// ・Plane（板）を円状に並べる
// → planeをまず表示
//   for文で表示
// ・円状に並べたものを、グループにして見える位置をかえる
// ・円状に並べたPlane（板）に画像を貼り付ける
// ・Raycasterでマウスが各々の画像に交差する時を判定
// → 交差したら、planeをずらす
// 
// ============================================================================

import * as THREE from '../lib/three.module.js';
import { OrbitControls } from '../lib/OrbitControls.js';

window.addEventListener('DOMContentLoaded', async () => {
  const wrapper = document.querySelector('#webgl');
  const app = new ThreeApp(wrapper);
  await app.load();
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
    fovy: 40, // 60
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
  raycaster;        // レイキャスター
  renderer;         // レンダラ
  scene;            // シーン
  camera;           // カメラ
  directionalLight; // 平行光源（ディレクショナルライト）
  ambientLight;     // 環境光（アンビエントライト）
  axesHelper;       // 軸ヘルパー

  group;            // 20枚のplaneのグループ化
  plane;            // 板ポリゴン
  imgList = [
    "img/img01.png",
    "img/img02.png",
    "img/img03.png",
    "img/img04.png",
    "img/img05.png",
    "img/img06.png",
    "img/img07.png",
    "img/img08.png",
    "img/img09.png",
    "img/img10.png",
    "img/img11.png",
    "img/img12.png",
    "img/img13.png",
    "img/img14.png",
    "img/img15.png",
    "img/img16.png",
    "img/img17.png",
    "img/img18.png",
    "img/img19.png",
    "img/img20.png",
  ];
  imgDataList;      // imgList


  /**
   * コンストラクタ
   */
  constructor(wrapper) {
    // 初期化時に canvas を append できるようにプロパティに保持
    this.wrapper = wrapper;

    // this のバインド
    this.render = this.render.bind(this);

    // Raycaster のインスタンスを生成する
    this.raycaster = new THREE.Raycaster();
    // マウスのクリックイベントの定義
    window.addEventListener('hover', (mouseEvent) => {
      // スクリーン空間の座標系をレイキャスター用に正規化する（-1.0 ~ 1.0 の範囲）
      const x = mouseEvent.clientX / window.innerWidth * 2.0 - 1.0;
      const y = mouseEvent.clientY / window.innerHeight * 2.0 - 1.0;
      // スクリーン空間は上下が反転している点に注意（Y だけ符号を反転させる）
      const v = new THREE.Vector2(x, -y);
      // レイキャスターに正規化済みマウス座標とカメラを指定する
      this.raycaster.setFromCamera(v, this.camera);
      // 計算に必要な要素を渡しただけで、計算自体はまだ行われていない
      // scene に含まれるすべてのオブジェクト（ここでは Mesh）を対象にレイキャストする
      // itersectObject(mesh)、intersectObjects(配列)
      const intersects = this.raycaster.intersectObject(this.torusArray);
      // レイが交差しなかった場合を考慮し一度マテリアルを通常時の状態にリセットしておく
      this.torusArray.forEach((mesh) => {
        mesh.material = this.material;
      });

      // - intersectObjects でレイキャストした結果は配列 ----------------------
      // 名前が似ているので紛らわしいのですが Raycaster には intersectObject と
      // intersectObjects があります。複数形の s がついているかどうかの違いがあ
      // り、複数形の場合は引数と戻り値のいずれも配列になります。
      // この配列の長さが 0 である場合はカーソル位置に向かって放ったレイは、どの
      // オブジェクトとも交差しなかったと判断できます。また、複数のオブジェクト
      // とレイが交差した場合も、three.js 側で並び替えてくれるので 0 番目の要素
      // を参照すれば必ず見た目上の最も手前にあるオブジェクトを参照できます。
      // 戻り値の中身は object というプロパティを経由することで対象の Mesh など
      // のオブジェクトを参照できる他、交点の座標などもわかります。
      // ----------------------------------------------------------------------
      if (intersects.length > 0) {
        // [0]としているのは手前にあるやつを判定させるため
        intersects[0].object.material = this.hitMaterial;
      }
      // - Raycaster は CPU 上で動作する --------------------------------------
      // WebGL は描画処理に GPU を活用することで高速に動作します。
      // しかし JavaScript は CPU 上で動作するプログラムであり、Raycaster が内部
      // で行っている処理はあくまでも CPU 上で行われます。
      // 原理的には「メッシュを構成するポリゴンとレイが衝突するか」を JavaScript
      // でループして判定していますので、シーン内のメッシュの量やポリゴンの量が
      // 増えると、それに比例して Raycaster のコストも増加します。
      // ----------------------------------------------------------------------
    }, false);

    // ウィンドウのリサイズを検出できるようにする
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }, false);
  }


  /**
   * アセット（素材）のロードを行う Promise
   */
  // THREE.TextureLoaderについて
  // https://threejs.org/docs/#api/en/loaders/TextureLoader
  // https://ics.media/tutorial-three/material_basic/
  // loader.load(url, onLoad, onProgress, onError);
  // url: ロードする画像ファイルのパス（URL）。
  // onLoad: 画像のロードが完了したときに呼ばれるコールバック関数。ここで THREE.Texture オブジェクトが引数として渡されます。
  // onProgress: （省略可能）ロードの進捗状況を受け取るコールバック関数。
  // onError: （省略可能）ロード中にエラーが発生したときに呼ばれるコールバック関数。

  async load() {
    const loader = new THREE.TextureLoader();
    this.imgDataList = await Promise.all(
      this.imgList.map(path =>
        new Promise(resolve => 
          loader.load(path, texture => resolve(texture))
          // texture: 画像のロードが完了すると、THREE.Texture オブジェクトがこの引数として渡される。
          // resolve(texture): Promiseの解決関数 resolve を呼び出して、引数として渡された texture を解決値として設定。
          // これにより、このPromiseが解決され、texture が次の処理に渡される。
        )
      )
    );
  }
  // load() {
  //   return new Promise((resolve) => {
  //     const earthPath = './earth.jpg';
  //     const moonPath = './moon.jpg';
  //     const loader = new THREE.TextureLoader();
  //     loader.load(earthPath, (earthTexture) => {
  //       // 地球用
  //       this.earthTexture = earthTexture;
  //       loader.load(moonPath, (moonTexture) => {
  //         // 月用
  //         this.moonTexture = moonTexture;
  //         resolve();
  //       });
  //     });
  //   });
  // }


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
    this.renderer.setPixelRatio(window.devicePixelRatio); // 画質改善 https://qiita.com/__knm__/items/c4eb55a4affe0d2e1bc1
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
     * コントロール
     * マウス操作で次のようにカメラを制御できる
     * オービット（周回軌道）: 左ボタンでドラッグ
     * ズーム: マウスホイール
     * パン: 右ボタンでドラッグ
     */
     this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    /**
     * 軸ヘルパー
     */
    const axesBarLength = 5.0;
    this.axesHelper = new THREE.AxesHelper(axesBarLength);
    this.scene.add(this.axesHelper);


    /**
     * 板ポリゴン
     */

    this.group = new THREE.Group(); // 板ポリ全体をグループ化するため

    const planeGeometry = new THREE.PlaneGeometry(0.40, 0.30);
    // const planeMaterial = new THREE.MeshBasicMaterial({color: 0x000000});
    // ↑ 板ポリゴンはバックフェイスカリングの効果で裏返ったらまったく見えない状態になってしまうので、
    // 　それを避けるためにマテリアルに対してカリングをしないように設定 ↓
    // const planeMaterial = new THREE.MeshBasicMaterial({
    //   color: 0x000000,
    //   side: THREE.DoubleSide, // カリングをしないように設定 = マテリアルの side プロパティに裏表どちらでも描画されるようにする
    // });
    // テクスチャを設定したマテリアルを作成
    const numPlanes = 20;
    const radius = 3.0; // 円の半径

    for(let i = 0; i < numPlanes; i++){
      const angle = i * (2 * Math.PI / numPlanes); // 各ポリゴンの場所決め
      const x = radius * Math.cos(angle); // x座標
      const y = radius * Math.sin(angle); // y座標

      const texture = this.imgDataList[i];
      const planeMaterial = new THREE.MeshBasicMaterial({
        map: texture, 
        // ↑ THREE.Textureインスタンス（例えば、THREE.TextureLoaderでロードしたテクスチャ）を指定することで、
        //   MeshBasicMaterialにテクスチャを適用
        side: THREE.DoubleSide
      });

      const plane = new THREE.Mesh(planeGeometry, planeMaterial);
      plane.position.set(x, y, 0); // 計算した座標にポリゴンを配置
      plane.rotation.x = Math.PI / 2;
      plane.rotation.y = angle;

      this.group.add(plane);

      // planeは真横から見ると厚みがないので見えなくなる → それを防ぐために一度傾きをかけておく
      // this.group.rotation.x = -0.25;
      // ↓ 微調整で
      // this.group.rotation.x = -300;
      // ↑回転デカすぎて制御できていない感じ
      // 回転はラジアンで考えるので、度数法の 360 度に相当する値は２パイ（約 6.28）
      this.group.rotation.x = Math.PI / 2 + 10;
      this.group.rotation.z = 15; // 少しずらすことでplaneが全て見えるようにする

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