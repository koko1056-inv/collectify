import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * 利用規約（プレースホルダー）。
 * Footer リンクから到達する公開ページ。本番運用時は法務確認の上、
 * 内容をプロダクトの実態に合わせて更新してください。
 */
export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 sm:px-6 py-16 sm:py-24">
        <Link
          to="/lp"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition mb-8"
        >
          <ArrowLeft className="h-4 w-4" /> 戻る
        </Link>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">利用規約</h1>
        <p className="text-sm text-muted-foreground mb-12">最終更新日: 2026-05-10</p>

        <div className="prose prose-zinc max-w-none space-y-8 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold mb-3">第1条（適用）</h2>
            <p className="text-foreground/80">
              本規約は、MGC inc.（以下「当社」）が提供する Collectify（以下「本サービス」）の
              利用に関する条件をユーザーと当社との間で定めるものです。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">第2条（利用登録）</h2>
            <p className="text-foreground/80">
              本サービスを利用するには、当社の定める方法に従って利用登録を行う必要があります。
              ユーザーは登録情報の正確性について責任を負います。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">第3条（禁止事項）</h2>
            <ul className="list-disc pl-6 space-y-1 text-foreground/80">
              <li>法令または公序良俗に違反する行為</li>
              <li>他のユーザーまたは第三者の権利を侵害する行為</li>
              <li>本サービスの運営を妨害する行為</li>
              <li>不正アクセス、リバースエンジニアリング、スクレイピング</li>
              <li>商業目的での無断利用、転売、譲渡</li>
              <li>未成年者の保護に反する行為</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">第4条（コンテンツの権利）</h2>
            <p className="text-foreground/80">
              ユーザーが投稿したコンテンツの著作権はユーザーに帰属します。
              ただし、本サービスの提供・宣伝のため、当社は無償で当該コンテンツを使用できるものとします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">第5条（トレード機能）</h2>
            <p className="text-foreground/80">
              本サービスのトレード機能は、ユーザー間のグッズ交換をサポートする目的で提供されます。
              当社はトレードの結果について責任を負わず、トレードはユーザーの自己責任において行われます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">第6条（有料サービス・ポイント）</h2>
            <p className="text-foreground/80">
              本サービスでは、消費型のポイント購入機能（Apple In-App Purchase または Google Play Billing 経由）を提供します。
              購入されたポイントは、原則として返金されません。
              プラットフォーム規約に従い、不具合による未付与の場合のみ、サポートにご相談ください。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">第7条（免責事項）</h2>
            <p className="text-foreground/80">
              当社は、本サービスの内容について、その完全性、正確性、有用性等について
              いかなる保証も行いません。本サービスの利用により生じた損害について、
              当社の故意または重大な過失による場合を除き、責任を負わないものとします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">第8条（規約の変更）</h2>
            <p className="text-foreground/80">
              当社は、必要と判断した場合、ユーザーに通知することなく本規約を変更できるものとします。
              変更後の規約は、本サービス内に掲示された時点から効力を生じます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">第9条（準拠法・管轄）</h2>
            <p className="text-foreground/80">
              本規約の解釈にあたっては、日本法を準拠法とします。
              本サービスに関して紛争が生じた場合には、東京地方裁判所を専属的合意管轄とします。
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
