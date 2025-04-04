import axios from "axios";
import "dotenv/config";

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID;
const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID;
console.log(MSG91_TEMPLATE_ID);
console.log(MSG91_AUTH_KEY);
console.log(MSG91_SENDER_ID)

// Send OTP to phone
export const sendOTP = async (phone) => {
    const url = "https://api.msg91.com/api/v5/otp";
    const data = {
        template_id: MSG91_TEMPLATE_ID,
        mobile: `91${phone}`,
        sender: MSG91_SENDER_ID,
    };
    console.log(data);
    const headers = {
        "Content-Type": "application/json",
        authkey: MSG91_AUTH_KEY,
    };

    try {
        const response = await axios.post(url, data, { headers });
        return response.data;
    } catch (error) {
        console.error("Error sending OTP:", error.response?.data || error.message);
        throw error;
    }
};

// Verify OTP
export const verifyOTP = async (phone, otp) => {
    const url = "https://api.msg91.com/api/v5/otp/verify";
    const data = {
        mobile: `91${phone}`,
        otp: otp,
    };

    const headers = {
        "Content-Type": "application/json",
        authkey: MSG91_AUTH_KEY,
    };

    try {
        const response = await axios.post(url, data, { headers });
        return response.data;
    } catch (error) {
        console.error("Error verifying OTP:", error.response?.data || error.message);
        throw error;
    }
};