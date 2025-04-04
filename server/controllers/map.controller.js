import axios from "axios";

const OLA_MAPS_API_KEY = process.env.OLA_MAPS_API_KEY;
// console.log(OLA_MAPS_API_KEY)

export const autocompletePlaces = async (req, res) => {
    const { input } = req.query;
    console.log(input)
    if (!input) {
        return res.status(400).json({ error: true, success: false, message: "Input query is required" });
    }

    const apiUrl = `https://api.olamaps.io/places/v1/autocomplete?input=${encodeURIComponent(input)}&api_key=${OLA_MAPS_API_KEY}`;

    try {
        const response = await axios.get(apiUrl);
        res.status(200).json({ error: false, success: true, data: response.data });
    } catch (error) {
        console.error("Error fetching autocomplete data:", error);
        res.status(500).json({ error: true, success: false, message: "Failed to fetch autocomplete suggestions" });
    }
};

export const reverseGeocode = async (req, res) => {
    const { lat, lng } = req.query;
    console.log(lat,lng)
    if (!lat || !lng) {
        return res.status(400).json({ error: true, success: false, message: "Latitude and Longitude are required" });
    }

    const apiUrl = `https://api.olamaps.io/places/v1/reverse-geocode?latlng=${lat},${lng}&api_key=${OLA_MAPS_API_KEY}`;

    try {
        const response = await axios.get(apiUrl);
        res.status(200).json({ error: false, success: true, data: response.data });
    } catch (error) {
        console.error("Error fetching reverse geocode data:", error.message);
        res.status(500).json({ error: true, success: false, message: "Failed to fetch location details" });
    }
};
