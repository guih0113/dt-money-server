import { it, beforeAll, afterAll, describe, expect, beforeEach } from "vitest";
import { execSync } from "node:child_process";
import request from "supertest";
import { app } from "../src/app";

// Todos sao testes end-to-end (E2E)
// Categorizando os testes em um grupo específico ("Transactions routes")
describe("Transactions routes", () => {
	// método usado para iniciar o servidor antes de todos os testes (executado uma vez antes de todos os testes)
	beforeAll(async () => {
		await app.ready();
	});

	// método usado para fechar o servidor após todos os testes
	afterAll(async () => {
		await app.close();
	});

	// executa antes de cada teste, garantindo que o banco de dados esteja limpo e pronto antes de cada teste ser executado
	beforeEach(() => {
		execSync("npm run knex migrate:rollback --all"); // limpa todas as migrações anteriores (rollback executa o método down de todas as migrações)
		execSync("npm run knex migrate:latest"); // cria todas as migrações novamente
	});

	// it faz o mesmo que o test, mas é mais usado para testes unitários ("Deveria ser capaz de criar uma nova transação")
	it("should be able to create a new transaction", async () => {
		await request(app.server)
			.post("/transactions")
			.send({
				title: "New transaction",
				amount: 5000,
				type: "credit",
			})
			.expect(201); // Verifica se a resposta tem o status 201 (Created)
	});

	it("should be able to list all transactions", async () => {
		const createTransactionResponse = await request(app.server)
			.post("/transactions")
			.send({
				title: "New transaction",
				amount: 5000,
				type: "credit",
			});

		const cookies = createTransactionResponse.get("Set-Cookie") ?? []; // Obtém os cookies da resposta da criação da transação;

		const listTransactionsResponse = await request(app.server)
			.get("/transactions")
			.set("Cookie", cookies) // Envia os cookies recebidos na resposta anterior
			.expect(200); // Verifica se a resposta tem o status 200 (OK)

		expect(listTransactionsResponse.body.transactions).toEqual([
			expect.objectContaining({
				title: "New transaction",
				amount: 5000,
			}),
		]);
	});

	it("should be able to get a specific transaction", async () => {
		const createTransactionResponse = await request(app.server)
			.post("/transactions")
			.send({
				title: "New transaction",
				amount: 5000,
				type: "credit",
			});

		const cookies = createTransactionResponse.get("Set-Cookie") ?? [];

		const listTransactionsResponse = await request(app.server)
			.get("/transactions")
			.set("Cookie", cookies)
			.expect(200);

		const transactionTitle =
			listTransactionsResponse.body.transactions[0].title;

		const getTransactionResponse = await request(app.server)
			.get(`/transactions/${transactionTitle}`)
			.set("Cookie", cookies)
			.expect(200);

		expect(getTransactionResponse.body.transaction).toEqual(
			expect.objectContaining({
				title: "New transaction",
				amount: 5000,
			}),
		);
	});

	it("should be able to get the summary", async () => {
		const createTransactionResponse = await request(app.server)
			.post("/transactions")
			.send({
				title: "Credit transaction",
				amount: 5000,
				type: "credit",
			});

		const cookies = createTransactionResponse.get("Set-Cookie") ?? [];

		await request(app.server)
			.post("/transactions")
			.set("Cookie", cookies)
			.send({
				title: "Debit transaction",
				amount: 2000,
				type: "debit",
			});

		const summaryResponse = await request(app.server)
			.get("/transactions/summary")
			.set("Cookie", cookies)
			.expect(200);

		expect(summaryResponse.body.summary).toEqual({
			amount: 3000, // 5000 (crédito) - 2000 (débito)
		});
	});
});
