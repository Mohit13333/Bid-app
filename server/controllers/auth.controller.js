import jwt from "jsonwebtoken";
import { createUser, checkUserExists, findUserById, findUserByEmail, findUserByPhone, canPostAdvertisement, updateUserVerificationToken, verifyUserEmail, getAllUsers } from "../models/user.model.js";
import { sendOTP, verifyOTP } from "../config/mail91.js";
// import { auth } from "../config/firebase.js";
// import { uploadImages } from "../middlewares/upload.js";
import crypto from "crypto";
import { v4 as uuidv4 } from 'uuid';
import { sendVerificationEmail } from "../utils/emailVerrification.js";
import { getProductByUserId } from "../models/product.model.js";
import { checkOtpLimit, saveOtpRequest } from "../models/otpLimit.model.js";
import { validateEmail } from "../config/emailValidator.js";

export const register = async (req, res) => {
  const { idToken, name, email, phone, role = "buyer", referrerId, otp } = req.body;

  try {
    if (!email && phone) {
      return res.status(400).json({
        message: "Email and phone number is required",
        error: true,
        success: false,
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ message: "Invalid or temporary email not allowed" });
    }

    const isLimited = await checkOtpLimit(phone);
    if (isLimited) {
      return res.status(429).json({ message: "OTP limit reached. Try again later." });
    }
    // if (!(idToken || phone)) {
    //   return res.status(400).json({
    //     message: "Either idToken or phone number is required",
    //     error: true,
    //     success: false,
    //   });
    // }

    // let email = null;
    // if (idToken) {
    //   const decodedToken = await auth.verifyIdToken(idToken);
    //   email = decodedToken.email;
    // }
    // const existingUser = await checkUserExists(email, phone);
    // if (existingUser) {
    //   return res.status(400).json({
    //     message: "User already exists",
    //     error: true,
    //     success: false,
    //   });
    // }
    if (phone) {
      if (!otp) {
        await sendOTP(phone);
        await saveOtpRequest(phone);
        return res.status(200).json({
          message: "OTP sent to phone",
          success: true,
          error: false,
        });
      } else {
        const otpResponse = await verifyOTP(phone, otp);
        if (otpResponse.type !== "success") {
          return res.status(400).json({
            message: "Invalid OTP",
            error: true,
            success: false,
          });
        }
      }
    }
    const userId = uuidv4();
    const newUser = await createUser(
      userId,
      name,
      email,
      phone,
      role,
      referrerId
    );
    const token = jwt.sign(
      { userId: newUser.id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "5d" }
    );

    res.status(201).json({
      message: "User registered successfully",
      user: newUser,
      token,
      error: false,
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Server error during registration",
      error: true,
      success: false,
    });
  }
};

// Check if user exists
export const checkUser = async (req, res) => {
  try {
    const { email, phone } = req.body;

    const checkUserDetails = await checkUserExists(email, phone);
    if (checkUserDetails) {
      return res.status(200).json({
        message: "User Already Exists!",
        success: false,
        error: true,
        exists: true,
      });
    }

    return res.status(200).json({
      message: "User does not exist!",
      success: true,
      error: false,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
      error: true,
    });
  }
};

// User Login
export const login = async (req, res) => {
  const { idToken, phone, otp } = req.body;

  try {
    // let user = null;

    // if (idToken) {
    //   const decodedToken = await auth.verifyIdToken(idToken);
    //   const email = decodedToken.email;

    //   if (!email) {
    //     return res.status(400).json({
    //       message: "Invalid ID token",
    //       error: true,
    //       success: false,
    //     });
    //   }

    //   user = await findUserByEmail(email);
    //   if (!user) {
    //     return res.status(400).json({
    //       message: "User not found",
    //       error: true,
    //       success: false,
    //     });
    //   }
    // } else if (phone) {
    const isLimited = await checkOtpLimit(phone);
    if (isLimited) {
      return res.status(429).json({ message: "OTP limit reached. Try again later." });
    }
    const user = await findUserByPhone(phone);
    if (phone) {
      if (!user) {
        return res.status(400).json({
          message: "User not found",
          error: true,
          success: false,
        });
      }

      if (!otp) {
        await sendOTP(phone);
        await saveOtpRequest(phone);
        return res.status(200).json({
          message: "OTP sent to phone",
          success: true,
          error: false,
        });
      } else {
        const otpResponse = await verifyOTP(phone, otp);
        if (otpResponse.type !== "success") {
          return res.status(400).json({
            message: "Invalid OTP",
            error: true,
            success: false,
          });
        }
      }
    }
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "5d" }
    );

    res.status(200).json({
      message: "Login successful",
      user,
      token,
      success: true,
      error: false,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Server error during login",
      error: true,
      success: false,
    });
  }
};

// User Logout
export const logout = (req, res) => {
  try {
    if (!req.cookies?.access_token) {
      return res.status(400).json({
        message: "You are already logged out.",
        success: false,
        error: true,
      });
    }

    // Clear cookie
    res.clearCookie("access_token", {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });

    res.status(200).json({
      message: "Logged out successfully",
      success: true,
      error: false,
    });
  } catch (error) {
    res.status(500).json({
      message: "Logout failed. Please try again.",
      error: true,
      success: false,
    });
  }
};

// Get user by ID
export const getUserById = async (req, res) => {
  try {
    const { id } = req.body;
    const user = await findUserById(id);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get current user
export const getUser = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(400).json({
        message: "Invalid request: No user ID found",
      });
    }

    const user = await findUserById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json({
      user,
      success: true,
      error: false,
    });
  } catch (error) {
    console.error("Error fetching user:", error.message);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Upgrade to premium plan
export const upgradePlan = async (req, res) => {
  const { userId, planType } = req.body;

  if (!userId || !planType) {
    return res.status(400).json({
      message: "User ID and plan type are required",
      error: true,
      success: false,
    });
  }

  try {
    const updatedUser = await upgradeToPremiumPlan(userId, planType);
    res.status(200).json({
      message: "Plan upgraded successfully",
      user: updatedUser,
      success: true,
      error: false,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Failed to upgrade plan",
      error: true,
      success: false,
    });
  }
};

// Check if user can post an advertisement
export const checkAdvertisementLimit = async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      message: "User ID is required",
      error: true,
      success: false,
    });
  }

  try {
    const { canPost, reason } = await canPostAdvertisement(userId);
    if (!canPost) {
      return res.status(403).json({
        message: reason,
        error: true,
        success: false,
      });
    }

    res.status(200).json({
      message: "User can post an advertisement",
      success: true,
      error: false,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Failed to check advertisement limit",
      error: true,
      success: false,
    });
  }
};

// Increment advertisement count
export const postAdvertisement = async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      message: "User ID is required",
      error: true,
      success: false,
    });
  }
  try {
    const { canPost, reason } = await canPostAdvertisement(userId);
    if (!canPost) {
      return res.status(403).json({
        message: reason,
        error: true,
        success: false,
      });
    }
    const updatedUser = await incrementAdvertisementCount(userId);

    res.status(200).json({
      message: "Advertisement posted successfully",
      user: updatedUser,
      success: true,
      error: false,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Failed to post advertisement",
      error: true,
      success: false,
    });
  }
};

// // Update user profile
// export const updateProfileImage = async (req, res) => {
//   try {
//     uploadImages(req, res, async (err) => {
//       if (err) {
//         return res.status(400).json({
//           success: false,
//           error: true,
//           message: err.message
//         });
//       }

//       const userId = req.user?.id || req.userId; // Adjust based on your auth middleware
//       if (!userId) {
//         return res.status(401).json({
//           success: false,
//           error: true,
//           message: "Unauthorized: User not authenticated"
//         });
//       }

//       if (!req.file) {
//         return res.status(400).json({
//           success: false,
//           error: true,
//           message: "No image uploaded"
//         });
//       }

//       // Take the first image as profile image
//       const profileImageUrl = req.file.location;

//       try {
//         const updatedUser = await updateUserProfileImage(userId, profileImageUrl);
//         res.status(200).json({
//           success: true,
//           error: false,
//           message: "Profile image updated successfully",
//           user: updatedUser
//         });
//       } catch (error) {
//         res.status(500).json({
//           success: false,
//           error: true,
//           message: error.message || "Failed to update profile image"
//         });
//       }
//     });
//   } catch (error) {
//     console.error("Error updating profile image:", error);
//     res.status(500).json({
//       success: false,
//       error: true,
//       message: "Internal server error"
//     });
//   }
// };

export const requestEmailVerification = async (req, res) => {
  const { userId } = req.body;

  try {
    const user = await findUserById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found", success: false, error: true });
    }

    const { email, name, email_verified } = user;

    if (email_verified) {
      return res.status(400).json({ message: "Email already verified", success: false, error: true });
    }

    const token = crypto.randomBytes(32).toString("hex");

    await updateUserVerificationToken(userId, token);

    await sendVerificationEmail(email, name, token);

    res.status(200).json({ message: "Verification email sent successfully", success: true, error: false });

  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "Internal server error", success: false, error: true });
  }
};

export const verifyEmail = async (req, res) => {
  const { token } = req.query;

  if (!token) return res.status(400).json({ message: "Invalid token", success: false, error: true });

  try {
    const user = await verifyUserEmail(token);
    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token", success: false, error: true });
    }
    res.status(200).json({ message: "Email verified successfully!", success: true, error: false });

  } catch (error) {
    res.status(500).json({ message: error.message, success: false, error: true });
  }
};

export const getOtherUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: "User ID is rewuired!", success: false, error: true });
    }

    const user = await findUserById(userId);
    const products = await getProductByUserId(userId)

    if (!user) {
      return res.status(404).json({ message: "User not found", success: false, error: true });
    }

    res.status(200).json({ message: "user fetched successfully!", user, products, success: true, errro: false })

  } catch (error) {
    res.status(500).json({ message: error.message, success: false, error: true });
  }
}

export const getAllUser = async (req, res) => {
  try {
    const users = await getAllUsers();
    return res.status(200).json({ users, success: true, error: false });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch users", success: false, error: true });
  }
}