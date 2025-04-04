import {
  createProduct,
  getProductById,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getNearbyProducts,
  getProductByUserId,
  approveProduct,
  getProductsByCategory,
  deactivateExpiredAdvertisements,
  incrementProductViewCount,
  getSuggestedProducts,
} from "../models/product.model.js";
import uploadOnCloudinary from "../config/cloudinary.js";
import jwt from "jsonwebtoken";
import { searchProducts } from "../models/search.model.js";
import { canPostAdvertisement } from "../models/user.model.js";
import { notifyUsersOnProductUpdate } from "../models/notification.model.js";
import { AzureOpenAI } from "openai";
// Create Product
export const createProductController = async (req, res) => {
  try {
    const { name, description, categoryId, price, latitude, longitude, badge, product_type } = req.body;
    const { userId } = req.user;

    // Validate required fields
    if (!name || !price || !categoryId || !latitude || !longitude || !product_type) {
      return res.status(400).json({
        message: "Name, price, categoryId, latitude, longitude, and product_type are required",
        error: true,
      });
    }

    // Validate latitude and longitude
    const parsedLatitude = parseFloat(latitude);
    const parsedLongitude = parseFloat(longitude);
    if (isNaN(parsedLatitude) || isNaN(parsedLongitude)) {
      return res.status(400).json({
        message: "Latitude and Longitude must be valid numbers",
        error: true,
      });
    }

    // Check if the user can post an advertisement
    const { canPost, reason, requiresPremium } = await canPostAdvertisement(userId);
    if (!canPost) {
      return res.status(403).json({
        message: reason,
        error: true,
        redirectToPricing: requiresPremium,
      });
    }

    // Upload images to Cloudinary
    const imageUrls =
      req.files?.length > 0
        ? await uploadOnCloudinary(req.files.map((file) => file.path))
        : [];

    // Create the product (advertisement)
    const product = await createProduct(
      name,
      description,
      price,
      imageUrls,
      categoryId,
      parsedLatitude,
      parsedLongitude,
      userId,
      badge || null,
      product_type
    );
    res.status(201).json({
      message: "Product created successfully, wait for approval",
      product,
      success: true,
      error: false,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: error.message || "Error creating product",
      error: true,
    });
  }
};

// Get product by userId
export const getProductsByUserId = async (req, res) => {
  try {
    const { userId } = req.user;
    const products = await getProductByUserId(userId);
    res.status(200).json({
      message: "Products retrieved successfully",
      products,
      success: true,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: error.message || "Error fetching products",
      error: true,
    });
  }
};

export const getAllProductsController = async (req, res) => {
  try {
    const token = req.cookies.access_token || req.headers.authorization?.split(" ")[1];
    let userId = null;

    // Extract sorting and filtering parameters from the query
    const { sortBy = "posted_date", sortOrder = "DESC", priceSort } = req.query;
    const { priceMin, priceMax, categoryIds, latitude, longitude, maxDistance } = req.query;

    // Validate sortOrder to prevent SQL injection
    const validSortOrders = ["ASC", "DESC"];
    if (!validSortOrders.includes(sortOrder.toUpperCase())) {
      return res.status(400).json({
        message: "Invalid sortOrder. Use 'ASC' or 'DESC'.",
        error: true,
      });
    }

    // Validate sortBy to prevent SQL injection
    const validSortByFields = ["posted_date", "price", "category", "location"];
    if (!validSortByFields.includes(sortBy)) {
      return res.status(400).json({
        message: "Invalid sortBy. Use 'posted_date', 'price', 'category', or 'location'.",
        error: true,
      });
    }

    // Handle priceSort parameter for direct price sorting
    let finalSortBy = sortBy;
    let finalSortOrder = sortOrder;

    if (priceSort === "high") {
      finalSortBy = "price";
      finalSortOrder = "DESC"; // High to low
    } else if (priceSort === "low") {
      finalSortBy = "price";
      finalSortOrder = "ASC"; // Low to high
    }

    // Validate price range
    let priceRange = null;
    if (priceMin !== undefined && priceMax !== undefined) {
      if (isNaN(priceMin) || isNaN(priceMax)) {
        return res.status(400).json({
          message: "Invalid price range. priceMin and priceMax must be numbers.",
          error: true,
        });
      }
      priceRange = { min: parseFloat(priceMin), max: parseFloat(priceMax) };
    }

    // Validate category IDs
    let parsedCategoryIds = null;
    if (categoryIds) {
      try {
        parsedCategoryIds = JSON.parse(categoryIds); // Expecting categoryIds as a JSON array
        if (!Array.isArray(parsedCategoryIds)) {
          return res.status(400).json({
            message: "Invalid categoryIds. Must be an array of category IDs.",
            error: true,
          });
        }
      } catch (error) {
        return res.status(400).json({
          message: "Invalid categoryIds. Must be a valid JSON array.",
          error: true,
        });
      }
    }

    // Validate location parameters
    if (sortBy === "location" && (!latitude || !longitude || !maxDistance)) {
      return res.status(400).json({
        message: "Location sorting requires latitude, longitude, and maxDistance.",
        error: true,
      });
    }

    // Decode token to get userId (if token exists)
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
      } catch (error) {
        console.log("Invalid token:", error.message);
      }
    }

    // Prepare filters object
    const filters = {
      priceRange,
      categoryIds: parsedCategoryIds,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      maxDistance: maxDistance ? parseFloat(maxDistance) : null,
    };

    // Fetch products with sorting and filtering
    const products = await getAllProducts(userId, finalSortBy, finalSortOrder, filters);

    res.status(200).json({
      message: "Products retrieved successfully",
      products,
      success: true,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: error.message || "Error fetching products",
      error: true,
    });
  }
};

// Get Product by ID
export const getProductController = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await getProductById(id);
    await incrementProductViewCount(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found", error: true });
    }
    res.status(200).json({
      message: "Product retrieved successfully",
      product,
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Error fetching product",
      error: true,
    });
  }
};

// Get products by category
export const getProductByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    if (!categoryId) {
      return res.status(400).json({ message: "Category is required.", error: true });
    }

    const products = await getProductsByCategory(parseInt(categoryId));
    return res.status(200).json({ message: "Products retrieved successfully", products, success: true });
  } catch (error) {
    console.error("Error fetching products by category:", error);
    return res.status(500).json({ message: "Internal server error", error: true });
  }
};

// Update Product
export const updateProductController = async (req, res) => {
  const { id } = req.params;
  const { name, description, categoryId, price, latitude, longitude, badge, product_type } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({
      message: "Latitude and Longitude are required",
      error: true,
    });
  }

  try {
    const imageUrls =
      req.files?.length > 0
        ? await uploadOnCloudinary(req.files.map((file) => file.path))
        : undefined;

    const updatedProduct = await updateProduct(
      id,
      name,
      description,
      price,
      imageUrls,
      categoryId,
      parseFloat(latitude),
      parseFloat(longitude),
      badge || null,
      product_type
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found", error: true });
    }

    await notifyUsersOnProductUpdate(id, updatedProduct);

    res.status(200).json({
      message: "Product updated successfully",
      updatedProduct,
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Error updating product",
      error: true,
    });
  }
};

// Delete Product
export const deleteProductController = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedProduct = await deleteProduct(id);
    if (!deletedProduct) {
      return res.status(404).json({ message: "Product not found", error: true });
    }

    res.status(200).json({ message: "Product deleted successfully", success: true });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Error deleting product",
      error: true,
    });
  }
};

// Get Nearby Products
export const getNearbyProductsController = async (req, res) => {
  const { latitude, longitude } = req.query;

  if (!latitude || !longitude) {
    return res.status(400).json({
      message: "Latitude and Longitude are required",
      error: true,
    });
  }

  try {
    const nearbyProducts = await getNearbyProducts(
      parseFloat(latitude),
      parseFloat(longitude)
    );

    res.status(200).json({
      message: "Nearby products retrieved successfully",
      products: nearbyProducts,
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Error fetching nearby products",
      error: true,
    });
  }
};

// Search Products
export const searchProduct = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query)
      return res.status(400).json({ success: false, message: "Search query required" });

    const products = await searchProducts(query);
    res.json({ success: true, products });
  } catch (error) {
    console.error("Error searching products:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Approve Product
export const approveProductController = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_approved } = req.body;

    if (!id) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    if (is_approved === undefined || typeof is_approved !== "boolean") {
      return res.status(400).json({ message: "Approval status (true or false) is required" });
    }

    const updatedProduct = await approveProduct(id, is_approved);

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({
      message: `Product ${is_approved ? "approved" : "rejected"} successfully`,
      product: updatedProduct,
      success: true,
    });
  } catch (error) {
    console.error("Error approving product:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Deactivate Expired Advertisements
export const deactivateExpiredAdvertisementsController = async (req, res) => {
  try {
    const deactivatedCount = await deactivateExpiredAdvertisements();
    res.status(200).json({
      message: `Deactivated ${deactivatedCount} expired advertisements`,
      success: true,
    });
  } catch (error) {
    console.error("Error deactivating expired advertisements:", error);
    res.status(500).json({ message: "Internal server error", error: true });
  }
};

export const getSuggestedProductsController = async (req, res) => {
  try {
    const { userId } = req.params;

    const suggestedProducts = await getSuggestedProducts(userId);

    res.status(200).json({ suggestedProducts, error: false, success: true });
  } catch (error) {
    console.error('Error fetching suggested products:', error);
    res.status(500).json({ success: false, error: true, message: 'Internal server error' });
  }
};



const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY;
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;

const client = new AzureOpenAI({
  apiKey: AZURE_OPENAI_API_KEY,
  azure: {
    endpoint: AZURE_OPENAI_ENDPOINT,
    deploymentName: "gpt-4o", 
  },
  apiVersion: "2024-02-15-preview", // Required for GPT-4o
});

export const generateListing = async (req, res) => {
  try {
    const { image_base64, product_type, years_old } = req.body;

    if (!image_base64 || !product_type || years_old === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const prompt = `
      Analyze this product image and generate a complete listing with the following EXACT structure:
      
      Suitable Title to sell the image in picture: [Create a short, appealing title under 10 words]
      Category: [Select ONLY ONE from: Mobiles, Cars, Electronics and Appliances, Home and Garden, Beauty, Clothing, Books, Art and Craft, Construction, Agriculture, Bikes and Scooters]
      Description:
      [Write a 50-200 word compelling product description including:
      - Key features and specifications
      - Condition: ${product_type}
      - Age: ${years_old} years old
      - Any notable wear or special attributes
      - Reason for selling (if applicable)
      
      IMPORTANT: 
      - Only respond with the requested format above
      - Do not include any additional commentary or text outside this structure
      - The description should be sales-oriented and persuasive
      - Dont give same description again and again
      `;

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert e-commerce assistant that generates perfect product listings. Always follow the required format exactly without deviation."
        },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${image_base64}`
              }
            }
          ]
        }
      ],
      temperature: 0.2,
      max_tokens: 500,
      top_p: 0.9
    });

    const content = response.choices[0].message.content;

    const titleMatch = content.match(/Suitable Title[^\n]*:\s*(.+)/i);
    const categoryMatch = content.match(/Category[^\n]*:\s*(.+)/i);
    const description = content.split('Description:')[1]?.trim() ||
      content.split('Description:\n')[1]?.trim();

    if (!titleMatch || !categoryMatch || !description) {
      throw new Error("AI response format was not as expected");
    }

    const result = {
      title: titleMatch[1].trim(),
      category: categoryMatch[1].trim(),
      description: description
    };
    const validCategories = [
      'Mobiles', 'Cars', 'Electronics and Appliances',
      'Home and Garden', 'Beauty', 'Clothing',
      'Books', 'Art and Craft', 'Construction',
      'Agriculture', 'Bikes and Scooters'
    ];

    if (!validCategories.includes(result.category)) {
      result.category = 'Electronics and Appliances';
    }

    res.json(result);

  } catch (error) {
    res.status(error.status || 500).json({
      error: "Failed to generate listing",
      details: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};
