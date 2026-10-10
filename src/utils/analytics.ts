import mixpanel from 'mixpanel-browser';
import { supabase } from "@/integrations/supabase/client";
import { ANALYTICS_CONSENT_EVENT, getAnalyticsConsent, type AnalyticsConsent } from "@/utils/analyticsConsent";

// Mixpanel は、利用者が分析への同意を選んだときだけ初期化する（src/utils/analyticsConsent.ts）
const MIXPANEL_TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN;
let mixpanelEnabled = false;
let mixpanelInitialized = false;

function enableMixpanel() {
  if (!MIXPANEL_TOKEN) return;
  try {
    if (!mixpanelInitialized) {
      mixpanel.init(MIXPANEL_TOKEN);
      mixpanelInitialized = true;
    } else {
      mixpanel.opt_in_tracking();
    }
    mixpanelEnabled = true;
  } catch (e) {
    console.warn('Failed to initialize Mixpanel:', e);
  }
}

function disableMixpanel() {
  mixpanelEnabled = false;
  if (!mixpanelInitialized) return;
  try {
    mixpanel.opt_out_tracking();
    mixpanel.reset();
  } catch (e) {
    console.warn('Failed to disable Mixpanel:', e);
  }
}

if (getAnalyticsConsent() === 'granted') enableMixpanel();
if (typeof window !== 'undefined') {
  window.addEventListener(ANALYTICS_CONSENT_EVENT, (e) => {
    if ((e as CustomEvent<AnalyticsConsent>).detail === 'granted') enableMixpanel();
    else disableMixpanel();
  });
}
if (!MIXPANEL_TOKEN && import.meta.env.DEV) {
  // 本番では毎回出るノイズになるため開発時のみ通知
  console.warn('VITE_MIXPANEL_TOKEN is not set. Analytics will not be tracked.');
}

// 安全に mixpanel を呼び出すためのヘルパー
const safeTrack = (event: string, properties?: Record<string, any>) => {
  if (!mixpanelEnabled) return;
  try {
    mixpanel.track(event, properties);
  } catch (e) {
    console.warn(`Mixpanel track failed (${event}):`, e);
  }
};

const safePeopleSet = (properties: Record<string, any>) => {
  if (!mixpanelEnabled) return;
  try {
    mixpanel.people.set(properties);
  } catch (e) {
    console.warn('Mixpanel people.set failed:', e);
  }
};

const safeIdentify = (userId: string) => {
  if (!mixpanelEnabled) return;
  try {
    mixpanel.identify(userId);
  } catch (e) {
    console.warn('Mixpanel identify failed:', e);
  }
};

export const trackLogin = async (userId: string, method: string = 'email') => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single();

    safeIdentify(userId);
    safePeopleSet({
      $last_login: new Date().toISOString(),
      username: profile?.username,
    });
    safeTrack('User Login', {
      distinct_id: userId,
      method,
      username: profile?.username,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error tracking login:', error);
  }
};

export const trackSignup = async (userId: string, method: string = 'email') => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single();

    safeIdentify(userId);
    safePeopleSet({
      $created: new Date().toISOString(),
      $last_login: new Date().toISOString(),
      username: profile?.username,
    });
    safeTrack('User Signup', {
      distinct_id: userId,
      method,
      username: profile?.username,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error tracking signup:', error);
  }
};

export const trackLogout = (userId: string) => {
  safeTrack('User Logout', {
    distinct_id: userId,
    timestamp: new Date().toISOString(),
  });
};

export const trackTabChange = (tabName: string, userId?: string) => {
  safeTrack('Tab Change', {
    distinct_id: userId || 'anonymous',
    tab: tabName,
    timestamp: new Date().toISOString(),
  });
};

export const trackAddToCollection = (itemId: string, itemTitle: string, userId?: string) => {
  safeTrack('Add to Collection', {
    distinct_id: userId || 'anonymous',
    itemId,
    itemTitle,
    timestamp: new Date().toISOString(),
  });
};

export const trackRoomView = (roomId: string, ownerId: string, userId?: string) => {
  safeTrack('Room View', {
    distinct_id: userId || 'anonymous',
    roomId,
    ownerId,
    timestamp: new Date().toISOString(),
  });
};

export const trackRoomShare = (roomId: string, roomTitle: string, userId?: string) => {
  safeTrack('Room Share', {
    distinct_id: userId || 'anonymous',
    roomId,
    roomTitle,
    timestamp: new Date().toISOString(),
  });
};

export const updateUserProfile = (userId: string, properties: {
  username?: string;
  bio?: string;
  avatar_url?: string;
}) => {
  safePeopleSet({
    ...properties,
    $last_updated: new Date().toISOString(),
  });
  if (properties.username) {
    safePeopleSet({ username: properties.username });
  }
  safeTrack('Profile Update', {
    distinct_id: userId,
    ...properties,
    timestamp: new Date().toISOString(),
  });
};
