const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const PosUser = require("./user.model");

const sanitizeUser = (user) => {
	const obj = user.toObject ? user.toObject() : user;
	delete obj.password;
	return obj;
};

const createToken = (user) => {
	return jwt.sign(
		{
			id: user._id,
			employeeCode: user.employeeCode,
			email: user.email,
			role: user.role,
			dashboardType: user.dashboardType,
			storeCode: user.storeCode,
			storeName: user.storeName,
			permissions: user.permissions || []
		},
		process.env.JWT_SECRET || "hometown_pos_secret_2026",
		{
			expiresIn: process.env.JWT_EXPIRES_IN || "30d"
		}
	);
};

const login = async ({ email, username, loginId, employeeCode, password }) => {
	const identifier = email || username || loginId || employeeCode;
	if (!identifier || !password) {
		const error = new Error("Email/loginId and password are required");
		error.statusCode = 400;
		throw error;
	}
	const user = await PosUser.findOne({
		$or: [
			{ email: String(identifier).toLowerCase() },
			{ username: String(identifier).toLowerCase() },
			{ loginId: identifier },
			{ employeeCode: identifier }
		],
		isActive: true
	});
	if (!user) {
		const error = new Error("Invalid credentials");
		error.statusCode = 401;
		throw error;
	}
	const isHashed = user.password.startsWith("$2a$") || user.password.startsWith("$2b$");
	const isValid = isHashed
		? await bcrypt.compare(password, user.password)
		: password === user.password;
	if (!isValid) {
		const error = new Error("Invalid credentials");
		error.statusCode = 401;
		throw error;
	}
	const token = createToken(user);
	return {
		token,
		user: sanitizeUser(user),
		redirectTo: user.landingRoute
	};
};

const getMe = async (userId) => {
	const user = await PosUser.findById(userId);
	if (!user) {
		const error = new Error("User not found");
		error.statusCode = 404;
		throw error;
	}
	return sanitizeUser(user);
};

module.exports = {
	login,
	getMe
};
