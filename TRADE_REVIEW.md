# 交換フロー監査（TRADE_REVIEW）

対象: 出す（offer）→ 選ぶ（select）→ 申し込む（request）→ 承認/拒否（accept/decline）→ 発送（ship）→ 受領（receipt）→ 完了（complete）の一連、公式サンプルアカウントの扱い、エッジケース。

結論を先に: **状態遷移そのものは全箇所がDB側のSECURITY DEFINER関数経由に統一されており、競合（二重完了・片方だけの操作での完了）は構造的に防げている。見つかった不整合は1件（`TradeActionReason` 型の抜け）のみで、実害は軽微。本PRで修正済み。** それ以外は監査のみで、交換のRPCそのものは変更していない。

## 1. 状態遷移の一覧と実装箇所

| 段階 | クライアント | DB関数（最新定義） |
|---|---|---|
| 出すものを選ぶ (offer) | `src/components/trade/TradeOfferPicker.tsx` の `toggle()` → `user_items.for_trade` 更新 | （直接のRPCなし。`for_trade` を立てるだけ） |
| マッチング候補の提示 | `src/components/trade/TradeMatchingSection.tsx` | `find_trade_matches` / `find_trade_series_partners` / `find_holders_for_my_wishes`（`supabase/migrations/20261020160000_sample_account_exclude_trade_chat.sql`） |
| 申し込む (request) | `src/services/trade/tradeStateMachine.ts:69-80 createTradeRequest` | `create_trade_request`（同ファイル、L266〜） |
| 承認/拒否 (accept/decline) | `tradeStateMachine.ts:104-113 respondToTradeRequest` | `respond_to_trade_request`（`20260810100000_trade_state_machine.sql:100-129`、競合中の他の申し込みの自動取消は `...reservation_and_notifications.sql` で拡張） |
| 取消 (cancel) | `tradeStateMachine.ts:116-119` | `cancel_trade_request`（`20260810100000...sql:134-166`） |
| 発送 (ship) | `tradeStateMachine.ts:122-125` | `report_trade_shipment`（`20260810100000...sql:169-206`） |
| 受領・完了 (receipt/complete) | `tradeStateMachine.ts:128-131` | `report_trade_receipt`（`20260810100000...sql:210-259`）。送受双方の `*_received_at` が揃ったときだけ `status='completed'` |
| コレクションへの反映 | `tradeStateMachine.ts:92-101` | `apply_trade_to_collection`（`20261016073316_purchase_records_and_past_items.sql:59-`）。`sender_applied_at`/`receiver_applied_at` で冪等 |

**OK点:**
- すべての書き込み系RPCが `SELECT ... FOR UPDATE` で行ロックしてから判定しており、`trade_requests` への直接 `UPDATE`/`INSERT` は権限上できない（`REVOKE ALL ... FROM PUBLIC` + 個別 `GRANT EXECUTE`）。以前は「完了」処理が4箇所に分散し片方の操作だけで完了にできたと冒頭コメントにある通りだが、現状は一本化済み。
- `report_trade_receipt` は相手の発送（`*_shipped_at`）が無いと受領を記録できない作りで、両者受領が揃うまで `completed` にならない。発送前に受領だけ先行する、片方だけの操作で完了になる、という競合は見当たらない。

## 2. `TradeActionReason` と翻訳キーの対応（指摘点・修正済み）

`src/services/trade/tradeStateMachine.ts` の `TradeActionReason` 型（修正前）には `sample_account` が無かった。一方で:
- DBの `create_trade_request`（`20261020160000_sample_account_exclude_trade_chat.sql`）は、申込み先が公式サンプルアカウントで自分がサンプルでない場合に **実際に** `trade_error('sample_account')` を返す。
- 翻訳キー `trade.errors.sample_account` は ja/en とも既に用意されている（`src/translations/modules/trade.ts:124` 「このアカウントとは交換できません」 / `:640` "You can't trade with this account"）。

つまり型だけがサーバーの返し得る値を正しく表していない状態だった。実行時の見え方としては、`tradeErrorKey()`（`tradeStateMachine.ts`）がテンプレートリテラル `` `trade.errors.${reason}` `` でキーを組み立てて `t()` に渡すだけで、`TradeActionReason` に対する網羅的な `switch` を行っている呼び出し元（`TradeCard.tsx`, `TradeRequestModal.tsx`）は無いため、**画面上は正しい日本語/英語が出ており、ユーザーに見える不具合ではなかった**。ただし型が実態と食い違っているのは型安全性のギャップであり、将来 `TradeActionReason` を網羅的に分岐する実装が増えると実害化する。本PRで `"sample_account"` を型のユニオンに追加済み（`tradeStateMachine.ts`）。他の値は双方向とも翻訳キーとの対応漏れなし。

## 3. 公式サンプルアカウントのブロック（3段構え、いずれも健全）

1. **マッチング除外**: `find_trade_matches` / `find_trade_series_partners` / `find_holders_for_my_wishes` は `WHERE NOT pr.is_sample` でサンプルを候補から除外（同migration）。
2. **申込み時の拒否**: `create_trade_request` が、申込み先がサンプルかつ自分がサンプルでないとき `sample_account` を返す（サンプル同士のやり取りは運営のシミュレーター用に許可）。
3. **メッセージ/申込みのDBトリガー**: `trg_enforce_not_messaging_sample`（`messages` と `trade_requests` への `BEFORE INSERT`）が、受信者がサンプルかつ送信者がサンプルでないときに多重防御として拒否。`service_role` のみ回避可（運営のシミュレーター操作用）。

3層が同じ条件（`is_sample`）で整合しており、抜け道は確認できなかった。

## 4. その他の確認済み・要注意点（コードは変更していない）

- `TradeOfferPicker.tsx` / `TradeMatchingSection.tsx` / `TradeRequestModal.tsx` の画面側ロジックは、今回のA–Gの範囲（主にD: ツアーの指す場所）以外は変更していない。UIレベルの細かいエッジケース（例: 承認直後のキャッシュの古さ、ピッカーの在庫のリアルタイム性）までは深く検証していないため、別途ユーザー操作での確認を推奨する。
- 今回のD（オンボーディングのスポットライトツアー）修正に伴い、`TradeOfferPicker.tsx` の出品グリッドに `data-tour="trade-offer-grid"` を追加した。これは案内用のマーカーであり、交換のロジック自体には影響しない。

## 5. 今回のA–Gとの関連

- 交換関連で明確に「バグ」と確認できたのは `TradeActionReason` の型の抜け（§2）のみ。これを修正。
- D項（PCでの模様替えツアー誤配置）は交換の状態機械とは無関係で、オンボーディングのスポットライト演出（`SpotlightTour.tsx`/`tours.ts`）側の問題だったため、そちらで対処した（別項参照）。
