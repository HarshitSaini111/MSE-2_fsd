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
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
}, { timestamps: true });

const Student = mongoose.model("Student", studentSchema);

/* ===========================
   Grievance Schema
=========================== */
const grievanceSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: {
        type: String,
        enum: ["Academic", "Hostel", "Transport", "Other"],
        required: true
    },
    date: { type: Date, default: Date.now },
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
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ message: "No token provided" });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({ message: "Invalid token format" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;
        next();

    } catch (error) {
        res.status(401).json({ message: "Invalid token" });
    }
};

/* ===========================
   AUTH ROUTES
=========================== */

/* 🔹 Register */
app.post("/api/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const existing = await Student.findOne({ email });
        if (existing) {
            return res.status(400).json({ message: "Email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const student = new Student({
            name,
            email,
            password: hashedPassword
        });

        await student.save();

        res.json({ message: "Registration successful" });

    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

/* 🔹 Login */
app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const student = await Student.findOne({ email });
        if (!student) {
            return res.status(400).json({ message: "Invalid email" });
        }

        const isMatch = await bcrypt.compare(password, student.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid password" });
        }

        const token = jwt.sign(
            { id: student._id },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({ token, message: "Login successful" });

    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

/* ===========================
   GRIEVANCE ROUTES
=========================== */

/* 🔹 Submit grievance */
app.post("/api/grievances", authMiddleware, async (req, res) => {
    try {
        const { title, description, category } = req.body;

        const grievance = new Grievance({
            title,
            description,
            category,
            student: req.user.id
        });

        await grievance.save();

        res.json({ message: "Grievance submitted", grievance });

    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

/* 🔹 Get all grievances */
app.get("/api/grievances", authMiddleware, async (req, res) => {
    try {
        const grievances = await Grievance.find()
            .populate("student", "name email");

        res.json(grievances);

    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

/* 🔹 Get grievance by ID */
app.get("/api/grievances/:id", authMiddleware, async (req, res) => {
    try {
        const grievance = await Grievance.findById(req.params.id)
            .populate("student", "name email");

        if (!grievance) {
            return res.status(404).json({ message: "Not found" });
        }

        res.json(grievance);

    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

/* 🔹 Update grievance */
app.put("/api/grievances/:id", authMiddleware, async (req, res) => {
    try {
        const updated = await Grievance.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        res.json({ message: "Updated", updated });

    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

/* 🔹 Delete grievance */
app.delete("/api/grievances/:id", authMiddleware, async (req, res) => {
    try {
        await Grievance.findByIdAndDelete(req.params.id);

        res.json({ message: "Deleted successfully" });

    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

/* 🔹 Search grievance */
app.get("/api/grievances/search", authMiddleware, async (req, res) => {
    try {
        const { title } = req.query;

        const grievances = await Grievance.find({
            title: { $regex: title, $options: "i" }
        });

        res.json(grievances);

    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

/* ===========================
   Server Start
=========================== */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});