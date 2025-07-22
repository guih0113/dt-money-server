import { it, beforeAll, afterAll, describe, expect, beforeEach } from "vitest";
import { execSync } from "node:child_process";
import request from "supertest";
import { app } from "../src/app";

describe("Transactions routes", () => {
	beforeAll(async () => {
		await app.ready();
	});

	afterAll(async () => {
		await app.close();
	});

	beforeEach(() => {
		execSync("npm run knex migrate:rollback --all"); // limpa todas as migrações anteriores (rollback executa o método down de todas as migrações)
		execSync("npm run knex migrate:latest"); // cria todas as migrações novamente
	});

	it("should be able to create a new transaction", async () => {
		await request(app.server)
			.post("/transactions")
			.send({
				title: "New transaction",
				description: "New transaction test",
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
				description: "New transaction test",
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

	it("should be able to search transactions by title", async () => {
		const createTransactionResponse1 = await request(app.server)
			.post("/transactions")
			.send({
				title: "Salary Income",
				description: "Monthly salary payment",
				amount: 10000,
				type: "credit",
			});

		const cookies = createTransactionResponse1.get("Set-Cookie") ?? [];

		await request(app.server)
			.post("/transactions")
			.set("Cookie", cookies)
			.send({
				title: "Food Expenses",
				description: "Groceries for the week",
				amount: 500,
				type: "debit",
			});

		await request(app.server)
			.post("/transactions")
			.set("Cookie", cookies)
			.send({
				title: "Car Maintenance",
				description: "Oil change and tire rotation",
				amount: 300,
				type: "debit",
			});

		const searchFoodResponse = await request(app.server)
			.get("/transactions?query=Food")
			.set("Cookie", cookies)
			.expect(200);

		expect(searchFoodResponse.body.transactions).toHaveLength(1);
		expect(searchFoodResponse.body.transactions[0]).toEqual(
			expect.objectContaining({
				title: "Food Expenses",
				amount: -500,
			}),
		);
		expect(searchFoodResponse.body.total).toEqual(1);

		const searchSalaryResponse = await request(app.server)
			.get("/transactions?query=salary")
			.set("Cookie", cookies)
			.expect(200);

		expect(searchSalaryResponse.body.transactions).toHaveLength(1);
		expect(searchSalaryResponse.body.transactions[0]).toEqual(
			expect.objectContaining({
				title: "Salary Income",
				amount: 10000,
			}),
		);
		expect(searchSalaryResponse.body.total).toEqual(1);

		const searchNonExistentResponse = await request(app.server)
			.get("/transactions?query=Vacation")
			.set("Cookie", cookies)
			.expect(200);

		expect(searchNonExistentResponse.body.transactions).toHaveLength(0);
		expect(searchNonExistentResponse.body.total).toEqual(0);
	});

	it("should be able to get the summary", async () => {
		const createTransactionResponse = await request(app.server)
			.post("/transactions")
			.send({
				title: "Credit transaction",
				description: "New transaction test",
				amount: 5000,
				type: "credit",
			});

		const cookies = createTransactionResponse.get("Set-Cookie") ?? [];

		await request(app.server)
			.post("/transactions")
			.set("Cookie", cookies)
			.send({
				title: "Debit transaction",
				description: "New transaction test",
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

	it("should be able to get the credit summary", async () => {
		const createCreditTransaction1 = await request(app.server)
			.post("/transactions")
			.send({
				title: "Salary",
				description: "Monthly salary",
				amount: 5000,
				type: "credit",
			});

		const cookies = createCreditTransaction1.get("Set-Cookie") ?? [];

		await request(app.server)
			.post("/transactions")
			.set("Cookie", cookies)
			.send({
				title: "Freelance Payment",
				description: "Project completion",
				amount: 2500,
				type: "credit",
			});

		await request(app.server)
			.post("/transactions")
			.set("Cookie", cookies)
			.send({
				title: "Rent",
				description: "Monthly rent payment",
				amount: 1000,
				type: "debit",
			});

		const creditSummaryResponse = await request(app.server)
			.get("/transactions/summary/credit")
			.set("Cookie", cookies)
			.expect(200);

		expect(creditSummaryResponse.body.creditSummary).toEqual({
			amount: 7500, // 5000 (salary) + 2500 (freelance)
		});
	});

	it("should be able to get the debit summary", async () => {
		const createCreditTransaction = await request(app.server)
			.post("/transactions")
			.send({
				title: "Investment",
				description: "Investment gain",
				amount: 10000,
				type: "credit",
			});

		const cookies = createCreditTransaction.get("Set-Cookie") ?? [];

		await request(app.server)
			.post("/transactions")
			.set("Cookie", cookies)
			.send({
				title: "Groceries",
				description: "Weekly groceries",
				amount: 300,
				type: "debit",
			});

		await request(app.server)
			.post("/transactions")
			.set("Cookie", cookies)
			.send({
				title: "Electricity Bill",
				description: "Monthly electricity bill",
				amount: 150,
				type: "debit",
			});

		const debitSummaryResponse = await request(app.server)
			.get("/transactions/summary/debit")
			.set("Cookie", cookies)
			.expect(200);

		expect(debitSummaryResponse.body.debitSummary).toEqual({
			amount: -450, // -300 (groceries) + -150 (electricity)
		});
	});
});
