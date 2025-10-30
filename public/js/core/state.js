// Core: application state
(function (global) { const PP = global.PlanningPoker = global.PlanningPoker || {}; PP.LS_KEYS = { CLIENT_ID: 'clientId', DISPLAY_NAME: 'displayName', SESSION_ID: 'currentSessionId', SESSION_NAME: 'currentSessionName' }; PP.state = { clientId: null, displayName: '', sessionId: null, sessionName: '', roundId: null, selectedValue: null, revealed: false, joined: false }; })(window);

