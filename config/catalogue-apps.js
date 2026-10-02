import { APP_ID, APP_DETAILS } from '../learning-tracker/config.js';

// New apps hosted inside this site must declare their path and branding here.
// Standalone template repositories publish their root app automatically.
export const HOSTED_APPS = [{
  path: 'learning-tracker/',
  appId: APP_ID,
  details: APP_DETAILS,
  templateOnly: true, // Don't advertise a duplicate tracker in generated repos.
}];
