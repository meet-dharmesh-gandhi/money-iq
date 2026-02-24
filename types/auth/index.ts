export type AuthUser = {
	id: string;
	username: string;
	role: "user" | "admin";
};

export type LoginRequest = {
	username: string;
	password: string;
};

export type LoginResponse = {
	success: boolean;
	message?: string;
	user?: AuthUser;
	token?: string;
};

export type JWTPayload = AuthUser & {
	iat: number;
	exp: number;
};
