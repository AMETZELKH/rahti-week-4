const express = require("express");
const mysql = require("mysql2/promise");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;

const dbConfig = {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "appuser",
    password: process.env.DB_PASSWORD || "password",
    database: process.env.DB_NAME || "visitor_db"
};

const pool = mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10
});

app.get("/api/health", async (req, res) => {
    try {
        await pool.query("SELECT 1");
        res.json({ status: "ok" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: "error" });
    }
});

app.get("/api/info", async (req, res) => {
    try {
        const [timeRows] = await pool.query("SELECT NOW() AS currentTime");

        const [counterRows] = await pool.query(
            "SELECT page_views AS pageViews FROM stats WHERE id = 1"
        );

        res.json({
            time: timeRows[0].currentTime,
            pageViews: counterRows[0].pageViews
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Database query failed"
        });
    }
});

app.post("/api/visit", async (req, res) => {
    try {
        await pool.query(
            "UPDATE stats SET page_views = page_views + 1 WHERE id = 1"
        );

        const [rows] = await pool.query(
            "SELECT page_views AS pageViews FROM stats WHERE id = 1"
        );

        res.json({
            pageViews: rows[0].pageViews
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Database update failed"
        });
    }
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Backend listening on port ${PORT}`);
});