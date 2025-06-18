import { FastifyInstance } from "fastify";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { knex } from "../database";
import { checkSessionIdExists } from "../middlewares/check-session-id-exists";

// cookies são formas de manter estado entre requisições HTTP
// e são usados para autenticação, preferências do usuário, etc.

// tipos de testes mais famosos:
// unitários, integração e ponta a ponta (end-to-end).
// unitários testam partes isoladas do código, como funções ou métodos.
// testes de integração verificam se diferentes partes do sistema funcionam juntas corretamente.
// testes ponta a ponta (end-to-end) simulam o comportamento do usuário final, testando o sistema como um todo, desde a interface do usuário até o banco de dados.

// Pirâmide de testes:
// 1. Testes unitários (base da pirâmide, mais rápidos e numerosos)
// 2. Testes de integração (menos numerosos, mas importantes para verificar a interação entre componentes	)
// 3. Testes ponta a ponta (menos numerosos, mais lentos, mas importantes para verificar o sistema como um todo) => não dependem de nenhuma tecnologia ou arquitetura

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
