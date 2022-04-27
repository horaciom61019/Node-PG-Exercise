process.env.NODE_ENV = 'test';
const req = require('express/lib/request');
const request = require('supertest');
const app = require('../app');
const db = require('../db');

let testCompany;

beforeEach(async () => {
    await db.query("DELETE FROM invoices");
    await db.query("DELETE FROM companies");
    await db.query("SELECT setval('invoices_id_seq', 1, false)");

    await db.query(`INSERT INTO companies (code, name, description)
                    VALUES ('apple', 'Apple', 'Maker of OSX.'),
                            ('ibm', 'IBM', 'Big blue.')`);

    const inv = await db.query(
        `INSERT INTO invoices (comp_code, amt, paid, add_date, paid_date)
            VALUES ('apple', 100, false, '2018-01-01', null),
                    ('apple', 200, true, '2018-02-01', '2018-02-02'), 
                    ('ibm', 300, false, '2018-03-01', null)
            RETURNING id`);
});


describe("GET /", () => {
  test("It should respond with array of companies", async () => {
    const response = await request(app).get("/companies");
    expect(response.body).toEqual({
      "companies": [
        {code: "apple", name: "Apple"},
        {code: "ibm", name: "IBM"},
      ]
    });
  })
});


describe("GET /apple", () => {
  test("It return company info", async () => {
    const response = await request(app).get("/companies/apple");
    expect(response.body).toEqual(
        {
          "company": {
            code: "apple",
            name: "Apple",
            description: "Maker of OSX.",
            invoices: [1, 2],
          }
        }
    );
  });
  test("It should return 404 for no-such-company", async () => {
    const response = await request(app).get("/companies/blargh");
    expect(response.status).toEqual(404);
  })
});


describe("POST /", () => {
  test("It should add company", async () => {
    const response = await request(app)
        .post("/companies")
        .send({name: "TacoTime", description: "Yum!"}
    );
    expect(response.body).toEqual(
        {
          "company": {
            code: "tacotime",
            name: "TacoTime",
            description: "Yum!",
          }
        }
    );
  });

  test("It should return 500 for conflict", async () => {
    const response = await request(app)
        .post("/companies")
        .send({name: "Apple", description: "Huh?"});

    expect(response.status).toEqual(500);
  })
});


describe("PUT /", () => {
  test("It should update company", async () => {
    const response = await request(app)
        .put("/companies/apple")
        .send({name: "AppleEdit", description: "NewDescrip"});
    expect(response.body).toEqual(
        {
          "company": {
            code: "apple",
            name: "AppleEdit",
            description: "NewDescrip",
          }
        }
    );
  });
  test("It should return 404 for no-such-comp", async () => {
    const response = await request(app)
        .put("/companies/blargh")
        .send({name: "Blargh"});

    expect(response.status).toEqual(404);
  });
  test("It should return 500 for missing data", async () => {
    const response = await request(app)
        .put("/companies/apple")
        .send({});
    expect(response.status).toEqual(500);
  })
});


describe("DELETE /", () => {
  test("It should delete company", async () => {
    const response = await request(app)
        .delete("/companies/apple");

    expect(response.body).toEqual({"status": "deleted"});
  });
  test("It should return 404 for no-such-comp", async () => {
    const response = await request(app)
        .delete("/companies/blargh");

    expect(response.status).toEqual(404);
  });
});


afterEach(async () => {
    // Delete any data created by test
    await db.query('DELETE FROM companies')
});

afterAll(async () => {
    // close db connection
    await db.end();
});