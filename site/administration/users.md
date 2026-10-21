# Users & Menu Features

Only the **Superadmin** can add users, assign roles, and control which menu features operations roles see. Open **Users** from the top of the left menu.

<img class="screenshot" src="/screenshots/users.png" alt="Users administration" />

## Add a user

1. Select **Add user**.
2. Enter name, email, a temporary password (at least 6 characters), and a role.
3. For the **Vendor** role, also pick the supplier. The vendor portal then shows only that supplier's purchase orders.
4. Save. The person can sign in immediately with that email and password.

Emails are unique within the association; creating a duplicate is rejected.

## Edit or deactivate a user

Use the pencil icon on a row to change name, email, role, password, or the **Active** flag. Inactive users cannot sign in. Users are never hard-deleted, so their history (stock movements, approvals, gate logs) stays intact.

A changed role or password takes effect at the user's next sign-in. Existing sessions keep their old role until the token expires (7 days) or the user signs out.

## Role menu features

**Role menu features** lets you tailor the left menu for the four operations roles:

- Security Head
- Estate Manager
- Security Staff
- Staff

For each role, tick the features it should see (Home, Dashboard, Flat owners, NOC, Notices, Board, Attendance, Bus gate, School bus admin, Moves, Items, Categories, Suppliers, Warehouses, Barcodes, Purchase Orders, Requisitions, Stock, AMC Contracts, Reports, Settings).

- The choice gates **viewing** — both the menu and the API. Edit and delete rights still follow the [permission matrix](/administration/roles#permission-matrix).
- Leaving a role with no overrides means it uses its default features from the matrix.
- Users must **sign out and sign in again** to pick up changes, because menu features are carried in the login token.

## Demo accounts

Seeding creates one account per role, all with password `password123` (see [Get Started](/installation/#demo-accounts)). Before going live, deactivate them or change their passwords, and create real accounts for office bearers and staff.

## Residents

Resident accounts are linked to their flat through the flat's member list (**Flat owners → household**). A resident only sees flats linked to their account. Residents who don't want an account can still update their details through the login-free [flat self-update link](/usage/flat-self-update).
