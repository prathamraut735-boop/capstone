# Toy Choir TV — Project Progress

## Frontend status

- [x] Set up a React, TypeScript and Vite frontend.
- [x] Add responsive navigation for dashboard, lessons, practice, progress and profile.
- [x] Build the student dashboard and a four-step learning journey.
- [x] Add four learning levels with eight lesson slots each. Level 1 uses sample lesson names; Levels 2–4 remain unpublished placeholders.
- [x] Add lesson detail pages with video placeholders and a local “Mark as viewed” interaction.
- [x] Add an audio-only practice demo with a four-minute limit note and fictional submission examples.
- [x] Show example progress and teacher-controlled progression approval.
- [x] Add a fictional profile and preferences that only last for the current page visit.
- [x] Keep all sample lesson and practice data in `src/data/mockData.ts`.
- [x] Organise public pages, student pages and role-specific layouts.
- [x] Add the public landing page, Firebase email/password parent signup and login with Firestore profile creation/sync.
- [x] Move the existing student routes under `/student/` without removing student features.
- [x] Add form validation, password visibility controls, remembered/session login persistence and password reset emails.
- [x] Add parent dashboard, learner cards, booking demo, subscription placeholder and parent settings.
- [x] Add authenticated parent learner profile create/list/edit/deactivate flows with required first name/age range, optional approved profile fields, and private profile pictures.
- [x] Add parent-created one-time student activation invitations and separate Student ID/password sign-in backed by Firebase Auth.
- [x] Add API-backed upcoming session availability, booking history, reservation/capacity management and cancellation; checkout records simulated payment only.
- [x] Add admin overview, user list, content management demo, entitlements, support queue and audit-log preview.
- [x] Add responsive parent and admin navigation layouts with separate role-specific sections.
- [x] Build the teacher overview, learner list, practice review queue, session attendance, lesson plans, restricted learner-needs view and incident-report demo.
- [x] Add responsive teacher navigation and connect the seven `/teacher/` routes.
- [x] Add local-only teacher review and attendance interactions, including a new-attempt requirement after revision requests.
- [x] Send Firebase ID tokens to the FastAPI profile endpoint after login and signup.

## Backend status

- [x] Add a FastAPI service using Firebase Admin and Cloud Firestore.
- [x] Verify Firebase ID tokens and expose `GET /api/v1/users/me` for the signed-in user's `users/{uid}` profile.
- [x] Add parent-only learner and booking endpoints, an authenticated session catalog, and an admin-only session publishing endpoint.
- [x] Add parent-scoped learner create/list/edit/deactivate and private picture endpoints; platform-owned learner status/progress fields cannot be set by parents.
- [x] Add transactional Student ID assignment, single-use 24-hour invitations, separate Firebase Auth credentials, server-verified Student ID login, and parent-managed temporary password resets.
- [x] Reserve and release session capacity with Firestore transactions; simulated checkout does not charge money.
- [x] Configure explicit CORS origins, local environment examples, and backend API tests.
- [ ] Deploy the backend and configure its production frontend origin and API URL.

## Routes

- Public: `/`, `/login`, `/signup`
- Student: `/student/login`, `/student/activate`; protected student workspace at `/student/dashboard`, `/student/lessons`, `/student/lessons/:lessonId`, `/student/practice`, `/student/progress`, `/student/profile`
- Parent: `/parent/dashboard` (demo), `/parent/children` (API-backed learner profiles and student activation), `/parent/bookings` (API-backed reservations with simulated payment), `/parent/subscription` (placeholder), `/parent/settings` (demo)
- Admin demo: `/admin/dashboard`, `/admin/users`, `/admin/content`, `/admin/entitlements`, `/admin/support`, `/admin/audit-logs`
- Teacher demo: `/teacher/dashboard`, `/teacher/learners`, `/teacher/reviews`, `/teacher/sessions`, `/teacher/lesson-plans`, `/teacher/learner-needs`, `/teacher/incidents`
- Unknown public routes show a friendly not-found page.

## Demo and privacy notes

Student learning content, lessons, progress, feedback and practice submissions remain fictional examples. Parent email/password accounts use Firebase Authentication; enable the Email/Password provider and configure authorized domains before deployment. Signup saves a parent profile to Firestore, and login creates or syncs the signed-in user's `users/{uid}` profile. Firestore rules are configured through the root `firebase.json`; users can access only their own profile and cannot change their role. Deploy them with `firebase deploy --only firestore:rules`. The FastAPI backend verifies Firebase ID tokens. Parent learner and booking endpoints enforce the role stored in the user's profile; administrator session publishing requires a profile whose role was provisioned by a trusted administrator.

Parent-owned learner profiles store required first name and age range plus the approved optional profile fields. Learner IDs, Student IDs and parent IDs are assigned by the backend. Parent-issued activation codes are single-use, expire after 24 hours, and are stored only as hashes; activation creates a separate Firebase student account with an unverified internal email alias. Student ID/password login is verified through the backend and exchanged for a Firebase custom token. Parents can generate a temporary student password for recovery; it is returned once and never stored in Firestore. Student routes require an active backend-verified student-to-learner link. Profile pictures are limited to JPEG/PNG/WebP under 2 MB and served through authenticated API responses. Student learning data, dashboard feedback and teacher assignments are still sample or unpopulated data. The parent dashboard, subscription, settings, administrator and teacher pages remain demonstrations. Guardian identity verification/consent, payment processing, recording/upload, AI feedback and subscription billing are not implemented.

## Run locally

From the `frontend` directory:

```sh
npm install
npm run dev
```

In a second terminal, follow the setup and start instructions in
[backend/README.md](../backend/README.md). The frontend defaults to the
deployed API; set `VITE_API_BASE_URL=http://localhost:8000` to use a local API.

Create a production build with `npm run build`.

## Latest checks

- The newly added parent API and page flows have not yet been validated; run the backend tests and frontend production build before deploying.
- `npm run build` passes TypeScript and the Vite production build.
- `npm audit` reports zero vulnerabilities.
- Browser smoke checks covered public pages, the student routes, role placeholder pages, the not-found page, mobile navigation, login demo, and signup validation/success.
- Browser smoke checks covered every parent/admin route, session selection, support status demo, user search, content preview, and parent/admin mobile navigation.
- `npm run build` passes TypeScript and the Vite production build after teacher portal implementation.
- Browser smoke checks covered all teacher routes and existing public, student, parent and admin routes; review revision gating, local teacher approval, attendance changes, upload placeholder, incident-form demo confirmation and mobile navigation were exercised.
- Backend tests pass with a Python 3.11 virtual environment; Firebase Admin startup and `/health` pass using the local service account. Live ID-token verification and a live Firestore profile read still require a Firebase-authenticated request.
- The latest student-vs-parent role-boundary changes were syntax-checked, but the focused API tests and frontend build were not run in this session because permission was denied.
