# Toy Choir TV API

FastAPI verifies Firebase Authentication ID tokens and uses Cloud Firestore for
parent profiles, linked learner profiles, student invitations, student account
links, session availability and bookings.

## Local setup

Use Python 3.11 or newer. From the repository root:

```sh
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements-dev.txt
cp backend/.env.example backend/.env
```

Check `backend/.env` contains the correct Firebase project ID, storage bucket,
and points `GOOGLE_APPLICATION_CREDENTIALS` to a trusted service account JSON
file with Firebase Auth, Firestore and Cloud Storage access. The key is ignored
by Git; do not commit it or put it in frontend configuration.
Set `FIREBASE_WEB_API_KEY` to the Firebase Web API key from the project's web
app configuration. It is a public Firebase configuration value, not a service
account secret; the backend uses it to verify student passwords with Firebase
Authentication.

Start the API from the repository root:

```sh
backend/.venv/bin/python -m uvicorn app.main:app --app-dir backend --reload
```

The local Vite origin defaults to `http://localhost:5173`. For deployment, set
`ENVIRONMENT=production` and set `FRONTEND_ORIGINS` to the exact comma-separated
frontend origins. Wildcard CORS origins are rejected. Set
`VITE_API_BASE_URL` in the frontend to the deployed API origin. The
`STUDENT_AUTH_EMAIL_DOMAIN` value must match the Firebase Auth account aliases
created by this API. These aliases are internal and are never shown to
students; students sign in with their Student ID.

## Authentication and roles

Parent, administrator, and student-profile endpoints require
`Authorization: Bearer <Firebase ID token>`. Parent learner and booking
endpoints require a Firestore user profile with
`role: "parent"`. Session publishing requires `role: "admin"`; provision that
role only through a trusted administrator process. Firestore rules prevent a
user from assigning or changing their own role.
Student UIDs recorded in `studentAccounts` are also rejected by parent-only API
routes, and Firestore rules prevent those accounts from creating or changing a
parent profile. Student invitation activation and Student ID login are public API
routes; they validate the one-time invitation or Firebase password before
creating/returning student credentials.

## Parent endpoints

- `GET /api/v1/users/me` — current user's profile.
- `GET /api/v1/users/me/children` — list the authenticated parent's learner
  profiles, with platform-managed account, access, learning and invitation
  status.
- `POST /api/v1/users/me/children` — create a learner with required
  `firstName` and `ageRange` (`8-10`, `11-13`, or `14-16`), and optional
  `preferredName`, `musicalExperience`, and `learningInterests`.
- `PATCH /api/v1/users/me/children/{learner_id}` — edit permitted profile
  fields or set `{"status":"deactivated"}` / `{"status":"active"}`. Deactivation
  revokes pending invitations and disables the linked Firebase student user.
- `PUT /api/v1/users/me/children/{learner_id}/profile-picture` — upload a raw
  JPEG, PNG or WebP body (maximum 2 MB). Pictures are stored privately and
  served through an authenticated API route, not a public download URL.
- `GET /api/v1/users/me/children/{learner_id}/profile-picture` and `DELETE
  /api/v1/users/me/children/{learner_id}/profile-picture` — view or remove the
  signed-in parent's private learner image.
- `POST /api/v1/users/me/children/{learner_id}/student-invitations` — create a
  24-hour, one-time invitation. The code is returned once and only its hash is
  stored. The backend assigns a Student ID to every learner and returns that ID
  with the invitation.
- `POST /api/v1/users/me/children/{learner_id}/student-password-reset` — reset
  the linked student's password and return a generated temporary password once
  to the authenticated parent. The password is not stored in Firestore.
- `POST /api/v1/student-invitations/activate` — public activation endpoint;
  accepts the invitation code, a student-chosen username, and password. Only a
  valid pending code can create a Firebase student account. The internal email
  is marked unverified and is never used for email delivery or verification.
- `POST /api/v1/students/login` — public Student ID-or-username/password login.
  The API resolves either identifier to the internal Firebase Auth email,
  verifies the password with Firebase Identity Toolkit, checks the resulting
  UID against the learner link, and returns a Firebase custom token.
- `GET /api/v1/students/me` — return the authenticated student's own linked
  profile. A student's access is denied if the learner is inactive or the
  account-to-learner link does not match.
- `PUT /api/v1/students/me/username` — let an authenticated student choose a
  username if the account predates username support.
- `GET /api/v1/sessions` — list published future sessions with places available.
- `POST /api/v1/users/me/bookings` — reserve a session place for one of the
  guardian's learner profiles.
- `GET /api/v1/users/me/bookings` — list the guardian's bookings.
- `DELETE /api/v1/users/me/bookings/{booking_id}` — cancel a future booking
  and release its place.

Learner records are stored under `users/{parentUid}/children/{learnerId}` and
include server-assigned learner and Student IDs, parent ID, creation date, learning level,
access/account status, progress and teacher/practice status. Parent endpoints
derive the parent UID from the verified Firebase ID token; callers cannot
select another parent's collection. Student accounts are created only from
parent-issued invitations, use separate Firebase credentials, and are linked
by the backend. Parent credentials and child passwords are never shared.

## Session publishing and booking behavior

`POST /api/v1/admin/sessions` publishes a session. It requires an administrator
profile and accepts a title, venue, timezone-aware `startAt`/`endAt`, capacity
and `priceCents`; prices are shown in AUD. Example:

```json
{
  "title": "Family singing session",
  "venue": "Community Hall",
  "startAt": "2035-06-15T10:00:00+10:00",
  "endAt": "2035-06-15T10:45:00+10:00",
  "capacity": 12,
  "priceCents": 2500
}
```

The session catalog starts empty until an administrator publishes availability.
Booking creation uses a Firestore transaction to confirm the reservation and
decrement available capacity. Cancellation releases the place. Checkout is a
simulation: bookings record `paymentStatus: "simulated"` and **no money is
charged**. A confirmed booking nevertheless reserves a real place, as the API
does not treat simulated payment as a real payment-provider transaction.

## Student invitations and identity

Student IDs use the format `TC` + UTC year + a per-year sequence and are
reserved in Firestore transactions. Existing learner profiles receive an ID
when the parent learner list is next loaded; existing Firebase student UIDs
and internal email aliases are retained and linked to that ID.

Invitation codes are generated with cryptographic randomness, stored as
SHA-256 hashes, expire after 24 hours, and are claimed under a Firestore
transaction before Firebase Auth account creation. The learner, Student ID,
username, Firebase UID and one-time-used invitation state are linked by the
backend. Usernames are case-insensitive, unique, and use 3-20 letters, numbers,
or underscores; Student IDs remain valid sign-in identifiers too. Existing
student accounts can continue using their Student ID and are prompted to set a
username after their next successful login.
Firebase Auth stores password hashes; the API never writes passwords to
Firestore. Student login exchanges successful Firebase password verification
for a custom token so the existing Firebase client session and protected
student workspace continue to work.

```text
STUDENT_AUTH_EMAIL_DOMAIN=student.toychoir.local
FIREBASE_WEB_API_KEY=<Firebase Web API key>
```

The internal aliases are not mailboxes and are never marked email-verified.
Parents recover student accounts by generating a temporary password from the
learner management page and sharing it with the child. Configure the Web API
key and alias domain in each deployed backend environment before enabling
student activation/login.

## Tests

```sh
cd backend
.venv/bin/python -m pytest
```
