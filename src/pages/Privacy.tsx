import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * プライバシーポリシー（プレースホルダー）。
 * Footer リンクから到達する公開ページ。本番運用時は法務確認の上、
 * 内容をプロダクトの実態に合わせて更新してください。
 */
export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 sm:px-6 py-16 sm:py-24">
        <Link
          to="/lp"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition mb-8"
        >
          <ArrowLeft className="h-4 w-4" /> 戻る
        </Link>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          プライバシーポリシー
        </h1>
        <p className="text-sm text-muted-foreground mb-12">最終更新日: 2026-05-10</p>

        <div className="prose prose-zinc max-w-none space-y-8 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold mb-3">1. はじめに</h2>
            <p className="text-foreground/80">
              MGC inc.（以下「当社」）は、Collectify（以下「本サービス」）における
              ユーザーの個人情報の取り扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」）を定めます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">2. 収集する情報</h2>
            <ul className="list-disc pl-6 space-y-1 text-foreground/80">
              <li>アカウント情報（メールアドレス、ユーザー名、プロフィール画像）</li>
              <li>コレクション情報（登録したグッズの写真・タイトル・タグ・メモ）</li>
              <li>サービス利用ログ（アクセス日時、デバイス種別、IPアドレス）</li>
              <li>購入情報（App Store / Google Play 経由の購入履歴）</li>
              <li>メッセージ・トレード等のコミュニケーション履歴</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">3. 利用目的</h2>
            <ul className="list-disc pl-6 space-y-1 text-foreground/80">
              <li>本サービスの提供・運用・改善</li>
              <li>不正利用の防止およびセキュリティ確保</li>
              <li>新機能・キャンペーン等のお知らせ</li>
              <li>カスタマーサポート対応</li>
              <li>統計データの作成（個人を特定できない形式）</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">4. 第三者提供</h2>
            <p className="text-foreground/80">
              当社は、法令に基づく場合または以下の場合を除き、ユーザーの同意なく個人情報を第三者に提供しません。
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-foreground/80">
              <li>本サービスの運営委託先（クラウドインフラ、決済代行など）</li>
              <li>合併・事業譲渡等の事業承継時</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">5. データの保管・セキュリティ</h2>
            <p className="text-foreground/80">
              すべてのデータは、エンタープライズグレードのクラウドストレージ（Supabase）にて
              暗号化して保管されます。アクセスは権限を持つ担当者のみに限定されます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">6. データの削除・退会</h2>
            <p className="text-foreground/80">
              ユーザーはアプリ内設定からいつでも退会いただけます。
              退会時、すべての個人データは30日以内に完全削除されます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">7. クッキーおよび類似技術</h2>
            <p className="text-foreground/80">
              本サービスは、認証維持・利便性向上のためクッキーおよびローカルストレージを使用します。
              ブラウザの設定により無効化することができますが、一部機能が利用できなくなる場合があります。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">8. 改定</h2>
            <p className="text-foreground/80">
              本ポリシーは、必要に応じて改定する場合があります。重要な変更がある場合は、
              本サービス内またはメールにて通知します。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">9. お問い合わせ</h2>
            <p className="text-foreground/80">
              本ポリシーに関するお問い合わせは、運営：MGC inc.までご連絡ください。
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
