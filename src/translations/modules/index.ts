// エリア別の翻訳モジュールをまとめる。
// 各モジュールは1ファイル=1担当にしてあるため、並列で編集しても衝突しない。
import { chrome } from './chrome';
import { itemDetails } from './itemDetails';
import { profileScreen } from './profileScreen';
import { tagManage } from './tagManage';
import { roomEditor } from './roomEditor';
import { homeScreen } from './homeScreen';
import { aiRoom } from './aiRoom';
import { collectionScreen } from './collectionScreen';
import { social } from './social';
import { trade } from './trade';
import { screens } from './screens';
import { notices } from './notices';
import { misc } from './misc';

export const moduleTranslations = {
  ja: {
    chrome: chrome.ja,
    itemDetails: itemDetails.ja,
    profileScreen: profileScreen.ja,
    tagManage: tagManage.ja,
    roomEditor: roomEditor.ja,
    homeScreen: homeScreen.ja,
    aiRoom: aiRoom.ja,
    collectionScreen: collectionScreen.ja,
    social: social.ja,
    trade: trade.ja,
    screens: screens.ja,
    notices: notices.ja,
    misc: misc.ja,
  },
  en: {
    chrome: chrome.en,
    itemDetails: itemDetails.en,
    profileScreen: profileScreen.en,
    tagManage: tagManage.en,
    roomEditor: roomEditor.en,
    homeScreen: homeScreen.en,
    aiRoom: aiRoom.en,
    collectionScreen: collectionScreen.en,
    social: social.en,
    trade: trade.en,
    screens: screens.en,
    notices: notices.en,
    misc: misc.en,
  },
};
