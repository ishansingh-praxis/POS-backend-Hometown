const service = require("./service");
const { successResponse, errorResponse } = require("../../utils/response");

exports.list = async (req, res, next) => {
  try {
    successResponse(
      res,
      await service.listCatalog(req.query, req.user),
      "Catalog fetched successfully"
    );
  } catch (e) {
    next(e);
  }
};

exports.home = async (req, res, next) => {
  try {
    successResponse(
      res,
      await service.homeCatalog(req.query, req.user),
      "Catalog home fetched successfully"
    );
  } catch (e) {
    next(e);
  }
};

exports.filters = async (req, res, next) => {
  try {
    successResponse(
      res,
      await service.catalogFilters(req.query, req.user),
      "Catalog filters fetched successfully"
    );
  } catch (e) {
    next(e);
  }
};

exports.get = async (req, res, next) => {
  try {
    const data = await service.getCatalogItem(req.params.id, req.query, req.user);
    if (!data) return errorResponse(res, "Catalog item not found", 404);

    successResponse(res, data, "Catalog item fetched successfully");
  } catch (e) {
    next(e);
  }
};
