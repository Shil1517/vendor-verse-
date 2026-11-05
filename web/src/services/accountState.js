/* F-ACC-03 account states: one definition used by screens, gates and banners. */

export const ACCOUNT_STATES = {
  pending: { label: 'Pending verification', tone: 'amber', message: 'You can browse and prepare content. Publishing and transacting stay locked until verification completes.', signIn: true, transact: false, publish: false, appeal: false },
  active: { label: 'Active', tone: 'green', message: 'Everything available to your role is open.', signIn: true, transact: true, publish: true, appeal: false },
  restricted: { label: 'Restricted', tone: 'amber', message: 'Some actions are limited while we review a report. Existing commitments stay manageable.', signIn: true, transact: false, publish: false, appeal: true },
  suspended: { label: 'Suspended', tone: 'red', message: 'You cannot transact. You can read your records and appeal to a human reviewer.', signIn: true, transact: false, publish: false, appeal: true },
  deletion_requested: { label: 'Deletion requested', tone: 'gray', message: 'Your account is queued for the approved deletion and anonymisation flow.', signIn: true, transact: false, publish: false, appeal: false },
}

export const ACCOUNT_STATE_IDS = Object.keys(ACCOUNT_STATES)

/** Unknown or missing values behave as `active` only for guests/legacy data; anything else unknown is treated as pending (safe default). */
export function stateOf(me) {
  const s = me?.accountState
  if (!s) return 'active'
  return ACCOUNT_STATES[s] ? s : 'pending'
}

export const describeState = (me) => ACCOUNT_STATES[stateOf(me)]
export const canTransact = (me) => describeState(me).transact
export const canPublish = (me) => describeState(me).publish
export const canAppeal = (me) => describeState(me).appeal
/** Banner to show app-wide, or null when the account is active. */
export function stateBanner(me) {
  const s = stateOf(me)
  return s === 'active' ? null : { state: s, ...ACCOUNT_STATES[s] }
}
