/**
 * カタログを取り込んでいるアカウント（koko）の profiles.id。
 * import_official_batch がカタログのグッズの created_by にこの ID を入れている。
 * 登録者が分からないグッズ（created_by が NULL・退会済み）も、このアカウントが登録したものとして表示する。
 */
export const CATALOG_ACCOUNT_ID = "2cbe8645-0347-4d9d-8a6d-3dbb8a3c1df3";
