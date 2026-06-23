const Offer = require("./model");

const buildFilter = (query = {}) => {
  const filter = {};

  if (query.offerId) filter.offerId = query.offerId;
  if (query.offerType) filter.offerType = query.offerType;
  if (query.applicableMainCategory) {
    filter.applicableMainCategory = query.applicableMainCategory;
  }
  if (query.applicableSubcategory) {
    filter.applicableSubcategory = query.applicableSubcategory;
  }
  if (query.status) filter.status = query.status;

  if (query.storeCode) {
    filter.applicableStoreCodes = query.storeCode;
  }

  if (query.q) {
    const search = new RegExp(query.q, "i");

    filter.$or = [
      { offerId: search },
      { offerName: search },
      { offerType: search },
      { applicableMainCategory: search },
      { applicableSubcategory: search }
    ];
  }

  return filter;
};

const getOffers = async (query = {}) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 50;
  const skip = (page - 1) * limit;

  const filter = buildFilter(query);

  const [data, total] = await Promise.all([
    Offer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Offer.countDocuments(filter)
  ]);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  };
};

const getOfferById = async (id) => {
  return Offer.findById(id);
};

const getOfferByOfferId = async (offerId) => {
  return Offer.findOne({ offerId });
};

const createOffer = async (payload) => {
  return Offer.create(payload);
};

const updateOffer = async (id, payload) => {
  delete payload._id;

  return Offer.findByIdAndUpdate(
    id,
    { $set: payload },
    { new: true }
  );
};

const deleteOffer = async (id) => {
  return Offer.findByIdAndDelete(id);
};

module.exports = {
  getOffers,
  getOfferById,
  getOfferByOfferId,
  createOffer,
  updateOffer,
  deleteOffer
};
