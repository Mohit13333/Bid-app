import pool from "../config/connectDB.js";
import cron from "node-cron";
import crypto from "crypto";

// Create user_role ENUM if not exists
const createUserRoleEnum = async () => {
    const query = `
    DO $$ BEGIN
      CREATE TYPE user_role AS ENUM ('admin', 'seller', 'buyer');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `;
    await pool.query(query);
};
createUserRoleEnum();

// Create users table if not exists
const createUserTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(30) NOT NULL,
      email VARCHAR(100) UNIQUE,
      phone VARCHAR(20) UNIQUE,
      role user_role DEFAULT 'buyer',
      plan_type VARCHAR(10) DEFAULT 'free',
      plan_start_date DATE,
      plan_end_date DATE,
      ads_posted_in_current_period INT DEFAULT 0,
      max_ads_allowed INT DEFAULT 5,
      wallet_balance INT DEFAULT 0, 
      referrer_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
      referral_code VARCHAR(255) UNIQUE NOT NULL,
      first_item_uploaded BOOLEAN DEFAULT FALSE,
      subscription_purchased BOOLEAN DEFAULT FALSE,
      wallet_history JSONB DEFAULT '[]',
      email_verified BOOLEAN DEFAULT FALSE,
      verification_token TEXT
    )
  `;
    await pool.query(query);
};
createUserTable();

// Find user by ID
export const findUserById = async (id) => {
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    return result.rows[0];
};

// Check if user already exists
export const checkUserExists = async (email, phone) => {
    const result = await pool.query(
        "SELECT id FROM users WHERE email = $1 OR phone = $2",
        [email, phone]
    );
    return result.rowCount > 0;
};
const generateReferralCode = (id) => {
    return id;
};

export const findUserByEmail = async (email) => {
    const query = "SELECT * FROM users WHERE email = $1";
    const result = await pool.query(query, [email]);
    return result.rows[0];
};

// Find user by phone
export const findUserByPhone = async (phone) => {
    const query = "SELECT * FROM users WHERE phone = $1";
    const result = await pool.query(query, [phone]);
    return result.rows[0]; // Return the first matching user or null
};

// Function to add a transaction to wallet history
const logWalletTransaction = async (userId, amount, type, reason) => {
    const transaction = JSON.stringify([{ amount, type, reason, timestamp: new Date() }]);
    await pool.query(
        `UPDATE users 
         SET wallet_balance = wallet_balance + $1, 
             wallet_history = wallet_history || $2 
         WHERE id = $3`,
        [amount, transaction, userId]
    );
};

// Create user with referral system
export const createUser = async (id, name, email, phone, role = "buyer", referrerId) => {
    const planStartDate = new Date();
    const planEndDate = new Date();
    planEndDate.setDate(planStartDate.getDate() + 7);

    let walletBalance = 0;
    const referralCode = generateReferralCode(id);

    try {
        await pool.query("BEGIN");
        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1 OR phone = $2",
            [email, phone]
        );

        console.log(existingUser)
        if (existingUser.rowCount > 0) {
            throw new Error("User already exists with this email or phone number.");
        }

        // Validate referrer
        let validReferrerId = null;
        if (referrerId) {
            const referrerExists = await pool.query(
                "SELECT id FROM users WHERE LOWER(referral_code) = LOWER($1)",
                [referrerId]
            );
            if (referrerExists.rowCount > 0) {
                validReferrerId = referrerExists.rows[0].id;
                walletBalance = 10;
                await logWalletTransaction(validReferrerId, 10, "credit", "Referral reward for new registration");
            }
        }
        const result = await pool.query(
            `INSERT INTO users 
             (id, name, email, phone, role, plan_start_date, plan_end_date, wallet_balance, referrer_id, referral_code, wallet_history, max_ads_allowed, email_verified) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, false); 
             RETURNING *`,
            [id, name, email, phone, role, planStartDate, planEndDate, walletBalance, validReferrerId, referralCode, JSON.stringify(walletBalance > 0 ? [{ type: "credit", amount: 10, reason: "Welcome reward for signing up with a referral", timestamp: new Date() }] : []), 5]
        );
        await pool.query("COMMIT");
        return result.rows[0];

    } catch (error) {
        await pool.query("ROLLBACK");
        throw error;
    }
}

// // Get user wallet balance and history
// export const getUserWallet = async (userId) => {
//     const result = await pool.query(
//         "SELECT wallet_balance, wallet_history FROM users WHERE id = $1",
//         [userId]
//     );
//     return result.rows[0];
// };

// // Check if user exists by email or phone
// export const checkUserExists = async (email, phone) => {
//     const result = await pool.query(
//         'SELECT * FROM users WHERE email = $1 OR phone = $2',
//         [email, phone]
//     );
//     return result.rows[0];
// };

// Update user role
export const updateUserRole = async (id, newRole) => {
    const result = await pool.query(
        'UPDATE users SET role = $1 WHERE id = $2 RETURNING *',
        [newRole, id]
    );
    return result.rows[0];
};

// Check if user can post an advertisement
export const canPostAdvertisement = async (userId) => {
    const user = await findUserById(userId);
    if (!user) throw new Error("User not found");

    const currentDate = new Date();

    // Free Plan: User can post only 5 ads in 7 days.
    if (user.plan_type === "free" && currentDate > new Date(user.plan_end_date)) {
        return { canPost: false, redirectToPlanPage: true, reason: "Free plan expired. Please upgrade." };
    }

    if (user.plan_type === "premium" && currentDate > new Date(user.plan_end_date)) {
        return { canPost: false, redirectToPlanPage: true, reason: "Premium plan expired. Please renew." };
    }

    if (user.ads_posted_in_current_period >= user.max_ads_allowed) {
        return { canPost: false, redirectToPlanPage: true, reason: "Ad posting limit reached." };
    }

    return { canPost: true };
};


// Increment advertisement count
export const incrementAdvertisementCount = async (userId) => {
    const result = await pool.query(
        'UPDATE users SET ads_posted_in_current_period = ads_posted_in_current_period + 1 WHERE id = $1 RETURNING *',
        [userId]
    );
    return result.rows[0];
};

// Reset advertisement count
export const resetAdvertisementCount = async (userId) => {
    const result = await pool.query(
        'UPDATE users SET ads_posted_in_current_period = 0 WHERE id = $1 RETURNING *',
        [userId]
    );
    return result.rows[0];
};

export const decrementMaxAdsCount = async (userId) => {
    const result = await pool.query(
        'UPDATE users SET max_ads_allowed = max_ads_allowed - 1 WHERE id = $1 RETURNING *',
        [userId]
    );
    return result.rows[0];
};


// premium with bid credits
export const buyPremiumWithBidCredits = async (userId, planType) => {
    const planStartDate = new Date();
    let planEndDate = new Date();
    let planName = '';
    let maxAds = 0;
    let bidCreditsRequired = 0;

    switch (planType) {
        case 200:
            planEndDate.setDate(planStartDate.getDate() + 10);
            planName = 'basic';
            maxAds = 10;
            bidCreditsRequired = 200;
            break;
        case 500:
            planEndDate.setDate(planStartDate.getDate() + 30);
            planName = 'premium';
            maxAds = 30;
            bidCreditsRequired = 500;
            break;
        case 750:
            planEndDate.setDate(planStartDate.getDate() + 45);
            planName = 'super';
            maxAds = 50;
            bidCreditsRequired = 750;
            break;
        case 1000:
            planEndDate.setDate(planStartDate.getDate() + 60);
            planName = 'gold';
            maxAds = 100;
            bidCreditsRequired = 1000;
            break;
        default:
            throw new Error("Invalid plan type");
    }

    try {
        await pool.query("BEGIN");
        const userResult = await pool.query(
            `SELECT wallet_balance, max_ads_allowed 
             FROM users 
             WHERE id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            throw new Error("User not found");
        }

        const user = userResult.rows[0];

        if (user.wallet_balance < bidCreditsRequired) {
            throw new Error("Insufficient bid credits to purchase this plan");
        }
        const newMaxAds = (user.max_ads_allowed || 0) + maxAds;

        await logWalletTransaction(userId, -bidCreditsRequired, "debit", `Purchased ${planName} plan with bid credits`);

        const updateResult = await pool.query(
            `UPDATE users 
             SET plan_type = $1, 
                 plan_start_date = $2, 
                 plan_end_date = $3, 
                 ads_posted_in_current_period = 0,
                 max_ads_allowed = $4
             WHERE id = $5 RETURNING *`,
            [planName, planStartDate, planEndDate, newMaxAds, userId]
        );

        await pool.query("COMMIT");
        return updateResult.rows[0];

    } catch (error) {
        await pool.query("ROLLBACK");
        throw error;
    }
};

export const upgradeToPremiumPlan = async (userId, planType) => {
    const planStartDate = new Date();
    let planEndDate = new Date();
    let planName = '';
    let maxAds = 0;

    switch (planType) {
        case '49':
            planEndDate.setDate(planStartDate.getDate() + 10);
            planName = 'basic';
            maxAds = 10;
            break;
        case '99':
            planEndDate.setDate(planStartDate.getDate() + 30);
            planName = 'premium';
            maxAds = 30;
            break;
        case '149':
            planEndDate.setDate(planStartDate.getDate() + 45);
            planName = 'super';
            maxAds = 50;
            break;
        case '199':
            planEndDate.setDate(planStartDate.getDate() + 60);
            planName = 'gold';
            maxAds = 100;
            break;
        default:
            throw new Error("Invalid plan type");
    }

    const userResult = await pool.query(
        `SELECT plan_type, plan_end_date, max_ads_allowed 
         FROM users 
         WHERE id = $1`,
        [userId]
    );

    if (userResult.rows.length === 0) {
        throw new Error("User not found");
    }

    const user = userResult.rows[0];

    const newMaxAds = (user.max_ads_allowed || 0) + maxAds;

    const updateResult = await pool.query(
        `UPDATE users 
         SET plan_type = $1, 
             plan_start_date = $2, 
             plan_end_date = $3, 
             ads_posted_in_current_period = 0,
             max_ads_allowed = $4
         WHERE id = $5 RETURNING *`,
        [planName, planStartDate, planEndDate, newMaxAds, userId]
    );

    return updateResult.rows[0];
};

// await upgradeToPremiumPlan("Zydl4rLwMrM80xOFkRpZtoTRpDs1","49")

export const markFirstItemUploaded = async (userId) => {
    const user = await findUserById(userId);
    if (!user) throw new Error("User not found");
    if (user.first_item_uploaded) return;

    try {
        await pool.query("BEGIN");
        const itemCount = await pool.query(
            "SELECT COUNT(*) FROM products WHERE created_by = $1",
            [userId]
        );
        if (parseInt(itemCount.rows[0].count) >= 1) {
            await pool.query(
                "UPDATE users SET first_item_uploaded = TRUE WHERE id = $1",
                [userId]
            );
            if (user.referrer_id) {
                await logWalletTransaction(user.referrer_id, 30, "credit", "Referral bonus for first item upload");
            }
        }

        await pool.query("COMMIT");
    } catch (error) {
        await pool.query("ROLLBACK");
        throw error;
    }
};

export const rewardForSubscription = async (userId) => {
    const user = await findUserById(userId);
    if (!user) throw new Error("User not found");

    if (user.subscription_purchased) return;

    try {
        await pool.query('BEGIN');

        await pool.query(
            "UPDATE users SET subscription_purchased = TRUE WHERE id = $1",
            [userId]
        );

        if (user.referrer_id) {
            await logWalletTransaction(user.referrer_id, 50, "credit", "Referral bonus for subscription purchase");
        }

        await pool.query('COMMIT');
    } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
    }
};

// Reset free plan users every 1st of the month
export const resetFreePlanMonthly = async () => {
    const currentDate = new Date();
    const planEndDate = new Date();
    planEndDate.setDate(planEndDate.getDate() + 10);
    const result = await pool.query(
        `UPDATE users 
         SET plan_type = 'free monthly', 
             plan_start_date = $1, 
             plan_end_date = $2, 
             ads_posted_in_current_period = 0, 
             max_ads_allowed = 1
         RETURNING *`,
        [currentDate, planEndDate]
    );
};

// Schedule the reset on the 1st of every month at midnight
cron.schedule("0 0 1 * *", async () => {
    await resetFreePlanMonthly();
});

export const updateUserVerificationToken = async (userId, token) => {
    try {
        await pool.query(
            "UPDATE users SET verification_token = $1 WHERE id = $2",
            [token, userId]
        );
    } catch (error) {
        throw new Error(error.message);
    }
};


export const verifyUserEmail = async (token) => {
    try {
        const result = await pool.query(
            "UPDATE users SET email_verified = true, verification_token = NULL WHERE verification_token = $1 RETURNING *",
            [token]
        );

        return result.rowCount > 0 ? result.rows[0] : null;
    } catch (error) {
        throw new Error(error.message);
    }
};

export const getAllUsers = async () => {
    try {
        const query = "SELECT * FROM users";
        const result = await pool.query(query);
        return result.rows;
    } catch (error) {
        console.error("Error fetching all users:", error);
        throw error;
    }
};