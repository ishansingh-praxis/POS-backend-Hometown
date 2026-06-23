const mongoose = require("mongoose");

const AddressSchema = new mongoose.Schema(
  {
    addressId: String,
    postalCode: String,
    addressLine1: String,
    addressLine2: String,
    addressLine3: String,
    city: String,
  },
  { _id: false }
);

const CustomerSchema = new mongoose.Schema(
  {
    customerId: { type: String, index: true },

    // SAP fields
    sapCustomerCode: { type: String, index: true },
    sourceSystem: { type: String, default: "SAP", index: true },

    // common POS fields
    name: { type: String, index: true },
    customerName: { type: String, index: true },

    mobile: { type: String, index: true },
    phone: { type: String, index: true },
    customerPhone: { type: String, index: true },

    email: { type: String, index: true },

    customerType: {
      type: String,
      enum: ["B2C", "B2B", "Retail", "Business", "Interior Designer", "Corporate", "UNKNOWN"],
      default: "B2C",
      index: true,
    },

    primaryCity: { type: String, index: true },
    city: { type: String, index: true },

    primaryAddress: AddressSchema,

    billingAddress: mongoose.Schema.Types.Mixed,
    deliveryAddress: mongoose.Schema.Types.Mixed,
    deliveryAddresses: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    gstNumber: { type: String, index: true },
    gstin: { type: String, index: true },

    invoiceCount: { type: Number, default: 0 },
    orderCount: { type: Number, default: 0 },
    transactionRows: { type: Number, default: 0 },
    uniqueSkuCount: { type: Number, default: 0 },

    totalHistoricalSalesValue: { type: Number, default: 0, index: true },
    totalSpend: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },

    orders: { type: Number, default: 0 },
    visits: { type: Number, default: 0 },

    returnOrCancelRows: { type: Number, default: 0 },
    returnOrCancelRatePercent: { type: Number, default: 0 },

    firstTransactionDate: String,
    lastTransactionDate: String,
    lastVisit: String,

    purchases: { type: [mongoose.Schema.Types.Mixed], default: [] },
    pendingOrders: { type: [mongoose.Schema.Types.Mixed], default: [] },
    returns: { type: [mongoose.Schema.Types.Mixed], default: [] },

    preferredCategory: String,

    status: { type: String, default: "ACTIVE", index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    strict: false,
    collection: "customers",
  }
);

CustomerSchema.index({
  name: "text",
  customerName: "text",
  mobile: "text",
  phone: "text",
  customerPhone: "text",
  email: "text",
  sapCustomerCode: "text",
  primaryCity: "text",
});

module.exports = mongoose.model("Customer", CustomerSchema, "customers");
