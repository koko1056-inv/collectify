
import mixpanel from 'mixpanel-browser';

// Initialize Mixpanel
mixpanel.init('4bc4d60b2405ad26a1c8851be3bbfdcd');

export const trackLogin = (userId: string, method: string = 'email') => {
  mixpanel.identify(userId);
  
  // ユーザー基本情報の設定
  mixpanel.people.set({
    $email: userId,
    $last_login: new Date().toISOString(),
  });

  mixpanel.track('User Login', {
    distinct_id: userId,
    method: method,
    timestamp: new Date().toISOString()
  });
};

export const trackSignup = (userId: string, method: string = 'email') => {
  mixpanel.identify(userId);
  
  // ユーザー基本情報の設定
  mixpanel.people.set({
    $email: userId,
    $created: new Date().toISOString(),
    $last_login: new Date().toISOString(),
  });

  mixpanel.track('User Signup', {
    distinct_id: userId,
    method: method,
    timestamp: new Date().toISOString()
  });
};

export const trackLogout = (userId: string) => {
  mixpanel.track('User Logout', {
    distinct_id: userId,
    timestamp: new Date().toISOString()
  });
};

export const trackTabChange = (tabName: string, userId?: string) => {
  mixpanel.track('Tab Change', {
    distinct_id: userId || 'anonymous',
    tab: tabName,
    timestamp: new Date().toISOString()
  });
};

export const trackAddToCollection = (itemId: string, itemTitle: string, userId?: string) => {
  mixpanel.track('Add to Collection', {
    distinct_id: userId || 'anonymous',
    itemId,
    itemTitle,
    timestamp: new Date().toISOString()
  });
};

export const updateUserProfile = (userId: string, properties: {
  username?: string;
  bio?: string;
  avatar_url?: string;
}) => {
  mixpanel.people.set({
    ...properties,
    $last_updated: new Date().toISOString(),
  });

  mixpanel.track('Profile Update', {
    distinct_id: userId,
    ...properties,
    timestamp: new Date().toISOString()
  });
};
