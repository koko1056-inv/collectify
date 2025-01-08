import mixpanel from 'mixpanel-browser';

// Initialize Mixpanel
mixpanel.init('4bc4d60b2405ad26a1c8851be3bbfdcd');

export const trackLogin = (userId: string, method: string = 'email') => {
  mixpanel.track('User Login', {
    distinct_id: userId,
    method: method,
    timestamp: new Date().toISOString()
  });
};