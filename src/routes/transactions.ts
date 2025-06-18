import { FastifyInstance } from "fastify";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { knex } from "../database";
import { checkSessionIdExists } from "../middlewares/check-session-id-exists";

export async function transactionsRoutes(app: FastifyInstance) {
	// Busca todas as transações
	app.get(
		"/",
		{
			preHandler: [checkSessionIdExists], // middleware para verificar se o sessionId existe
		},
		async (request) => {
			const { sessionId } = request.cookies;

			const transactions = await knex("transactions")
				.where("session_id", sessionId)
				.select(""); // Seleciona todas as colunas

			return { transactions };
		},
	);

	// Busca o resumo das transações
	app.get(
		"/summary",
		{
			preHandler: [checkSessionIdExists],
		},
		async (request) => {
			const { sessionId } = request.cookies;

			const summary = await knex("transactions")
				.where("session_id", sessionId)
				.sum("amount", { as: "amount" }) // Soma os valores da coluna 'amount'
				.first();

			return { summary };
		},
	);

	// Busca uma transação específica pelo ID
	app.get(
		"/:id",
		{
			preHandler: [checkSessionIdExists],
		},
		async (request) => {
			const getTransactionParamsSchema = z.object({
				id: z.string().uuid(),
			});

			const { id } = getTransactionParamsSchema.parse(request.params);
			const { sessionId } = request.cookies;

			const transaction = await knex("transactions")
				.where({
					session_id: sessionId,
					id,
				})
				.first(); // buscando primeiro e único registro

			return { transaction };
		},
	);

	// Cria uma nova transação
	app.post("/", async (request, reply) => {
		const createTransactionBodySchema = z.object({
			title: z.string(),
			amount: z.number(),
			type: z.enum(["credit", "debit"]),
		});

		const { title, amount, type } = createTransactionBodySchema.parse(
			request.body,
		);

		let sessionId = request.cookies.sessionId;

		if (!sessionId) {
			sessionId = randomUUID(); // Gera um novo UUID se não existir

			reply.cookie("sessionId", sessionId, {
				path: "/", // Define quais caminhos o cookie está disponível
				maxAge: 60 * 60 * 24 * 7, // Define a duração do cookie (7 dias)
			}); // Define o cookie 'sessionId' na resposta
		}

		await knex("transactions").insert({
			id: randomUUID(),
			title,
			amount: type === "credit" ? amount : amount * -1,
			session_id: sessionId,
		});

		return reply.status(201).send(); // 201 Created
	});
}
