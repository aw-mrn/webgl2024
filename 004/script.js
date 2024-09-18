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

// 【残りやりたいこと】
// ※「いずれかの Plane のどれかと交差しているか」だけを条件にしてすべての処理を行っている場合、A という Plane と B という Plane が
// スクリーン空間で重なって見えている場合に、A からカーソルは外れたけど B にそのまま重なってしまった、という状況で破綻する可能性がある
// ・クリックしながらthis.groupを動かすとくるくる回る
// ・中心に最初はタイトルが出ている。
// ============================================================================

import * as THREE from '../lib/three.module.js';
// import { OrbitControls } from '../lib/OrbitControls.js';
// import { Pane } from '../lib/tweakpane-4.0.3.min.js'; 

window.addEventListener('DOMContentLoaded', async () => {
  const wrapper = document.querySelector('#webgl');
  const app = new ThreeApp(wrapper);
  await app.load();
  app.init();
  app.render();

  // Tweakpane を使った GUI の設定
  // const pane = new Pane();

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
  parentGroup;      // 20枚のplaneのグループ化した親のグループ
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
  isRotating;       // マウスの動きに応じて回転するフラグ
  targetRotation;   // マウスイベント(pointer Down/UP で回転)
  targetRotationOnPointerDown;
  pointerX;
  pointerXOnPointerDown;
  windowHalfX;

  /**
   * コンストラクタ
   */
  constructor(wrapper) {
    // 初期化時に canvas を append できるようにプロパティに保持
    this.wrapper = wrapper;

    // this のバインド
    this.render = this.render.bind(this); // bindを使ってthisを明示的に設定する

    // Raycaster のインスタンスを生成する
    this.raycaster = new THREE.Raycaster();
    
    let flag = false; // plane移動のフラグ
    this.isLean = true; // マウスの動きに応じて傾くフラグ

    // マウスのホバーイベントの定義
    window.addEventListener('mousemove', (mouseEvent) => { //mouseover

      // スクリーン空間の座標系をレイキャスター用に正規化する（-1.0 ~ 1.0 の範囲）
      const x = mouseEvent.clientX / window.innerWidth * 2.0 - 1.0;
      const y = mouseEvent.clientY / window.innerHeight * 2.0 - 1.0;
      // 単位化 スクリーン空間は上下が反転している点に注意（Y だけ符号を反転させる）
      const v = new THREE.Vector2(x, -y);
      // console.log(v);

      // planeのグループ(this.parentGroup)をマウスの動きに合わせて傾ける
      // どう考える？ ↓
      // カーソルを水平に動かしているとき、つまりカーソルの X 座標が変化しているとき、それに連動して Group はどういうふうに動いているか
      // 首を横にふるような動きなのか、首を縦に振るうなずくような動きなのか。
      // もし、首を左右に振るような、日本人的には拒絶を表すときの首振りの動きだとすると、それは Group に対する Y 軸回転。（扇風機の課題のときを思い出して！）
      // もし首を上下に振るような、日本人的には同意などを表すときの首振りの動きだとすると、それは X 軸回転。
      // このように、カーソルがスクリーン空間上で X / Y のそれぞれが変化するとき、Group の何軸が連動して回転すればよいのかを、各要素ごとに切り離して、それぞれ区別して考えてみることが大事
      if (this.isLean) {
        this.parentGroup.rotation.y = x * 0.5; // 回転角度を小さくするために0.5を掛ける
        this.parentGroup.rotation.x = y * 0.2;
      }

      // レイキャスターに正規化済みマウス座標とカメラを指定する
      this.raycaster.setFromCamera(v, this.camera);
      // 計算に必要な要素を渡しただけで、計算自体はまだ行われていない
      // scene に含まれるすべてのオブジェクト（ここでは Mesh）を対象にレイキャストする
      // itersectObject(mesh)、intersectObjects(配列)
      const intersects = this.raycaster.intersectObjects(this.planesArray);
      // レイが交差しなかった場合を考慮し一度位置を通常時の状態にリセットしておく
      this.planesArray.forEach((plane) => {
        // もし、planeが何にも当たっていなかったら
        if (!plane.defaultPos) {
          plane.defaultPos = plane.position.clone();
        }
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
      if (intersects.length > 0) { // ぶつかったオブジェクトに対しての処理
        if (flag === true) {
          // フラグがすでに立っている場合なにもしない
          return;
        } else {
          const intersectsObject = intersects[0].object;
          // console.log(intersectsObject);
          const direction = intersectsObject.position.clone();
          const vDirection = direction.normalize(); // vDirection = 長さが1の状態になる
          intersectsObject.position.add(vDirection.multiplyScalar(0.2));
          flag = true;

          // ホバー時
          const planeId = intersectsObject.userData.id; // userDataからIDを取得する
          const hov_item = document.getElementById(planeId);
          if(hov_item) {
            hov_item.style.display = 'block';
          }
        }
      } else { // intersects.length === 0
        this.planesArray.forEach((plane) => { // 各planeを見る = intersects[0]と同じようにしている
          // 位置を元に戻す
          plane.position.copy(plane.defaultPos);
        });
        // ホバー外れた時
        document.querySelectorAll('.hov_cont').forEach(item => {
          item.style.display = 'none';
        });
        flag = false;
      }

      // 元々の記述(勉強用)
      // if (intersects.length > 0) { // ぶつかったオブジェクトに対しての処理
      //   const intersectsObject = intersects[0].object;

      //   const direction = intersectsObject.position.clone(); // ここの部分↓のように考えられる
      //   // 今回は、グループの中心がワールド空間の原点と重なっている状態
      //   // ベクトルを定義するときの式「終点 ー 視点」ということを考えたときには、
      //   // 仮に終点、つまり Plane が置かれているワールド座標へと伸びるベクトルは以下のように求められる
      //   // const origin = new Vector3(0.0, 0.0, 0.0); // 原点
      //   // const planePosition = Plane.position.clone();
      //   // const toPlaneVector = new Vector3().subVectors(planePosition, origin); // 原点から Plane へと伸びるベクトル
      //   // toPlaneVector.normalize()
      //   // 長さを考えず向きだけを考えたいので、ベクトルを単位化する

      //   const vDirection = direction.normalize(); // vDirection = 長さが1の状態になる
      //   intersectsObject.position.add(vDirection.multiplyScalar(0.2));
      //   // 0.2は単体の数値 = スカラー 
      //   // スカラーをベクトルに対して掛け算したい
      // }
      // - Raycaster は CPU 上で動作する --------------------------------------
      // WebGL は描画処理に GPU を活用することで高速に動作します。
      // しかし JavaScript は CPU 上で動作するプログラムであり、Raycaster が内部
      // で行っている処理はあくまでも CPU 上で行われます。
      // 原理的には「メッシュを構成するポリゴンとレイが衝突するか」を JavaScript
      // でループして判定していますので、シーン内のメッシュの量やポリゴンの量が
      // 増えると、それに比例して Raycaster のコストも増加します。
      // ----------------------------------------------------------------------
    }, false);


    // マウスイベント(pointer Down/UP で回転)
    this.wrapper.addEventListener('pointerdown', (event) => onPointerDown(event));

    this.targetRotation = 0; // オブジェクトに適用される最終的な回転の値を保持する
    this.targetRotationOnPointerDown = 0; // ポインターが押された時の初期回転値を保存する

    this.pointerX = 0; // 現在のポインターの横方向の位置を保持
    this.pointerXOnPointerDown = 0; // ポインターが押された時の横方向の位置を保存

    this.windowHalfX = window.innerWidth / 2; // ウィンドウの中心

    const onPointerDown = (event) => { // ポインターが押された時
      if (event.isPrimary === false) return; // メインポインター操作のみを対象にするため。isPrimary

      this.isLean = false; 
    
      this.pointerXOnPointerDown = event.clientX - this.windowHalfX; // ポインターが押された瞬間の位置を保存
      this.targetRotationOnPointerDown = this.targetRotation; // ポインターが押された瞬間のオブジェクトの回転を保存
    
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      // ポインターが動いた時、指を離した時のイベントリスナーを追加して、ポインターの動きに応じた回転制御をする
    }
    
    const onPointerMove = (event) => { // ポインターが移動した時
      if (event.isPrimary === false) return;

      this.isLean = false; 

      this.pointerX = event.clientX - this.windowHalfX; // ポインターの現在の位置を計算

      this.targetRotation = this.targetRotationOnPointerDown + ( this.pointerX - this.pointerXOnPointerDown ) * 0.02; // ポインターが押された時の回転角にポインターの移動量に比例した回転量を加えたもの。??ちょっとよくわからない
    }
    
    const onPointerUp = (event) => { // ポインターが離された時
      if (event.isPrimary === false) return;

      this.isLean = true; 
    
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      // ポインターの操作が終了した時点で、イベントリスナーを削除する
    }





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
    //  this.controls = new OrbitControls(this.camera, this.renderer.domElement);

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
    this.parentGroup = new THREE.Group(); // groupを包むgroup = マウスで傾きをつける groupはxで回転がかかっているので区別する

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
    this.planesArray = []; // raycasterに入れるため

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

      this.plane = new THREE.Mesh(planeGeometry, planeMaterial);
      this.plane.position.set(x, y, 0); // 計算した座標にポリゴンを配置
      this.plane.rotation.x = Math.PI / 2;
      this.plane.rotation.y = angle;
      this.plane.userData.id = `hov_cont${i + 1}`;  // userDataにIDを設定

      this.group.add(this.plane);
      // console.log(this.plane);
      this.planesArray.push(this.plane); // raycasterに入れるため
      // console.log(this.planesArray);

      // planeは真横から見ると厚みがないので見えなくなる → それを防ぐために一度傾きをかけておく
      // this.group.rotation.x = -0.25;
      // ↓ 調整で
      // this.group.rotation.x = -300;
      // ↑回転デカすぎて制御できていない感じ
      // 回転はラジアンで考えるので、度数法の 360 度に相当する値は２パイ（約 6.28）
      this.group.rotation.x = Math.PI / 2 + 10;
      this.group.rotation.z = 15; // 少しずらすことでplaneが全て見えるようにする
      this.scene.add(this.group);

      this.parentGroup.add(this.group);
      this.scene.add(this.parentGroup);
    }
  }

  /**
   * 描画処理
   */
  render() {

    // グループの回転を適用
    this.parentGroup.rotation.y += (this.targetRotation - this.parentGroup.rotation.y) * 0.05;

    // 恒常ループ
    requestAnimationFrame(this.render);

    // コントロールを更新
    // this.controls.update();

    // レンダラーで描画
    this.renderer.render(this.scene, this.camera);

  }

}