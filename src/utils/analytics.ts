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