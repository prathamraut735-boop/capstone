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

Start the API from the repository root:

```sh
backend/.venv/bin/python -m uvicorn app.main:app --app-dir backend --reload
```

The local Vite origin defaults to `http://localhost:5173`. For deployment, set
`ENVIRONMENT=production` and set `FRONTEND_ORIGINS` to the exact comma-separated
frontend origins. Wildcard CORS origins are rejected. Set
`VITE_API_BASE_URL` in the frontend to the deployed API origin and make
`STUDENT_AUTH_EMAIL_DOMAIN` match `VITE_STUDENT_AUTH_EMAIL_DOMAIN`. Student
usernames map internally to Firebase Auth email aliases; students sign in with
their generated username, not that alias.

## Authentication and roles

Every endpoint below requires `Authorization: Bearer <Firebase ID token>`.
Learner and booking endpoints require a Firestore user profile with
`role: "parent"`. Session publishing requires `role: "admin"`; provision that
role only through a trusted administrator process. Firestore rules prevent a
user from assigning or changing their own role.
Student UIDs recorded in `studentAccounts` are also rejected by parent-only API
routes, and Firestore rules prevent those accounts from creating or changing a
parent profile. The public parent login recognizes the configured student
alias domain and routes valid student accounts to the student workspace.

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
  stored. The platform generates the student username.
- `POST /api/v1/student-invitations/activate` — public activation endpoint;
  accepts the invitation code and a student-chosen password. Only a valid
  pending code can create a Firebase student account.
- `GET /api/v1/students/me` — return the authenticated student's own linked
  profile. A student's access is denied if the learner is inactive or the
  account-to-learner link does not match.
- `GET /api/v1/sessions` — list published future sessions with places available.
- `POST /api/v1/users/me/bookings` — reserve a session place for one of the
  guardian's learner profiles.
- `GET /api/v1/users/me/bookings` — list the guardian's bookings.
- `DELETE /api/v1/users/me/bookings/{booking_id}` — cancel a future booking
  and release its place.

Learner records are stored under `users/{parentUid}/children/{learnerId}` and
include a server-assigned learner ID, parent ID, creation date, learning level,
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

Invitation codes are generated with cryptographic randomness, stored as
SHA-256 hashes, expire after 24 hours, and are claimed under a Firestore
transaction before Firebase Auth account creation. The learner link and
one-time-used invitation state are written transactionally. The generated
username is reserved per learner; the child supplies only their new password
during activation. Passwords are sent only to Firebase Auth through the
server-side Admin SDK and are never saved in Firestore.

Configure the same Firebase Auth email alias domain in the API and frontend:

```text
STUDENT_AUTH_EMAIL_DOMAIN=students.capstone-af3eb.firebaseapp.com
VITE_STUDENT_AUTH_EMAIL_DOMAIN=students.capstone-af3eb.firebaseapp.com
```

These aliases are not mailboxes. Student password recovery by email is not
available; a parent-mediated recovery flow still needs to be designed before
production student accounts are enabled.

## Tests

```sh
cd backend
.venv/bin/python -m pytest
```
