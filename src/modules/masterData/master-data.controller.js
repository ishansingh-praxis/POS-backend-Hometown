const service = require("./master-data.service");
const { successResponse, errorResponse } = require("../../utils/response");
exports.list = async (req,res,next) => { try { successResponse(res, await service.list(req.query), "MasterData list fetched successfully"); } catch(e) { next(e); } };
exports.get = async (req,res,next) => { try { const data = await service.getById(req.params.id); if(!data) return errorResponse(res, "MasterData not found", 404); successResponse(res, data, "MasterData fetched successfully"); } catch(e) { next(e); } };
exports.create = async (req,res,next) => { try { successResponse(res, await service.create(req.body), "MasterData created successfully", 201); } catch(e) { next(e); } };
exports.bulk = async (req,res,next) => { try { successResponse(res, await service.bulkCreate(Array.isArray(req.body)?req.body:req.body.records||[]), "MasterData records imported successfully", 201); } catch(e) { next(e); } };
exports.update = async (req,res,next) => { try { const data = await service.update(req.params.id, req.body); if(!data) return errorResponse(res, "MasterData not found", 404); successResponse(res, data, "MasterData updated successfully"); } catch(e) { next(e); } };
exports.status = async (req,res,next) => { try { successResponse(res, await service.patchStatus(req.params.id, req.body.status), "MasterData status updated successfully"); } catch(e) { next(e); } };
exports.remove = async (req,res,next) => { try { await service.remove(req.params.id); successResponse(res, null, "MasterData deleted successfully"); } catch(e) { next(e); } };
