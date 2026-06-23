const service = require("./offline-sales.service");
const { successResponse, errorResponse } = require("../../utils/response");
exports.list = async (req,res,next) => { try { successResponse(res, await service.list(req.query), "OfflineSale list fetched successfully"); } catch(e) { next(e); } };
exports.get = async (req,res,next) => { try { const data = await service.getById(req.params.id); if(!data) return errorResponse(res, "OfflineSale not found", 404); successResponse(res, data, "OfflineSale fetched successfully"); } catch(e) { next(e); } };
exports.create = async (req,res,next) => { try { successResponse(res, await service.create(req.body), "OfflineSale created successfully", 201); } catch(e) { next(e); } };
exports.bulk = async (req,res,next) => { try { successResponse(res, await service.bulkCreate(Array.isArray(req.body)?req.body:req.body.records||[]), "OfflineSale records imported successfully", 201); } catch(e) { next(e); } };
exports.update = async (req,res,next) => { try { const data = await service.update(req.params.id, req.body); if(!data) return errorResponse(res, "OfflineSale not found", 404); successResponse(res, data, "OfflineSale updated successfully"); } catch(e) { next(e); } };
exports.status = async (req,res,next) => { try { successResponse(res, await service.patchStatus(req.params.id, req.body.status), "OfflineSale status updated successfully"); } catch(e) { next(e); } };
exports.remove = async (req,res,next) => { try { await service.remove(req.params.id); successResponse(res, null, "OfflineSale deleted successfully"); } catch(e) { next(e); } };
