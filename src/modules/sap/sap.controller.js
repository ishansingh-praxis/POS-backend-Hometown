const service = require("./sap.service");
const { successResponse, errorResponse } = require("../../utils/response");
exports.list = async (req,res,next) => { try { successResponse(res, await service.list(req.query), "SapSyncLog list fetched successfully"); } catch(e) { next(e); } };
exports.get = async (req,res,next) => { try { const data = await service.getById(req.params.id); if(!data) return errorResponse(res, "SapSyncLog not found", 404); successResponse(res, data, "SapSyncLog fetched successfully"); } catch(e) { next(e); } };
exports.create = async (req,res,next) => { try { successResponse(res, await service.create(req.body), "SapSyncLog created successfully", 201); } catch(e) { next(e); } };
exports.bulk = async (req,res,next) => { try { successResponse(res, await service.bulkCreate(Array.isArray(req.body)?req.body:req.body.records||[]), "SapSyncLog records imported successfully", 201); } catch(e) { next(e); } };
exports.update = async (req,res,next) => { try { const data = await service.update(req.params.id, req.body); if(!data) return errorResponse(res, "SapSyncLog not found", 404); successResponse(res, data, "SapSyncLog updated successfully"); } catch(e) { next(e); } };
exports.status = async (req,res,next) => { try { successResponse(res, await service.patchStatus(req.params.id, req.body.status), "SapSyncLog status updated successfully"); } catch(e) { next(e); } };
exports.remove = async (req,res,next) => { try { await service.remove(req.params.id); successResponse(res, null, "SapSyncLog deleted successfully"); } catch(e) { next(e); } };

exports.queueSync = async (req,res,next) => { try { successResponse(res, await service.queueSync(req.body), "Sync queued successfully", 201); } catch(e) { next(e); } };
exports.queueUnsyncedInvoices = async (req,res,next) => { try { successResponse(res, await service.queueUnsyncedInvoices(req.query.storeCode), "Unsynced invoices queued successfully", 201); } catch(e) { next(e); } };
exports.retry = async (req,res,next) => { try { successResponse(res, await service.retrySync(req.params.id), "Sync retried successfully"); } catch(e) { next(e); } };
exports.markSyncStatus = async (req,res,next) => { try { successResponse(res, await service.markSyncStatus(req.params.id, req.body.syncStatus, req.body.errorMessage), "Sync status updated successfully"); } catch(e) { next(e); } };
exports.summary = async (req,res,next) => { try { successResponse(res, await service.summary(req.query), "Sync summary fetched successfully"); } catch(e) { next(e); } };
