import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "AdScale One ERP Backend is running",
  });
});

app.get("/api/health", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    status: "healthy",
    service: "AdScale One ERP API",
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});