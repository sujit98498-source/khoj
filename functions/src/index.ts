// functions/src/index.ts
// Registers all KHOJ Cloud Functions.
// Deploy: firebase deploy --only functions

import * as admin from 'firebase-admin'
admin.initializeApp()

// ── Collaboration Rooms ───────────────────────────────────────────────────────
export { createStartupRoom }         from './collaborationRooms/createStartupRoom'
export {
  submitStartupJoinRequest,
  reviewStartupJoinRequest,
  withdrawStartupJoinRequest,
}                                    from './collaborationRooms/joinRequest'
export {
  sendStartupInvite,
  respondToStartupInvite,
  revokeStartupInvite,
}                                    from './collaborationRooms/invites'
export {
  createStartupSession,
  getStartupSessionToken,
  endStartupSession,
}                                    from './collaborationRooms/sessions'
export {
  onMemberWriteSyncRoomSummary,
  onRoleWriteSyncOpenRoleCount,
  onJoinRequestWriteSyncPendingCount,
  onRoomDeleteCleanup,
}                                    from './collaborationRooms/triggers'
export { rankStartupProfiles }       from './collaborationRooms/matching'
