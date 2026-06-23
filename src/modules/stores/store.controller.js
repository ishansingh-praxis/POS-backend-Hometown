const service = require("./store.service");
const { successResponse, errorResponse } = require("../../utils/response");

const list = async (req, res, next) => { try { return successResponse(res, await service.list(req.query), "Stores fetched successfully"); } catch(e) { next(e); } };
const get = async (req, res, next) => { try { const data = await service.getByStoreCode(req.params.storeCode); if (!data) return errorResponse(res, "Store not found", 404); return successResponse(res, data, "Store fetched successfully"); } catch(e) { next(e); } };
const create = async (req, res, next) => { try { return successResponse(res, await service.create(req.body), "Store created successfully", 201); } catch(e) { next(e); } };
const update = async (req, res, next) => { try { return successResponse(res, await service.update(req.params.storeCode, req.body), "Store updated successfully"); } catch(e) { next(e); } };
const remove = async (req, res, next) => { try { await service.remove(req.params.storeCode); return successResponse(res, null, "Store deleted successfully"); } catch(e) { next(e); } };
const cashierSummary = async (req, res, next) => { try { return successResponse(res, await service.cashierSummary(), "Cashier summary fetched successfully"); } catch(e) { next(e); } };

module.exports = { list, get, create, update, remove, cashierSummary };
