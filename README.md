# Google Analytics Report to Slack

Google Analytics の API を叩いて結果を Slack に連携するプログラムです。GitHub Actions で実行 (GUI / スケジュール実行）が可能です。プログラムは TypeScript で書かれていて、Deno で動作します。

## レポートについて

Google Analytics Reporting API v4 を使用し、下記のデータを Slack に投稿します。

-   サマリー(セッション・合計 PV・平均閲覧ページ数・平均滞在時間・直帰率)
-   PV が多いページのランキング

※ 2022 年 11 月 17 日現在、UA のみ動作確認しています。GA4 での動作は今後確認予定です。

### Slack に送られるテキストのサンプル

```
YYYY-MM-DD ~ YYYY-MM-DD のレポート
訪問数 : 12345 (+678) ↗
合計PV : 18517 (-90) ↘
平均閲覧ページ数 : 1.5 (+0.1) ↗
平均滞在時間 : 48.51秒 (-16.68) ↘
直帰率 : 87.38% (-3.16) ↘

YYYY-MM-DD ~ YYYY-MM-DD のランキング
1.  〇〇について　1234PV
2.  △△をリリースしました　1111PV
3.  ××のサービス 999PV
4.  □□に関するニュース 726PV
5.  △△の特徴 589PV
6.  ××料金 420PV
7.  〇〇の使い方 313PV
8.  △△の話 190PV
9.  □□と△△の比較 92PV
10. xxの活用例  55PV
```

### レポートの期間

実行時に引数を渡して取得するレポートの期間を指定できます。

| 引数    | 取得する期間              |
| ------- | ------------------------- |
| daily   | 前日                      |
| weekly  | 8 日前〜前日までの 1 週間 |
| monthly | 先月 1 日〜から先月末     |

## 使い方

### Slack アプリと Google Analytics Reporting API を使うための準備

Slack のワークスペースや Google アカウントがある前提になります。

#### Slack アプリの準備

1. [Slack アプリを作成](https://api.slack.com/apps/new)
2. Bot Token Scopes で `chat:write` `chat:write.customize` のパーミッションを付与
3. Workspace にインストール
4. 投稿したいチャンネルにアプリを追加

参考: https://api.slack.com/start/overview#apps

#### Google Analytics Reporting API を使うための準備

1. [Google Developers Console](https://console.developers.google.com/) でプロジェクト作成
2. Analytics Reporting API を有効にする
3. 認証情報の作成からサービスアカウントを作成してキー(json)を作成する
4. Google Analytics の管理画面から作成したサービスアカウントにアクセス権を付与する

参考: https://developers.google.com/analytics/devguides/reporting/core/v4?hl=ja

### Secrets を設定する

GitHub のリポジトリ設定から Actions secrets を設定します。

| 変数名                   | 説明                                                                                              | 必須 |
| ------------------------ | ------------------------------------------------------------------------------------------------- | :--: |
| SLACK_BOT_TOKEN          | 作成した Slack アプリの Bot User OAuth Token                                                      |  ✅  |
| SLACK_TARGET_CHANNEL     | 投稿したい Slack チャンネルの ID                                                                  |  ✅  |
| SLACK_BOT_USERNAME       | 投稿する Slack Bot のユーザー名(指定しなければ Slack アプリ名)                                    |      |
| SLACK_BOT_EMOJI          | 投稿する Slack Bot のアイコン(指定しなければ デフォルトアイコン)                                  |      |
| GCP_PROJECT_ID           | GCP のプロジェクト ID(認証キーから取得可能)                                                       |  ✅  |
| GCP_PRIVATE_KEY_ID       | GCP のプライベートキー ID(認証キーから取得可能)                                                   |  ✅  |
| GCP_PRIVATE_KEY          | GCP のプライベートキー(認証キーから取得可能)<br>※ Secrets に登録するときは \n を \\n に変更が必要 |  ✅  |
| GCP_CLIENT_EMAIL         | GCP のサービスアカウントのメールアドレス(認証キーから取得可能)                                    |  ✅  |
| GCP_CLIENT_X509_CERT_URL | 認証キーから取得可能                                                                              |  ✅  |
| GOOGLE_ANALYTICS_VIEW_ID | Google Analytics の View ID                                                                       |  ✅  |
| RANKING_EXCLUDE_TEXT     | ランキングのタイトルで除外したいテキスト<br>(全てのタイトルに入ってくるサイト名など)              |      |

### 実行する

#### GUI から実行

リポジトリの Actions のページから `Google Analytics Report to Slack` のワークフローを選択すると、`Run workflow` のプルダウンがあるのでそこから実行できます。

#### スケジューリング実行

`.github/workflows/report-to-slack.yml` で実行スケジュールを指定できます。
コメントに`daily` `weekly` `monthly` の書き方例があるので、実行したいスケジュールに合わせて書き換えてください。

例

```
on:
    schedule:
        # Runs every day at 1:00（UTC）
        - cron: '0 1 * * *'
        # Runs every Monday at 1:00（UTC）
        - cron: '0 1 * * 1'
        # Runs on the first day of each month at 1:00（UTC）
        - cron: '0 1 1 * *'
```

スケジュールに合わせて、タスクのスクリプト実行箇所も書き換えます。
デフォルトではコメントアウトされているので、実行したいスケジュールに合わせて書き換えてください。

例

```
- name: Run Script if schedule from daily setting
  if: github.event.schedule == '0 1 * * *'
  run: deno task report daily

- name: Run Script if schedule from weekly setting
  if: github.event.schedule == '0 1 * * 1'
  run: deno task report weekly

- name: Run Script if schedule from monthly setting
  if: github.event.schedule == '0 1 1 * *'
  run: deno task report monthly
```

TBD
