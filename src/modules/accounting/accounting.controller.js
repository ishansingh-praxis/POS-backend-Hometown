const service = require("./accounting.service");
const { successResponse, errorResponse } = require("../../utils/response");
exports.list = async (req,res,next) => { try { successResponse(res, await service.list(req.query), "AccountingEntry list fetched successfully"); } catch(e) { next(e); } };
exports.get = async (req,res,next) => { try { const data = await service.getById(req.params.id); if(!data) return errorResponse(res, "AccountingEntry not found", 404); successResponse(res, data, "AccountingEntry fetched successfully"); } catch(e) { next(e); } };
exports.create = async (req,res,next) => { try { successResponse(res, await service.create(req.body), "AccountingEntry created successfully", 201); } catch(e) { next(e); } };
exports.bulk = async (req,res,next) => { try { successResponse(res, await service.bulkCreate(Array.isArray(req.body)?req.body:req.body.records||[]), "AccountingEntry records imported successfully", 201); } catch(e) { next(e); } };
exports.update = async (req,res,next) => { try { const data = await service.update(req.params.id, req.body); if(!data) return errorResponse(res, "AccountingEntry not found", 404); successResponse(res, data, "AccountingEntry updated successfully"); } catch(e) { next(e); } };
exports.status = async (req,res,next) => { try { successResponse(res, await service.patchStatus(req.params.id, req.body.status), "AccountingEntry status updated successfully"); } catch(e) { next(e); } };
exports.remove = async (req,res,next) => { try { await service.remove(req.params.id); successResponse(res, null, "AccountingEntry deleted successfully"); } catch(e) { next(e); } };

exports.getSummary = async (req,res,next) => { try { successResponse(res, await service.getSummary(req.query), "Finance summary fetched successfully"); } catch(e) { next(e); } };
exports.getSettlementBatches = async (req,res,next) => { try { successResponse(res, await service.getSettlementBatches(req.query), "Settlement batches fetched successfully"); } catch(e) { next(e); } };
exports.postSettlementBatch = async (req,res,next) => { try { successResponse(res, await service.postSettlementBatch(req.body, req.user || {}), "Settlement batch posted successfully", 201); } catch(e) { next(e); } };
exports.exportGstr1 = async (req,res,next) => { try { successResponse(res, await service.exportGstr1(req.query), "GSTR-1 export fetched successfully"); } catch(e) { next(e); } };
