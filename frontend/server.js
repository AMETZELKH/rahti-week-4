const express = require("express");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/info", async (req, res) => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/info`);

        if (!response.ok) {
            throw new Error(`Backend returned ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Could not reach backend"
        });
    }
});

app.post("/api/visit", async (req, res) => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/visit`, {
            method: "POST"
        });

        if (!response.ok) {
            throw new Error(`Backend returned ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Could not reach backend"
        });
    }
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Frontend listening on port ${PORT}`);
});