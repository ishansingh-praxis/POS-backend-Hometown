const getCashiers = (loginData = {}) => {
  if (Array.isArray(loginData.cashiers)) return loginData.cashiers;
  return (loginData.users || []).filter((user) => user.role === "CASHIER");
};

module.exports = { getCashiers };
