const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

/* ===========================
   MongoDB Connection
=========================== */
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

/* ===========================
   Student Schema
=========================== */
const studentSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String
});

const Student = mongoose.model("Student", studentSchema);

/* ===========================
   Grievance Schema
=========================== */
const grievanceSchema = new mongoose.Schema({
    title: String,
    description: String,
    category: {
        type: String,
        enum: ["Academic", "Hostel", "Transport", "Other"]
    },
    status: {
        type: String,
        enum: ["Pending", "Resolved"],
        default: "Pending"
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student"
    }
}, { timestamps: true });

const Grievance = mongoose.model("Grievance", grievanceSchema);

/* ===========================
   Auth Middleware
=========================== */
const authMiddleware = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ message: "No token" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        res.status(401).json({ message: "Invalid token" });
    }
};

/* ===========================
   AUTH ROUTES
=========================== */

app.post("/api/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const exist = await Student.findOne({ email });
        if (exist) return res.status(400).json({ message: "Email exists" });

        const hash = await bcrypt.hash(password, 10);

        await Student.create({ name, email, password: hash });

        res.json({ message: "Registered" });
    } catch (e) {
        res.status(500).json({ message: "Server error" });
    }
});

app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await Student.findOne({ email });
        if (!user) return res.status(400).json({ message: "Invalid email" });

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return res.status(400).json({ message: "Invalid password" });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

        res.json({ token });
    } catch {
        res.status(500).json({ message: "Server error" });
    }
});

/* ===========================
   GRIEVANCE ROUTES
=========================== */

/* 🔹 SEARCH (IMPORTANT: FIRST) */
app.get("/api/grievances/search", authMiddleware, async (req, res) => {
    try {
        const { title } = req.query;

        if (!title) {
            return res.status(400).json({ message: "Title required" });
        }

        const data = await Grievance.find({
            title: { $regex: title, $options: "i" }
        });

        res.json(data);
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: "Server error" });
    }
});

/* 🔹 CREATE */
app.post("/api/grievances", authMiddleware, async (req, res) => {
    try {
        const g = await Grievance.create({
            ...req.body,
            student: req.user.id
        });

        res.json(g);
    } catch {
        res.status(500).json({ message: "Server error" });
    }
});

/* 🔹 GET ALL */
app.get("/api/grievances", authMiddleware, async (req, res) => {
    const data = await Grievance.find().populate("student", "name");
    res.json(data);
});

/* 🔹 GET BY ID */
app.get("/api/grievances/:id", authMiddleware, async (req, res) => {
    try {
        const data = await Grievance.findById(req.params.id);

        if (!data) return res.status(404).json({ message: "Not found" });

        res.json(data);
    } catch {
        res.status(400).json({ message: "Invalid ID" });
    }
});

/* 🔹 UPDATE */
app.put("/api/grievances/:id", authMiddleware, async (req, res) => {
    const updated = await Grievance.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
});

/* 🔹 DELETE */
app.delete("/api/grievances/:id", authMiddleware, async (req, res) => {
    await Grievance.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
});

/* ===========================
   SERVER
=========================== */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log("Server running on", PORT));