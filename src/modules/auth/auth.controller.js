const service = require("./auth.service");
const PosUser = require("./user.model");
const { successResponse } = require("../../utils/response");

const login = async (req, res, next) => {
	try {
		const result = await service.login(req.body);
		return successResponse(res, result, "Login successful");
	} catch (error) {
		next(error);
	}
};

const me = async (req, res, next) => {
	try {
		const result = await service.getMe(req.user.id);
		return successResponse(res, result, "User fetched successfully");
	} catch (error) {
		next(error);
	}
};

const getAllLogins = async (req, res, next) => {
	try {
		const users = await PosUser.find({})
			.select("-password")
			.sort({ role: 1, storeCode: 1, name: 1 });

		return successResponse(res, users, "POS logins fetched successfully");
	} catch (error) {
		next(error);
	}
};

const getLoginsByRole = async (req, res, next) => {
	try {
		const users = await PosUser.find({ role: req.params.role.toUpperCase() })
			.select("-password")
			.sort({ storeCode: 1, name: 1 });

		return successResponse(res, users, "Role logins fetched successfully");
	} catch (error) {
		next(error);
	}
};

module.exports = {
	login,
	me,
	getAllLogins,
	getLoginsByRole
};
