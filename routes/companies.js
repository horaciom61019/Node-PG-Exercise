const express = require('express');
const ExpressError = require('../expressError');
const router = new express.Router();
const db = require('../db');


/** GET / => list of companies.
 * =>   {companies: [{code, name}, {code, name} ...]}
*/
router.get('/', async (req, res, next) => {
    try {
        const result = await db.query(`SELECT code, name FROM companies`);
        return res.json({companies: result.rows});
    } catch (err) {
        next(err)
    }
});


/** GET /[code] => list of companies.
 * =>   {company: {code, name, description}}
*/
router.get('/:code', async (req, res, next) => {
    try {
        const { code } = req.params;
        const result = await db.query(
            `SELECT code, name, description FROM companies WHERE code = $1`, [code]
            );

        if (result.rows.length === 0) {
            throw new ExpressError(`Can't find company with code of ${code}`, 404)
        }
        return res.json({company: result.rows[0]});
    } catch (err) {
        next(err)
    }
});


/** POST / => add a new company
 * =>   {code, name, description}  =>  {company: {code, name, description}}
*/
router.post('/', async (req, res, next) => {
    try {
        const {code, name, description} = req.body;
        const result = await db.query(
            `INSERT INTO companies (code, name, description) 
            VALUES ($1, $2, $3) RETURNING code, name, description`, 
            [code, name, description]
            );
        return res.status(201).json({ company: result.rows[0] })
    } catch (err) {
        next(err);
    }
});


/** PUT /[code] => update company
 * =>   {name, description}  =>  {company: {code, name, description}}
*/
router.put('/:code', async (req, res, next) => {
    try {
      const { code } = req.params;
      const { name, description } = req.body;
      const result = await db.query(
          `UPDATE companies SET name=$1, description=$2 
          WHERE code=$3 RETURNING code, name, description`, 
          [name, description, code]
      )
      if (result.rows.length === 0) {
        throw new ExpressError(`Can't update company with code of ${code}`, 404)
      }
      return res.json({ company: result.rows[0] })
    } catch (err) {
      return next(err)
    }
})


/** DELETE /[code] => delete company
 * =>   {status: "DELETED"}
*/
router.delete('/:code', async (req, res, next) => {
    try {
      const result = db.query('DELETE FROM companies WHERE code = $1', [req.params.code])
      return res.send({ status: "DELETED" })
    } catch (e) {
      return next(e)
    }
})


module.exports = router;
