# 外部ライブラリ・出典

確認日：2026-11-01。現在のローカルトップページ試作で使用している外部ライブラリを記録する。元の開発仕様から変更された試作上の選択であり、正式版の技術構成を確定するものではない。

## 導入：GSAP 3.15.0

- 提供元：GreenSock / Webflow。公式：[GSAP](https://gsap.com/)、[公式リポジトリ](https://github.com/greensock/GSAP)、[npmパッケージ](https://www.npmjs.com/package/gsap)。
- インストール：`npm install --save-exact gsap@3.15.0`。`package.json` と `package-lock.json` に版を固定。配信用の `vendor/gsap.min.js` は同パッケージの `dist/gsap.min.js` をライセンス表示を保持したまま複製したもので、ページから相対パスで読み込む。静的サイトの実行に `npm install` は不要。
- 用途：スクロールで変化する視点位置の補間、観測地点の切替、資料パネルの表示、画面縁の観測線のアニメーション。WebGL自体の描画は従来通りブラウザ標準WebGL 2と自作シェーダーで行う。
- 採用理由：DOMとJavaScriptの数値を同じアニメーション手法で扱え、既存の小さな静的構成に組み込める。公式の [gsap.to()](https://gsap.com/docs/v3/GSAP/gsap.to()/) を参照。
- ライセンス：提供元が示す [Standard “No Charge” GSAP License](https://gsap.com/community/standard-license/) を適用。条件・制限はリンク先の原文と、インストールされたパッケージのライセンス表示を確認する。MITライセンスとは扱わない。
- 制約：`vendor/gsap.min.js` が読み込めない場合はGSAPの演出を使えない。視点のスクロールは即時反映するフォールバックを持つ。動きの軽減を選ぶと、GSAPによるスクロール補間・背景の反復アニメーション・遷移演出を停止する。

## 比較した候補

| 候補 | 参照した公式資料 | 今回の判断 |
|---|---|---|
| Motion | [scroll()](https://motion.dev/docs/scroll)、[導入方法](https://motion.dev/docs/quick-start) | スクロールとオブジェクトの補間を扱える。今回はGSAPに統一し、重複導入しない |
| GSAP ScrollTrigger | [公式ドキュメント](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) | ピン留めや区間ごとの演出に適する。現在はページ本来のスクロールと単一の視点値で足りるため、プラグインは読み込まない |

上記の候補は調査のみで、現在のページにインストール・読み込みしていない。画像やフォントの外部素材は今回追加していない。
