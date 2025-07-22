import fastify from "fastify";
import cookie from "@fastify/cookie";
import { transactionsRoutes } from "./routes/transactions";
import cors from "@fastify/cors";

export const app = fastify();

app.register(cors, {
	origin: "http://localhost:5173",
	credentials: true,
});

app.register(cookie);
app.register(transactionsRoutes, {
	prefix: "transactions",
});
