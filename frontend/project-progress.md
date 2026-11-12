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
- [x] Add admin overview, user list, content management demo, entitlements, support queue and audit-log preview.
- [x] Add responsive parent and admin navigation layouts with separate role-specific sections.
- [x] Build the teacher overview, learner list, practice review queue, session attendance, lesson plans, restricted learner-needs view and incident-report demo.
- [x] Add responsive teacher navigation and connect the seven `/teacher/` routes.
- [x] Add local-only teacher review and attendance interactions, including a new-attempt requirement after revision requests.
- [x] Send Firebase ID tokens to the FastAPI profile endpoint after login and signup.

## Backend status

- [x] Add a FastAPI service using Firebase Admin and Cloud Firestore.
- [x] Verify Firebase ID tokens and expose `GET /api/v1/users/me` for the signed-in user's `users/{uid}` profile.
- [x] Configure explicit CORS origins, local environment examples, and backend API tests.
- [ ] Deploy the backend and configure its production frontend origin and API URL.

## Routes

- Public: `/`, `/login`, `/signup`
- Student demo: `/student/dashboard`, `/student/lessons`, `/student/lessons/:lessonId`, `/student/practice`, `/student/progress`, `/student/profile`
- Parent demo: `/parent/dashboard`, `/parent/children`, `/parent/bookings`, `/parent/subscription`, `/parent/settings`
- Admin demo: `/admin/dashboard`, `/admin/users`, `/admin/content`, `/admin/entitlements`, `/admin/support`, `/admin/audit-logs`
- Teacher demo: `/teacher/dashboard`, `/teacher/learners`, `/teacher/reviews`, `/teacher/sessions`, `/teacher/lesson-plans`, `/teacher/learner-needs`, `/teacher/incidents`
- Unknown public routes show a friendly not-found page.

## Demo and privacy notes

All student details, progress, lessons, feedback and practice submissions shown here are fictional examples. Parent email/password accounts are created and authenticated with Firebase Authentication from the frontend; enable the Email/Password provider in the Firebase console and configure authorized domains before deployment. Signup saves a parent profile to Firestore, and login creates or syncs the signed-in user's `users/{uid}` profile. Firestore rules are configured through the root `firebase.json` and allow signed-in users to get, create and update only their own `users/{uid}` document; collection listing and deletion are denied. Deploy them with `firebase deploy --only firestore:rules`. The FastAPI backend verifies Firebase ID tokens and reads the signed-in user's Firestore profile. The parent, student, administrator and teacher pages are still frontend demonstrations and are not protected by backend authorization. This project does not include real recording or upload functionality, video submissions, public student profiles, messaging, payments or AI feedback. Level 4 content and the relationship between learning levels and curriculum stages still need confirmation.

Parent, administrator and teacher pages are frontend demonstrations backed by fictional data in `src/data/parentAdminData.ts` and `src/data/teacherData.ts`. Local booking selections, list filters, attendance changes, review actions and incident-form confirmations do not persist or change real data. Teacher audio playback, resource upload, AI feedback, learner-needs access controls and incident reporting are visual placeholders only. None of the roles are protected by real access controls.

## Run locally

From the `frontend` directory:

```sh
npm install
npm run dev
```

In a second terminal, follow the setup and start instructions in
[backend/README.md](../backend/README.md). Frontend authentication calls the
backend profile endpoint after login/signup; set `VITE_API_BASE_URL` when the
API is hosted outside `http://localhost:8000`.

Create a production build with `npm run build`.

## Latest checks

- `npm run build` passes TypeScript and the Vite production build.
- `npm audit` reports zero vulnerabilities.
- Browser smoke checks covered public pages, the student routes, role placeholder pages, the not-found page, mobile navigation, login demo, and signup validation/success.
- Browser smoke checks covered every parent/admin route, session selection, support status demo, user search, content preview, and parent/admin mobile navigation.
- `npm run build` passes TypeScript and the Vite production build after teacher portal implementation.
- Browser smoke checks covered all teacher routes and existing public, student, parent and admin routes; review revision gating, local teacher approval, attendance changes, upload placeholder, incident-form demo confirmation and mobile navigation were exercised.
- Backend tests pass with a Python 3.11 virtual environment; Firebase Admin startup and `/health` pass using the local service account. Live ID-token verification and a live Firestore profile read still require a Firebase-authenticated request.
