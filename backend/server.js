const express = require("express");
const mysql = require("mysql2/promise");
const { createClient } = require("redis");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;

app.use((req, res, next) => {
    const start = Date.now();

    res.on("finish", () => {
        const duration = Date.now() - start;
        console.log(
            `${req.method} ${req.path} ${res.statusCode} ${duration}ms`
        );
    });

    next();
});


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


// Redis configuration
const redisClient = createClient({
    socket: {
        host: process.env.REDIS_HOST || "localhost",
        port: Number(process.env.REDIS_PORT || 6379)
    }
});

redisClient.on("error", (error) => {
    console.error("Redis error:", error);
});

async function startServer() {
    try {
        await redisClient.connect();
        console.log("Connected to Redis");

        app.listen(PORT, "0.0.0.0", () => {
            console.log(`Backend listening on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start backend:", error);
        process.exit(1);
    }
}

app.get("/api/health", async (req, res) => {
    try {
        await pool.query("SELECT 1");
        res.json({ status: "ok" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: "error" });
    }
});

app.get("/healthz", (req, res) => {
    res.json({ status: "ok" });
});

app.get("/api/info", async (req, res) => {
    try {
        // Check Redis cache first
        const cached = await redisClient.get("api:info");

        if (cached) {
            console.log("Cache hit: /api/info");

            return res.json({
                ...JSON.parse(cached),
                source: "redis"
            });
        }

        console.log("Cache miss: /api/info");

        // Cache miss: query MySQL
        const [timeRows] = await pool.query(
            "SELECT NOW() AS currentTime"
        );

        const [counterRows] = await pool.query(
            "SELECT page_views AS pageViews FROM stats WHERE id = 1"
        );

        const data = {
            time: timeRows[0].currentTime,
            pageViews: counterRows[0].pageViews
        };

        // Store result in Redis for 30 seconds
        await redisClient.setEx(
            "api:info",
            30,
            JSON.stringify(data)
        );

        res.json({
            ...data,
            source: "mysql"
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

        // Invalidate cached /api/info data
        await redisClient.del("api:info");

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



startServer();