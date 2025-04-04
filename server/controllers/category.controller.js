import { createCategory, deleteCategory, getCategories } from "../models/category.model.js";


export const createCategories = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ message: "Name is required", error: true, success: false })
        }
        const caetegory = await createCategory(name);

        return res.status(201).json({ caetegory, message: "Category created successfully", success: true, errro: false });
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

export const getAllCategories = async (req, res) => {
    try {
        const categories = await getCategories();
        if (!categories) {
            return res.status(404).json({ message: "Catgeory not availbe" });
        }
        return res.status(200).json({ categories, message: "Categories fetched successfully", success: true, error: false });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

export const deleteCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: "Category id is required.", error: true, success: false });
        }
        const category = await deleteCategory(id);
        return res.status(200).json({ category, message: "category deleted successfully", error: false, success: true });
    } catch (error) {
        return res.status(500).json({ message: error.message, error: true, success: false });
    }
}