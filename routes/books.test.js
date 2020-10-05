process.env.NODE_ENV = 'test';

const request = require('supertest');

const app = require('../app');
const db = require('../db');

let testBook;

beforeEach(async function() {
	const newbook = {
		isbn: '0099554569',
		amazon_url:
			'https://www.amazon.com/Norwegian-Wood-Haruki-Murakami/dp/0099554569/ref=tmm_pap_swatch_0?_encoding=UTF8&qid=1601865171&sr=1-1',
		author: 'Haruki Murakami',
		language: 'english',
		pages: 389,
		publisher: 'Vintage',
		title: 'Norwegian Wood',
		year: 2011
	};

	const result = await db.query(
		`INSERT INTO books (
              isbn,
              amazon_url,
              author,
              language,
              pages,
              publisher,
              title,
              year) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
           RETURNING isbn,
                     amazon_url,
                     author,
                     language,
                     pages,
                     publisher,
                     title,
                     year`,
		[
			newbook.isbn,
			newbook.amazon_url,
			newbook.author,
			newbook.language,
			newbook.pages,
			newbook.publisher,
			newbook.title,
			newbook.year
		]
	);
	testBook = result.rows[0];
});

describe('GET /books', async () => {
	test('Gets a list of books', async () => {
		const res = await request(app).get(`/books`);
		expect(res.statusCode).toBe(200);
		expect(res.body.books[0]).toHaveProperty('isbn');
	});
});

describe('GET /books/:id', async () => {
	test('Gets a single book by isbn', async () => {
		const res = await request(app).get(`/books/${testBook.isbn}`);
		expect(res.statusCode).toBe(200);
		expect(res.body.book).toHaveProperty('isbn');
	});
	test('Returns 404 if isbn is invalid', async () => {
		const res = await request(app).get(`/books/09q2whg0092wng`);
		expect(res.statusCode).toBe(404);
	});
});

describe('POST /books', async () => {
	test('Creates a new book', async () => {
		const res = await request(app).post(`/books`).send({
			isbn: '12121212121212',
			amazon_url: 'https://www.amazon.com/not-a-real-link/dp/12121212121212',
			author: 'Haruki Murakami',
			language: 'english',
			pages: 1000,
			publisher: 'Vintage',
			title: 'Not A Real Book',
			year: 2015
		});
		expect(res.statusCode).toBe(201);
		expect(res.body.book).toHaveProperty('isbn');
	});
	test('Does not create a book without an isbn', async () => {
		const res = await request(app).post(`/books`).send({
			amazon_url: 'https://www.amazon.com/not-a-real-link/dp/12121212121212',
			author: 'Haruki Murakami',
			language: 'english',
			pages: 1000,
			publisher: 'Vintage',
			title: 'Not A Real Book',
			year: 2015
		});
		expect(res.statusCode).toBe(400);
	});
	test('Does not create a book with a release date of more than 10 years in the future', async () => {
		const res = await request(app).post(`/books`).send({
			isbn: '12121212121212',
			amazon_url: 'https://www.amazon.com/not-a-real-link/dp/12121212121212',
			author: 'Haruki Murakami',
			language: 'english',
			pages: 1000,
			publisher: 'Vintage',
			title: 'Not A Real Book',
			year: 2031
		});
		expect(res.statusCode).toBe(400);
	});
});

describe('PUT /books/:isbn', async () => {
	test('Updates only the published year', async () => {
		const res = await request(app).put(`/books/${testBook.isbn}`).send({ year: 1989 });
		expect(res.statusCode).toBe(200);
		expect(res.body.book).toHaveProperty('isbn');
		expect(res.body.book.isbn).toEqual(testBook.isbn);
	});
	test('Does not update year if data is not a number', async () => {
		const res = await request(app).put(`/books/${testBook.isbn}`).send({ year: 'hehe' });
		expect(res.statusCode).toBe(500);
	});
	test('Does not update year if year is more than 10 years in the future', async () => {
		const res = await request(app).put(`/books/${testBook.isbn}`).send({ year: 2031 });
		expect(res.statusCode).toBe(400);
	});
});

describe('DELETE /books/:isbn', async () => {
	test('Deletes a book', async () => {
		const res = await request(app).delete(`/books/${testBook.isbn}`);
		expect(res.statusCode).toBe(200);
		expect(res.body.message).toEqual('Book deleted');
	});
	test('Returns 404 if isbn is not found or is invalid', async () => {
		const res = await request(app).delete(`/books/8601420106598`);
		const res2 = await request(app).delete(`/books/hahadude`);
		expect(res.statusCode).toBe(404);
		expect(res2.statusCode).toBe(404);
	});
});

afterEach(async function() {
	// delete any data created by test
	await db.query('DELETE FROM books');
});

afterAll(async function() {
	// close db connection
	await db.end();
});
