## Authentication System Guide

### Overview

The MoneyIQ app now has a complete JWT-based authentication system with database integration. Users can log in with credentials stored in MongoDB, and authentication tokens are stored in localStorage.

### Setup Instructions

#### 1. Add JWT Secret to Environment Variables

Add the following to your `.env.local` file:

```
JWT_SECRET=your-super-secret-key-change-this-in-production
```

In production, use a strong random string. You can generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 2. Seed the Database with Demo Users (Development)

When developing locally, seed the database with demo credentials:

```bash
npm run seed:db
```

This creates:

- **Admin user**: username `admin` / password `admin123` (role: admin)
- **Regular user**: username `user` / password `user123` (role: user)

### Key Components

#### Types (`/types/auth/index.ts`)

```typescript
type AuthUser = {
	id: string;
	username: string;
	role: "user" | "admin";
};

type JWTPayload = AuthUser & {
	iat: number; // Issued at
	exp: number; // Expiration (7 days by default)
};
```

#### JWT Utilities (`/lib/auth.ts`)

- **`encodeJWT(payload)`** - Create a signed JWT token
- **`decodeJWT(token)`** - Validate and decode JWT token
- Returns `null` if token is invalid or expired

#### Authentication Utilities (`/lib/auth-utils.ts`)

- **`useAuth()`** - Client-side hook to manage authentication
    - `getAuthUser()` - Get current user from localStorage
    - `getAuthToken()` - Get JWT token from localStorage
    - `isLoggedIn()` - Check if user is authenticated
    - `logout()` - Clear authentication data
- **`verifyJWT(token)`** - Server-side JWT verification
- **`getTokenFromHeaders(headers)`** - Extract token from Authorization header

#### Login API (`/app/api/auth/login/route.ts`)

POST endpoint that:

1. Accepts `{ username, password }`
2. Queries MongoDB for user
3. Returns user data and JWT token on success
4. Returns error message on failure (401)

### Frontend Usage

#### Login Page (`/app/login/page.tsx`)

- Clean, professional login form
- Password visibility toggle with eye icon
- Demo credentials shown only in development
- Stores JWT + user data in localStorage on success
- Auto-redirects to `/dashboard` after login

#### Dashboard Page (`/app/dashboard/page.tsx`)

- Protected page that redirects to login if not authenticated
- Role-based content:
    - **Admin sees**: Admin Panel section
    - **User sees**: Portfolio section
- Shows user info (ID, username, role)
- Logout button clears tokens

### Backend Usage

#### Protecting API Routes

In your API endpoints, use `verifyJWT()` to protect routes:

```typescript
import { getTokenFromHeaders, verifyJWT } from "@/lib/auth-utils";
import type { AuthUser } from "@/types/auth";

export async function GET(request: Request) {
	const token = getTokenFromHeaders(request.headers);
	const authUser: AuthUser | null = verifyJWT(token);

	if (!authUser) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	// Proceed with protected logic
	console.log(`User ${authUser.username} (${authUser.role}) is accessing this route`);

	return Response.json({ success: true });
}
```

#### Client-side Fetch with Token

When calling protected API routes from the frontend, include the JWT token:

```typescript
const { getAuthToken } = useAuth();

const response = await fetch("/api/protected-route", {
	headers: {
		Authorization: `Bearer ${getAuthToken()}`,
	},
});
```

### Database Schema

#### User Model (`/models/User.ts`)

```typescript
{
	_id: ObjectId;
	username: string; // unique, lowercase, trimmed
	password: string; // store hashed passwords in production
	role: "user" | "admin"; // default: "user"
	createdAt: Date;
	updatedAt: Date;
}
```

**⚠️ TODO**: Implement password hashing with bcrypt before production deployment.

### Login Page Features

✅ **Logo with Text**: MoneyIQ logo + text at the top
✅ **Password Visibility Toggle**: Eye icon to show/hide password
✅ **Conditional Demo Credentials**: Only shown in development (`NODE_ENV=development`)
✅ **Cursor Styling**: Pointer cursor on hover for sign in button
✅ **Database Integration**: Uses MongoDB for user credentials
✅ **JWT Tokens**: Secure authentication with JWT signing

### Environment-Specific Behavior

**Development (`NODE_ENV=development`)**

- Demo credentials box shown on login page
- Helpful for testing without database setup
- Use `npm run seed:db` to populate demo users

**Production (`NODE_ENV=production`)**

- Demo credentials box hidden
- Only real users in database can log in
- JWT_SECRET must be set to strong random value

### Security Considerations

1. **JWT_SECRET** - Must be strong and kept secret in production
2. **Password Storage** - Currently plain text! Implement bcrypt hashing
3. **HTTPS Only** - Use HTTPS in production to prevent token interception
4. **Token Expiry** - Currently 7 days; adjust as needed
5. **localStorage** - Vulnerable to XSS; consider using httpOnly cookies

### Next Steps / TODO

- [ ] Implement bcrypt password hashing in `lib/user-auth.ts`
- [ ] Add backend route protection using `verifyJWT()`
- [ ] Implement refresh token strategy (optional)
- [ ] Add email verification on signup
- [ ] Add password reset functionality
- [ ] Move to httpOnly cookies for better security
- [ ] Implement rate limiting on login endpoint
