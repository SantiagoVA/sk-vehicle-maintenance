const express = require("express");
const { getAvailability } = require("../services/availabilityService");

const router = express.Router();

// GET /api/availability?serviceId=oil-filter&date=2026-08-25
router.get("/", async (req, res, next) => {
  try {
    const { serviceId, date } = req.query;
    if (!serviceId || !date) {
      return res.status(400).json({ error: "serviceId and date are required" });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "date must be YYYY-MM-DD" });
    }
    const result = await getAvailability(serviceId, date);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
