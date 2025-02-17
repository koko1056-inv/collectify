
import mixpanel from 'mixpanel-browser';

// Initialize Mixpanel
mixpanel.init('4bc4d60b2405ad26a1c8851be3bbfdcd');

export const trackLogin = async (userId: string, method: string = 'email') => {
  try {
    // Get username from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single();

    mixpanel.identify(userId);
    
    // ユーザー基本情報の設定
    mixpanel.people.set({
      $email: userId,
      $last_login: new Date().toISOString(),
      username: profile?.username,
    });

    mixpanel.track('User Login', {
      distinct_id: userId,
      method: method,
      username: profile?.username,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error tracking login:', error);
  }
};

export const trackSignup = async (userId: string, method: string = 'email') => {
  try {
    // Get username from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single();

    mixpanel.identify(userId);
    
    // ユーザー基本情報の設定
    mixpanel.people.set({
      $email: userId,
      $created: new Date().toISOString(),
      $last_login: new Date().toISOString(),
      username: profile?.username,
    });

    mixpanel.track('User Signup', {
      distinct_id: userId,
      method: method,
      username: profile?.username,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error tracking signup:', error);
  }
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
  // Update Mixpanel user profile with new properties
  mixpanel.people.set({
    ...properties,
    $last_updated: new Date().toISOString(),
  });

  // If username is being updated, make sure to update it
  if (properties.username) {
    mixpanel.people.set({
      username: properties.username
    });
  }

  mixpanel.track('Profile Update', {
    distinct_id: userId,
    ...properties,
    timestamp: new Date().toISOString()
  });
};
