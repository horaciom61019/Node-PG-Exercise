const express = require('express');
const ExpressError = require('../expressError');
const router = new express.Router();
const db = require('../db');

/** GET / => list of invoices.
 * =>   {invoices: [{id, comp_code}, ...]}
*/
router.get('/', async (req, res, next) => {
    try {
        const result = await db.query(`SELECT id, comp_code FROM invoices ORDER BY id`);
        return res.json({"invoices": result.rows});
    } catch (err) {
        next(err)
    }
});


/** GET /[id] => detail on invoice
 * =>   {invoices: {id, amt, paid, add_date, paid_date, company: {code, name, description}}}
*/
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            `SELECT i.id, i.comp_code, i.amt, i.paid, i.add_date, i.paid_date, c.name, c.description 
            FROM invoices AS i
            INNER JOIN companies AS c ON (i.comp_code = c.code) 
            WHERE id = $1`,
        [id]);

        if (result.rows.length === 0) {
            throw new ExpressError(`No such invoice: ${id}`, 404)
        }
        const data = result.rows[0];
        const invoice = {
            id: data.id,
            company: { code: data.comp_code, name: data.name, description: data.description },
            amt: data.amt,
            paid: data.paid,
            add_date: data.add_date,
            paid_date: data.paid_date,
        };
        return res.json({invoice: invoice});
    } catch (err) {
        next(err)
    }
});


/** POST / => add a new invoice
 * =>   {comp_code, amt}  =>  {id, comp_code, amt, paid, add_date, paid_date}
*/
router.post('/', async (req, res, next) => {
    try {
        const { comp_code, amt } = req.body;
        const result = await db.query(
            `INSERT INTO invoices (comp_code, amt) VALUES ($1, $2) 
            RETURNING id, comp_code, amt, paid, add_date, paid_date`,
            [comp_code, amt]
        );
        return res.json({"invoice": result.rows[0]});
    } catch (err) {
        next(err);
    }
});


/** PUT /[id] => update invoice
 * =>   {amt, paid}  =>  {id, comp_code, amt, paid, add_date, paid_date}
 * If paying unpaid invoice, set paid_date; if marking as unpaid, clear paid_date.
*/
router.put('/:id', async (req, res, next) => {
    try {
      const { id } = req.params;
      const { amt, paid } = req.body;
      let paidDate = null;

      const currResult = await db.query(`SELECT paid FROM invoices WHERE id = $1`, [id]);
      if (currResult.rows.length === 0) {
        throw new ExpressError(`No such invoice: ${id}`, 404);
      }
      const currPaidDate = currResult.rows[0].paid_date;

      if (!currPaidDate && paid) {
        paidDate = new Date();
      } else if (!paid) {
        paidDate = null
      } else {
        paidDate = currPaidDate;
      }

      const result = await db.query(
          `UPDATE invoices SET amt=$1, paid=$2, paid_date=$3
          WHERE id=$4 RETURNING id, comp_code, amt, paid, add_date, paid_date`, 
          [amt, paid, paidDate, id]
      );

      return res.json({"invoice": result.rows[0]});
    } catch (err) {
      return next(err)
    }
})


/** DELETE /[id] => delete invoice
 * =>   {status: "DELETED"}
*/
router.delete('/:id', async (req, res, next) => {
    try {
      const result = db.query('DELETE FROM invoices WHERE id = $1 RETURNING id', [req.params.id])
      if (result.rows.length === 0) {
        throw new ExpressError(`No such invoice: ${id}`, 404);
      }
      return res.send({ status: "DELETED" })
    } catch (e) {
      return next(e)
    }
})


module.exports = router;