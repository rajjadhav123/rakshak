# Project Rakshak — Working Skeleton (MERN)

> **v18 — the Police officer portal.** The last big gap flagged back
> when Citizen and Family got their own hubs in v13: Police Station
> Admin still landed on the same generic case-list Dashboard every
> role sees, with everything specific to the role (pending sightings,
> own cases, enrollment status) scattered across separate nav items.
> New "My Station" home consolidates the highest-value information
> directly and links out to the standalone flows that already work
> well, rather than duplicating them.

## What changed in v18 (this round)
- **New `GET /api/sightings/pending-review`** — a queue of sightings
  awaiting verification, scoped to the requester's own jurisdiction
  (station for Police Admin, district for District Control, state for
  State Control, everything for system/super admin). Nothing before
  this could answer "what's waiting on me, across every case my
  jurisdiction covers" in one call — `listSightings` requires a
  specific `caseId`, `listMySightings` is a citizen's own submissions.
- **Extracted `jurisdictionCaseFilter`** (`utils/caseVisibility.js`)
  from `listCases`' own inline jurisdiction-scoping logic, so the new
  endpoint and `listCases` share one rule instead of a second copy
  that can drift from the first — the same reasoning `canViewCase`
  already exists for at the single-case level, now extended to the
  list-scoping level. Verified the extraction is byte-for-byte
  identical to the original inline logic across every role and
  jurisdiction combination (9 cases) before wiring `listCases` to use
  it, then added 8 more permanent test cases for the new function
  itself to `utils/__tests__/caseVisibility.test.js` — including that
  a citizen or a null user can't accidentally trigger a restriction
  meant only for officials.
- **New `PoliceHome.jsx`** ("My Station" in the nav, `/police-home`,
  mirroring exactly how `/my-missing-person` was wired for Family in
  v13 — same `RoleGate` pattern, nav link inserted in the same
  position) — the pending-review queue above, an at-a-glance active-
  cases list (reusing `StatusPill`/`PriorityBadge` for visual
  consistency with the rest of the app), a face-enrollment status
  nudge, and quick links to Register Case and Messages. Every data
  load has its own error/retry state — the same pattern already
  established for every other page in this app, applied consistently
  here rather than reintroducing the class of bug v13.1's audit
  specifically found and fixed elsewhere.
- **District Control, State Control, and NGO/Volunteer portals are
  still open** — this round scoped to Police specifically, the
  platform's anchor role and the most requested. The pending-review
  endpoint was deliberately built jurisdiction-generic (not Police-
  specific), so a District/State Control portal reusing it later is a
  small follow-up, not a redesign.

> **v17.4 — a real terminal log changed the conclusion, and this is
> now the one lineage to keep.** A genuine command-line log — not a
> screenshot, not a claim — showed blink completing and registering
> real cases repeatedly on a parallel "v16.2" build being tested
> alongside this one. That's real evidence a properly speed-tuned
> blink pipeline works on this hardware, which outweighs v17.3's
> conclusion that it structurally couldn't. The one optimization from
> the original bug diagnosis this session had deliberately held off
> on is applied now, the default is reverted to blink on the strength
> of that evidence, and — importantly — nothing from either lineage
> needs to be manually merged: this file already has every backend/
> security fix from every round (duplicate detection, the case-
> visibility fix, the account-lockout system, photo_match, every test
> suite), so this is the one build to keep going forward.

## What changed in v17.4 (this round)
- **`inputSize: 224` finally applied to the hot detection loop**
  (`detectLivenessFrameLight` in `faceApi.js`) — the one piece of the
  original bug diagnosis (back in v16) this session recognized but
  deliberately didn't apply, reasoning that shrinking detection
  precision without solid evidence it was actually needed was its own
  risk. That reasoning was sound at the time — there was no evidence
  either way. There is now: a real log of blink completing repeatedly
  on this exact hardware, on a build that included this exact
  optimization. Left at the default (416, more precise, no speed
  pressure) for the two one-time calls that aren't on a timer
  (`detectFaceDescriptor`, `detectFacesInImage`) — this only ever
  applies to the repeated, real-time polling call.
- **Default reverted to blink**, from head_turn. The theoretical case
  for head_turn (a slower gesture is inherently more forgiving of
  polling-rate variance) was reasonable and is still true in
  principle — but real evidence of blink actually working, repeatedly,
  on this hardware outweighs a reasonable theory about what should
  work better. head_turn stays fully available and fully fixed (see
  v17.1/v17.2), just no longer the first thing shown.
- **On reconciling two lineages, for the record**: there was no way to
  directly diff the parallel "v16.2" build against this one — every
  attempt to share it this conversation turned out to be a file mix-
  up (see v16.2's and v17's own entries above). What mattered wasn't
  merging files line by line; it was treating the *evidence* in that
  log as real signal and acting on it, while keeping this codebase —
  which already carries every fix from every round, not just the
  liveness ones — as the single source going forward. Nothing from the
  other build needs preserving separately: whatever made blink work
  there, the two concrete, applicable pieces of it (speed, default
  ordering) are now here too.

> **v17.3 — where this actually stands: verify.js confirms the client
> never even attempts submission.** A real Network tab, captured
> mid-attempt, showed repeated `/face/challenge` calls and zero
> `/face/verify` calls across multiple tries — proof the backend,
> middleware, and submission wiring (all re-checked in v17.2's
> follow-up) were never the problem. The gesture itself isn't
> completing on this specific hardware, across six rounds of
> genuinely fixed, verified bugs. One real, low-risk optimization
> applied; the honest recommendation for now is the fallback already
> built for exactly this situation.

## What changed in v17.3 (this round)
- **`willReadFrequently: true` added to every canvas context this app
  creates that gets read back via `getImageData`** (`snapshotVideoFrame`
  in `useNonOverlappingPoll.js`, both canvases in `photoQuality.js`) —
  directly responding to a real browser console warning ("Canvas2D:
  Multiple readback operations... are faster with willReadFrequently
  set to true"), pointing at face-api.js's own internal canvas use
  during every detection call. This is a genuine, low-risk
  optimization, not a guessed fix — but it's a hint about face-api.js's
  *internal* canvas usage (inside `node_modules`, not something this
  project's own code controls), so it may not be the deciding factor.
- **Not fixed, because it isn't a code bug**: six rounds in (the
  original setInterval/descriptor issue, head-turn's threshold
  asymmetry, blink's baseline poisoning, the inverted progress bar,
  the misleading timeout message, and now this), the live gesture
  still isn't completing on this specific camera/hardware/lighting
  combination — confirmed by a real Network tab showing `/face/verify`
  is never even called. That's not a bug still hiding in this
  codebase; every plausible one that could be found by reading code
  has been found and fixed. It's a signal about what this particular
  device can reliably run in a browser, which no amount of further
  threshold tuning changes. `photo_match` — already built, already the
  labeled fallback exactly for this situation — is the practical path
  for this hardware right now; head-turn/blink stay in the codebase
  and documentation as the stronger option for hardware that handles
  them.

> **v17.2 — the actual reason head-turn felt like it was fighting
> you.** Two real screenshots (not a description of a problem — the
> problem itself, mid-attempt) showed "Turn detected — confirming…"
> immediately followed by "No clear head turn detected" — a direct
> contradiction, and a real bug, not a wording nitpick. Traced it to
> the actual cause: the confirming-phase progress bar was filling as
> you stayed turned away, not as you returned to center — visually
> telling you to do the opposite of what would finish the check.

## What changed in v17.2 (this round)

- **The confirming-phase progress bar was measuring the wrong thing.**
  It reused the same "distance from center" formula the watching phase
  correctly uses to show progress *toward* a trigger — but during
  confirming, the goal has flipped: the bar needs to show progress
  *toward return*. Left as-is, it grew while turned away and shrank
  while correctly turning back — exactly backwards, and psychologically
  the opposite of what someone reads a filling bar to mean. Rescaled
  it so 0 = still at the original trigger distance, 1 = right at the
  recovery threshold — verified with five concrete values by hand
  (still turned, just at threshold, halfway, past threshold, and
  turned even further) before trusting the direction was actually
  fixed, not just plausible-looking.
- **The timeout message contradicted what had just happened onscreen.**
  Both `HeadTurnLivenessCapture.jsx` and `FaceLivenessCapture.jsx`
  showed the same generic "no clear gesture detected" message
  regardless of *which* stage actually timed out — so someone who
  genuinely completed the gesture (saw "Turn detected" / "Blink
  detected — confirming…") but didn't return to center/reopen their
  eyes in time got told nothing was detected at all, flatly
  contradicting what they'd just watched happen. Now checks which
  stage was active when the timeout fired and says the true thing:
  "we saw the turn/blink, but didn't see you return/reopen in time"
  versus "no clear gesture detected" for a genuine no-attempt timeout.
  These aren't the same failure and were never given the same fix
  before — different next action (turn back further vs. reposition
  and start over), so they need different words.

> **v17.1 — reconsidering v17: live liveness back as the default,
> genuinely strengthened, not just re-tried.** v17's "drop it, default
> to a photo" was too quick a retreat — it treated blink and head-turn
> as equally hard, when they're not, and it's a fair objection that a
> platform pitched at this level shouldn't default to something a
> printed photo can pass. Two real bugs in head-turn's own thresholds
> got found and fixed (verified in this codebase, not just claimed),
> blink's baseline got hardened against the exact failure mode
> reported, and the hierarchy got rebuilt around what's actually more
> robust — not which one happened to be built first.

## What changed in v17.1 (this round)

- **Head-turn's recovery threshold was provably too tight — confirmed
  directly in this codebase, not taken on faith from the parallel
  session's document.** `YAW_RECOVER_RATIO` and `YAW_CENTERED_MAX_RATIO`
  were both exactly `0.05` — the same tolerance for "did you return to
  center" as for "were you centered to begin with," despite the
  baseline being smoothed across many ticks (an EMA) while recovery
  was checked against one instantaneous reading, structurally more
  exposed to the same measurement noise. Loosened to `0.065` — not
  copied from the other document, derived independently (the centered
  band scaled up by roughly the margin the EMA's smoothing buys the
  baseline side) and it happens to land on the same number, which is
  reassuring rather than redundant.
- **Head-turn's confirmation phase now gets its own timeout window.**
  `poll.resetTimeout()` now fires the moment a turn is detected, in
  both `HeadTurnLivenessCapture.jsx` and `FaceLivenessCapture.jsx` —
  someone who took a while to start their gesture no longer has less
  time left to finish it than someone who moved immediately.
- **Blink's baseline can no longer be poisoned by one noisy frame.**
  It's a running max with no decay by design (it has to remember "how
  open were this person's eyes, at best," for the whole watching
  phase) — which also meant a single glitched reading could inflate it
  permanently, since nothing ever brought it back down, and a
  genuinely full blink afterward could then never register as a big
  enough drop. A higher reading now needs 2 consecutive ticks above the
  current baseline (~200ms) before it's promoted. Verified the fix
  actually matters, not just that the new code happens to work: ran the
  exact same spike scenario through both the old and new logic side by
  side — old logic stalls on it, new logic doesn't, 10 test cases
  total including a genuine gradual rise and a completely clean blink,
  to confirm nothing legitimate got slower or stricter in the process.
- **The default hierarchy is now head-turn → blink → photo_match, not
  photo_match by default.** Blink is the fastest human gesture there
  is (100-400ms) — right at the edge of what any polling loop can
  reliably sample on hardware neither this session nor the one before
  it can test against. Head-turn is slower and inherently more
  forgiving of exactly that variance, and its real bugs (above) turned
  out to be calibration issues, not a structural sampling-rate
  ceiling the way blink's is. `photo_match` is still available — for
  whoever's camera genuinely can't run live detection reliably — but
  it's an explicit, clearly-labeled fallback now, not the default
  experience, and `FaceVerifyGate.jsx` states each method's actual
  guarantee honestly rather than implying they're equivalent.
- **New: an observational staticness signal, logged but never
  enforced.** For blink/head-turn (not photo_match, which only has one
  frame), the distance between the two "open"/centered frames — taken
  seconds apart — is computed and logged on every verification
  (`faceMatch.js`'s `framePairDistance`). A live person, even holding
  still, has natural micro-movement between those two moments; a
  rigidly mounted static photo has almost none. This is deliberately
  NOT a blocking check: there's no real captured-attack data available
  to calibrate a safe "this is definitely a photo" cutoff against, and
  getting that wrong in the blocking direction would mean rejecting
  genuine officers who followed the on-screen instruction to hold
  still — the exact false-positive problem this whole feature has
  already been fighting. It's there for District Control to have
  available if they're reviewing an account for other reasons, not to
  make automated calls on its own.
- **Said plainly, because it matters for how this gets presented: none
  of this makes photo_match, blink, or head-turn individually
  unspoofable in an absolute sense** — a sufficiently determined
  attacker with a video loop of the enrolled officer, or a 3D mask,
  isn't stopped by any client-side heuristic, including these. What
  changed is real: head-turn and blink are both measurably more
  reliable than before, the weakest option is no longer the default,
  and there's now a logged forensic signal that didn't exist before.
  That's a genuinely stronger position than v17's, and an honestly
  described one — not a claim this is now bulletproof.

> **v17 — dropping liveness as the required gate, keeping it as an
> option.** Four rounds (v16, v16.1's follow-ups, and two more rounds
> of reported timing/threshold bugs) went into making blink/head-turn
> liveness detection reliable, and it kept not being reliable enough
> to actually use — not because the underlying logic was wrong each
> time (every round found and fixed a real, distinct bug), but because
> face-api.js's inference speed on a live polling loop varies a lot by
> device, and neither this session nor the parallel one debugging it
> has a real camera to test against. A verification step that mostly
> times out isn't providing the security property it's meant to,
> regardless of how correct its logic is. Default is now a single
> live-camera photo match — no gesture, no polling loop, no timing to
> get wrong — with blink/head-turn still available as an opt-in
> stronger check for anyone whose hardware handles it well. This is a
> deliberate trade-off, documented honestly below, not a quiet
> downgrade.

## What changed in v17 (this round)

- **New default: `photo_match`.** One live-camera frame (not a file
  upload), descriptor extracted, matched against the enrolled face —
  the exact same matching logic (`utils/faceMatch.js`) already proven
  by the other two methods, just without the liveness pattern check in
  front of it. New `PhotoMatchCapture.jsx` is deliberately the
  simplest possible capture UI: a live "face detected" indicator and a
  manual Capture button, no automatic trigger, no multi-stage timing
  state machine at all. That removes the entire class of bug that hit
  blink/head-turn — there's no fast human gesture racing a polling
  loop, because there's no gesture. `FaceVerifyGate.jsx` offers blink/
  head-turn as explicit opt-ins ("Want a stronger check instead?"),
  not deleted, for anyone who wants to keep using them.

- **The trade-off, stated plainly, not hidden**: `photo_match` does
  not require a live gesture, so a clear photo of the enrolled officer
  held up to the camera could pass it. This is real and is said
  outright in the verification screen itself (see `securityNote` in
  `FaceVerifyGate.jsx`), not just in this file. It's accepted for this
  round because the alternative — a check that mostly doesn't complete
  — wasn't providing much real security either, just friction. If this
  matters more for your report/viva than the reliability trade-off, an
  honest way to frame it: this is a real, working system with a
  documented, understood limitation, not a broken one pretending to be
  complete — and the stronger methods are still one click away.

- **What now compensates for the weaker check: automatic account
  lockout on repeated mismatch.** Not new infrastructure — the
  district-notification-on-mismatch behavior already existed
  (`notifyDistrictSuperiors`, unchanged) and already fires on every
  method, every failure. What's new: 3 consecutive failed matches (any
  method — photo_match, blink, or head-turn all count toward the same
  counter, `User.faceEnrollment.failedMatchAttempts`) now also sets
  the account to `status: 'suspended'` automatically — which is
  already fully enforced everywhere an account's status is checked
  (`middleware/auth.js`, `authController.js` login), so locking is a
  one-line change, not new enforcement. A liveness failure (didn't
  catch the gesture) is deliberately NOT counted toward this — only an
  actual live face that doesn't match the enrolled one counts, since
  that's the materially serious signal, not a mistimed blink. The
  counter resets to 0 on any successful match. New pure, tested
  `nextFailedAttempts` (`controllers/faceController.js`) — small
  arithmetic, but it's the exact decision behind auto-suspending a
  real officer's account, so it gets a permanent test, not just a
  manual trace.

- **A file mix-up, for the record**: the `rakshak-v16_2.zip` uploaded
  this round was byte-identical to this project's own v16.2 delivery —
  none of the 4 fixes described in the accompanying handoff (from a
  parallel Claude Code session — inputSize tuning, a head-turn
  recovery-threshold/timeout fix, blink-baseline debouncing, a
  progress-bar direction bug) were actually present in it to verify or
  build on. They're individually plausible, real-sounding fixes for
  real problems, and worth trying if blink/head-turn keep getting used
  — but they're not reflected in this codebase, and this round didn't
  fabricate a diff against code that was never actually seen.

> **v16.2 — the four follow-ups from the v16.1 audit.** Verified each
> against the actual codebase before touching anything — none were
> taken on faith. All four turned out real and worth fixing; none
> were fixed blindly.

## What changed in v16.2 (this round)

- **`canAddToCase` had the same unsafe pattern `canViewCase` did**
  (`backend/controllers/caseController.js`) — confirmed: `String(caseDoc.
  createdBy) === String(user._id)`, no `idsEqual`. Not currently
  broken (`addPhoto`/`addDocument`/`addAdditionalInfo` all fetch via a
  plain `Case.findById` with no `.populate()`, confirmed by reading
  each of the three), but the exact same shape as the bug that WAS
  broken — a later `.populate('createdBy')` added to any of those
  three queries (e.g. to show a name in a response) would silently
  break it the same way. Now uses `idsEqual`.

- **`attachFir`'s station fallback could route a case to an
  unrelated station** — confirmed the code and traced the full
  picture: when `findNearestStation` fails at creation (bad/missing
  coordinates in a family's Emergency Report), the case is created
  with `policeStationId` genuinely unset — not a bug, that's already
  a supported state (`canViewCase` and `listCases` both already treat
  it as "visible to any official who could plausibly claim it").
  `attachFir` was defaulting an unset station to whichever officer
  happened to click Attach FIR — potentially reviewing a backlog from
  anywhere, with no geographic relationship to the case. Replaced with
  a real second `findNearestStation` attempt against the case's own
  stored coordinates (more stations may exist now than at creation
  time), and if that still finds nothing, the station is left
  genuinely unset — which is the already-correct, already-visible
  state — with a timeline note explaining why, rather than silently
  claiming a specific wrong station.

- **The stats filter really could leak platform-wide numbers** —
  this one needed proving, not just reading. `filter.policeStationId =
  user.jurisdiction?.policeStationId` with no guard looked concerning
  but "concerning" isn't "confirmed," so it was tested directly
  against the real `bson` package this project's MongoDB driver uses:
  `{policeStationId: undefined}` serializes to `{}` — a completely
  empty filter, matching every case in the database, not zero. Fixed
  by having `scopeFilter` return `null` when a role's required scope
  isn't actually set (Police Admin's station; extended to District/
  State Control's district/state too, for consistency, though those
  are already required at account creation so shouldn't be reachable
  today), with `overview`/`timeseries`/`byRegion` each returning a
  correctly-shaped empty response instead of ever building a query
  from it. `super_admin`'s legitimately-empty, see-everything filter
  stays distinct from this — confirmed both stay distinguishable.

- **The 34 test cases the v16.1 fix was actually verified with are
  now real files in the repo, not a one-time check that evaporated
  once trusted.** `backend/utils/__tests__/ids.test.js`,
  `caseVisibility.test.js` (this one also picked up `canAddToCase`'s
  new tests, since it's the same bug class), and `backend/controllers/
  __tests__/statsController.test.js` for the filter fix above. Plain
  Node scripts, no framework added — matches this project's existing
  style, and introducing one for this alone felt like more than what
  was actually needed. `npm test` (backend) runs all three; each
  exits 1 on any failure. Every test imports and calls the real
  exported function (`scopeFilter` and `canAddToCase` are now
  exported specifically so their tests exercise the actual code, not
  a re-implemented copy that could silently drift from it).

> **v16.1 — the actual reason "Case not found" survived two previous
> fix rounds, plus a full audit of the same bug class.** Diagnosed
> (with detailed help from a parallel Claude Code session working
> directly against your local DB — full credit, their handoff is what
> pinpointed the exact mechanism) and independently verified against
> the real Mongoose library before trusting it, then audited every
> other place in the backend the same bug class could exist. One real
> bug found and fixed; nine other places checked and confirmed safe;
> two design smells flagged for a decision, not silently changed.

## What changed in v16.1 (this round)

### The actual bug
`GET /api/cases/:id` (`getCase`) populates `policeStationId` — `
.populate('policeStationId', 'name district state')` — so it can show
the station's name instead of a bare ID. That turns
`caseDoc.policeStationId` from a raw ObjectId into a full `{_id, name,
district, state}` document. `canViewCase`'s Police Admin branch
compared it with `String(caseDoc.policeStationId) === String(user.
jurisdiction.policeStationId)` — and `String()` on a populated
Mongoose document is a JSON-ish field dump, **never** equal to a bare
ObjectId string, regardless of whether the underlying `_id`s actually
match. Proved this empirically rather than trusting the theory —
built the exact populated-vs-unpopulated scenario against the real
`mongoose` package and confirmed `String()` produces completely
different output for each, then confirmed the fix resolves it, before
touching the real code:
```
UNPOPULATED: String(caseDoc.policeStationId) -> "507f1f77bcf86cd799439011"
POPULATED:   String(caseDoc.policeStationId) -> "{ name: 'Nalasopara PS', district: ..., _id: ... }"
```
This is why the bug looked like it kept surviving fixes across three
rounds: it's not a data problem (every account's `policeStationId`
could be perfectly correct) and not a per-case problem (every Police
Admin, every case, on this one endpoint, unconditionally) — it's a
comparison bug that only manifests where `.populate()` touches that
specific field. `GET /sightings?caseId=` calls the identical
`canViewCase` function but never populates `policeStationId` on its
own case fetch, which is exactly why sightings worked while the case
itself 404'd for the same user on the same case — the asymmetry that
actually cracked this.

### The fix, and why it's structural, not a one-line patch
New `backend/utils/ids.js` — `getId(x)` / `idsEqual(a, b)` — resolves
either a raw ObjectId or a populated document to its `_id` before
comparing. `caseVisibility.js`'s all 5 identity comparisons (not just
the broken one — `createdBy`, `verifiedBy`, `policeStationId`,
`involvedNgos.ngoAdmin`, `assignedVolunteers.volunteer`) now go
through it uniformly, closing off this exact bug class at the file
that actually had it, not just the one line that happened to be
wrong this time. Verified with 34 test cases total: the original
15-case `canViewCase` regression suite re-run against the fix, 6 more
specifically covering the NGO/volunteer branches with populated
sub-documents (these were already doing the right thing manually
before this refactor — confirmed the refactor didn't change that),
and 13 direct edge-case tests of the new helper itself — including
that two `null` IDs are never treated as matching each other, which a
naive `String(null) === String(null)` comparison would get wrong.

### The full audit (not just this one endpoint)
- **Every other identity comparison in the backend** (9 more, across
  `messageController.js`, the rest of `caseController.js`,
  `sightingController.js`, `utils/ngoInvolvement.js`) checked
  individually against the exact query that produces the document
  being compared. All 9 confirmed safe — none of their source queries
  populate the field being compared. Not refactored to use the new
  helper (no current bug to fix there, and touching working code
  broadly "just in case" is its own risk) — but the shared helper
  exists now for any new comparison going forward, and this list is
  the paper trail for what was actually checked.
- **`listCases`'s query filter confirmed still consistent** with the
  fixed `canViewCase`. This was never actually at risk from this bug
  class in the first place — a MongoDB query filter matches against
  the raw stored value directly; `.populate()` only affects documents
  *after* a query already ran, so it can't affect filter matching.
  Worth confirming explicitly rather than assuming, since it was
  asked about directly.
- **Every write-site of `policeStationId` audited**: case creation
  (`findNearestStation`, writes a real station `_id` by construction),
  manual reassignment (`reassignStation`, already validates the
  station exists and is in-district), account creation
  (`createOfficialUser`, validated since v14.1). No "edit an existing
  account's jurisdiction" endpoint exists at all — confirmed by
  reading the full route list, not assumed.
- **Flagged, not changed** (matching how it was raised — a design
  decision to make deliberately, not an obvious bug to silently
  patch): `attachFir`'s fallback silently sets a case's station to
  whichever officer's own station happens to attach the FIR, if the
  case had no station at creation (e.g. bad/missing coordinates). This
  makes station-of-record "whoever clicked the button" rather than
  "the case's actual location" in that specific situation. Also
  noticed in passing while auditing writes: `statsController.js`'s
  Police Admin stats filter sets `policeStationId` straight from
  `user.jurisdiction?.policeStationId` with no guard if that's ever
  unset — lower stakes than case visibility (stats scoping, not who
  can see what), not confirmed as an active problem, just noted for
  awareness.

> **v16 — the actual reason blink verification needed 100+ attempts,
> plus a second liveness option.** You reported blink capture being
> so unreliable it sometimes took 100-150 tries. Found the real cause
> (below — a genuine bug, not just a strict threshold), fixed it, and
> added head-turn as a selectable alternative for anyone who still
> finds blink finicky for their camera/face/lighting.

## What changed in v16 (this round)
- **The root cause: every ~100ms polling tick ran face-api's full
  pipeline, including descriptor extraction — by far its most
  expensive stage — and a naive `setInterval(async () => {...}, 100)`
  doesn't wait for one tick to finish before starting the next.** On
  any hardware where a full detection took longer than 100ms (common
  without GPU acceleration), calls piled up and each one got slower
  competing for the same resources — the opposite of what catching a
  ~100-400ms human blink needs. This is a materially different, more
  severe problem than the threshold tuning v1→v2 already went through
  (see the "v1 was bad" history further down) — that fix was real and
  still correct, it just couldn't fix a sampling-rate problem underneath
  it. Fixed two ways together: `detectLivenessFrameLight` (new, in
  `faceApi.js`) skips descriptor extraction entirely during the hot
  polling loop — a descriptor is only ever extracted once, at the very
  end, from the three specific frames actually kept, via a snapshot
  taken onto an offscreen canvas at the moment each matters (see
  `snapshotVideoFrame`). And the polling loop itself (new
  `useNonOverlappingPoll` hook) explicitly waits for each detection to
  resolve before scheduling the next — no more pile-up, structurally,
  regardless of how slow any individual tick is.
- **The blink/watching state logic was extracted into a pure,
  dependency-free function** (`nextBlinkState` in the new
  `utils/livenessState.js`) specifically so it could be tested without
  a camera — this project has no browser test runner, but plain state-
  transition logic runs fine in Node. Verified against a clean blink,
  no blink at all, a shallow dip that shouldn't trigger, a rising
  baseline, a very fast blink (fewer samples — the actual post-fix
  scenario), and eyes staying closed (must never falsely "recover") —
  8 cases, all passing before this was wired into the real component.
- **New: head-turn as a selectable alternative**, for anyone who still
  finds blink unreliable for their particular setup — a small "Try a
  head turn instead" link on the verification screen
  (`FaceVerifyGate.jsx`) switches to it. Same security shape as blink
  end to end: the client sends raw jaw-outline + nose landmark points,
  never a pre-computed yaw number, and the server (new
  `verifyHeadTurnPattern` in `utils/liveness.js`) independently
  recomputes yaw from those points before accepting a centered→turned→
  centered pattern — the identical "never trust a client-derived
  number" principle the blink check has always used, not a
  weaker cousin of it. Its state logic (`nextHeadTurnState`) got the
  same testing treatment as blink's, plus the backend geometry
  (`frameYaw`) was separately verified against synthetic landmark data
  — 13 more cases, including malformed/garbage input, before either
  was trusted.
- **Be aware: the head-turn thresholds are a first pass, unlike
  blink's** (which went through two real tuning rounds against actual
  usage — see the history below). The yaw-ratio geometry and trigger
  values are mathematically sound and tested against synthetic data,
  but have no real-camera calibration behind them yet. If it turns out
  too strict or too loose once you actually try it, the constants are
  in exactly two places — `frontend/utils/livenessState.js` and
  `backend/utils/liveness.js` (kept in sync deliberately, same as EAR)
  — and are documented inline as judgment calls to revisit, not
  derived constants.
- **Shared plumbing kept deliberately small.** Rather than one large
  hook covering both challenges end to end (harder to verify
  correctness of, and a bug in it would hit both methods at once),
  only the genuinely generic, low-risk mechanics — camera setup and
  the non-overlapping poll timing fix itself — are shared
  (`useNonOverlappingPoll`). Each challenge's own state tracking,
  snapshot bookkeeping, and finalize step stay directly visible in its
  own component (`FaceLivenessCapture.jsx` / `HeadTurnLivenessCapture.
  jsx`), so the interesting, harder-to-verify-without-a-browser logic
  for each stays independently auditable rather than hidden inside a
  shared abstraction.

> **v15 — photo quality check.** The last item off your original
> Tier 2 AI list (smart search shipped in v13, duplicate detection in
> v14) — before a case's identification photo is submitted, it's
> checked in-browser for a detectable face, blur, and lighting, with
> a dismissible heads-up if something looks off. Never a block: a
> rough photo is still far better than none, and whoever's filing
> always gets to submit it anyway.

## What changed in v15 (this round)
- **New `utils/photoQuality.js`** — runs entirely client-side against
  the photo the person just uploaded, no extra server round-trip.
  Face detection reuses the same face-api.js models already loaded
  for the liveness/verification flow (`utils/faceApi.js`, now exports
  `detectFacesInImage` alongside the existing live-video functions) —
  no new dependency, and no extra download for anyone who's already
  used a face-capture screen this session. Blur (variance of
  Laplacian) and brightness (mean grayscale) are plain, model-free
  canvas pixel math — neither needed a model.
- **The pixel math is deliberately split from the browser-only parts**
  (`analyzePixels(data, width, height)` takes a raw RGBA buffer, no
  DOM) specifically so it could be tested — this project has no
  browser test runner, but plain math runs fine in Node. Verified
  against a solid-colour image (should read ~zero blur), a
  checkerboard (should read very high), a gradient (in between, and
  well below the checkerboard), pure black/white/red for brightness
  and colour-channel weighting, and 1x1/2x2 images specifically to
  confirm the interior-pixel loop's zero-division guard actually
  holds — 12 cases, all passing before this was wired into either
  form. The face-detection half reuses an already-proven call
  (`faceapi.detectAllFaces`, same as `detectFaceDescriptor` already
  uses) rather than new logic, so it didn't need the same treatment.
- **Wired into both `CreateCase.jsx` and `EmergencyReport.jsx`** via a
  new shared `PhotoQualityCheck.jsx` (same reasoning as
  `DuplicateWarning` — one component, not two copies that can drift)
  that runs automatically the moment a photo is attached and shows
  up to three independent notes: no/multiple faces detected, the face
  being quite small in frame, and blur/lighting. If the check itself
  fails to run at all (model blocked, a CORS hiccup), that's silently
  treated as "nothing to say" rather than misreported as a bad photo.
- **Not wired into `PhotosPanel.jsx`** (additional photos added to an
  existing case later) — scoped to the one identification photo that
  actually matters most for matching sightings, deliberately, rather
  than spreading thinner across every photo touchpoint in one round.
  `PhotoQualityCheck` takes a plain `photoUrl` prop, so extending it
  there is a small follow-up, not a redesign, whenever it's next.
- **Thresholds are judgment calls, not derived constants** (documented
  inline in `photoQuality.js`) — picked against synthetic test images,
  not real submitted photos. Same caveat as the duplicate-detection
  thresholds: worth tuning once there's real usage to check them
  against.

> **v14.1 — the "Loading… forever" bug, traced to its actual root.**
> You reported a case routed to Nalasopara not showing up for the
> Nalasopara Police Admin — stuck on an infinite spinner — and said
> v13.1 was supposed to have already fixed this. It hadn't, because
> the thing v13.1 fixed (a seed-data gap) and the thing actually
> hitting you were two different bugs wearing the same symptom. Full
> trace below; two real, previously-undiscovered bugs fixed.

## What changed in v14.1 (this round)
- **`CaseDetail.jsx`'s `load()` had no error handling — this is the
  actual cause of the infinite spinner.** Exactly the same bug class
  as four other spots fixed in v13.1 (`PhotosPanel`, `MyMissingPerson`
  x2, `MyMessages`), on the single most-used page in the app, and I
  missed it in that pass — it should have been caught then. A failed
  `GET /cases/:id` (wrong station, doesn't exist, anything) left
  `caseData` at `null` forever, and `if (!caseData) return <p>Loading
  …</p>` can't tell "still loading" from "never going to load" apart.
  Fixed with a dedicated `loadError` state (kept separate from the
  page's existing action-error state on purpose, so a failed sighting
  submission and a failed page load can't be confused for each other)
  and a Retry button — but only takes over the page when nothing has
  ever loaded, so a refresh failing after some other action doesn't
  blow away an already-rendered case.
- **This is what was actually hiding the answer to "did v13.1's fix
  work."** `canViewCase` (`utils/caseVisibility.js`, added in v13) is
  an exact `policeStationId` match for a Police Admin, no
  district-level grace — deliberate, and correct to keep: it's what
  stops any officer from opening any case platform-wide, which was a
  real hole before v13. But it means a case routed to the wrong
  station 404s identically to a case that never existed, and with bug
  1 above, both looked identical to "still loading" too. If you're
  still seeing this after updating, the case's `policeStationId`
  genuinely doesn't match your Police Admin account's own — now at
  least the page will tell you that directly instead of spinning.
- **Found chasing that: Police Admin accounts created through the
  actual Admin Users screen never got a station at all.** The
  create-official-account form (`AdminUsers.jsx`) only ever collected
  state and district — no station field existed — and
  `createOfficialUser` never required or validated one either. Every
  seeded demo account is fine (`utils/seed.js` writes `User.create()`
  directly with the real station `_id`, bypassing this form
  entirely), but any Police Admin created by a District/State/Super
  Admin through the actual UI got `jurisdiction.policeStationId`
  silently left `undefined` — which `canViewCase`'s `!!user.
  jurisdiction?.policeStationId` check reads as "no station," meaning
  that account could never see a single case routed to any station,
  regardless of which one it actually was. Not what triggered your
  specific report (that's a seeded account) but a real, previously-
  undiscovered gap in the core "create an officer" workflow that
  would hit the next account made through the UI. Fixed both sides:
  `AdminUsers.jsx` now fetches `GET /stations?district=` and shows a
  real station picker once a role of Police Admin and a district are
  selected (clearing any stale pick if the district changes), and
  `createOfficialUser` now requires `jurisdiction.policeStationId` for
  that role and verifies it's a real station in the assigned district
  — server-side, so a frontend bug alone can't reopen this gap.
- **To confirm which of these is actually yours**, once you're on
  this version the page itself will now say so — no more mongosh
  detective work needed. If you want to double check anyway:
  `db.cases.findOne({_id: ObjectId("<id>")}, {policeStationId:1})`
  and compare against `db.users.findOne({email: "<your Police Admin's
  email>"}, {"jurisdiction.policeStationId":1})`. Matching IDs = some
  other bug; different IDs = the case is genuinely at a different
  station than this account's own — which the reassign-station action
  (already built, official roles above Police Admin) is the right way
  to handle, not a code fix.

> **v14 — possible-duplicate detection before a case is filed.** New
> feature, picked as the first of a short prioritized list (see the
> project chat for the full reasoning): before either case-creation
> path actually creates anything, the backend scores the new report
> against every existing active case on name similarity + age +
> location + how close the two "last seen" dates are, and — if
> anything scores high enough — shows the person filing a heads-up
> with the matching case(s) and a choice: go view the existing case,
> or confirm this is genuinely a different one and continue. Never a
> hard block; a false positive here must never be able to stop a real
> report from going in.

## What changed in v14 (this round)
- **New `POST /api/cases/check-duplicates`** (`backend/utils/
  duplicateDetection.js`, wired into `caseController.js`) — takes a
  draft name/age/location/last-seen-date, scores it against every
  case that's currently `emergency_pending`, `verified`, or
  `under_search` (found/closed cases aren't worth flagging;
  `courtRestricted` cases are excluded outright since this endpoint
  is reachable by Family accounts, not just officials), and returns
  the top matches ranked by score.
- **Name matching is Levenshtein-based, not exact/token match** —
  deliberately, because names on this platform often come through
  OCR (`OcrFirUpload`), and edit distance tolerates a single
  misread character much better than exact or word-based matching
  would. Thresholds (0.72 name similarity, 3 years of age slop,
  25km, 45 days) are documented inline in `duplicateDetection.js`
  as judgment calls, not derived constants — worth revisiting once
  you have real usage to tune against.
- **Wired into both creation paths** — `CreateCase.jsx` (police,
  FIR-anchored) and `EmergencyReport.jsx` (family, pre-FIR) now both
  run the check on submit, before their existing face-gate /
  30-day-cooldown logic. New shared `DuplicateWarning.jsx` component
  (same reasoning as `DocumentsPanel`/`PhotosPanel`/
  `AdditionalInfoPanel` being split out in v13 — one place, not two
  copies that can drift) shows the matched case(s) with a link to
  view it, and a "this is a different case" button to proceed
  anyway. If the duplicate-check request itself fails, both forms
  fail open and let the report through rather than blocking a
  genuine — possibly urgent — report over a non-critical pre-check.
- **Verified with 16 test cases before trusting it** — real near-
  duplicates, an OCR-typo'd name with minor location/date drift,
  same name but far away / months apart / wildly different age (each
  correctly NOT flagged), missing optional fields, and ranking order
  when multiple candidates match. All passing before this was wired
  into either form.

> **v13.1 — bug-fix pass over v13, plus the MIME-spoofing gap open
> since v10.** No new features. Went through the codebase end to end
> (dependency install, a full production frontend build, a
> require-resolution pass over every backend module, and a manual
> read of the newest — least battle-tested — v13 code and its API
> contracts against the backend) looking for anything actually
> broken. Found and fixed five real issues, all below.

## What changed in v13.1 (this round)
- **`PhotosPanel` was silently losing photos on failure.** Its two
  sibling components (`DocumentsPanel`, `AdditionalInfoPanel` — all
  three built together in v13 for exactly this reason, so they
  shouldn't drift) both wrap their attach call in try/catch and show
  an error. `PhotosPanel` didn't: if `POST /:id/photos` failed for
  any reason (session expiry, a 403, a network blip), `FileUpload`
  had already shown "Uploaded: photo.jpg" — true of the raw file
  upload, but the photo then never actually attached to the case,
  with nothing telling the user why. Now matches its siblings.
- **`MyMissingPerson`'s initial case load had no failure path.**
  `GET /cases/mine` — the fetch the entire hub page depends on — had
  no `.catch()`. A failed request left `myCases` at `null` forever,
  which the render logic reads as "still loading," so the page was
  stuck on "Loading…" with no error and no way to recover short of a
  full reload. This is exactly the failure mode the v10 note below
  once described for five other pages — reintroduced here in v13's
  newest page. Fixed with the same loading/error/retry shape used
  elsewhere (e.g. `MyReports`). `ApprovedSightingsTab` inside the
  same file had the identical gap on its own sightings fetch and got
  the same fix.
- **`MyMessages` misreported a failed request as "not configured."**
  With no `.catch()`, a failed `GET /messages/my-district-control`
  left `districtControl` at `null` — which the page already treats as
  "no District Control account found for your district yet." A
  Police Admin seeing a transient failure would be told their district
  has no District Control at all, which is both untrue and not
  actionable. Now has its own error state and a Retry button, so a
  real failure reads as a failure, not as a configuration gap.
- **Upload MIME-type spoofing — closes the gap noted as open since
  v10 (just below).** `middleware/upload.js`'s `fileFilter` only ever
  checked the client-supplied `Content-Type` header, which costs an
  attacker nothing to lie about. `POST /api/uploads` now also
  verifies each file's actual bytes against a magic-byte signature
  for its declared type (new `utils/fileSignature.js`) once multer
  has written it to disk, and deletes the whole batch and rejects the
  request if any file's real content doesn't match what it claims to
  be. Hand-rolled rather than via the `file-type` package, since
  recent versions are ESM-only against this CommonJS backend, and the
  allowed set is small and fixed (JPEG/PNG/GIF/WEBP/PDF) — five
  signatures is little enough code that a dependency wasn't worth it.
  Verified against real headers for all five types, two spoofed
  files (an HTML payload relabeled `image/jpeg`, an .exe relabeled
  `image/png`), and empty/truncated files, before trusting it.

> **v13 — Citizen and Family portals, actually built out.** Citizen
> goes from Map/Cases/Sighting to the full Search / Nearby Cases /
> Map / My Reports / Safety & Help set. Family gets the bigger change:
> a single **My Missing Person** hub replacing the bare "My Cases"
> list, with Case Status, Timeline, Police Updates, Approved
> Sightings, Documents, Additional Information, Photos, Notifications,
> and Contact Officer as real tabs backed by real data — most of which
> needed new backend support (documents/photos/additional-info didn't
> exist as case fields at all, and case search, "my sightings," and
> case-scoped Family↔officer messaging were all new). One thing added
> that wasn't explicitly asked for but mattered: officials viewing
> `CaseDetail` had no visibility into any of this new family-submitted
> material until it was added there too — see "What changed in v13"
> for why that was worth fixing in the same round rather than leaving
> for later. The other 7 portals (Police/NGO/Volunteer/District/State/
> National/System) are still the shared Dashboard/CaseDetail/
> Notifications set with role restrictions — flagged as the next major
> development area, not attempted this round.

## What changed in v13 (this round)

### Citizen portal
- **Search** — name/description search, deliberately nationwide
  (`scope=all`) rather than scoped to the citizen's home district by
  default — finding a specific missing person isn't bounded by where
  the searcher happens to live, unlike the Dashboard's browse view.
- **Nearby Cases** — new page using the geo-radius endpoint that
  already existed server-side (`GET /cases/nearby`) but had no
  frontend page of its own.
- **My Reports** — every sighting the citizen has personally
  submitted, across all cases, with its review status. Needed a new
  endpoint (`GET /sightings/mine`) — the existing sightings endpoint
  intentionally requires a caseId (that's the v10 access-control fix),
  so there was no way to see "everything I've contributed" before now.
- **Safety & Help** — static guidance: what to do if you spot someone,
  how a report gets handled, reporting responsibly, emergency contact
  numbers.
- Case Details and Report Sighting aren't separate nav entries — they're
  reached by navigating from Search/Nearby Cases/Map into a specific
  case, which is the correct shape for them (you pick a case, then act
  on it), not something that belongs as its own top-level button.

### Family portal — My Missing Person
Replaces the bare "My Cases" list for Family accounts with a proper
hub. If they have exactly one case it opens directly; more than one
shows a picker first.
- **Case Status** — status, priority, the existing progress stepper,
  key facts (filed date, assigned station, FIR number, verifier).
- **Timeline** / **Police Updates** — the same underlying timeline
  data, with Police Updates filtered to entries whose actor is an
  official role.
- **Approved Sightings** — verified sightings only, not the raw feed.
- **Documents**, **Additional Information**, **Photos** — genuinely
  new case data, none of which existed before this round: a document/
  photo/note collection on `Case`, with endpoints to add to each,
  scoped to the reporting family or an official with jurisdiction
  over the case (`caseController.canAddToCase`).
- **Notifications** — the existing notification feed, filtered to
  this case.
- **Contact Officer** — a real conversation with whoever's handling
  the case (whoever attached the FIR, or a station admin as fallback).
  New `Message.caseId` field and `/api/messages/case/:caseId` +
  `/thread` endpoints, reusing the same `Message` model v11 already
  built for DySP/PSI messaging. Deliberately **not** gated the way
  DySP/PSI replies are — a family member reaching out about their own
  case, or an officer with an update, are both normal at any time;
  the chain-of-command reply-protocol doesn't apply here.

### The gap that would have undercut all of this
Documents/photos/additional-info a family adds are genuinely useful
only if the people investigating can see them. `CaseDetail` (what
Police Admin and above actually look at) had no rendering for any of
these three new fields — meaning a family attaching, say, dental
records would have had zero visibility on the police side. Added a
**Case Material** section there too, reusing the exact same panel
components as the Family hub (`DocumentsPanel`, `AdditionalInfoPanel`,
`PhotosPanel` — extracted as shared components specifically so both
places stay identical, not two copies that can drift). Officials and
the reporting family can add; everyone else with legitimate visibility
into the case (Citizen, NGO, Volunteer) gets read-only.

> **v12 — the two most serious bugs found yet, plus five real
> features.** "Manage Officials" had no jurisdiction or hierarchy
> check at all: a District Control account could see and suspend
> every account on the platform, State Control and Super Admin
> included. Separately, the face-enrollment routing gap you found
> traced to account creation silently allowing an empty district — an
> official with nowhere to route anything. Both are the kind of bug
> that undermines everything built around them, so they came first.
> Also: a Registration Details card so a Police Admin can see exactly
> where and how a case was filed, offline face enrollment for an
> in-person office visit, a reworked blink algorithm that shouldn't
> need 10+ attempts anymore, a real "your area" for a specific
> locality like Virar (not just its district), and direct confirmation
> that liveness and identity are independent checks — someone else's
> genuine blink still fails on their own face not matching yours. See
> "What changed in v12" for exactly what was wrong and why.

## What changed in v12 (this round)

### The two serious bugs
- **"Manage Officials" had zero jurisdiction or hierarchy enforcement.**
  A District Control account could list, approve, and suspend *any*
  account on the platform — other districts, other roles, even State
  Control and Super Admin. `listUsers` had no scoping beyond an
  optional role/status filter; `approveUser`/`suspendUser` had no
  per-target check at all outside NGO Admin's own volunteers. New
  `utils/userHierarchy.js` defines the actual rule once — Super Admin/
  System Admin manage everyone, State Control manages District
  Control + Police Admin within their own state, District Control
  manages only Police Admin within their own district, nobody manages
  a peer or senior — and it's now enforced in the list query *and*
  every approve/suspend/create action, so they can't drift apart.
  Account creation is affected too: a District Control creating a new
  official is now forced into their own district/state rather than
  trusting whatever the form sent.
- **Face-enrollment requests could route to nobody** because an
  official account could be created with an empty district in the
  first place — the old creation form didn't require State/District at
  all. An empty district matches no District Control's jurisdiction
  query, so the request (and its notification) silently reached zero
  people. `createOfficialUser` now rejects creating a Police Admin or
  District Control without a real state + district; the frontend
  requires the same, and District/State Control now get a locked
  field (their own territory) instead of free text that could typo or
  go missing.

### New / improved
- **Registration Details card** on the case page — filed as (Emergency
  Report vs. official FIR), by whom, when, the assigned station and
  district, the reported last-seen address, and who verified it. All
  of this data already existed; the case page just never surfaced it
  anywhere a Police Admin would actually see it before now.
- **Offline face enrollment.** For a PSI visiting the DySP's office in
  person instead of self-enrolling online: District Control gets a
  searchable directory of their officers (grouped by station, same
  data Officer Activity already uses) and captures the 3 angles
  directly on their own device. Since the DySP is physically
  confirming identity in person, this goes straight to active — no
  separate review step, because the review already happened.
- **Reworked blink detection — the actual fix for "10-20 attempts."**
  The old version used fixed absolute EAR thresholds (open > 0.24,
  closed < 0.19) plus a same-value-twice confirmation requirement on
  both sides of the blink. Neither holds up well in practice: a fixed
  cutoff doesn't account for individual eye shape, camera distance, or
  lighting, and a real blink is often too fast to land two confirming
  frames cleanly either side of it. Replaced with a relative-drop
  detector: does EAR fall to a clearly lower value than *this specific
  session's own* open-eye baseline? That adapts to whoever's actually
  in front of the camera instead of assuming one universal number, and
  the server-side re-check (`utils/liveness.js`) uses the identical
  logic, so nothing was loosened to get there. Also faster polling and
  a visibly redesigned capture UI (circular frame, live ratio
  indicator, clearer staging) for both enrollment and verification.
- **A specific locality, not just its district.** Picking "Virar" at
  registration previously still only ever showed "Palghar" afterward
  — the exact name chosen was thrown away, only the coarser
  auto-derived district was kept. `homeLocation` now stores the
  specific place too (whatever was explicitly picked, or a reverse-
  geocoded label for a raw GPS point) and "Your area" shows it —
  "Virar, Palghar" rather than just "Palghar". The actual jurisdiction
  boundary this account is scoped by is still the district (that part
  was never wrong, just under-displayed).

### Confirmed, not just claimed
Re-read `verifyFace` line by line before answering the "does someone
else's blink pass?" question: liveness and identity are two
*sequential, independent* checks. A different person presenting their
own genuine blink passes step 1 (it's a real blink) and is then
rejected at step 2 (their descriptor doesn't match the logged-in
account's enrolled reference) — same as a photo failing step 1
outright. No plausible path was found where the wrong person's real,
live blink alone is sufficient.

> **v11 — merged in from your other branch: a real message thread,
> plus a few genuinely good things it had that this one didn't.** You
> shared a version of this project from a different session with a
> few small things worth having — most notably an actual chat-style
> conversation screen for DySP/PSI messaging instead of messages
> mixed into the general notification feed. Adopted that, rebuilt on
> a dedicated `Message` model, while keeping this branch's security
> work (the middleware-based face gate, blink liveness) rather than
> reverting to that branch's simpler approach to either. Also pulled
> in: a notification fallback so a station with no assigned admin
> escalates to District Control instead of going nowhere, a DB-backed
> public locations endpoint, and immediate DySP escalation on a face
> verification that fails to match. See "What changed in v11" for the
> full list, including what was deliberately NOT carried over and why.

## What changed in v11 (this round)

- **A real conversation screen for DySP/PSI messaging.** Previously
  messages lived inside the general Notification feed — functional,
  but not really a "conversation." New dedicated `Message` model +
  `/api/messages` (send, reply, thread, call-log) + a chat-bubble
  `MessageThread` component used from both sides: District Control
  opens it per-officer from Officer Activity, Police Admin gets their
  own copy on a new **Messages** page. Logged calls appear inline in
  the same timeline as a centered system line ("📞 DySP called you"),
  not a separate thing to check. The reply-gate rule is unchanged and
  fully preserved: a Police Admin can only reply once their District
  Control has messaged *or* called them first — a logged call still
  counts, exactly as before, just checked against the new Message
  collection instead of Notification entries.
- **Notification fallback**: if a case routes to a station that
  genuinely has no Police Admin assigned yet, the alert now escalates
  to that district's District Control instead of reaching nobody.
  Layered on top of the v8 fix (every seeded station already has a
  real admin) as a structural safety net, not a replacement for it —
  real deployments can't guarantee every station is provisioned yet.
- **`GET /api/public/locations`** — district/locality data derived
  live from actual `PoliceStation` records, unauthenticated (needed at
  registration, before a token exists). Merged with the existing
  curated locality list (real places without their own seeded station,
  like Virar or Boisar) rather than replacing it — `hooks/useAreas.js`
  combines both so neither source has to be the only one.
- **Immediate District Control escalation on a face-match failure.**
  A liveness hiccup (bad lighting, mistimed blink) stays a quiet retry
  — common and benign. A face that's live but genuinely doesn't match
  the enrolled officer now notifies their District Control right away,
  not just an audit-log line nobody's actively watching.
- Face Enrollment Requests now has Pending/Approved/Rejected tabs,
  instead of only ever showing the current backlog.

### Deliberately NOT carried over, and why
Your other branch's face-verification work predates this one's
security hardening, so a few of its choices were kept OUT on purpose
rather than merged in:
- Its face gate is a manual check pasted inside each controller
  function — the exact pattern that let `createCase` ship with no
  gate at all in this branch, before v10.1 fixed it. Kept this
  branch's route-level middleware instead, specifically because it
  doesn't have that failure mode.
- No liveness/blink detection there — this branch's is kept.
- A single reference descriptor there vs. this branch's "nearest of 3
  enrolled angles" — kept the 3.
- Its face models load from a GitHub CDN at runtime; this branch's are
  vendored into `public/models/` — kept vendored (works offline, no
  dependency on a third-party repo staying reachable mid-verification).

> **v10.1 — the actual fraud-prevention gap: "Register Case (FIR)"
> itself was never gated.** v9/v10 wired the face+liveness check into
> attaching a FIR to an existing report and verifying a sighting — but
> not into filing a brand-new case directly, which is the literal
> "lodge a fake case" action the whole feature exists to stop. A
> Police Admin could verify once (on some other action) and then file
> unlimited cases through Register Case with no check at all. Found by
> testing, not by inspection — worth saying plainly rather than
> glossing over. Fixed, and restructured so this specific mistake
> can't quietly repeat: see "What changed in v10.1."

## What changed in v10.1 (this round)

**What was wrong, precisely**: the previous round added a face check
inside `attachFir` and inside `verifySighting` — two specific
functions. `createCase` ("Register Case (FIR)", `POST /api/cases`) is
a *third*, separate function that also results in an immediately-
verified case, and it was never touched. Not a bug in the nonce logic
itself — a single verification genuinely can't be replayed for a
second FIR through `attach-fir` (tested directly, see below) — the
problem was narrower and worse: an entire action had no gate on it at
all, so there was nothing to replay in the first place.

**Why it happened**: the check lived as a few lines pasted inside each
function body. That gives no signal, when adding or reading a
different mutating function, that it needs the same treatment — you'd
have to already know to look. That's a structural problem, not just a
missed line.

**The actual fix**: moved the check out of controller bodies entirely
and into route-level middleware (`middleware/faceGate.js`, applied in
`routes/caseRoutes.js` / `routes/sightingRoutes.js`). "Which actions
require a face check" is now one small, readable list at the top of
two route files, not something buried inside function bodies you'd
have to already know to check:

```
POST   /api/cases                            (Register Case / FIR)
PATCH  /api/cases/:id/attach-fir              (attach FIR to a report)
PATCH  /api/cases/:id/status                  (mark Found / Under Search / Closed)
PATCH  /api/cases/:id                         (edit case details)
POST   /api/cases/:id/versions/:vId/restore   (restore a prior version)
PATCH  /api/sightings/:id/verify              (verify/reject a sighting)
```

Also gated **`updateStatus`** and **`updateCase`**/**`restoreVersion`**
this round, not just the create path — marking a case Found or Closed
is as significant an assertion as verifying it was real in the first
place, and editing identity-defining details (or restoring an old
version, which can reinstate them) is exactly the kind of tampering
this feature is meant to prevent. `setPriority` stays deliberately
ungated — it doesn't assert anything about a case's truth or
existence, and requiring a blink to move Medium to High would be
friction with no matching fraud benefit. `reassignStation` and NGO
actions (`assignVolunteer`, `fieldUpdate`) aren't reachable by Police
Admin at all, so no gate applies there either.

**Verified directly, not just re-read**: ran the actual single-use
consumption logic in isolation (in-memory, no DB needed) — one
verification passes once and is confirmed rejected on a second use
with the same nonce. That part was always correct. The gap was purely
missing coverage, now closed and listed explicitly above so it's
checkable at a glance instead of taken on faith.

> **v10 update — a full audit pass (minor to major) plus real blink-
> based liveness:** closed a NoSQL-injection vector that spanned 5
> controllers, added the access control `GET /cases/:id` and
> `GET /sightings` never had at all (any logged-in account could view
> any case or its sightings by ID, courtRestricted or not), added
> login rate-limiting and security headers, and fixed several smaller
> things (a stats field that could never be anything but zero, three
> pages that hung on "Loading…" forever if a request failed). Also:
> face verification now requires an actual live blink — open, closed,
> open — recomputed server-side from raw eye-landmark points, not a
> client-asserted flag, closing the "hold up a photo of the officer"
> gap directly. See "What changed in v10" for the full list with
> exactly what was wrong and why.

## What changed in v10 (this round)

### Security — the ones that matter most
- **NoSQL injection via query strings, across 5 controllers.**
  Express's default query parser turns `?district[$ne]=null` into
  `req.query.district = { $ne: 'null' }` — an object, not a string.
  Every place that then did `filter['jurisdiction.district'] = district`
  without checking the type handed that straight to MongoDB as a real
  query operator, silently defeating whatever the filter was supposed
  to restrict. A Citizen scoped to their own district, for example,
  could see every district's cases with nothing more than a crafted
  URL. Fixed with one shared utility (`utils/sanitize.js`) applied
  everywhere this pattern occurred: `listCases`, `listSightings`,
  `listStations`/`listOfficers`, the shared stats `scopeFilter`, and
  `listUsers`.
- **`GET /cases/:id` had no access control at all.** Any authenticated
  account — Citizen, Family, any NGO — could view any case by ID,
  including an unverified Emergency Report (a family's home contact
  details) or a courtRestricted case, just by knowing or guessing the
  ID. `GET /sightings?caseId=` had the identical gap. Both now go
  through one shared rule (`utils/caseVisibility.js`) that mirrors
  what `listCases` already enforces via its query filter — written
  once so the two can't quietly drift apart, the same way
  `emergency_pending`/`pending_verification` drifted apart in v8.
- **No rate limiting anywhere — `/auth/login` had zero brute-force
  protection.** This is a direct gap against the exact threat model
  face recognition was built for: face verification defends what
  happens *after* login, this defends the login itself. 8 attempts /
  15 minutes, keyed by IP + attempted email together.
- **No security headers** (`helmet`, now added) and **no startup
  check for a missing/placeholder `JWT_SECRET`** — it now fails loudly
  at boot instead of quietly signing tokens with an empty or
  publicly-known secret.
- Password minimum raised from 6 to 8 characters, backend and both
  frontend forms (Register, AdminUsers — these had quietly drifted
  apart too).

### Smaller things that were still real bugs
- A stats field, `casesByStatus.pending_verification`, could
  structurally never be anything but zero — no case has had that
  status since v8. Removed. Same root cause also left a dead entry in
  two label dictionaries and an always-unreachable schema default
  (now points at `emergency_pending`, the value a case can actually
  have) — cleaned up everywhere it appeared.
- **Five pages had no error handling on their data load** — Stats
  Dashboard, Platform Admin, My Assignments, My Cases, Admin Users.
  A failed request meant either "Loading…" forever or a silently
  empty list indistinguishable from a genuine zero. All five now show
  a real error with a retry button.
- `GET /cases/nearby` now validates lat/lng are real numbers up front
  instead of letting a malformed value reach MongoDB as a raw query
  operand.

### Real blink-based liveness, not a mocked check
Verifying a case or a sighting now requires an actual **live blink** —
eyes open, then closed, then open again — not just one photo held up
to the camera:
- Uses the 68-point face landmarks already being computed for face
  matching (no new model, no new dependency) to track Eye Aspect Ratio
  (Soukupov\u00e1 & \u010cech, 2016) through open \u2192 closed \u2192 open.
- The client sends **raw eye-landmark coordinates for 3 frames**, not
  a computed number or a "blinked: true" flag. The server independently
  recomputes EAR from those points (`utils/liveness.js`, pure math, no
  ML) and only then runs identity matching on the best open-eye frame
  — the same "server decides, not the client" principle the identity
  match itself already followed.
- This closes the exact gap you flagged: a printed photo or a static
  image has no open-closed-open transition to produce, so it fails at
  the liveness step before identity matching is even attempted.
- Still doesn't defend against a **video** of the real officer
  blinking, or a sufficiently sophisticated deepfake — true anti-
  spoofing (depth sensing, texture analysis) is genuinely research-
  grade, and claiming otherwise would be exactly the kind of security
  theater this project has tried not to ship. This raises the bar
  from "any photo" to "a live presentation with a real blink,"
  which is what was actually asked for.

### Noted, not fixed this round (be aware)
- ~~**Upload MIME-type checking can be spoofed.**~~ **Fixed in v13.1
  (see top of file).** `middleware/upload.js` checked only the
  client-supplied `Content-Type` header and file extension — solid
  for accidental wrong-file-type uploads, but a deliberate attacker
  could lie about both. `POST /api/uploads` now also sniffs actual
  file content against a magic-byte signature before accepting it.

> **v9 update — face recognition as step-up auth for the two highest-
> stakes actions a Police Admin takes:** attaching a FIR (verifying a
> case) and verifying a sighting now require a live, server-checked
> face match immediately beforehand — real detection and matching
> (`@vladmandic/face-api`, run in-browser), not a mocked pass-through.
> Enrollment is 3 live shots (center/left/right), reviewed and
> approved by that officer's own District Control before it's active
> — a Palghar PSI's request only ever reaches Palghar's DySP. Not-yet-
> enrolled Police Admins get a one-time login notification plus a
> standing banner and sidebar badge until they complete it. See "What
> changed in v9" below for what this does and doesn't actually defend
> against — that honesty matters more for a biometric feature than
> for almost anything else in this app.

## What changed in v9 (this round)

- **Face enrollment, PSI-initiated, DySP-approved.** A Police Admin
  captures 3 live shots via their camera (Face Enrollment page); this
  goes to their own district's District Control (Face Enrollment
  Requests page) as a pending request — the images for visual
  confirmation, plus the descriptors `face-api.js` computed from each
  shot, which become the active reference the moment it's approved.
  Rejecting sends the officer a reason and lets them resubmit.
- **Face verification gates `attach-fir` and sighting-verify**, for
  Police Admin specifically (District Control/State Control/Super
  Admin, who can also verify, are unaffected — this is scoped to the
  role actually filing day-to-day, matching how you described the
  risk). Tapping submit opens a live camera capture; only on a
  server-confirmed match does the real request go through.
- **The match decision is made server-side, deliberately.** The
  browser computes the descriptor (128 numbers) using face-api.js,
  but the server independently compares it against ITS OWN stored
  reference and decides pass/fail — the client never gets to just
  assert "verified: true". A short-lived, single-use challenge nonce
  (`POST /api/face/challenge` → `/api/face/verify`) also means a
  captured request can't simply be replayed later without a fresh
  live capture. See `utils/faceCheckGate.js` and `utils/faceMatch.js`.
- **No native ML dependency on the server.** The neural network only
  ever runs in the browser (well-supported, no install fragility);
  the backend's entire job is comparing two arrays of numbers — plain
  JS, nothing to compile, nothing that can fail to install on your
  machine the way native TensorFlow bindings sometimes do.
- **Self-contained**: the 3 model files (~6.7MB) are vendored into
  `frontend/public/models/`, not loaded from a CDN — works offline
  once the app is loaded, and doesn't depend on a third-party service
  staying up. The face-api library itself is lazy-loaded (dynamic
  `import()`), so it only downloads for someone who actually opens a
  face-capture screen — everyone else's page load is unaffected.
- **Alerts for not-yet-enrolled Police Admins**: a one-time
  notification on their first login after this shipped, plus a
  standing banner on their home screen and a badge in the sidebar
  until enrollment is approved — not just a single notification that
  can get missed.

### Be honest with yourself about what this does and doesn't defend against
This is real face matching, not a mock — but "real" and "defeats a
determined attacker" aren't the same claim, and this project's whole
credibility rests on not blurring that line (same reason the messaging
feature doesn't pretend to know if a call connected).

**What it raises the bar against**: someone who has ONLY a Police
Admin's stolen or guessed password, and does NOT also have that
officer's face. That's a real, common threat (phishing, a written-down
password, a shared/left-open device) and this closes it.

**What it does NOT defend against**:
- **Photo/video spoofing.** There's no liveness detection here (no
  blink check, no depth sensing, no randomized challenge like "turn
  left now"). A good printed photo or a video held up to the camera
  could plausibly pass. Real liveness detection is a much harder,
  genuinely research-grade problem — flagging this honestly rather
  than quietly shipping a weaker guarantee than "face recognition"
  implies.
- **An attacker with backend/database access.** If someone can reach
  the database directly, the security model here doesn't hold — this
  defends the login-credential layer, not a full backend compromise.
- **A fully compromised client device** (e.g. malware controlling the
  browser) — no client-side check of any kind is trustworthy against
  that; it's a fundamentally different, much harder problem.

**Biometric data handling, for your report**: descriptors (not raw
images) are what's actually matched against, and are never sent back
to the client after enrollment (see `toSafeObject()` and
`pendingEnrollments` — both explicitly exclude them). The 3 review
images ARE kept, since the DySP needs to visually confirm identity —
that's a real privacy tradeoff worth naming explicitly rather than
glossing over: a production deployment would want encryption at rest,
a defined retention/deletion policy, and explicit informed consent
language, none of which this skeleton implements.

> **v8.1 update — what testing v8 actually found:** the Bandra case
> WAS routing correctly; the reasons it then looked invisible were
> three separate, real gaps your testing surfaced — an officially-
> created case never told any NGO at all (a different code path than
> the one v8 fixed for Family reports), NGO accounts had no resolvable
> "home area" for the case list to default-scope against (every other
> role did), and an unlabeled State/District override pair on the
> case-creation form silently wins over the correct auto-detected
> location with zero warning — almost certainly what actually
> happened. Also added: a consistent "📍 Your area" line on the home
> screen for every role, and "use my current location" on Report a
> Sighting, which had been missed. See "What changed in v8.1" below.

## What changed in v8.1 (this round)

- **Fixed: an officially-created case (`POST /cases`, FIR-anchored,
  auto-verified) never notified any NGO at all.** `involveNearbyNgos`
  was wired into `attachFir` (Family report → verified) and sighting
  creation, but never into this path — so a case a Police Admin files
  directly (like the Bandra demo) stayed invisible to every NGO unless
  a sighting happened to come in near it later. This is almost
  certainly why none of the 3 NGO accounts saw it. Fixed by calling
  `involveNearbyNgos` here too, tagged `linkedVia: 'case_verified'` so
  it's distinguishable in the data from the other two triggers.
- **Fixed: NGO accounts had no "home area" for the case list to
  default-scope against.** Citizen/Family got scoped to
  `homeLocation.district` in v8; officials were already scoped to
  their `jurisdiction`. NGO accounts had neither — only a service-area
  geo-point and radius, never resolved to a district — so an NGO's
  Cases & Map view fell through to fully nationwide every time,
  regardless of location. New shared utility, `resolveUserArea()`,
  answers "what area is this account associated with" the same way
  for every role — NGO Admin via a nearest-station lookup on their
  service area, NGO Volunteer via their supervisor's — and now backs
  default scoping for NGOs too, the same way it already did for
  Citizen/Family.
- **Found the actual reason the Bandra case didn't reach
  `citizen_mumbai`**: Register Case (FIR) has always had a State/
  District pair of plain text inputs below the location picker,
  described in a code comment as "the officer may know something the
  geo-lookup can't" — a legitimate override, but the form gave zero
  indication these should normally stay blank, or what they'd
  override *to* if left blank. Typing anything here — even out of
  habit, even the officer's own district — silently wins over the
  correctly auto-detected jurisdiction, with no warning. That's almost
  certainly what happened in testing. Now: both fields show what
  auto-detection resolved to as placeholder text, with explicit "leave
  blank" guidance, and a live warning banner appears if what's typed
  disagrees with the detected location.
- **New: "📍 Your area" on the home screen, for every role** — Cases &
  Map now shows what the backend actually considers your account's
  area to be (via the same `resolveUserArea`), so this is checkable
  at a glance instead of inferred from what shows up in the list.
  Previously there was no consistent "your area" concept across roles
  at all — this is also what the NGO scoping fix above is built on.
- **Fixed: "Use my current location" was missing from Report a
  Sighting** — it had GPS/picker/reverse-geocode everywhere else
  (Register, Emergency Report, Register Case) but this form still had
  raw manual lat/lng only. Now uses the same shared `LocationField`.

> **v8 update — the jurisdiction pipeline actually works end to end
> now, plus two-way DySP/PSI messaging:** traced "citizen sees cases
> from three different districts at once" to its real cause (Citizen/
> Family accounts were never scoped to their own area at all), added
> a District → City/Taluka picker and a reverse-geocoded "resolves
> to" confirmation everywhere a raw lat/lng gets captured, fixed the
> actual reason your Bandra → Mumbai cross-jurisdiction demo went
> silent (only one Police Admin login existed per district, tied to
> that district's *primary* station — Bandra had nobody), got NGOs
> notified the moment an Emergency Report is filed instead of only
> after police verify it, fixed a dead "Pending Verification" filter,
> and gave Police Admin a real way to reply to their District Control
> — but only after being contacted first. See "What changed in v8"
> below, and the new "Try everything at once" walkthrough near the
> bottom for a single path through all of it.

## What changed in v8 (this round)

- **Citizen/Family case feed now actually scopes to their own area.**
  This was the root of "I'm in Mumbai but I see Pune, Bandra, and
  Palghar cases together": every *official* role auto-scoped to their
  own jurisdiction, but a Citizen/Family account never did — despite
  `homeLocation.district` being captured at registration since v7, it
  was never read anywhere. It's now the default scope, the same way
  an official's own jurisdiction is; an explicit override (see next
  item) still wins, so browsing elsewhere is a deliberate choice, not
  a bug.
- **District → City/Taluka picker + reverse-geocoded location
  confirmation**, wherever a raw lat/lng is captured (Register,
  Emergency Report, Register Case) and on the Dashboard as a browse
  filter. Three ways to land on the same point — GPS, the picker, or
  typing coordinates by hand — all show a **"📍 Resolves to: …"** line
  underneath via a new `/api/geo/reverse` endpoint (free OpenStreetMap
  Nominatim, no API key). *Scope note:* District is a real jurisdiction
  filter, backed by the same `jurisdiction.district` field cases and
  officials already use. City/Taluka is currently a location-entry aid
  and a client-side text match against the last-seen address — not a
  new database field — see "Known limitations" below.
- **Fixed the actual cause of the Bandra → Mumbai demo going silent.**
  Seed data created exactly **one** Police Admin per district, tied to
  that district's *primary* station only. Bandra is Mumbai's 2nd
  station — nobody was logged in as "Bandra's admin," so both the
  cross-jurisdiction notification query and the case's own visibility
  filter matched zero people. It wasn't a notification bug so much as
  a missing account. Every station now has its own real Police Admin
  login (new: `police_admin_mumbai_bandra@rakshak.test`,
  `_mumbai_andheri`, `_pune_shivajinagar`, `_pune_kothrud`,
  `_palghar_nalasopara`, `_palghar_town` — all existing emails are
  unchanged). This also fixes the Officer Directory previously showing
  2 of every district's 3 stations as having zero officers.
- **NGOs learn about an Emergency Report the moment it's filed**, not
  only after an officer verifies it. Previously `involveNearbyNgos`
  only fired on FIR-attach or a sighting — a freshly-filed report near
  a district's NGO produced nothing until police acted on it, which
  could be hours later. Worded honestly as "unverified" in the
  notification so a volunteer doesn't mistake it for a confirmed case.
- **Fixed a dead "Pending Verification" filter** on the Dashboard — it
  was filtering for `status: 'pending_verification'`, a schema value
  no case creation path has ever actually produced (the real value for
  an unverified report is `emergency_pending`). The option existed,
  it just never matched anything.
- **Police Admin can now reply to District Control — but only after
  being contacted first.** Previously `POST /users/:id/message` was
  hard-restricted to District Control and above; a PSI had no way to
  message their DySP at all, not even a reply, and no page even showed
  their own District Control's contact info. Now: District Control can
  still always initiate (unchanged). Police Admin can reply, but *only*
  to the DySP covering their own district, and *only* once that DySP
  has messaged or called them — enforced server-side in `messageUser`,
  not just hidden in the UI. Since a `tel:` link can't tell the app
  whether a call connected, tapping **Call** now also logs a real,
  honest "contact attempted" record (`POST /users/:id/log-call`) —
  that's the signal that unlocks the reply, which is what "the elder
  calls him first" actually resolves to in a web app. New page: **My
  District Control** (sidebar, Police Admin only) — the reciprocal
  side of District Control's existing Officer Activity page, which
  didn't have an equivalent before this.
- **On "cases visible in all three districts, then disappearing after
  verification"** (the behavior you flagged as Issue 3): the mechanism
  is in `listCases` — a case with no jurisdiction match yet is shown to
  *every* official who could plausibly claim it, by design, and gets
  locked to whichever one verifies it first. With the Bandra-style
  routing gap above fixed, this should now only trigger for a case
  that genuinely never resolved to a station (missing/invalid
  coordinates) — worth re-testing with the walkthrough below, since it
  was hard to pin to one exact repro from description alone.

### Known limitations (be aware)
- **City/Taluka is not yet its own jurisdiction field.** The Case,
  User, and PoliceStation models only store `state`/`district` —
  that's the real unit this app's routing, notifications, and
  visibility all key off. The City/Taluka picker sets a real lat/lng
  (so routing still works correctly) and the Dashboard's taluka filter
  does a text match against `lastSeenLocation.address`, but there's no
  `jurisdiction.taluka` to query on yet. If you want literal
  taluka-level case filtering (not just district-level + address
  text-match), that's a real schema addition for a future round.
- **The District → City/Taluka reference list is hand-typed**,
  covering the 3 seeded districts plus their well-known localities —
  it's not sourced from an official gazetteer, so treat it as demo
  data, not an authoritative boundary list.
- Couldn't spin up a live MongoDB in the sandbox this was built in, so
  this round is verified by a clean production frontend build, every
  touched backend module `require()`-resolving cleanly, and careful
  reading against the actual schema/query logic — not a live
  end-to-end run. Please run the walkthrough below on your machine
  before you trust it fully.

> **v7 update — multi-district demo data, emergency report rejection,
> officer directory with call/message, and several sharp-eyed bug
> fixes:** rebuilt the seed data around 3 real districts (Pune,
> Palghar, Mumbai) with real-locality station names, added the ability
> to reject a fake Emergency Report and optionally suspend the account
> that filed it, added a District Control officer directory with
> click-to-call and in-app messaging, fixed a future-dated "last seen"
> bug, fixed closed cases still showing loud priority badges, and
> redesigned the date/time picker. See "What changed in v7" below.

## What changed in v7 (this round)

- **Multi-district seed data**: rebuilt around 3 real Maharashtra
  districts — **Pune, Palghar, Mumbai** — each with 3 real-locality
  police stations (e.g. Mahalaxmi, Bandra, Andheri for Mumbai; Vasai,
  Nalasopara, Palghar Town for Palghar), a Police Admin, a District
  Control, one NGO with 3 volunteers, one Family account, and one
  Citizen account. Every account you'd already been testing with kept
  its exact email — this only *adds* the Palghar tier and gives
  Pune/Mumbai real station names instead of one generic station each.
- **Reject a fake Emergency Report, with optional account suspension**
  — the core of what you asked for. A Police Admin can now reject an
  Emergency Report outright (mandatory reason, permanently logged), and
  when the reason is specifically "false report," an explicit checkbox
  lets them also suspend the account that filed it. Deliberately
  scoped narrow: the checkbox only appears for that exact combination,
  so a routine "duplicate" or "withdrawn" rejection can never
  accidentally lock someone out.
- **Family/Citizen accounts now capture a home area at registration**
  — lat/lng (with a "use my current location" button), resolved to a
  district the same way case locations are resolved to a station
  (`findNearestStation`), so "which area does this account belong to"
  has a real, geo-based answer instead of a free-text field someone
  could mistype.
- **District Control Officer Directory** (`/officer-activity`): every
  Police Admin in your district, with on-duty status (self-toggled by
  the officer — see the sidebar button when logged in as one), a
  **Call** button (`tel:` link — opens the native dialer on mobile,
  genuinely 1:1), a **Message** button (delivers live via the same
  Socket.io channel as every other notification — also genuinely 1:1,
  restricted to your own district), and a recent-activity feed showing
  exactly which officer did what, when.
- **Fixed: "last seen" could be set to a future date** (e.g. 2027) —
  a person can't be last seen in the future. Now rejected on the
  backend across every write path, with a `max` constraint on the
  picker too.
- **Fixed: closed/found cases still showing a loud "Critical" priority
  badge** and floating to the top of sorted lists — priority reflects
  urgency while a case is active; once resolved it's shown dimmed as
  "(resolved)" and sorts below active cases regardless of its historic
  level.
- **Redesigned the last-seen date/time field**: one-tap options (Just
  now / 1 hour ago / 3 hours ago / This morning / Yesterday) instead of
  fiddling with a native picker digit by digit — filing from memory is
  usually "a few hours ago," not a precise clock time.

> **v6 update — case jurisdiction routing fix, closure integrity, and
> district oversight:** fixed cases being tagged to the creating
> officer's own station regardless of where the incident actually
> happened (the "Mumbai showing zero" bug), closed a real accountability
> gap where a Police Admin could close a case without ever marking it
> Found, added District Control oversight notifications, NGO/volunteer
> broadcast on case verification (not just on sightings), and a
> dedicated sightings map with verify/reject built in. See "What changed
> in v6" below.

> **v5 update — a second real notification bug, "My Cases," and strict
> data validation:** fixed a socket-room leak that could deliver one
> account's notifications to whichever account was last logged into
> the same tab, added a "My Cases" view so Family/Citizen can find
> their own submitted reports (previously invisible until verified),
> fixed a bug where Close Case disappeared after Mark Found, added a
> 30-day Emergency Report limit with a required accuracy declaration,
> and switched age/height to strictly validated numeric fields. See
> "What changed in v5" below.

## What changed in v6 (this round)

- **Fixed the real cause of "case shows zero in the correct station":**
  case creation always tagged the case with the *creating officer's
  own station*, no matter where the last-seen location actually was. A
  Pune officer entering a Mumbai-area case kept it tagged as Pune's,
  so Mumbai correctly showed nothing — the case genuinely was never
  assigned there. Fixed with `utils/findNearestStation.js`: both
  official case creation and Family Emergency Reports now route to
  whichever real police station is geographically nearest the
  last-seen location, and that station's admin(s) get notified live if
  it differs from the creator's own station. This matches how real FIR
  jurisdiction actually works — by location, not by who typed it in.
- **Fixed: a rejected sighting never updated the case timeline.** Only
  the "verified" path wrote a timeline entry; rejecting a sighting left
  the case's timeline stuck showing "pending verification" forever,
  even though the sighting itself was correctly marked rejected.
- **Closed a real accountability gap — closing a case without ever
  marking it Found.** This is the one you were explicitly strict about,
  and you were right to be: previously any Police Admin could close a
  case directly from "Verified" or "Under Search," with no resolution
  and no oversight. Now:
  - A Police Admin can only mark a case **Found**, then close it from
    there — normal resolution, no special gate.
  - Closing a case that was **never** marked Found is restricted to
    **District Control and above**, and requires a specific mandatory
    reason (false report / duplicate / withdrawn by family / resolved
    another way / other-with-explanation) — permanently on record.
- **Added District Control oversight notifications**: whenever a
  Police Admin verifies a case or changes its status, their District
  Control superior (matched by shared jurisdiction — same state +
  district) gets notified live. This is the PSI→DSP surveillance chain
  you described — continuous, not just for the closure edge case.
- **NGOs and volunteers now get alerted the moment a case is verified**,
  not only reactively when a sighting later happens to land in their
  service area — extracted the proximity-matching logic into a shared
  `utils/ngoInvolvement.js` used by both paths.
- **Added a dedicated sightings map** (`SightingMap.jsx`) on the case
  detail page — separate from the main case map, plots every sighting's
  actual reported location (color-coded by pending/verified/rejected),
  with Verify/Reject buttons right in the map popup so an officer can
  act on a sighting while looking at where it actually is relative to
  the case and other sightings.

### Not done this round (be aware)
- **On-duty officer directory + click-to-call for District Control.**
  This is a real, well-scoped feature (`tel:` links are the honest way
  to do "call" from a web app — no fake VOIP claims), but the list of
  changes this round was already very large and I didn't want to ship
  it half-built. Next round if you still want it.
- District/State/National Admin having largely the same *operational*
  options is intentional, not a bug — they're differentiated by
  jurisdiction breadth (station → district → state → everything), which
  was the whole point of the v4 auto-scoping work. System Admin is the
  one that's meaningfully different (platform-only, no case actions).

> **v4 update — multi-tab testing bug + case priority/assessment
> feature:** fixed a real bug where testing multiple roles in tabs of
> the same browser caused sessions to bleed into each other, and added
> an auto-suggested case priority (Critical/High/Medium/Low) with live
> preview, color-coded map markers, and a visual progress tracker. See
> "What changed in v4" below.

> **v3 update — bug fixes from real testing:** fixed a case-visibility
> regression, added self-healing for a stale-database issue, added real
> Socket.io push notifications, and improved OCR accuracy. See
> "What changed in v3" below.

> **v2 update:** this build addresses a full round of testing feedback —
> real per-role differentiation, OCR, NGO geo-coordination, and a
> working volunteer workflow. See "What changed in v2" below if you're
> comparing against an earlier download.

This is a **running full-stack skeleton** implementing the core of your BE major
project spec (Master Documentation + ART_D workflows + Architecture doc),
built with the stack your Architecture doc specifies: **MongoDB, Express,
React (Vite), Node**, with **Leaflet** for maps, **Tesseract.js** for OCR,
**Socket.io** for real-time notifications, and **JWT** for auth.

## What changed in v5 (this round)

- **Fixed a second, distinct notification bug** (separate from the v4
  tab fix): Socket.io rooms are additive — joining a new room doesn't
  leave the old one. Logging out of Account A and into Account B **in
  the same tab** left that tab's connection subscribed to both
  accounts' rooms forever, so it kept receiving Account A's live
  notifications even while showing Account B's UI. This is very likely
  what you were seeing. Fixed with an explicit leave-before-join on
  every identity change (`utils/socket.js`, `context/NotificationContext.jsx`).
- **Added "My Cases"** (`/my-cases`): Family and Citizen accounts can
  now see every case they've ever submitted, including ones still
  pending verification — this was a real gap: an Emergency Report was
  previously invisible to its own creator the moment they navigated
  away from the post-submission redirect, since the public case list
  correctly hides unverified cases from everyone, including the person
  who filed it. Operational roles (Police Admin and above) get the same
  page showing cases **they personally verified** — their own track
  record, separate from their station's full queue.
- **Fixed: Close Case disappearing after Mark Found.** Both buttons
  shared one condition that excluded the `found` status, so marking a
  case Found made it impossible to ever close it afterward through the
  UI. Split into independent conditions.
- **Added a 30-day Emergency Report limit** for Family accounts, to
  discourage spam/abuse — backend-enforced, with a `testAccount` flag
  (set only on the seeded demo family account) that exempts it from
  the limit so your own testing is never blocked. The UI shows exactly
  when the next report is allowed, before you even open the form.
- **Added a required accuracy declaration** on every Emergency Report,
  citing **Section 217 of the Bharatiya Nyaya Sanhita, 2023** (the
  correct current law — verified against a government BPRD training
  document, since the old IPC was replaced in July 2024). This is a
  deterrent and accountability record, not a technical identity check —
  see "On preventing fake Family reports" below for the fuller
  discussion and further options.
- **Strict age/height validation**, enforced on the backend (not just
  the form): age must be a whole number between 0–120 — previously
  nothing stopped a 4-digit "age" from being submitted. Height switched
  from free-text to a numeric inches field (10–100), displayed back as
  feet'inches for readability.

## On preventing fake Family reports

You asked how to stop a Citizen from registering as Family to file a
false report. There's no purely technical fix that fully solves this —
it's fundamentally an identity-verification problem — but here's what's
in place now and what else is possible, roughly in order of
friction added:

1. **Implemented now**: a signed declaration on every report (logged
   with a timestamp) citing the legal consequence of a false report,
   plus the 30-day rate limit. Low friction, real accountability trail,
   but doesn't stop a determined bad actor.
2. **Not implemented, moderate friction**: require phone OTP
   verification before a Family account can submit its first report.
3. **Not implemented, higher friction**: require Family accounts to be
   approved by a Police Admin (similar to how official accounts already
   work) before they can submit — strongest deterrent, but adds a wait
   step that could complicate a live demo with a freshly-registered
   account.
4. **Not implemented, highest friction**: require a government ID
   upload cross-checked against the FIR once filed.

I held off on 2–4 since they'd add friction to your own testing flow
without you asking for that trade-off explicitly — happy to build
whichever you want next.

## What changed in v4 (this round)

- **Fixed a real multi-tab bug**: the login token was stored in
  `localStorage`, which is shared across every tab of the same browser.
  Testing 9 roles by opening 9 tabs of one normal browser window meant
  logging into a new role would silently overwrite every other tab's
  session — a tab could keep showing an old user's name while actually
  making API calls (and receiving notifications) as whoever logged in
  most recently, anywhere in the browser. Switched to `sessionStorage`,
  which is independent per tab — you can now have all 9 roles logged in
  simultaneously across 9 tabs of the same browser with zero cross-talk.
- **Added case priority / assessment** (`backend/utils/priority.js`):
  every case gets an auto-suggested priority — Critical / High / Medium
  / Low — based on transparent, explainable risk factors (age bracket,
  time elapsed since last seen). The reasoning is always shown, not just
  the label, and any operational role can review and override it
  (recorded in the case's audit history, same as everything else).
  - Shows as a color-coded badge on the case list, case detail, and as
    the **map marker color itself** (red/orange/blue/grey pins instead
    of uniform blue) — you can see urgency at a glance without opening
    a case.
  - The case list now **sorts by priority by default**.
  - Both case-creation forms show a **live preview** of the likely
    priority as you type age/last-seen-time, before you even submit.
- **Added a visual case-progress stepper** (`CaseProgress.jsx`):
  replaces/augments the flat status pill with a Reported → Verified →
  Under Search → Found pipeline visual, shown prominently on case detail
  and compactly in the case list.

## What changed in v3 (this round — real bugs found in testing)

- **Fixed: "duplicate key error, caseNumber_1, can't create any case."**
  This wasn't a bug in the current schema (it has no `caseNumber` field
  at all) — it was a **leftover unique index in your local MongoDB**
  from an earlier schema version, which silently broke every case
  creation after the first because every new document got
  `caseNumber: null` and a unique index only allows one `null`. Two
  fixes:
  1. `backend/config/db.js` now **auto-detects and drops unrecognized
     indexes** on every server boot — this heals the problem
     automatically, no manual database surgery needed.
  2. `npm run seed` now does a **full wipe** (all collections, not just
     Users/Stations) so stray documents from old test runs can't
     accumulate and cause exactly this kind of drift again.

  **If your server is already running with the bad index**, just
  restart it (`npm run dev` again) — the fix runs on connect. If you
  still see the error, run `npm run seed` once to be sure.

- **Fixed: Family's Emergency Report only visible to Super Admin.**
  This was a real regression from the v2 jurisdiction-scoping change —
  a case with no assigned station/district yet (which is exactly what
  an Emergency Report is, since it's pre-FIR) matched *nobody's*
  jurisdiction filter except System/Super Admin, who have no default
  scope. Fixed: unassigned cases are now visible to **all** officials in
  the relevant tier (any Police Admin, any District Control, etc.) —
  once a case gets a real station/jurisdiction (via FIR attachment or
  creation), normal scoping applies as before.

- **Added: real-time notifications via Socket.io.** Previously,
  notifications only loaded on page refresh. Now the backend pushes
  each notification live to the relevant user's browser the moment it's
  created (`utils/socket.js`, `utils/notify.js`) — the sidebar badge
  count and a toast update instantly, no polling.

- **Improved OCR accuracy**: added client-side image preprocessing
  (grayscale + contrast boost + 2x upscale) before recognition, and
  switched field extraction from one big regex to line-by-line label
  matching, which is far more tolerant of OCR noise. Being direct about
  a limit here: **no OCR engine reads decorative/stylized fonts
  reliably** — if you test with a graphically-designed "sample"
  document instead of plain typed or scanned text, expect poor
  extraction regardless of engine. Test with a real or realistically
  plain-formatted FIR for a fair read on accuracy.

## What changed in v2 (this round)

- **Every role now does something genuinely different**, not just
  "different label, same portal":
  - **Police Station Admin**'s case list auto-scopes to their own station.
  - **District Control** auto-scopes to their district, sees a
    station-by-station case breakdown, and can **reassign a case to a
    different station** in their district.
  - **State Control** auto-scopes to their state, sees a district-by-
    district breakdown.
  - **System Admin** no longer has case-verification power (that was a
    permissions overreach in v1) — they now have a dedicated
    **Platform Admin** view: audit log + user statistics only.
  - **NGO Admin** manages their own volunteers (scoped — can't see other
    orgs), sees cases their org is linked to, and assigns volunteers.
  - **NGO Volunteer** has a real **My Assignments** queue and can post
    field updates distinct from a citizen sighting.
- **OCR on FIR upload** (`OcrFirUpload.jsx`): real client-side OCR via
  Tesseract.js (no API keys, runs in-browser) on both the official case
  form and the Family emergency report — auto-fills name/age/address/FIR
  number/contact, all fields stay editable for review.
- **NGO geo-coordination**: NGO Admins set a service area (location +
  radius). When a sighting lands within that radius, the case
  auto-links to that NGO (and notifies their volunteers) — this is the
  "case in Pune, sighting near Mumbai, Mumbai NGOs get pulled in"
  workflow from the original spec.
- **Cross-jurisdiction police alerting**: a sighting also finds the
  *nearest* police station (not just the case's original station) and
  notifies that station's admin — same Pune/Mumbai scenario, police side.
- **Fixed**: the case status filter dropdown, which previously ignored
  non-official users' selections entirely.
- **"Reported by" is now surfaced**: case detail shows who originally
  filed the report and their role; timeline entries show the actor's
  name and role.

The seed script (`npm run seed`) now creates **two police stations**
(Pune + Mumbai) and an NGO with a Mumbai-area service radius specifically
so you can walk through the cross-jurisdiction demo end to end — see
the printed instructions after seeding.

## What's implemented (working end-to-end)

- **Full role hierarchy** wired into auth + RBAC: National Rakshak
  Administrator, System Administrator, State Control Room, District
  Control Room, Police Station Admin, NGO Admin, NGO Volunteer, Family,
  Citizen (`backend/config/roles.js`).
- **Auth**: register (Citizen/Family self-signup), login, JWT-protected
  routes, official accounts created by a senior admin (`/admin/users` in
  the UI) with automatic "you can't create a role above your own" checks.
- **Case lifecycle** (WORKFLOW-003 & WORKFLOW-004): Police/Control Room
  create an FIR-anchored verified case; Family can file a pre-FIR
  Emergency Report which starts with restricted visibility until an
  officer attaches an FIR number.
- **Possible-duplicate detection** (v14): both case-creation paths
  check the new report against existing active cases (name/age/
  location/date similarity) and warn — without blocking — before
  creating a likely duplicate.
- **Photo quality check** (v15): the identification photo on both
  case-creation paths is checked in-browser (face detection, blur,
  brightness) with a dismissible heads-up if something looks off.
- **Sighting workflow**: Citizens/NGOs/Family submit sightings with
  geolocation; officials verify or reject; a verified sighting
  auto-transitions the case to "Under Search".
- **Geospatial**: MongoDB `2dsphere` indexes on case & sighting
  locations, `GET /api/cases/nearby` for radius search, live map on the
  dashboard (Leaflet + OpenStreetMap tiles).
- **Notifications**: in-app notifications on verification, new
  sightings, and status changes.
- **Audit log**: every state-changing action is recorded
  (`backend/models/AuditLog.js`) — this is your foundation for
  WORKFLOW-021 (traceability) in the ART_D doc.
- **File uploads**: real multipart uploads (multer) for case photos and
  sighting evidence — served from `/uploads`, capped at 8MB/file, images
  + PDF only. `POST /api/uploads` returns public URLs the client attaches
  to a case or sighting, same shape as if a URL had been pasted in.
- **Case versioning & restore**: every edit to a case's details is
  snapshotted to `CaseVersion` *before* the change is applied
  (`PATCH /api/cases/:id`). `GET /api/cases/:id/versions` lists the
  history; `POST /api/cases/:id/versions/:versionId/restore` rolls back
  to an earlier snapshot — and snapshots the pre-restore state too, so a
  restore is itself always undoable. Visible in the UI as **Edit** /
  **History** buttons on the case detail page.
- **Control-room dashboards**: `/dashboard` in the UI, backed by
  `GET /api/stats/overview|timeseries|by-region`. Automatically scoped
  by jurisdiction — a District Control account only ever sees its own
  district's numbers, State Control sees its state (or drills into
  districts), Police Station Admin sees only their station's cases.
  System/National Admin see everything by default, or can filter with
  `?state=&district=`. No charting library needed — a small dependency-
  free `BarChart` component renders the visuals.

## What's intentionally NOT built yet (your next milestones)

The ART_D doc describes 21+ workflows and a 55-chapter SDD. This
skeleton now covers the spine plus OCR, NGO geo-coordination, volunteer
assignment, and per-role differentiated views — but there's still real
ground for you to cover over the coming months:

1. **Push/SMS notifications** — `utils/notify.js` is the single seam to
   plug this into (e.g. Twilio, Firebase Cloud Messaging). Right now
   notifications are in-app only, polled on page load.
2. **"Nearby citizen alert"** — push a notification to *citizens* (not
   just NGOs/police) within a radius of a new verified case. The
   `distanceKm` helper in `utils/geo.js` and the `/cases/nearby`
   endpoint are the pieces to build this on.
3. Real FIR system integration — the FIR number is currently a free-text
   field the OCR tries to extract; there's no actual government FIR
   database to validate against (there isn't a public one to integrate
   with, realistically — document this as a known limitation in your
   report rather than trying to fake it).
4. Move uploaded files to cloud storage (S3/Cloudinary) before you
   deploy anywhere beyond your own machine — local disk storage in
   `backend/uploads` won't survive a redeploy on most free hosting tiers.
5. Pagination on case/sighting/version/audit-log lists (currently capped
   with simple `.limit()` calls — fine for a demo, not for real scale).
6. OCR field-extraction regexes in `OcrFirUpload.jsx` are tuned for a
   generic FIR layout — if you have a real sample FIR format, tightening
   these patterns against it will noticeably improve auto-fill accuracy.
7. Manual NGO linking (an official manually pulling in a specific NGO,
   not just automatic proximity matching) — the `involvedNgos` field
   already supports a `linkedVia: 'manual'` value, just needs an endpoint.

## Running it locally

### Prerequisites
- Node.js 18+
- MongoDB running locally (or a free MongoDB Atlas cluster) — this
  sandbox couldn't install MongoDB itself to test against, so **run
  and test this on your own machine**.

### Backend
```bash
cd backend
cp .env.example .env      # edit MONGO_URI / JWT_SECRET if needed
npm install
npm test                    # runs the case-visibility / stats-scoping regression suite (no DB needed)
npm run seed               # creates one demo account per role
npm run dev                 # http://localhost:5000
```

### If you're upgrading from an earlier download and see a "duplicate key" error
This is stale data/indexes from before, not a fresh bug. In order of
what to try:
1. Just restart the backend (`Ctrl+C`, then `npm run dev` again) — v3
   auto-detects and drops indexes that don't belong to the current
   schema on every connect. Check the terminal for a line like
   `Dropped stale index "caseNumber_1"...`.
2. If that doesn't clear it, run `npm run seed` — it now wipes every
   collection, not just Users.
3. If it *still* persists, the nuclear option is dropping the whole
   database from a Mongo shell (`mongosh`):
   ```
   use rakshak
   db.dropDatabase()
   ```
   then run `npm run seed` again.

Seeded demo accounts (password for all: `Password@123`):

**National tier**
| Role | Email | Notes |
|---|---|---|
| National Admin | super_admin@rakshak.test | Sees everything |
| System Admin | system_admin@rakshak.test | Platform Admin view only — no case access |
| State Control | state_control@rakshak.test | Scoped to Maharashtra |

**Pune district** — stations: Deccan Gymkhana, Shivajinagar, Kothrud
| Role | Email | Notes |
|---|---|---|
| District Control | district_control@rakshak.test | DySP Meera Joshi |
| Police Admin | police_admin@rakshak.test | PSI Vikram Deshmukh, at Deccan Gymkhana |
| NGO Admin | ngo_admin_pune@rakshak.test | Sahyog Foundation |
| NGO Volunteers | volunteer_pune1/2/3@rakshak.test | Under Sahyog Foundation |
| Family | family@rakshak.test | **Rate-limit exempt** (`testAccount: true`) for repeat testing |
| Citizen | citizen@rakshak.test | |

**Palghar district** — stations: Vasai, Nalasopara, Palghar Town
| Role | Email | Notes |
|---|---|---|
| District Control | district_control_palghar@rakshak.test | DySP Ramesh Pawar |
| Police Admin | police_admin_palghar@rakshak.test | PSI Sanjay Patil, at Vasai |
| NGO Admin | ngo_admin_palghar@rakshak.test | Asha Trust |
| NGO Volunteers | volunteer_palghar1/2/3@rakshak.test | Under Asha Trust |
| Family | family_palghar@rakshak.test | Normal 30-day limit applies |
| Citizen | citizen_palghar@rakshak.test | |

**Mumbai district** — stations: Mahalaxmi, Bandra, Andheri
| Role | Email | Notes |
|---|---|---|
| District Control | district_control_mumbai@rakshak.test | DySP Suresh Rane |
| Police Admin | police_admin_mumbai@rakshak.test | PSI Anjali Kadam, at Mahalaxmi |
| NGO Admin | ngo_admin@rakshak.test | Hope Foundation |
| NGO Volunteers | ngo_volunteer@rakshak.test, volunteer_mumbai2/3@rakshak.test | Under Hope Foundation |
| Family | family_mumbai@rakshak.test | Normal 30-day limit applies |
| Citizen | citizen_mumbai@rakshak.test | |

### Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173
```

### Try the core loop
**Tip: open each role in its own browser tab (Ctrl/Cmd+T).** As of v4,
each tab keeps an independent session. As of v5, even logging out and
into a *different* account in the *same* tab no longer bleeds
notifications between accounts — both cross-talk paths are now closed.

1. Log in as `family@rakshak.test` → **Emergency Report** → notice the
   declaration checkbox is required to submit → after submitting, go to
   **My Cases** in the sidebar — your report is there, labeled
   "Emergency — Pending FIR," even though it won't show up in the
   public **Cases & Map** view yet (that's correct — it's pre-FIR).
   Try submitting a second Emergency Report immediately — it should be
   blocked with a "you can submit again on &lt;date&gt;" message. (This
   demo account is exempt from the limit — see **My Cases** for the
   "Demo account" notice — so if you want to test the block itself,
   register a brand-new Family account instead.)
2. Log in as `police_admin@rakshak.test` → **Register Case (FIR)** →
   try the **OCR scanner** at the top (upload any photo with printed
   text to see it run — a real FIR scan will extract far more usefully)
   → fill in age and last-seen time and watch the **live priority
   preview** appear → fill/verify the rest → use Pune coordinates
   (18.5204, 73.8567).
3. In another tab, log in as `citizen@rakshak.test` → open the case
   from the map/list (notice the marker is colored by priority) →
   **Report a sighting**.
4. Switch back to the `police_admin` tab → you should see a live
   notification badge appear on **Notifications** within a second or
   two, no refresh needed → open the case → **Verify** the sighting →
   watch the status flip to "Under Search" (see the progress stepper
   update) and a notification appear live for the citizen's tab.
5. Back on the case detail page → **Case Assessment** card → click
   **Review priority** → override it, add a reason → **Save priority**
   → check **History** to see both the original auto-suggestion and
   your override recorded.
6. Log in as `super_admin` or `district_control` → **Manage Officials**
   → create a new Police Station Admin account for another station.
7. As `police_admin`, open a case → **Edit** → change a field, add a
   photo, give a reason → **Save**. Click **History** to see the
   snapshot, then **Restore this version** to roll it back. Also try
   **Mark Found** then **Close Case** in sequence — both should stay
   available in order now.
8. As `super_admin`, `state_control`, or `district_control` → click
   **Dashboard** in the sidebar to see jurisdiction-scoped case counts,
   sighting pipeline, a 14-day trend, and a by-region breakdown.

### Try the cross-jurisdiction workflow (the "Pune case, Mumbai sighting" scenario)
1. Log in as `police_admin@rakshak.test` → register a case with
   last-seen coordinates near Pune: **18.5204, 73.8567**.
2. Log in as `citizen@rakshak.test` → open that case → report a
   sighting with coordinates near Mumbai: **18.9750, 72.8258**.
3. Log in as `police_admin_mumbai@rakshak.test` → check
   **Notifications** — you'll see an alert about a sighting near your
   jurisdiction, even though you didn't create the case.
4. Log in as `ngo_admin@rakshak.test` → check **Notifications**, then
   **Involved Cases** in the sidebar — Hope Foundation was
   auto-linked because the sighting fell within its 40km service area
   around Mumbai. From here, assign `ngo_volunteer@rakshak.test` to
   the case.
5. Log in as `ngo_volunteer@rakshak.test` → **My Assignments** → open
   the case → post a **field update**.
6. Log in as `district_control@rakshak.test` → open the case →
   try **Reassign to a different station** — Pune now has 3 real
   stations (Deccan Gymkhana, Shivajinagar, Kothrud) to choose between.
7. Log in as `system_admin@rakshak.test` → notice there's no case
   list or verify buttons — only **Platform Admin** (audit log + user
   stats). That's intentional now.

### Try the v7 features
1. Log in as `family_palghar@rakshak.test` → **Emergency Report** →
   submit one with clearly fake details.
2. Log in as `police_admin_palghar@rakshak.test` → open the case →
   click **Reject as fake / invalid…** → reason **False report** →
   check the **suspend the account** box → confirm.
3. Try logging in as `family_palghar@rakshak.test` again — the account
   is now suspended and login should fail. (`family@rakshak.test` is
   exempt from this, by design — see the "testAccount" note above — so
   don't use it to test suspension.)
4. Log in as `district_control_palghar@rakshak.test` → **Officer
   Activity** → see PSI Sanjay Patil listed with on-duty status → try
   **Call** (opens your device's dialer via `tel:`) and **Message**
   (delivers live — check `police_admin_palghar@rakshak.test`'s
   notifications in another tab).
5. Log in as `police_admin_palghar@rakshak.test` → tap the on-duty
   toggle in the sidebar → switch tabs back to District Control's
   **Officer Activity** and refresh — the status updates.
6. Try setting a case's "last seen" date to tomorrow — the picker
   won't let you past "now," and if you bypass it via devtools, the
   backend rejects it too.
7. Mark a case **Found** then **Close** it → open **My Cases** — its
   priority badge now shows dimmed as "(resolved)" instead of a loud
   color, and it sorts below any still-active case regardless of how
   urgent it was originally.

### Try everything at once — the full v8 walkthrough
One continuous path through every role and every fix above — location
scoping, the picker + reverse-geocode confirmation, per-station cross-
jurisdiction routing, NGO timing, the pending-verification filter, and
DySP/PSI messaging. Re-run `npm run seed` first so you're on the new
per-station accounts. Open a few of these in separate tabs as you go.

1. **Register a brand-new account** → role **Citizen** → under "Your
   area," click **District: Palghar → City/Taluka: Vasai** (or use
   "Use my current location" if you're actually nearby) → notice the
   **"📍 Resolves to: …"** line confirm it before you submit.
2. Log in as that new citizen → **Cases & Map** should say *"Showing
   your own area"* and only show Palghar-district cases, not Pune or
   Mumbai's. Change the **area dropdown** to **All areas**, then to
   **Mumbai** specifically, and watch the list actually change each
   time — that's the fix for Issue 1.
3. Log in as `family_palghar@rakshak.test` → **Emergency Report** →
   for last-seen location, pick **District: Palghar → City/Taluka:
   Nalasopara** (or GPS) → submit.
4. Immediately (before any officer touches it) log in as
   `ngo_admin_palghar@rakshak.test` → **Notifications** — Asha Trust
   should already be alerted, worded as *unverified* — this is the
   fix for Issue 6; previously nothing would show here yet.
5. Log in as `police_admin_palghar@rakshak.test` → **Cases & Map** →
   status filter → **Pending Verification** → your new report should
   actually appear now (it didn't before — dead filter, Issue 4).
   Open it, register the FIR to verify it.
6. Log in as `police_admin_pune_shivajinagar@rakshak.test` and
   `police_admin_mumbai@rakshak.test` in two more tabs — the
   now-verified Palghar case should **not** appear in either (confirms
   the Issue 3 mechanism: a real jurisdiction match keeps it out of
   unrelated districts, not just "eventually disappears").
7. **Cross-jurisdiction, precisely** — log in as `police_admin@rakshak.test`
   (Pune) → **Register Case (FIR)** → for last-seen location, pick
   **District: Mumbai → City/Taluka: Bandra** (this sets the exact
   Bandra coordinates) → **leave the State/District override fields
   below it blank** — you'll see them show "Auto-detects: Mumbai" as
   placeholder text; typing anything there (even out of habit) is what
   actually caused the v8.1 investigation → submit.
7a. Log in as `citizen_mumbai@rakshak.test` → **Cases & Map** should
   show the Bandra case now (district-scoped correctly, since nothing
   overrode it this time). If you want to see the trap itself, try
   creating a second test case and deliberately typing a different
   district into the override field — you should see the ⚠️ warning
   appear immediately, and that case should correctly NOT show for
   `citizen_mumbai`.
7b. Log in as `ngo_admin@rakshak.test` (Hope Foundation, Mumbai) →
   **Involved Cases** — the Bandra case should be listed, tagged as
   linked via a verified case, not just a sighting. This didn't work
   at all before v8.1 for any officially-created case.
8. Log in as `police_admin_mumbai_bandra@rakshak.test` — the officer
   actually assigned to Bandra — check **Notifications**: you should
   see the cross-jurisdiction alert this time. This is the repro from
   Issue 5, now fixed by giving Bandra its own real login.
9. Log in as `district_control_mumbai@rakshak.test` → **Officer
   Activity** → all 3 Mumbai stations should now show a real officer
   each (previously Bandra/Andheri showed nobody) → tap **Message** to
   PSI Imran Shaikh (Bandra) with any text.
10. Log in as `police_admin_mumbai_bandra@rakshak.test` → **My
    District Control** (new, sidebar) → you should see **"You can
    reply"** and the message from step 9 in the thread → send a reply.
11. To confirm the gate actually holds: log in as
    `police_admin_mumbai_andheri@rakshak.test` (whom nobody has
    contacted yet) → **My District Control** → should show **"Awaiting
    first contact"** with no reply box. Try posting directly to
    `POST /users/:districtControlId/message` via devtools/Postman if
    you want to see the 403 itself, not just the hidden UI.
12. Back as `district_control_mumbai@rakshak.test` → **Officer
    Activity** → tap **Call** (not Message) on PSI Snehal Rao (Andheri)
    → switch to that PSI's tab → **My District Control** should now
    say **"You can reply"** too — confirming a logged call unlocks
    reply just as a message does, not only messages.

If every step above matches what's described, the pipeline is doing
what you originally expected end to end — not just individually
patched.

### Try face recognition + liveness (v9/v10)
This is the flow you specifically want to self-test.

1. Log in as `police_admin_palghar@rakshak.test` (or any Police Admin
   — this is per-account, works the same for all of them) → sidebar
   shows a **Face Enrollment** link with a **!** badge → open it.
2. **Complete face recognition online** → allow camera access →
   capture all 3 prompts (center, left, right) with your own face —
   this is the "I'm going to have my face in the DB for testing"
   part. Submit.
3. Log in as `district_control_palghar@rakshak.test` → **Face
   Enrollment Requests** → your 3 photos should be there → **Approve**.
4. Back as `police_admin_palghar@rakshak.test` → the banner should be
   gone, the sidebar badge cleared. Open any `emergency_pending` case
   → **Attach FIR & Verify** → a face-verify modal opens BEFORE
   anything is submitted → it'll ask you to look at the camera, then
   **blink naturally** — watch the on-screen bar dip as you blink →
   on a match, the FIR attaches normally. Same modal appears verifying
   a sighting.
5. **To see the liveness gate specifically hold**: hold a photo of
   yourself (printed, or on another phone/screen) up to the camera
   instead of your real face, and just... don't blink it. It should
   sit on "Look at the camera with your eyes open" and eventually time
   out with "Didn't catch a blink in time" — it never even reaches the
   identity-matching step. That's the actual fix for what you asked
   about.
6. To see the identity + nonce gate hold: log in as a *different*
   device/browser profile as the same account (or just try
   `attach-fir` directly via devtools/Postman without a
   `faceVerifyNonce`) — it should 403 with "Face verification is
   required for this action." even with a perfectly valid login token.
7. Try a second Police Admin account that's never enrolled (e.g.
   `police_admin_pune_kothrud@rakshak.test`) — attaching a FIR should
   prompt for verification, then correctly tell you enrollment isn't
   complete yet instead of silently failing.

### Verify the v10 security fixes directly
Two of these are easy to see hold even without a security background:

- **Injection fix**: log in as `citizen_mumbai@rakshak.test`, then hit
  `GET /api/cases?district[$ne]=null` directly (devtools Network tab,
  curl, or Postman — attach your bearer token). Before v10 this
  returned every district's cases; now it should behave exactly like
  `district=null` — i.e., return nothing (there's no real district
  named "null") — because the value is confirmed to be a plain string
  before it ever reaches the database, not interpreted as an object.
- **Access control fix**: as any Citizen/Family/NGO account, try
  opening the direct URL for a case that belongs to a different
  district than your own, or a `courtRestricted`/`emergency_pending`
  one (an officer account can tell you a real case ID, or check the
  Mongo `cases` collection directly). Before v10 this rendered
  normally for anyone logged in; it should now 404 for anyone the case
  isn't public to, or who isn't its reporter/verifier/an NGO actually
  linked to it.


```
rakshak/
  backend/
    config/       # DB connection, role hierarchy definitions
    models/       # User, Case, CaseVersion, Sighting, Notification, AuditLog, PoliceStation
    middleware/    # JWT auth, RBAC, upload (multer), error handler
    controllers/   # business logic per resource (case, sighting, user, stats, platform admin, station, upload)
    routes/        # Express route tables
    utils/         # token signing, audit logging, notifications, geo/nearest-station lookups,
                    # NGO involvement, district oversight, validators, seed script
    uploads/       # local file storage for case photos / sighting evidence (dev only, see milestone #4)
  frontend/
    src/
      pages/       # route-level screens (role-aware), pages/admin/ for user management
      components/  # Layout/sidebar, maps (case + sighting), status/priority badges,
                    # progress stepper, file upload, OCR uploader, bar chart, last-seen field
      context/     # AuthContext (JWT session), NotificationContext (Socket.io)
      api/         # axios client
      roles.js     # frontend mirror of backend role constants
```

## A note on scope for your report
Your original ChatGPT-generated spec (Master Documentation + ART_D) is
written at the scope of a real government platform — 150+ APIs, 100+
screens, 6-tier hierarchy, 55 SDD chapters. That's genuinely good
systems thinking and makes for a strong "Chapter 2: Requirements &
Design" in your project report. But it's not achievable to fully build
solo in a semester. Keep the full spec as your documented vision/design,
and present this skeleton (extended with the workflows above) as your
implemented subset — that's a completely normal and defensible framing
for a BE major project viva.
