// ================================================
// 課題：Raycaster と Plane（板）を使ってなにか作ってみる
// ================================================
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
  // ホバー時反応用のplane
  hoverPlaneGroup;
  hoverParentGroup;
  hoverPlanesArray;
  hoverPlane;
  hoverPlaneGroup;
  hoverParentGroup;
  // マウスイベント(pointer Down/UP で回転)
  pointerStartX;
  windowHalfX;
  pointerCurrentX;
  pointerDiffX;


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
      // if (this.isLean) {
      //   this.parentGroup.rotation.y = x * 0.5; // 回転角度を小さくするために0.5を掛ける
      //   this.parentGroup.rotation.x = y * 0.2;
      // }

      // 画像plane用
      this.parentGroup.rotation.y = x * 0.5; // 回転角度を小さくするために0.5を掛ける
      this.parentGroup.rotation.x = y * 0.2;
      // hoverplane用
      this.hoverParentGroup.rotation.y = x * 0.5;
      this.hoverParentGroup.rotation.x = y * 0.2;

      // レイキャスターに正規化済みマウス座標とカメラを指定する
      this.raycaster.setFromCamera(v, this.camera);
      // 計算に必要な要素を渡しただけで、計算自体はまだ行われていない
      // scene に含まれるすべてのオブジェクト（ここでは Mesh）を対象にレイキャストする
      // itersectObject(mesh)、intersectObjects(配列)
      const intersects = this.raycaster.intersectObjects(this.planesArray);
      const intersectsHover = this.raycaster.intersectObjects(this.hoverPlanesArray);
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
      // if(intersectsHover.length > 0) {
      //   console.log('hover！');
      // sceneにaddしないと反応しない
      // }
      
      if (intersectsHover.length > 0) {
        if (flag === true) {
          // フラグがすでに立っている場合は何もしない
          return;
        } else {
          const intersectsObject = intersects[0].object;
          
          // フラグが立っていない場合にだけホバー処理を行う
          if (!intersectsObject.userData.isHovered) {
            intersectsObject.userData.isHovered = true;
            
            // 位置移動
            const direction = intersectsObject.position.clone();
            const vDirection = direction.normalize();
            intersectsObject.position.add(vDirection.multiplyScalar(0.2));
            flag = true;
    
            // ホバー時に中央表示
            const planeId = intersectsObject.userData.id; // userDataからIDを取得
            const hov_item = document.getElementById(planeId);
            if (hov_item) {
              hov_item.style.display = 'block';
            }
          }
        }
      } else { 
        // ホバー外れた時の処理
        this.planesArray.forEach((plane) => {
          if (plane.userData.isHovered) {
            plane.position.copy(plane.defaultPos); // 元の位置に戻す
            plane.userData.isHovered = false; // ホバー状態を解除
          }
        });
    
        // ホバー時に中央非表示
        document.querySelectorAll('.hov_cont').forEach(item => {
          item.style.display = 'none';
        });
    
        flag = false;
      }

      // if (intersectsHover.length > 0) { // ぶつかったオブジェクトに対しての処理
      //   if (flag === true) {
      //     // フラグがすでに立っている場合なにもしない
      //     return;
      //   } else {
      //     const intersectsObject = intersects[0].object;
      //     // console.log(intersectsObject);
      //     const direction = intersectsObject.position.clone();
      //     const vDirection = direction.normalize(); // vDirection = 長さが1の状態になる
      //     intersectsObject.position.add(vDirection.multiplyScalar(0.2));
      //     flag = true;

      //     // ホバー時に中央表示
      //     const planeId = intersectsObject.userData.id; // userDataからIDを取得する
      //     const hov_item = document.getElementById(planeId);
      //     if(hov_item) {
      //       hov_item.style.display = 'block';
      //     }
      //   }
      // } else { // intersects.length === 0
      //   this.planesArray.forEach((plane) => { // 各planeを見る = intersects[0]と同じようにしている
      //     // 位置を元に戻す
      //     plane.position.copy(plane.defaultPos);
      //   });
      //   // ホバー時に中央非表示
      //   document.querySelectorAll('.hov_cont').forEach(item => {
      //     item.style.display = 'none';
      //   });
      //   flag = false;
      // }

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
    // 画像を貼り付けるplane
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

    // ホバー時反応用のplane
    this.hoverPlaneGroup = new THREE.Group(); // ホバー時用のグループを作成
    this.hoverParentGroup = new THREE.Group(); // マウスで傾きをつける用
    const hoverPlaneGeometry = new THREE.PlaneGeometry(0.40, 0.30); // planeジオメトリを作成
    this.hoverPlanesArray = []; // レイキャストに入れるための配列
    for(let i = 0; i < numPlanes; i++){
      const angle = i * (2 * Math.PI / numPlanes);
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);

      const hoverPlaneMaterial = new THREE.MeshBasicMaterial({
        // color: 0xFF0000, // 確認用
        colorWrite: false, // 深度値を無効にする
        side: THREE.DoubleSide
      });

      this.hoverPlane = new THREE.Mesh(hoverPlaneGeometry, hoverPlaneMaterial); // メッシュ作成
      this.hoverPlane.position.set(x, y, 0);
      this.hoverPlane.rotation.x = Math.PI / 2;
      this.hoverPlane.rotation.y = angle;
      this.hoverPlaneGroup.add(this.hoverPlane);
      // console.log(this.hoverPlane);
      this.hoverPlanesArray.push(this.hoverPlane);
      // console.log(this.hoverPlanesArray);

      this.hoverPlaneGroup.rotation.x = Math.PI / 2 + 10;
      this.hoverPlaneGroup.rotation.z = 15;
      this.scene.add(this.hoverPlaneGroup);
      this.hoverParentGroup.add(this.hoverPlaneGroup);
      this.scene.add(this.hoverParentGroup);
    }

    // マウスイベントで回転
    let mouseDownFlag = false; // マウスボタンが up or downのフラグ
    this.pointerStartX = 0;
    this.windowHalfX = window.innerWidth / 2; // ウィンドウの中心

    this.wrapper.addEventListener('mousedown', (event) => { // マウスボタンが押された時
      mouseDownFlag = true;
      // マウスボタンが押された瞬間（mousedown）に、その時のカーソルの位置を変数に保持するようにする
      this.pointerStartX = event.clientX - this.windowHalfX; // ポインターが押された瞬間の位置を保存
    });

    this.wrapper.addEventListener('mouseup', () => { // マウスボタンが離された時
      mouseDownFlag = false;
    });

    this.wrapper.addEventListener('mousemove', (event) => { // マウスが動いた時
      // まずフラグが立っているかを見る（false なら即 return する）
      if(mouseDownFlag === false) return;

      if(mouseDownFlag === true) {
        // mousemove + フラグが立っている（ボタンが押下されている）場合は
        // mousedown時で保持したカーソルの位置と、いまこの瞬間のカーソルの位置を比較することで、カーソルがどう動いたかを知ることができる
        this.pointerCurrentX = event.clientX - this.windowHalfX; // ポインターの現在の位置を計算
        this.pointerDiffX = this.pointerCurrentX - this.pointerStartX; // X軸の移動量
        
        // カーソルがどう動いたかを計算したら、また「その瞬間のカーソルの位置」は変数に保持しておく
        this.pointerStartX = this.pointerCurrentX;

        // 横方向の移動量を回転量に変換
        this.group.rotation.z += this.pointerDiffX * 0.01;
        this.hoverPlaneGroup.rotation.z += this.pointerDiffX * 0.01;
      }
    });
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