const s = require("./manager.service"); const { successResponse, errorResponse } = require("../../utils/response");
exports.list=async(req,res,next)=>{try{successResponse(res, await s.list(req.query), "managers fetched successfully");}catch(e){next(e)}};
exports.get=async(req,res,next)=>{try{const d=await s.getById(req.params.id); if(!d) return errorResponse(res,"Not found",404); successResponse(res,d,"manager fetched successfully");}catch(e){next(e)}};
exports.create=async(req,res,next)=>{try{successResponse(res, await s.create(req.body), "manager created successfully",201);}catch(e){next(e)}};
exports.bulk=async(req,res,next)=>{try{successResponse(res, await s.bulkCreate(Array.isArray(req.body)?req.body:req.body.records||[]), "managers imported successfully",201);}catch(e){next(e)}};
exports.update=async(req,res,next)=>{try{successResponse(res, await s.update(req.params.id, req.body), "manager updated successfully");}catch(e){next(e)}};
exports.status=async(req,res,next)=>{try{successResponse(res, await s.patchStatus(req.params.id, req.body.status), "manager status updated successfully");}catch(e){next(e)}};
exports.resetPassword=async(req,res,next)=>{try{successResponse(res, await s.resetPassword(req.params.id, req.body.password), "Password reset successfully");}catch(e){next(e)}};
exports.remove=async(req,res,next)=>{try{await s.remove(req.params.id); successResponse(res,null,"manager deleted successfully");}catch(e){next(e)}};
