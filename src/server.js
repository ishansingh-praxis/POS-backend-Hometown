const app = require("./app");
const connectDB = require("./config/db");
const PORT = process.env.PORT || 5003;

connectDB().then(() => {
	const server = app.listen(PORT, () => {
		console.log(`HomeTown POS complete backend running on port ${PORT}`);
		console.log(`API Base: http://localhost:${PORT}/api/pos`);
	});

	server.on("error", (err) => {
		if (err && err.code === "EADDRINUSE") {
			console.error(`Port ${PORT} is already in use. Stop the process using the port or set a different PORT.`);
			process.exit(1);
		}
		throw err;
	});
});
