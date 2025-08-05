import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { knex } from "../database";

export async function transactionsRoutes(app: FastifyInstance) {
	app.addHook("preHandler", async (request, reply) => {
		// Função helper para extrair sessionId do header (pode ser string ou array)
		const getSessionIdFromHeader = (
			headerValue: string | string[] | undefined,
		): string | undefined => {
			if (!headerValue) return undefined;
			return Array.isArray(headerValue) ? headerValue[0] : headerValue;
		};

		// Tentar pegar sessionId do cookie primeiro, depois do header
		let sessionId =
			request.cookies.sessionId ||
			getSessionIdFromHeader(request.headers["x-session-id"]);

		console.log(
			"🍪 Received sessionId from cookie:",
			request.cookies.sessionId,
		);
		console.log(
			"📡 Received sessionId from header:",
			request.headers["x-session-id"],
		);
		console.log("🆔 Final sessionId being used:", sessionId);

		if (!sessionId) {
			sessionId = randomUUID();
			console.log("🆔 Created new sessionId:", sessionId);

			reply.cookie("sessionId", sessionId, {
				path: "/",
				maxAge: 60 * 60 * 24 * 7, // cookie válido por 7 dias
				// Configurações para cross-origin
				sameSite: "none",
				secure: true, // necessário para sameSite: 'none'
				httpOnly: false, // permitir acesso via JavaScript
			});
		}

		request.sessionId = sessionId;
	});

	app.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
		const getTransactionsQuerySchema = z.object({
			page: z.coerce.number().min(1).default(1),
			query: z.string().optional(),
		});

		const { page, query } = getTransactionsQuerySchema.parse(request.query);
		const { sessionId } = request;

		if (!sessionId) {
			return reply.status(401).send({ message: "Sessão não autorizada." });
		}

		const pageSize = 10;
		const offset = (page - 1) * pageSize;

		let baseTransactionsQuery = knex("transactions").where(
			"session_id",
			sessionId,
		);

		if (query) {
			baseTransactionsQuery = baseTransactionsQuery.whereRaw(
				"LOWER(title) LIKE LOWER(?)",
				[`%${query}%`], // Certifique-se de que o Knex receba o binding corretamente
			);
		}

		baseTransactionsQuery = baseTransactionsQuery.orderBy("created_at", "desc");

		// Usamos .clone() para que a query de contagem não seja afetada pelo .offset() e .limit()
		const countResult = await baseTransactionsQuery
			.clone()
			.count({ total: "*" })
			.first();

		const total = Number(countResult?.total) || 0;
		const totalPages = Math.max(1, Math.ceil(total / pageSize));

		const transactions = await baseTransactionsQuery
			.offset(offset)
			.limit(pageSize)
			.select();

		return {
			page,
			pageSize,
			total,
			totalPages,
			transactions,
		};
	});

	app.get("/summary", async (request) => {
		const { sessionId } = request;

		const summary = await knex("transactions")
			.where("session_id", sessionId)
			.sum("amount", { as: "amount" })
			.first();

		return { summary };
	});

	app.get("/summary/debit", async (request) => {
		const { sessionId } = request;

		const debitSummary = await knex("transactions")
			.where("session_id", sessionId)
			.andWhere("amount", "<", 0)
			.sum("amount", { as: "amount" })
			.first();

		return { debitSummary };
	});

	app.get("/summary/credit", async (request) => {
		const { sessionId } = request;

		const creditSummary = await knex("transactions")
			.where("session_id", sessionId)
			.andWhere("amount", ">", 0)
			.sum("amount", { as: "amount" })
			.first();

		return { creditSummary };
	});

	app.post("/", async (request, reply) => {
		const createTransactionBodySchema = z.object({
			title: z.string(),
			description: z.string(),
			amount: z.number(),
			type: z.enum(["credit", "debit"]),
		});

		const { title, description, amount, type } =
			createTransactionBodySchema.parse(request.body);

		const { sessionId } = request;

		await knex("transactions").insert({
			id: randomUUID(),
			title,
			description,
			amount: type === "credit" ? amount : amount * -1,
			session_id: sessionId,
		});

		return reply.status(201).send();
	});
}
