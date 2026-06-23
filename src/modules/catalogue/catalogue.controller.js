const service = require("./service");
const { successResponse, errorResponse } = require("../../utils/response");

exports.summary = async (req, res, next) => { try { successResponse(res, await service.getCatalogueSummary(), "Catalogue summary fetched successfully"); } catch (e) { next(e); } };
exports.full = async (req, res, next) => { try { successResponse(res, await service.getFullCatalogue(), "Full catalogue fetched successfully"); } catch (e) { next(e); } };
exports.byStore = async (req, res, next) => { try { const data = await service.getStoreCatalogue(req.params.storeCode); if (!data) return errorResponse(res, "Store not found", 404); successResponse(res, data, "Store catalogue fetched successfully"); } catch (e) { next(e); } };
exports.byProduct = async (req, res, next) => { try { const data = await service.getProductCatalogue(req.params.sku); if (!data) return errorResponse(res, "Product not found", 404); successResponse(res, data, "Product catalogue fetched successfully"); } catch (e) { next(e); } };
exports.search = async (req, res, next) => { try { successResponse(res, await service.searchCatalogue(req.query), "Catalogue search results fetched successfully"); } catch (e) { next(e); } };
