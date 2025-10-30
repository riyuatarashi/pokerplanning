/** Core state module */
export const state = {
  clientId: null,
  displayName: '',
  sessionId: null,
  sessionName: '',
  roundId: null,
  selectedValue: null,
  revealed: false,
  joined: false
};

export const LS_KEYS = {
  CLIENT_ID: 'clientId',
  DISPLAY_NAME: 'displayName',
  SESSION_ID: 'currentSessionId',
  SESSION_NAME: 'currentSessionName'
};

export function generateClientId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {return crypto.randomUUID();}
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

