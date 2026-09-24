# GCP の準備手順

CI から本物の Cloud Storage に対してテストするための、開発・テスト専用のプロジェクトを作る手順。

このテストで確かめるのは、ローカルのエミュレーターでは確かめられないこと（署名と違うサイズ・種類のアップロードが拒否される、期限切れ・署名なしの取得が拒否される）。

- 所要時間：30分〜1時間
- 費用：無料枠の範囲（保存 5GB/月、読み書きの操作も月数万回まで無料）。ただし**請求先アカウントの登録は必要**
- パソコンへのインストールは不要（ブラウザの Cloud Shell を使う）

本番用のプロジェクトは、デプロイするときに別に作る。この手順は**開発・テスト専用**。

---

## 0. 用語

| 言葉 | 意味 |
| -- | -- |
| プロジェクト | GCP の入れ物。課金も権限もプロジェクト単位。用途ごとに分ける |
| バケット | ファイルの置き場所。名前は世界中で重複できない |
| サービスアカウント | 人ではなく、プログラムが使うアカウント |
| ロール | 権限のまとまり（例：`roles/storage.objectUser` はファイルの読み書き） |
| Workload Identity 連携 | 鍵ファイルを配らずに、GitHub Actions から GCP に接続するための仕組み |

---

## 1. プロジェクトを作る

1. https://console.cloud.google.com を開き、Google アカウントでログインする。
2. 初めてなら、利用規約への同意と**請求先アカウント**の作成を求められる。クレジットカードの登録が必要だが、無料枠の範囲では課金されない（初回は無料トライアルの割当も付く）。
3. 画面上部のプロジェクト選択 →「新しいプロジェクト」。
   - プロジェクト名：`tackup-dev`
   - プロジェクト ID は自動で決まる（`tackup-dev-123456` のような形）。**あとで使うので控える**。
4. 作成したプロジェクトに切り替える。

## 2. Cloud Shell を開く

画面右上の `>_` のアイコン（Cloud Shell をアクティブにする）を押す。ブラウザの下部にターミナルが開く。ここでは `gcloud` が最初から使える。

以降のコマンドは、この Cloud Shell に貼り付ける。まず、使う値を変数に入れる。

```bash
PROJECT_ID="<1 で控えたプロジェクト ID>"
BUCKET="tackup-ci-$(date +%s)"   # 世界で重複しない名前にする
REPO="sota-6741/tackup"
SA="tackup-ci"

gcloud config set project "$PROJECT_ID"
echo "バケット名: $BUCKET"   # 控える
```

## 3. 必要な API を有効にする

```bash
gcloud services enable storage.googleapis.com iamcredentials.googleapis.com
```

- `storage.googleapis.com`：Cloud Storage 本体
- `iamcredentials.googleapis.com`：**鍵ファイルなしで署名付き URL を作るために必要**。これを忘れると、テストが実行時に失敗する

## 4. テスト用のバケットを作る

```bash
gcloud storage buckets create "gs://$BUCKET" \
  --location=asia-northeast1 \
  --uniform-bucket-level-access \
  --public-access-prevention
```

- `--uniform-bucket-level-access`：ファイル単位の権限を使わず、バケットの権限だけで管理する（設定ミスを減らす）
- `--public-access-prevention`：誤って公開状態にできないようにする

テストのファイルが残らないよう、1日で自動削除する設定を入れる。

```bash
cat > /tmp/lifecycle.json <<'EOF'
{
  "rule": [
    { "action": { "type": "Delete" }, "condition": { "age": 1 } }
  ]
}
EOF

gcloud storage buckets update "gs://$BUCKET" --lifecycle-file=/tmp/lifecycle.json
```

## 5. テスト用のサービスアカウントを作る

```bash
gcloud iam service-accounts create "$SA" --display-name="tackup CI"

SA_EMAIL="$SA@$PROJECT_ID.iam.gserviceaccount.com"
echo "サービスアカウント: $SA_EMAIL"   # 控える
```

権限は2つだけ付ける。プロジェクト全体の権限は付けない。

```bash
# このバケットのファイルを読み書きできる
gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/storage.objectUser"

# 自分自身に署名させる（鍵ファイルなしで署名付き URL を作るために必要）
gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/iam.serviceAccountTokenCreator"
```

## 6. GitHub から鍵なしで接続できるようにする（Workload Identity 連携）

プール（接続の入り口）を作る。

```bash
gcloud iam workload-identity-pools create "github" \
  --location="global" \
  --display-name="GitHub Actions Pool"

POOL_ID=$(gcloud iam workload-identity-pools describe "github" \
  --location="global" --format="value(name)")
echo "プール: $POOL_ID"
```

プロバイダ（GitHub からの接続の受け口）を作る。**ここの条件が最も重要**で、このリポジトリからの接続だけを許す。

```bash
gcloud iam workload-identity-pools providers create-oidc "tackup" \
  --location="global" \
  --workload-identity-pool="github" \
  --display-name="tackup repo" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository == '$REPO'" \
  --issuer-uri="https://token.actions.githubusercontent.com"
```

> 条件（`--attribute-condition`）を付けないと、**ほかの人のリポジトリからも接続できてしまう**。必ず付ける。

このリポジトリから、上のサービスアカウントとして動くことを許可する。

```bash
gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/$POOL_ID/attribute.repository/$REPO"
```

最後に、GitHub に設定する値を表示する。

```bash
gcloud iam workload-identity-pools providers describe "tackup" \
  --location="global" --workload-identity-pool="github" \
  --format="value(name)"
echo "$SA_EMAIL"
echo "$BUCKET"
```

## 7. GitHub に3つの値を設定する

リポジトリの Settings → Secrets and variables → Actions → **Variables**（Secrets ではない）に追加する。

| 名前 | 値 |
| -- | -- |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | 6 で表示したプロバイダのリソース名（`projects/.../providers/tackup`） |
| `GCP_SERVICE_ACCOUNT` | サービスアカウントのメールアドレス |
| `GCS_TEST_BUCKET` | バケット名 |

`gh` コマンドでも設定できる。

```bash
gh variable set GCP_WORKLOAD_IDENTITY_PROVIDER --body "<プロバイダのリソース名>"
gh variable set GCP_SERVICE_ACCOUNT --body "<サービスアカウントのメールアドレス>"
gh variable set GCS_TEST_BUCKET --body "<バケット名>"
```

秘密の値ではない（鍵ではなく、名前と場所だけ）ので Variables でよい。

## 8. 動作を確かめる

3つを設定すると、次の PR から CI の `gcs` ジョブが動く。今ある PR で確かめるには、空のコミットを push するか、GitHub の Actions 画面から再実行する。

`gcs` ジョブが緑になれば、次が本物の Cloud Storage で確かめられたことになる。

- 署名どおりのアップロードと、署名付き URL での取得ができる
- 署名より大きいファイル・違う種類・ヘッダーなしは拒否される
- 署名のない URL、期限が切れた URL では取得できない

## うまくいかないときの手がかり

| 症状 | 原因の見当 |
| -- | -- |
| `gcs` ジョブが動かない（skip） | GitHub の変数が3つそろっていない。fork からの PR でも動かない（仕様） |
| 認証で失敗する | 6 のバインド（`roles/iam.workloadIdentityUser`）か、プロバイダの条件のリポジトリ名を確認 |
| `SERVICE_DISABLED` | 3 の `iamcredentials.googleapis.com` が有効になっていない |
| 署名で `Permission denied` | 5 の「自分自身への `roles/iam.serviceAccountTokenCreator`」が付いていない |
| アップロードが 403 | テストの期待どおり（拒否のテスト）か、バケット名の設定ミス |

## 本番のときに追加ですること

この手順は開発・テスト専用。本番では別のプロジェクトを作り、次を追加する（README の「本番に出すとき」）。

- バケットの CORS（本番のオリジンからの `PUT`・`GET` のみ）
- アプリのサービスアカウント（同じ2つのロール）
- `STORAGE_BUCKET` の設定（`STORAGE_API_ENDPOINT` と `GOOGLE_APPLICATION_CREDENTIALS` は設定しない）
