const Invoice = require("./model");
const sgMail = require("@sendgrid/mail");
const QRCode = require("qrcode");

const buildFilter = (query = {}) => {
  const filter = {};

  if (query.invoiceId) filter.invoiceId = query.invoiceId;
  if (query.invoiceNumber) filter.invoiceNumber = query.invoiceNumber;
  if (query.orderId) filter.orderId = query.orderId;
  if (query.storeCode) filter.storeCode = query.storeCode;
  if (query.city) filter.city = query.city;
  if (query.state) filter.state = query.state;
  if (query.region) filter.region = query.region;
  if (query.zone) filter.zone = query.zone;
  if (query.invoiceStatus) filter.invoiceStatus = query.invoiceStatus;
  if (query.financialYear) filter.financialYear = query.financialYear;
  if (query.channel) filter.channel = query.channel;

  if (query.customerPhone) filter["customer.customerPhone"] = query.customerPhone;
  if (query.paymentStatus) filter["payment.paymentStatus"] = query.paymentStatus;
  if (query.cashierId) filter.cashierId = query.cashierId;

  if (query.fromDate || query.toDate) {
    filter.invoiceDate = {};
    if (query.fromDate) filter.invoiceDate.$gte = new Date(query.fromDate);
    if (query.toDate) {
      const to = new Date(query.toDate);
      to.setHours(23, 59, 59, 999);
      filter.invoiceDate.$lte = to;
    }
  }

  if (query.minAmount || query.maxAmount) {
    filter["billing.grandTotal"] = {};
    if (query.minAmount) filter["billing.grandTotal"].$gte = Number(query.minAmount);
    if (query.maxAmount) filter["billing.grandTotal"].$lte = Number(query.maxAmount);
  }

  if (query.q || query.search) {
    const search = new RegExp(query.q || query.search, "i");
    filter.$or = [
      { invoiceId: search },
      { invoiceNumber: search },
      { orderId: search },
      { orderNumber: search },
      { storeCode: search },
      { storeName: search },
      { city: search },
      { region: search },
      { "customer.customerName": search },
      { "customer.customerPhone": search },
      { "customer.customerEmail": search },
      { "items.productName": search },
      { "items.sku": search }
    ];
  }

  return filter;
};

const applyStoreRestriction = (filter, user = null) => {
  if (user && user.role !== "ADMIN" && user.storeCode) {
    filter.storeCode = user.storeCode;
  }
  return filter;
};

const getInvoices = async (query = {}, user = null) => {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 50, 500);
  const skip = (page - 1) * limit;

  const filter = applyStoreRestriction(buildFilter(query), user);

  const sort = {};
  if (query.sortBy === "amountHighLow") sort["billing.grandTotal"] = -1;
  else if (query.sortBy === "amountLowHigh") sort["billing.grandTotal"] = 1;
  else sort.invoiceDate = -1;

  const [data, total] = await Promise.all([
    Invoice.find(filter).sort(sort).skip(skip).limit(limit),
    Invoice.countDocuments(filter)
  ]);

  return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
};

const getInvoiceById = async (id, user = null) => {
  return Invoice.findOne(applyStoreRestriction({ _id: id }, user));
};

const getInvoiceByInvoiceId = async (invoiceId, user = null) => {
  return Invoice.findOne(applyStoreRestriction({ invoiceId }, user));
};

const getInvoiceByOrderId = async (orderId, user = null) => {
  return Invoice.findOne(applyStoreRestriction({ orderId }, user));
};

const getInvoicesByStore = async (storeCode, query = {}, user = null) => {
  const finalQuery = applyStoreRestriction({ ...query, storeCode }, user);
  return getInvoices(finalQuery, user);
};

const getInvoiceSummary = async (query = {}, user = null) => {
  const filter = applyStoreRestriction(buildFilter(query), user);

  const [totalInvoices, issuedInvoices, cancelledInvoices, refundedInvoices, valueAgg] =
    await Promise.all([
      Invoice.countDocuments(filter),
      Invoice.countDocuments({ ...filter, invoiceStatus: "ISSUED" }),
      Invoice.countDocuments({ ...filter, invoiceStatus: "CANCELLED" }),
      Invoice.countDocuments({ ...filter, invoiceStatus: "REFUNDED" }),
      Invoice.aggregate([
        { $match: { ...filter, invoiceStatus: { $ne: "CANCELLED" } } },
        {
          $group: {
            _id: null,
            totalInvoiceValue: { $sum: "$billing.grandTotal" },
            totalPaid: { $sum: "$billing.paidAmount" },
            totalDue: { $sum: "$billing.dueAmount" },
            totalTax: { $sum: "$billing.taxTotal" },
            avgInvoiceValue: { $avg: "$billing.grandTotal" }
          }
        }
      ])
    ]);

  const values = valueAgg[0] || {
    totalInvoiceValue: 0,
    totalPaid: 0,
    totalDue: 0,
    totalTax: 0,
    avgInvoiceValue: 0
  };

  return {
    totalInvoices,
    issuedInvoices,
    cancelledInvoices,
    refundedInvoices,
    totalInvoiceValue: Math.round(values.totalInvoiceValue || 0),
    totalPaid: Math.round(values.totalPaid || 0),
    totalDue: Math.round(values.totalDue || 0),
    totalTax: Math.round(values.totalTax || 0),
    avgInvoiceValue: Math.round(values.avgInvoiceValue || 0)
  };
};

const getStoreInvoiceSummary = async (storeCode, user = null) => {
  return getInvoiceSummary(applyStoreRestriction({ storeCode }, user), user);
};

const createInvoice = async (payload) => {
  return Invoice.create(payload);
};

const updateInvoice = async (id, payload, user = null) => {
  delete payload._id;
  return Invoice.findOneAndUpdate(applyStoreRestriction({ _id: id }, user), { $set: payload }, { new: true });
};

const updateInvoiceByInvoiceId = async (invoiceId, payload, user = null) => {
  delete payload._id;
  return Invoice.findOneAndUpdate(applyStoreRestriction({ invoiceId }, user), { $set: payload }, { new: true });
};

const cancelInvoice = async (invoiceId, payload = {}, user = null) => {
  return Invoice.findOneAndUpdate(
    applyStoreRestriction({ invoiceId }, user),
    {
      $set: {
        invoiceStatus: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: payload.cancelReason || "Invoice cancelled",
        cancelledBy: payload.cancelledBy || "SYSTEM"
      }
    },
    { new: true }
  );
};

const markPrinted = async (invoiceId, user = null) => {
  return Invoice.findOneAndUpdate(
    applyStoreRestriction({ invoiceId }, user),
    {
      $inc: { "print.printCount": 1 },
      $set: { "print.printStatus": "PRINTED", "print.lastPrintedAt": new Date() }
    },
    { new: true }
  );
};

const deleteInvoice = async (id, user = null) => {
  return Invoice.findOneAndDelete(applyStoreRestriction({ _id: id }, user));
};

const getInvoicePublicUrl = (invoiceId) => {
  const baseUrl =
    process.env.INVOICE_PUBLIC_BASE_URL ||
    "http://localhost:5173/invoice-view";

  return `${baseUrl}/${invoiceId}`;
};

const generateInvoiceQr = async (invoiceId, user = null) => {
  const invoice = await getInvoiceByInvoiceId(invoiceId, user);

  if (!invoice) {
    const error = new Error("Invoice not found");
    error.statusCode = 404;
    throw error;
  }

  const invoiceUrl = getInvoicePublicUrl(invoice.invoiceId);

  const qrDataUrl = await QRCode.toDataURL(invoiceUrl, {
    width: 320,
    margin: 2
  });

  return {
    invoiceId: invoice.invoiceId,
    invoiceNumber: invoice.invoiceNumber,
    invoiceUrl,
    qrDataUrl
  };
};

const buildInvoiceEmailHtml = (invoice, qrDataUrl) => {
  const billing = invoice.billing || {};
  const customer = invoice.customer || {};
  const store = invoice.store || {};
  const seller = invoice.seller || {};

  const rows = (invoice.items || [])
    .map(
      (item) => `
        <tr>
          <td style="padding:8px;border:1px solid #eee;">
            <b>${item.productName || item.name || ""}</b><br/>
            <span style="font-size:11px;color:#777;">${item.sku || ""}</span>
          </td>
          <td style="padding:8px;border:1px solid #eee;text-align:center;">${item.quantity || item.qty || 0}</td>
          <td style="padding:8px;border:1px solid #eee;text-align:right;">₹${item.unitPrice || 0}</td>
          <td style="padding:8px;border:1px solid #eee;text-align:right;">₹${item.gstAmount || item.gst || 0}</td>
          <td style="padding:8px;border:1px solid #eee;text-align:right;">₹${item.lineTotal || item.total || 0}</td>
        </tr>
      `
    )
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#222;max-width:760px;margin:auto;border:1px solid #eee;border-radius:12px;overflow:hidden;">
      <div style="background:#fff7ed;padding:20px;border-bottom:2px solid #f97316;">
        <h1 style="margin:0;color:#9a3412;">HomeTown</h1>
        <p style="margin:4px 0 0;color:#555;">${seller.companyName || "Praxis Home Retail Limited - HomeTown"}</p>
      </div>

      <div style="padding:20px;">
        <h2 style="margin:0 0 8px;">Tax Invoice: ${invoice.invoiceNumber || invoice.invoiceId}</h2>
        <p style="margin:0;color:#666;">Order: ${invoice.orderId || "—"}</p>
        <p style="margin:0;color:#666;">Date: ${new Date(invoice.invoiceDate || invoice.issuedAt || Date.now()).toLocaleString("en-IN")}</p>

        <hr style="border:none;border-top:1px solid #eee;margin:18px 0;" />

        <table style="width:100%;font-size:13px;">
          <tr>
            <td style="vertical-align:top;width:50%;">
              <b>Bill To</b><br/>
              ${customer.customerName || "Walk-in Customer"}<br/>
              ${customer.customerPhone || ""}<br/>
              ${customer.customerEmail || ""}
            </td>
            <td style="vertical-align:top;width:50%;">
              <b>Store</b><br/>
              ${store.storeName || invoice.storeName || ""}<br/>
              ${store.address || invoice.storeAddress || ""}<br/>
              GSTIN: ${store.gstNumber || seller.gstNumber || "—"}
            </td>
          </tr>
        </table>

        <table style="width:100%;border-collapse:collapse;margin-top:18px;font-size:12px;">
          <thead>
            <tr style="background:#fff7ed;color:#9a3412;">
              <th style="padding:8px;border:1px solid #eee;text-align:left;">Item</th>
              <th style="padding:8px;border:1px solid #eee;">Qty</th>
              <th style="padding:8px;border:1px solid #eee;text-align:right;">Price</th>
              <th style="padding:8px;border:1px solid #eee;text-align:right;">GST</th>
              <th style="padding:8px;border:1px solid #eee;text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <div style="margin-top:20px;text-align:right;font-size:14px;">
          <p>Subtotal: <b>₹${billing.subtotal || 0}</b></p>
          <p>Discount: <b>₹${billing.discountTotal || 0}</b></p>
          <p>GST 18%: <b>₹${billing.taxTotal || 0}</b></p>
          <p style="font-size:20px;color:#ea580c;">Grand Total: <b>₹${billing.grandTotal || 0}</b></p>
          <p>Paid: <b>₹${billing.paidAmount || 0}</b></p>
          <p>Due: <b>₹${billing.dueAmount || 0}</b></p>
        </div>

        <div style="margin-top:24px;text-align:center;">
          <p style="font-size:12px;color:#666;">Scan QR to verify invoice</p>
          <img src="${qrDataUrl}" width="150" height="150" />
        </div>
      </div>
    </div>
  `;
};

const sendInvoiceEmail = async (invoiceId, payload = {}, user = null) => {
  const invoice = await getInvoiceByInvoiceId(invoiceId, user);

  if (!invoice) {
    const error = new Error("Invoice not found");
    error.statusCode = 404;
    throw error;
  }

  if (!process.env.SENDGRID_API_KEY) {
    const error = new Error(
      "SendGrid is not configured. Set SENDGRID_API_KEY in your .env to enable invoice email delivery."
    );
    error.statusCode = 503;
    throw error;
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  if (!fromEmail) {
    const error = new Error(
      "SendGrid sender email is not configured. Set SENDGRID_FROM_EMAIL in your .env to a verified SendGrid sender identity."
    );
    error.statusCode = 503;
    throw error;
  }

  const qr = await generateInvoiceQr(invoiceId, user);

  const to = payload.email || invoice.customer?.customerEmail;

  if (!to) {
    const error = new Error("Customer email missing");
    error.statusCode = 400;
    throw error;
  }

  const msg = {
    to,
    from: fromEmail,
    subject: `HomeTown Invoice ${invoice.invoiceNumber || invoice.invoiceId}`,
    html: buildInvoiceEmailHtml(invoice, qr.qrDataUrl)
  };

  try {
    await sgMail.send(msg);
  } catch (error) {
    const message =
      error?.response?.body ||
      error?.message ||
      "SendGrid failed to send the invoice email";
    const err = new Error(
      typeof message === "string" ? message : JSON.stringify(message)
    );
    err.statusCode = 502;
    throw err;
  }

  await Invoice.findOneAndUpdate(
    { invoiceId },
    {
      $set: {
        emailStatus: "SENT",
        emailedAt: new Date(),
        emailedTo: to
      }
    }
  );

  return {
    invoiceId,
    sentTo: to,
    emailStatus: "SENT"
  };
};

const createCreditNote = async (invoiceId, payload = {}, user = null) => {
  const invoice = await getInvoiceByInvoiceId(invoiceId, user);

  if (!invoice) {
    const error = new Error("Invoice not found");
    error.statusCode = 404;
    throw error;
  }

  const creditNoteId = `CN-${invoice.storeCode}-${Date.now()}`;

  const creditNote = await Invoice.create({
    invoiceId: creditNoteId,
    invoiceNumber: creditNoteId,
    invoiceType: "CREDIT_NOTE",
    invoiceStatus: "ISSUED",
    invoiceDate: new Date(),
    issuedAt: new Date(),
    financialYear: invoice.financialYear,

    orderId: invoice.orderId,
    orderNumber: invoice.orderNumber,
    channel: invoice.channel,
    orderType: invoice.orderType,

    storeCode: invoice.storeCode,
    storeName: invoice.storeName,
    city: invoice.city,
    state: invoice.state,
    region: invoice.region,
    zone: invoice.zone,
    storeAddress: invoice.storeAddress,

    store: invoice.store,
    seller: invoice.seller,
    customer: invoice.customer,
    items: payload.items || invoice.items,

    billing: {
      ...(invoice.billing || {}),
      grandTotal: -Math.abs(invoice.billing?.grandTotal || 0),
      paidAmount: -Math.abs(invoice.billing?.paidAmount || 0),
      dueAmount: 0,
      taxTotal: -Math.abs(invoice.billing?.taxTotal || 0),
      discountTotal: invoice.billing?.discountTotal || 0
    },

    payment: {
      paymentStatus: "REFUND_PENDING",
      paymentMode: invoice.payment?.paymentMode
    },

    fulfillment: invoice.fulfillment,

    sap: {
      sapSyncStatus: "PENDING"
    },

    accounting: {
      accountingStatus: "PENDING",
      ledgerPosted: false,
      revenueAccount: "SALES-RETURN-HOMETOWN-POS",
      taxAccount: "GST-REVERSAL-18"
    },

    print: {
      printStatus: "READY",
      printTemplate: "HOMETOWN_POS_CREDIT_NOTE_A4",
      printCount: 0
    },

    originalInvoiceId: invoice.invoiceId,
    reason: payload.reason || "Credit note created from invoice page",
    remarks: payload.remarks || "Credit note generated"
  });

  return creditNote;
};

module.exports = {
  getInvoices,
  getInvoiceById,
  getInvoiceByInvoiceId,
  getInvoiceByOrderId,
  getInvoicesByStore,
  getInvoiceSummary,
  getStoreInvoiceSummary,
  createInvoice,
  updateInvoice,
  updateInvoiceByInvoiceId,
  cancelInvoice,
  markPrinted,
  deleteInvoice,

  generateInvoiceQr,
  sendInvoiceEmail,
  createCreditNote
};
