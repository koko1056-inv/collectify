import mixpanel from 'mixpanel-browser';

// Initialize Mixpanel
mixpanel.init('4bc4d60b2405ad26a1c8851be3bbfdcd');

export const trackLogin = async (userId: string, username: string, method: string = 'email') => {
  mixpanel.identify(userId);
  mixpanel.people.set({
    $username: username,
    $last_login: new Date().toISOString(),
  });
  
  mixpanel.track('User Login', {
    distinct_id: userId,
    username: username,
    method: method,
    timestamp: new Date().toISOString()
  });
};