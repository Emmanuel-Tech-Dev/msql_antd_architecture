const AppError = require("../../shared/helpers/AppError");

const AuthService = require("../lib/authService");
const Model = require("../model/model");

const PUBLIC_ENDPOINTS = [
  "/auth/user_info",
];

// All a user with a temporary password can do until they replace it.
const PASSWORD_SETUP_ENDPOINTS = [
  "/auth/change_password",
  "/auth/logout",
];

const authMiddleWare = async (req, res, next) => {
  const path = req.path;

  if (PUBLIC_ENDPOINTS.includes(path)) {
    next();
    return;
  }

  const auth = new AuthService();

  let token = req.headers.authorization;
  let decodedToken;

  const tokenIssuer = await auth.tokenIssuerInit();

  if (!token || token === "Bearer undefined" || token === "Bearer null") {
    throw new AppError("ERR_TOKEN_INVALID", "No valid token provided");
  }

  if (!token) {
    throw new AppError("ERR_TOKEN_INVALID", null, {
      message: "Authenication failed! Try again later",
      level: "access",
    });
  }

  if (token.startsWith("Bearer ")) {
    token = token.slice(7).trim();
    decodedToken = await auth.verifyToken(
      token,
      process.env.ACCESS_TOKEN_SECRET,
    );
  }

  if (!decodedToken) {
    throw new AppError("ERR_TOKEN_INVALID", null, {
      message: "Authenication failed! Try again later",
      level: "access",
    });
  }

  // await checkTokenVersion(decodedToken);

  if (decodedToken?.iss !== tokenIssuer) {
    throw new AppError("ERR_TOKEN_INVALID", "Token issuer mismatch", {
      message: "Authenication failed! Try again later",
      level: "access",
    });
  }

  const [oldToken] = await new Model()
    .select(["admin_credentials.token_version", "admin.forced_password_change"], "admin_credentials")
    .join("INNER", "admin", "admin.custom_id", "admin_credentials.admin_custom_id")
    .where("admin_credentials.admin_custom_id", "=", decodedToken?.sub)
    .execute();

  if (decodedToken?.token_version !== oldToken?.token_version) {
    throw new AppError("ERR_TOKEN_EXPIRED", null, {
      message: "Authenication failed! Try again later",
      level: "access",
    });
  }

  // A temporary password was given by an administrator, who therefore knows
  // it: nothing else works until the user chooses their own.
  if (Number(oldToken?.forced_password_change) === 1 && !PASSWORD_SETUP_ENDPOINTS.includes(path)) {
    throw new AppError("ERR_PASSWORD_CHANGE_REQUIRED", "Choose a new password before continuing", {
      level: "access",
    });
  }

  req.user = decodedToken;

  // if (err.name === "TokenExpiredError") {
  //   throw new AppError("ERR_TOKEN_EXPIRED", null, {
  //     message: "Token has expired",
  //     level: "access",
  //   });
  // }

  next();
};

async function checkTokenVersion(decodedToken) {
  const [oldToken] = await new Model()
    .select(["token_version"], "admin_credentials")
    .where("admin_custom_id", "=", decodedToken?.sub)
    .execute();

  if (oldToken?.token_version !== decodedToken?.token_version)
    throw new AppError("ERR_TOKEN_EXPIRED", null, {
      message: "Authenication failed! Try again later",
      level: "access",
    });
}

module.exports = authMiddleWare;
