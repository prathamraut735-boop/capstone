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
- [x] Add the public landing page, parent/guardian signup demo and login demo.
- [x] Move the existing student routes under `/student/` without removing student features.
- [x] Add basic form validation, password visibility controls and demo-only result messages.
- [x] Add parent dashboard, learner cards, booking demo, subscription placeholder and parent settings.
- [x] Add admin overview, user list, content management demo, entitlements, support queue and audit-log preview.
- [x] Add responsive parent and admin navigation layouts with separate role-specific sections.
- [x] Build the teacher overview, learner list, practice review queue, session attendance, lesson plans, restricted learner-needs view and incident-report demo.
- [x] Add responsive teacher navigation and connect the seven `/teacher/` routes.
- [x] Add local-only teacher review and attendance interactions, including a new-attempt requirement after revision requests.

## Routes

- Public: `/`, `/login`, `/signup`
- Student demo: `/student/dashboard`, `/student/lessons`, `/student/lessons/:lessonId`, `/student/practice`, `/student/progress`, `/student/profile`
- Parent demo: `/parent/dashboard`, `/parent/children`, `/parent/bookings`, `/parent/subscription`, `/parent/settings`
- Admin demo: `/admin/dashboard`, `/admin/users`, `/admin/content`, `/admin/entitlements`, `/admin/support`, `/admin/audit-logs`
- Teacher demo: `/teacher/dashboard`, `/teacher/learners`, `/teacher/reviews`, `/teacher/sessions`, `/teacher/lesson-plans`, `/teacher/learner-needs`, `/teacher/incidents`
- Unknown public routes show a friendly not-found page.

## Demo and privacy notes

All student details, progress, lessons, feedback and practice submissions shown here are fictional examples. Login and signup are frontend-only demonstrations; no account is authenticated or created and no form data is sent to a server. The student demo is directly visitable and is not protected by authentication. This project does not include a backend, real recording or upload functionality, video submissions, public student profiles, messaging, payments or AI feedback. Level 4 content and the relationship between learning levels and curriculum stages still need confirmation.

Parent, administrator and teacher pages are frontend demonstrations backed by fictional data in `src/data/parentAdminData.ts` and `src/data/teacherData.ts`. Local booking selections, list filters, attendance changes, review actions and incident-form confirmations do not persist or change real data. Teacher audio playback, resource upload, AI feedback, learner-needs access controls and incident reporting are visual placeholders only. None of the roles are protected by real access controls.

## Run locally

From the `frontend` directory:

```sh
npm install
npm run dev
```

Create a production build with `npm run build`.

## Latest checks

- `npm run build` passes TypeScript and the Vite production build.
- `npm audit` reports zero vulnerabilities.
- Browser smoke checks covered public pages, the student routes, role placeholder pages, the not-found page, mobile navigation, login demo, and signup validation/success.
- Browser smoke checks covered every parent/admin route, session selection, support status demo, user search, content preview, and parent/admin mobile navigation.
- `npm run build` passes TypeScript and the Vite production build after teacher portal implementation.
- Browser smoke checks covered all teacher routes and existing public, student, parent and admin routes; review revision gating, local teacher approval, attendance changes, upload placeholder, incident-form demo confirmation and mobile navigation were exercised.
