import jwt from "jsonwebtoken";

export const authUser = (req, res, next) => {
  const token =
    req.cookies.access_token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access token is required" });
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ message: "Invalid access token" });
      }
      req.userId = user.userId;
      req.user = user;
      next();
    });
  } catch (error) {
    return res
      .status(401)
      .json({ message: "Unauthorized http request: " + error.message });
  }
};
