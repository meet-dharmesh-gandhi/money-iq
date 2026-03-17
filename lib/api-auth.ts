import { getTokenFromHeaders, verifyJWT } from "@/lib/auth-utils";
import { User } from "@/models/User";
import { connectToDatabase } from "@/lib/mongodb";

export async function getAuthenticatedUser(request: Request) {
	const token = getTokenFromHeaders(request.headers);
	const authUser = verifyJWT(token);

	if (!authUser?.id) {
		return null;
	}

	await connectToDatabase();

	return User.findById(authUser.id);
}
