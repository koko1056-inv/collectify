/**
 * 法務ページ（プライバシーポリシー・利用規約・特定商取引法に基づく表記）の本文。
 *
 * 実装の実態（Supabase / Vercel / Stripe / Mixpanel / AI 処理 / 退会・データ書き出し / 通報・ブロック）に
 * 合わせてある。サービスの仕組みを変えたら、ここも直すこと。
 * 運営者の名称・所在地などは src/config/legal.ts。
 */
import { LEGAL_OPERATOR } from "@/config/legal";

export type LegalLang = "ja" | "en";

export interface LegalSection {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  /** 表（見出し行 + 行） */
  table?: { head: string[]; rows: string[][] };
}

export interface LegalDoc {
  title: string;
  /** 前文 */
  intro?: string[];
  sections: LegalSection[];
}

const OP = LEGAL_OPERATOR.name;

const contactJa = LEGAL_OPERATOR.email
  ? `アプリ内の「設定 > ご意見・ご要望を送る」、またはメール（${LEGAL_OPERATOR.email}）`
  : "アプリ内の「設定 > ご意見・ご要望を送る」";
const contactEn = LEGAL_OPERATOR.email
  ? `the in-app form (Settings > Send feedback or a request), or email (${LEGAL_OPERATOR.email})`
  : "the in-app form (Settings > Send feedback or a request)";

// ───────────────────────────── プライバシーポリシー ─────────────────────────────

export const PRIVACY: Record<LegalLang, LegalDoc> = {
  ja: {
    title: "プライバシーポリシー",
    intro: [
      `${OP}（以下「当社」）は、推し活グッズの管理・交換アプリ「Collectify」（以下「本サービス」）で取り扱うユーザーの個人情報について、個人情報の保護に関する法律（個人情報保護法）をはじめとする各国の法令を守り、以下のとおりプライバシーポリシー（以下「本ポリシー」）を定めます。`,
    ],
    sections: [
      {
        title: "1. 取得する情報",
        paragraphs: ["当社は、本サービスの提供にあたり、次の情報を取得します。"],
        bullets: [
          "アカウント情報: ログインID（メールアドレス等）、ユーザー名、表示名、プロフィール画像、自己紹介、好きなコンテンツ（興味）、言語・表示の設定",
          "ユーザーが登録・投稿する内容: グッズの写真・タイトル・タグ・メモ、ほしいものリスト、投稿・コメント・リアクション、「推しフォト」の写真とひとこと、メッセージ、グッズ交換のやりとり、AI機能で作成した画像など",
          "ポイント・購入情報: ポイントの残高と履歴、有料プランの状態、購入の記録。クレジットカード番号などの決済情報は、決済事業者（Stripe、Apple、Google）が取り扱い、当社は保存しません",
          "利用状況・端末の情報: アクセス日時、IPアドレス、ブラウザ・端末の種類、操作の記録（エラー・不正利用の調査のため）。同意をいただいた場合に限り、機能の利用状況（どの画面や機能が使われたか）を分析ツールで取得します",
          "お問い合わせ・通報の内容、および対応の記録",
        ],
      },
      {
        title: "2. 写真に含まれる情報について",
        paragraphs: [
          "アップロードされた写真は、保存する前に端末側で圧縮し、撮影場所などの位置情報（EXIF）を取り除きます。写真に写り込んだ人物・住所・個人を特定できる情報は、ユーザーご自身の責任で確認のうえ投稿してください。",
        ],
      },
      {
        title: "3. 利用目的",
        bullets: [
          "本サービスの提供、本人確認、ログインの維持、機能の改善",
          "コレクションの管理、おすすめの表示、他のユーザーとの交流・グッズ交換の仲介",
          "ポイントの付与・有料プランの提供、決済・請求の処理",
          "AI機能（画像からのグッズ判定、アバター・背景の生成、チャットでの追加など）の提供",
          "通知（新商品、交換の申請、メッセージなど）の送信",
          "不正利用・規約違反の防止と対応（通報の確認、利用の制限を含む）",
          "お問い合わせへの対応、重要なお知らせの送付",
          "利用状況の分析による本サービスの改善（同意いただいた場合のみ）",
        ],
      },
      {
        title: "4. AI機能での取り扱い",
        paragraphs: [
          "AI機能をご利用になると、入力された文章・画像（および生成の参考にする画像）が、処理のために外部のAI提供事業者（Google の Gemini など）に送信されます。送信された内容は、各事業者の利用規約とデータの取り扱い方針に従って処理されます。他人の個人情報や、第三者の権利を侵害する画像をAI機能に入力しないでください。",
        ],
      },
      {
        title: "5. 第三者への提供と委託",
        paragraphs: [
          "当社は、法令に基づく場合を除き、ユーザーの同意なく個人情報を第三者に提供しません。ただし、本サービスの運営のため、次の事業者に取り扱いを委託しています（委託の範囲を超えて利用させることはありません）。",
        ],
        table: {
          head: ["事業者", "目的", "取り扱う主な情報"],
          rows: [
            ["Supabase", "データベース・認証・ファイル保存", "アカウント、登録した内容、写真"],
            ["Vercel", "サイトの配信", "アクセス情報（IPアドレスなど）"],
            ["Stripe", "クレジットカード等の決済", "決済情報（当社は保存しない）、購入の記録"],
            ["Apple / Google / RevenueCat", "アプリ内課金", "購入の記録"],
            ["Google（Gemini）ほか", "AI機能の処理", "ユーザーが入力した文章・画像"],
            ["Mixpanel", "利用状況の分析（同意した場合のみ）", "ユーザーID、機能の利用イベント"],
            ["Resend", "メールの送信", "メールアドレス、通知の内容"],
          ],
        },
      },
      {
        title: "6. 他のユーザーに表示される情報",
        paragraphs: [
          "プロフィール、コレクション、ほしいものリスト、投稿、コメント、「推しフォト」などは、ユーザーが設定した公開範囲に従って、他のユーザーまたはインターネット上に表示されます。公開範囲はプロフィールの設定からいつでも変更できます。メッセージは、やりとりの相手にのみ表示されます。",
        ],
      },
      {
        title: "7. 国外への移転",
        paragraphs: [
          "上記の委託先のサーバーは、日本国外（米国、シンガポールなど）にある場合があります。この場合、委託先との契約などにより、個人情報の保護に必要な措置を講じます。EEA（欧州経済領域）・英国のユーザーの情報を移転する場合は、標準契約条項（SCC）など、法令が認める方法によります。",
        ],
      },
      {
        title: "8. 保存期間と削除",
        paragraphs: [
          "アカウントがある間、個人情報を保存します。アプリ内の「設定 > アカウント」からいつでも退会でき、手続きが完了するとアカウントに紐づく個人データは直ちに削除されます。バックアップに含まれるデータは30日以内に完全に消去されます。",
          "法令で保存が求められる取引・請求の記録、不正利用の調査に必要な記録、他のユーザーとの取引の記録など相手方の利用に必要な一部の記録は、ユーザーを特定できない形にして、必要な期間のみ残す場合があります。",
        ],
      },
      {
        title: "9. ユーザーの権利",
        paragraphs: [
          "ユーザーは、ご自身の個人情報について、開示、訂正、削除、利用の停止、第三者提供の停止、同意の撤回を求めることができます。多くはアプリ内で行えます。",
        ],
        bullets: [
          "データの書き出し: 「設定 > アカウント > データを書き出す」から、ご自身のデータをファイルでダウンロードできます",
          "退会（データの削除）: 「設定 > アカウント」から行えます",
          "公開範囲・プロフィールの変更: プロフィールの設定から行えます",
          `上記で足りない場合は、${contactJa} からご連絡ください。ご本人であることを確認のうえ、法令の定める期間内に対応します`,
        ],
      },
      {
        title: "10. クッキー・ローカルストレージ・分析ツール",
        paragraphs: [
          "本サービスは、ログインの維持、言語や表示の設定、操作の途中状態の保存のために、クッキーおよびブラウザのローカルストレージを使用します（これらは本サービスの提供に必要なものです）。",
          "利用状況の分析（Mixpanel）は、初回の表示で「同意する」を選んだ場合にのみ有効になります。同意はいつでも、「設定 > アカウント > 分析への同意」から撤回できます。同意しなくても、本サービスのすべての機能を使えます。",
        ],
      },
      {
        title: "11. 未成年のユーザー",
        paragraphs: [
          "13歳未満の方は本サービスをご利用いただけません。18歳未満の方は、保護者の方の同意を得たうえでご利用ください。",
        ],
      },
      {
        title: "12. 安全管理",
        paragraphs: [
          "当社は、通信の暗号化、データベースの行単位のアクセス制御、権限を持つ担当者に限ったアクセス、写真の位置情報の除去など、個人情報の漏えい・滅失・毀損を防ぐための措置を講じます。",
        ],
      },
      {
        title: "13. EEA・英国にお住まいの方へ",
        bullets: [
          "取り扱いの法的根拠: 契約の履行（本サービスの提供）、正当な利益（不正の防止、サービスの安全・改善）、同意（分析ツール、任意の通知）、法令上の義務",
          "上記「ユーザーの権利」に加え、取り扱いへの異議、データポータビリティ（書き出し）の権利があります",
          "ご不満がある場合は、お住まいの国・地域の監督機関に申し立てることができます",
        ],
      },
      {
        title: "14. 本ポリシーの改定",
        paragraphs: [
          "法令の変更やサービスの変更に応じて、本ポリシーを改定することがあります。重要な変更をするときは、本サービス内またはメールでお知らせします。",
        ],
      },
      {
        title: "15. お問い合わせ",
        paragraphs: [`本ポリシーに関するお問い合わせは、${contactJa} までご連絡ください。（運営: ${OP}）`],
      },
    ],
  },
  en: {
    title: "Privacy Policy",
    intro: [
      `${OP} (the "Company") sets out this Privacy Policy (the "Policy") for how it handles users' personal information in Collectify (the "Service"), an app for managing and trading fandom goods, in compliance with Japan's Act on the Protection of Personal Information and other applicable laws.`,
    ],
    sections: [
      {
        title: "1. Information we collect",
        bullets: [
          "Account information: login ID (such as email address), username, display name, profile image, bio, favorite content, and language and display settings",
          "Content you add or post: photos, titles, tags and notes for your goods, wishlists, posts, comments, reactions, “Oshi photos” and captions, messages, trade conversations, and images created with AI features",
          "Points and purchases: your points balance and history, plan status, and purchase records. Payment details such as card numbers are handled by payment providers (Stripe, Apple, Google); we do not store them",
          "Usage and device information: access times, IP address, browser/device type, and operation logs (to investigate errors and abuse). Only if you consent, we also collect feature-usage analytics",
          "Your inquiries and reports, and our records of handling them",
        ],
      },
      {
        title: "2. Photos",
        paragraphs: [
          "Before storing a photo, the app compresses it on your device and removes location and other metadata (EXIF). Please make sure that photos you post do not show people, addresses or other information that could identify someone, unless you have the right to share it.",
        ],
      },
      {
        title: "3. How we use information",
        bullets: [
          "To provide the Service, verify accounts, keep you signed in, and improve features",
          "To manage your collection, show recommendations, and facilitate interaction and trades between users",
          "To grant points, provide paid plans, and process payments",
          "To provide AI features (identifying goods from photos, generating avatars and backgrounds, adding goods by chat)",
          "To send notifications (new goods, trade requests, messages)",
          "To prevent and respond to abuse and violations of the Terms (including reviewing reports and restricting use)",
          "To respond to inquiries and send important notices",
          "To improve the Service through usage analytics (only with your consent)",
        ],
      },
      {
        title: "4. AI features",
        paragraphs: [
          "When you use an AI feature, the text and images you enter (and reference images used for generation) are sent to an external AI provider (such as Google’s Gemini) for processing. They are handled under each provider’s terms and data policies. Please do not enter other people’s personal information or images that infringe third-party rights.",
        ],
      },
      {
        title: "5. Sharing and service providers",
        paragraphs: [
          "We do not provide personal information to third parties without your consent, except as required by law. To run the Service, we entrust handling of data to the following providers, and do not allow use beyond that purpose.",
        ],
        table: {
          head: ["Provider", "Purpose", "Main information"],
          rows: [
            ["Supabase", "Database, authentication, file storage", "Account, content you add, photos"],
            ["Vercel", "Delivering the site", "Access information (e.g. IP address)"],
            ["Stripe", "Card and other payments", "Payment details (not stored by us), purchase records"],
            ["Apple / Google / RevenueCat", "In-app purchases", "Purchase records"],
            ["Google (Gemini) and others", "Processing AI features", "Text and images you enter"],
            ["Mixpanel", "Usage analytics (only with consent)", "User ID, feature-usage events"],
            ["Resend", "Sending email", "Email address, notification content"],
          ],
        },
      },
      {
        title: "6. What other users can see",
        paragraphs: [
          "Your profile, collection, wishlist, posts, comments and “Oshi photos” are shown to other users or on the internet according to the visibility you set. You can change visibility at any time in your profile settings. Messages are shown only to the people in the conversation.",
        ],
      },
      {
        title: "7. International transfers",
        paragraphs: [
          "Our providers’ servers may be outside Japan (for example in the United States or Singapore). We take measures required to protect personal information, such as contractual safeguards. For data of users in the EEA or the UK, transfers rely on mechanisms permitted by law, such as Standard Contractual Clauses.",
        ],
      },
      {
        title: "8. Retention and deletion",
        paragraphs: [
          "We keep personal information while your account exists. You can delete your account at any time in Settings > Account; once complete, personal data linked to the account is deleted immediately, and copies in backups are erased within 30 days.",
          "Some records may remain in a form that does not identify you, only for as long as needed: records of trades needed by the other party, records required by law (such as transactions and billing), and records needed to investigate abuse.",
        ],
      },
      {
        title: "9. Your rights",
        paragraphs: [
          "You may ask us to disclose, correct or delete your personal information, to stop using or sharing it, or to withdraw your consent. Most of this can be done in the app.",
        ],
        bullets: [
          "Export: Settings > Account > Export my data lets you download your data as a file",
          "Delete: close your account in Settings > Account",
          "Visibility and profile: change them in your profile settings",
          `If that is not enough, contact us via ${contactEn}. After verifying your identity, we will respond within the period required by law`,
        ],
      },
      {
        title: "10. Cookies, local storage and analytics",
        paragraphs: [
          "The Service uses cookies and browser local storage to keep you signed in and to save language, display settings and in-progress state. These are necessary to provide the Service.",
          "Usage analytics (Mixpanel) is enabled only if you choose “Accept” in the first-visit notice. You can withdraw consent at any time in Settings > Account > Analytics consent. All features work even if you decline.",
        ],
      },
      {
        title: "11. Children",
        paragraphs: [
          "The Service is not available to children under 13. Users under 18 should use the Service with a parent or guardian’s consent.",
        ],
      },
      {
        title: "12. Security",
        paragraphs: [
          "We take measures to prevent leakage, loss and damage of personal information, including encrypted communication, row-level access control in the database, access limited to authorized personnel, and removal of location metadata from photos.",
        ],
      },
      {
        title: "13. For users in the EEA and the UK",
        bullets: [
          "Legal bases: performance of a contract (providing the Service), legitimate interests (preventing abuse, keeping the Service safe and improving it), consent (analytics, optional notifications), and legal obligations",
          "In addition to the rights above, you have the right to object to processing and the right to data portability (export)",
          "You may lodge a complaint with the supervisory authority in your country or region",
        ],
      },
      {
        title: "14. Changes to this Policy",
        paragraphs: [
          "We may revise this Policy as laws or the Service change. For significant changes, we will notify you in the Service or by email.",
        ],
      },
      {
        title: "15. Contact",
        paragraphs: [`For questions about this Policy, contact us via ${contactEn}. (Operator: ${OP})`],
      },
    ],
  },
};

// ───────────────────────────── 利用規約 ─────────────────────────────

export const TERMS: Record<LegalLang, LegalDoc> = {
  ja: {
    title: "利用規約",
    intro: [
      `この利用規約（以下「本規約」）は、${OP}（以下「当社」）が提供する推し活グッズの管理・交換アプリ「Collectify」（以下「本サービス」）の利用条件を定めるものです。本サービスを利用する方（以下「ユーザー」）は、本規約に同意したものとみなします。`,
    ],
    sections: [
      {
        title: "第1条（適用）",
        paragraphs: [
          "本規約は、本サービスの利用に関する当社とユーザーとの間のすべての関係に適用されます。当社が本サービス上で示すルール（プライバシーポリシー、各機能のガイドなど）は、本規約の一部を構成します。",
        ],
      },
      {
        title: "第2条（本サービスの内容）",
        paragraphs: [
          "本サービスは、公式グッズの情報（カタログ）をもとに、ユーザーが持っているグッズ・ほしいグッズを記録し、他のユーザーと投稿や交換を通じて交流するためのサービスです。AIによる画像の判定・生成などの機能、ポイントや有料プランを含みます。",
        ],
      },
      {
        title: "第3条（アカウント）",
        bullets: [
          "13歳未満の方は利用できません。18歳未満の方は、保護者の同意を得て利用してください",
          "登録する情報は、正確で最新のものにしてください。1人が複数のアカウントを不正な目的で作ることはできません",
          "ログインの情報は、ユーザー自身の責任で管理してください。第三者による利用で生じた損害について、当社に故意または重過失がある場合を除き、当社は責任を負いません",
          "アカウントの譲渡・貸与・売買はできません",
        ],
      },
      {
        title: "第4条（禁止事項）",
        paragraphs: ["ユーザーは、次の行為をしてはなりません。"],
        bullets: [
          "法令または公序良俗に違反する行為",
          "他のユーザーや第三者への誹謗中傷、嫌がらせ、脅迫、差別的な表現、つきまとい",
          "他人の個人情報（住所・氏名・連絡先・位置情報など）を、本人の同意なく投稿・収集する行為",
          "第三者の著作権・商標権・肖像権・プライバシーなどの権利を侵害する投稿",
          "わいせつ・暴力的・自傷を助長するなど、不快または有害な内容の投稿",
          "なりすまし、虚偽の情報の登録、偽物・模倣品・転売目的の不正な取引、詐欺",
          "グッズ交換での、約束した発送をしない、説明と異なるものを送る、相手を不当に困らせる行為",
          "スパム、勧誘、本サービスと無関係な広告",
          "ポイントや特典の不正取得（複数アカウントの作成、自動化したアクセスなど）",
          "本サービスのシステムへの不正アクセス、過度な負荷をかける行為、リバースエンジニアリング、他のユーザーの情報の収集",
          "AI機能に、他人の個人情報や第三者の権利を侵害する画像を入力する行為",
          "その他、当社が不適切と合理的に判断する行為",
        ],
      },
      {
        title: "第5条（ユーザーが投稿した内容）",
        bullets: [
          "ユーザーが投稿・登録した内容（写真、文章、コメントなど）の権利は、ユーザーまたは正当な権利者に留まります。ユーザーは、投稿する内容について必要な権利を持っていることを保証します",
          "ユーザーは、当社に対し、本サービスの提供・改善・宣伝（本サービス内、共有カード、SNSでの紹介を含む）に必要な範囲で、投稿した内容を、世界中で無償で、複製・表示・配信・加工（サイズの変更など）できる非独占的な権利を許諾します。この許諾は、投稿の削除または退会により、法令・バックアップ上必要な範囲を除き終了します",
          "ユーザーが公開範囲を限定した内容は、その設定に従い表示します",
          "当社は、本規約に違反する、または違反するおそれがある内容を、事前の通知なく非表示または削除できます",
        ],
      },
      {
        title: "第6条（カタログの情報・画像と権利者）",
        bullets: [
          "本サービスのカタログに載せている商品名・価格・画像などは、公式の販売サイト等で公開されている情報をもとにしており、各権利者に権利が帰属します。当社は、情報の正確性・最新性を保証しません",
          "権利者の方で、カタログの掲載内容の修正や削除をご希望の場合は、アプリ内の「設定 > ご意見・ご要望を送る」から、対象の商品と権利者であることがわかる内容をお知らせください。確認のうえ、速やかに対応します",
        ],
      },
      {
        title: "第7条（グッズの交換）",
        bullets: [
          "グッズの交換は、ユーザー同士が自らの責任で行うものです。当社は交換の当事者ではなく、交換の成立・品質・真贋・配送・代金のやりとり等について責任を負いません",
          "住所などの個人情報は、必要な範囲でのみ、交換が成立した相手にだけ伝えてください。本サービス内の配送ガイドに従うことを推奨します",
          "金銭を対価とする売買は、本サービスの目的外です。トラブルを避けるため、本サービス外での金銭のやりとりをおすすめしません",
          "トラブルは、まず当事者間で誠実に解決してください。通報の機能から当社に報告することもできます",
        ],
      },
      {
        title: "第8条（ポイント・有料プラン）",
        bullets: [
          "ポイントは、本サービス内の機能（AI機能、特典など）に使えるもので、現金や他のポイントとの交換、他のユーザーへの譲渡はできません。付与の条件・使い道・有効期限などは、本サービス内の表示に従います",
          "有料プラン・ポイントの購入は、Stripe、App Store、Google Play などの決済で行います。価格は購入画面に税込で表示します",
          "有料プランは、解約しない限り、同じ期間で自動的に更新されます。解約は、購入時に使った方法（Stripeのカスタマーポータル、App Store、Google Play）で、次の更新日の前までに行ってください。解約後も、支払い済みの期間の終わりまでは利用できます",
          "デジタルコンテンツの性質上、購入後の返金は、法令で認められる場合または当社が特に認めた場合を除き、できません。App Store・Google Play 経由の購入の返金は、各事業者の手続きに従います",
        ],
      },
      {
        title: "第9条（AI機能）",
        bullets: [
          "AI機能の結果（画像の判定、生成された画像や文章）は、正確性・適法性・特定の目的への適合性を保証しません。ユーザーは、結果を確認してから利用してください",
          "AIで生成した画像について、ユーザーは、本規約と法令の範囲で利用できます。ただし、他人の権利を侵害しないようにする責任はユーザーにあります",
          "AI機能の利用には、ポイントを使う場合があります。仕様や利用できる回数は、予告なく変更することがあります",
        ],
      },
      {
        title: "第10条（通報・ブロックと対応）",
        bullets: [
          "ユーザーは、不適切な投稿・コメント・メッセージ・ユーザーを、本サービス内の通報機能から当社に報告できます。また、特定のユーザーをブロックして、そのユーザーとのやりとりや表示を避けることができます",
          "当社は、通報を受けたら、内容を確認し、24時間以内を目安に対応を始めます（休日・混雑時は遅れることがあります）。必要に応じて、内容の非表示・削除、警告、利用の制限・停止、アカウントの削除を行います",
          "対応の結果は、個別にはお知らせしない場合があります",
        ],
      },
      {
        title: "第11条（サービスの変更・中断・終了）",
        paragraphs: [
          "当社は、システムの保守、障害、天災、その他やむを得ない事情があるときは、事前の通知なく、本サービスの全部または一部を中断できます。また、事業上の判断により、本サービスの内容を変更し、または終了することがあります。終了するときは、可能な限り事前にお知らせします。",
        ],
      },
      {
        title: "第12条（退会・利用の停止）",
        bullets: [
          "ユーザーは、アプリ内の「設定 > アカウント」からいつでも退会できます。退会すると、データは削除されます（詳しくはプライバシーポリシーをご覧ください）",
          "当社は、ユーザーが本規約に違反した場合、または違反するおそれがある場合に、事前の通知なく、利用の制限・停止やアカウントの削除ができます。この場合、購入済みのポイントや有料プランの料金は、法令で認められる場合を除き、返金しません",
        ],
      },
      {
        title: "第13条（免責・責任の制限）",
        bullets: [
          "当社は、本サービスが、常に中断なく、誤りなく、ユーザーの特定の目的に適合することを保証しません",
          "当社は、ユーザー間または第三者とのトラブル、ユーザーが投稿した内容、本サービスから外部のサイトに移動した後に生じた損害について、責任を負いません",
          "当社の責任は、当社に故意または重過失がある場合を除き、ユーザーが当社に支払った直近12か月の対価の額を上限とします。ただし、消費者契約法その他の法令により、この制限が認められない場合は、この限りではありません",
        ],
      },
      {
        title: "第14条（知的財産権）",
        paragraphs: [
          "本サービスのプログラム、デザイン、ロゴ、文章などに関する知的財産権は、当社または正当な権利者に帰属します。ユーザーは、本規約で認められた範囲を超えて、これらを利用できません。",
        ],
      },
      {
        title: "第15条（規約の変更）",
        paragraphs: [
          "当社は、必要に応じて、本規約を変更できます。重要な変更をするときは、本サービス内またはメールで事前にお知らせします。変更後に本サービスを使い続けたときは、変更後の規約に同意したものとみなします。",
        ],
      },
      {
        title: "第16条（準拠法・管轄）",
        paragraphs: [
          "本規約には日本法を適用します。本サービスに関して紛争が生じた場合は、当社の本店所在地を管轄する地方裁判所を、第一審の専属的合意管轄裁判所とします。ただし、法令により消費者に認められる管轄がある場合は、その定めによります。",
        ],
      },
      {
        title: "第17条（お問い合わせ）",
        paragraphs: [`本規約に関するお問い合わせは、${contactJa} までご連絡ください。（運営: ${OP}）`],
      },
    ],
  },
  en: {
    title: "Terms of Service",
    intro: [
      `These Terms of Service (the "Terms") set out the conditions for using Collectify (the "Service"), an app for managing and trading fandom goods provided by ${OP} (the "Company"). By using the Service, you agree to these Terms.`,
    ],
    sections: [
      {
        title: "Article 1 (Scope)",
        paragraphs: [
          "These Terms apply to all matters between the Company and users regarding use of the Service. Rules the Company shows within the Service (such as the Privacy Policy and feature guides) form part of these Terms.",
        ],
      },
      {
        title: "Article 2 (The Service)",
        paragraphs: [
          "The Service lets users record the goods they own or want, based on a catalog of official goods information, and interact with other users through posts and trades. It includes AI features (identifying and generating images), points and paid plans.",
        ],
      },
      {
        title: "Article 3 (Accounts)",
        bullets: [
          "You must be at least 13. If you are under 18, use the Service with a parent or guardian’s consent",
          "Keep your registration information accurate and current. You may not create multiple accounts for improper purposes",
          "You are responsible for your login credentials. Except where the Company is intentionally or grossly negligent, it is not liable for damage caused by use by third parties",
          "Accounts may not be transferred, lent or sold",
        ],
      },
      {
        title: "Article 4 (Prohibited conduct)",
        paragraphs: ["You must not:"],
        bullets: [
          "Violate laws or public order and morals",
          "Defame, harass, threaten, discriminate against or stalk other users or third parties",
          "Post or collect others’ personal information (addresses, names, contact details, location) without their consent",
          "Post content that infringes copyright, trademark, portrait, privacy or other rights",
          "Post obscene, violent or self-harm-promoting content, or other offensive or harmful content",
          "Impersonate others, register false information, deal in counterfeit goods or for improper resale, or commit fraud",
          "In trades: fail to ship as promised, send something different from what was described, or unreasonably trouble the other party",
          "Spam, solicit, or advertise unrelated to the Service",
          "Obtain points or benefits improperly (multiple accounts, automated access, etc.)",
          "Gain unauthorized access to the Service’s systems, put excessive load on them, reverse engineer them, or collect other users’ information",
          "Enter others’ personal information or rights-infringing images into AI features",
          "Do anything else the Company reasonably judges to be inappropriate",
        ],
      },
      {
        title: "Article 5 (Content you post)",
        bullets: [
          "Rights in content you post or register (photos, text, comments, etc.) remain with you or the rightful owner. You warrant that you have the necessary rights",
          "You grant the Company a non-exclusive, worldwide, royalty-free license to reproduce, display, distribute and adapt (e.g. resize) your content to the extent necessary to provide, improve and promote the Service (including within the Service, share cards and social media). This license ends when you delete the content or your account, except as needed for legal or backup reasons",
          "Content whose visibility you restrict is shown according to your settings",
          "The Company may hide or delete, without prior notice, content that violates or may violate these Terms",
        ],
      },
      {
        title: "Article 6 (Catalog information, images and rights holders)",
        bullets: [
          "Product names, prices and images in the catalog are based on information published on official sales sites and similar sources, and rights belong to their respective holders. The Company does not guarantee accuracy or timeliness",
          "If you are a rights holder and want catalog content corrected or removed, tell us the product and information showing that you are the rights holder via Settings > Send feedback or a request. We will review and act promptly",
        ],
      },
      {
        title: "Article 7 (Trading goods)",
        bullets: [
          "Trades are carried out by users at their own responsibility. The Company is not a party to any trade and is not responsible for whether a trade takes place, or for quality, authenticity, shipping or any exchange of money",
          "Share personal information such as your address only as needed and only with the person you have agreed a trade with. We recommend following the shipping guide in the Service",
          "Sales for money are outside the purpose of the Service. To avoid trouble, we discourage exchanging money outside the Service",
          "Resolve problems in good faith between the parties first. You can also report them to us with the report feature",
        ],
      },
      {
        title: "Article 8 (Points and paid plans)",
        bullets: [
          "Points can be used for features in the Service (AI features, perks, etc.). They cannot be exchanged for cash or other points, or transferred to other users. Conditions of grant, uses and expiry follow what is shown in the Service",
          "Paid plans and points are purchased via payment methods such as Stripe, the App Store and Google Play. Prices are shown including tax on the purchase screen",
          "Paid plans renew automatically for the same period unless cancelled. Cancel before the next renewal date through the method you used to purchase (Stripe customer portal, App Store, Google Play). You can keep using the plan until the end of the paid period",
          "Because of the nature of digital content, purchases are not refundable except where required by law or specifically approved by the Company. Refunds for App Store / Google Play purchases follow those providers’ procedures",
        ],
      },
      {
        title: "Article 9 (AI features)",
        bullets: [
          "Results of AI features (image identification, generated images and text) are not guaranteed to be accurate, lawful or fit for a particular purpose. Check results before using them",
          "You may use AI-generated images within these Terms and the law. You remain responsible for not infringing others’ rights",
          "AI features may use points. Specifications and usage limits may change without notice",
        ],
      },
      {
        title: "Article 10 (Reports, blocking and our response)",
        bullets: [
          "You can report inappropriate posts, comments, messages and users to the Company with the in-service report feature, and block a user to avoid interaction with and content from them",
          "After receiving a report, we review it and aim to begin acting within 24 hours (this may be delayed on holidays or when busy). As needed, we hide or delete content, warn users, restrict or suspend use, or delete accounts",
          "We may not notify you individually of the outcome",
        ],
      },
      {
        title: "Article 11 (Changes, interruption and discontinuation)",
        paragraphs: [
          "The Company may suspend all or part of the Service without prior notice for maintenance, failures, disasters or other unavoidable reasons. It may also change or discontinue the Service for business reasons; if so, it will give notice in advance where possible.",
        ],
      },
      {
        title: "Article 12 (Leaving and suspension)",
        bullets: [
          "You can close your account at any time in Settings > Account. Your data is then deleted (see the Privacy Policy)",
          "If you violate or may violate these Terms, the Company may restrict or suspend use or delete your account without prior notice. In that case, purchased points and plan fees are not refunded except where required by law",
        ],
      },
      {
        title: "Article 13 (Disclaimers and limitation of liability)",
        bullets: [
          "The Company does not guarantee that the Service will always be available, error-free or fit for your particular purpose",
          "The Company is not responsible for disputes between users or with third parties, content posted by users, or damage arising after you move from the Service to an external site",
          "Except where the Company is intentionally or grossly negligent, its liability is limited to the amount you paid the Company in the last 12 months. This limit does not apply where it is not permitted by consumer protection or other laws",
        ],
      },
      {
        title: "Article 14 (Intellectual property)",
        paragraphs: [
          "Intellectual property in the Service’s software, design, logos and text belongs to the Company or its rightful owners. You may not use them beyond what these Terms allow.",
        ],
      },
      {
        title: "Article 15 (Changes to these Terms)",
        paragraphs: [
          "The Company may change these Terms as needed. For significant changes, we will give notice in advance in the Service or by email. If you continue to use the Service after a change, you are deemed to agree to the revised Terms.",
        ],
      },
      {
        title: "Article 16 (Governing law and jurisdiction)",
        paragraphs: [
          "These Terms are governed by the laws of Japan. For disputes about the Service, the district court having jurisdiction over the Company’s head office is the exclusive court of first instance by agreement, except where consumer protection laws give you a different forum.",
        ],
      },
      {
        title: "Article 17 (Contact)",
        paragraphs: [`For questions about these Terms, contact us via ${contactEn}. (Operator: ${OP})`],
      },
    ],
  },
};

// ───────────────────────────── 特定商取引法に基づく表記 ─────────────────────────────

const disclosedJa = "請求があった場合は、遅滞なく開示します。下記のお問い合わせ窓口からご連絡ください。";
const disclosedEn = "Disclosed without delay upon request. Please contact us via the inquiry channel below.";

export const TOKUSHOHO: Record<LegalLang, LegalDoc> = {
  ja: {
    title: "特定商取引法に基づく表記",
    intro: ["ポイントの購入・有料プランについての、特定商取引法に基づく表記です。"],
    sections: [
      {
        title: "事業者の情報",
        table: {
          head: ["項目", "内容"],
          rows: [
            ["販売事業者", OP],
            ["運営責任者", LEGAL_OPERATOR.representative || disclosedJa],
            ["所在地", LEGAL_OPERATOR.address || disclosedJa],
            ["電話番号", LEGAL_OPERATOR.phone || disclosedJa],
            ["お問い合わせ", contactJa],
          ],
        },
      },
      {
        title: "販売条件",
        table: {
          head: ["項目", "内容"],
          rows: [
            ["販売する商品", "本サービス内で使うポイント、有料プラン（デジタルコンテンツ・サービス）"],
            ["販売価格", "各購入画面に、消費税を含む価格を表示します"],
            ["商品代金以外の必要料金", "インターネットの接続料金・通信料金は、お客様のご負担です"],
            ["お支払い方法", "クレジットカード等（Stripe）、App Store の決済、Google Play の決済"],
            ["お支払い時期", "購入の手続き時。有料プランは、購入時と、以降の更新日（毎月または毎年）に決済されます"],
            ["提供時期", "お支払いの確認後、直ちに（ポイントの付与・プランの有効化）"],
            ["有料プランの更新と解約", "解約しない限り、同じ期間で自動的に更新されます。購入時に使った方法（Stripe のカスタマーポータル、App Store、Google Play）で、次の更新日の前までに解約してください。解約後も、支払い済みの期間の終わりまでは利用できます"],
            ["返品・キャンセル", "デジタルコンテンツの性質上、購入後のキャンセル・返金は、法令で認められる場合または当社が特に認めた場合を除き、できません。商品の不具合・二重の課金などは、お問い合わせ窓口までご連絡ください。App Store・Google Play 経由の返金は、各事業者の手続きに従います"],
            ["動作環境", "最新の主要なブラウザ（Chrome、Safari、Edge など）、または対応するモバイル端末"],
          ],
        },
      },
    ],
  },
  en: {
    title: "Notation based on the Act on Specified Commercial Transactions",
    intro: ["This is the notation under Japan’s Act on Specified Commercial Transactions for purchases of points and paid plans."],
    sections: [
      {
        title: "Seller information",
        table: {
          head: ["Item", "Details"],
          rows: [
            ["Seller", OP],
            ["Person responsible", LEGAL_OPERATOR.representative || disclosedEn],
            ["Address", LEGAL_OPERATOR.address || disclosedEn],
            ["Phone", LEGAL_OPERATOR.phone || disclosedEn],
            ["Contact", contactEn],
          ],
        },
      },
      {
        title: "Terms of sale",
        table: {
          head: ["Item", "Details"],
          rows: [
            ["Products", "Points for use in the Service and paid plans (digital content and services)"],
            ["Price", "Prices including consumption tax are shown on each purchase screen"],
            ["Other charges", "Internet connection and data charges are borne by you"],
            ["Payment methods", "Credit cards and others (Stripe), App Store payments, Google Play payments"],
            ["Payment timing", "At purchase. Paid plans are charged at purchase and on each renewal date (monthly or yearly)"],
            ["Delivery", "Immediately after payment is confirmed (points granted, plan activated)"],
            ["Renewal and cancellation of plans", "Plans renew automatically for the same period unless cancelled. Cancel before the next renewal date via the method you used to purchase (Stripe customer portal, App Store, Google Play). You can keep using the plan until the end of the paid period"],
            ["Returns and cancellation", "Because of the nature of digital content, purchases cannot be cancelled or refunded except where required by law or specifically approved by us. For defects or double charges, contact us. Refunds for App Store / Google Play purchases follow those providers’ procedures"],
            ["System requirements", "A current major browser (Chrome, Safari, Edge, etc.) or a supported mobile device"],
          ],
        },
      },
    ],
  },
};
