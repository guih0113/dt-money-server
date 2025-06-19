import { app } from "./app";
import { env } from "./env";

const port = process.env.PORT;

app
	.listen({
		port: env.PORT,
	})
	.then(() => {
		console.log(`HTTP server is running on port: ${port}`);
	});
