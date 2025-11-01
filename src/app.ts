import express, { type Application } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import session from "express-session";
import passport from "./config/googleAuth.js";
import authRouter from "./routes/authRouter.js";
import userRouter from "./routes/userRouter.js";
import visitRouter from "./routes/visitRoutes.js";
import bookingRouter from "./routes/bookingRouter.js";

const app: Application = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
// app.use(
//   cors({
//     origin: process.env.CLIENT_URL || true,
//     credentials: true,
//   })
// );


const whitelistOrigins = process.env.CORS_URLS?.split(",");
const corsOptions = {
  origin: whitelistOrigins,
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
};
console.log("Allowed origins are:", whitelistOrigins);
app.use(cors(corsOptions));


// ✅ Add session & passport middleware
app.use(
  session({
    secret: process.env.JWT_SECRET || "defaultsecret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/booking", bookingRouter);
app.use("/api/visits", visitRouter);


app.get("/health", (req, res) => {
  res.send("Server is running, Helath is good")
});


export { app };
