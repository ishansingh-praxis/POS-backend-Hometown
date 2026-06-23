const makeCode = (prefix = "ID") => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
module.exports = { makeCode };
