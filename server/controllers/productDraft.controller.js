import { deleteProductDraft, getProductDraftByUserId, saveProductDraft } from "../models/productDraft.model.js";

export const saveDraft = async (req, res) => {
    try {
        const {
            name, description, price, images, category_id,
            latitude, longitude, product_type, brands, model, variant,
            year, fuel_type, transmission, km_driven, no_of_owners,
            sell_type, salary_start, salary_end, status, industry,
            type, salary_period, address, subcategory, profession
        } = req.body;

        const { userId } = req.user;

        const draft = await saveProductDraft(
            userId, name, description, price, images, category_id,
            latitude, longitude, product_type, brands, model, variant,
            year, fuel_type, transmission, km_driven, no_of_owners,
            sell_type, salary_start, salary_end, status, industry,
            type, salary_period, address, subcategory, profession
        );

        res.status(200).json({
            success: true,
            error: false,
            message: 'Draft saved successfully',
            draft
        });
    } catch (error) {
        console.log(error)
        res.status(500).json({
            success: false,
            message: 'Failed to save draft',
            error: true
        });
    }
};

export const getDraft = async (req, res) => {
    try {
        const { user_id } = req.params;
        if (!user_id) {
            return res.status(400).json({ message: "user id is required", error: true, success: false })
        }
        const draft = await getProductDraftByUserId(user_id);

        if (!draft) {
            return res.status(404).json({
                success: false,
                error: true,
                message: 'Draft not found'
            });
        }

        res.status(200).json({
            success: true,
            error: false,
            draft
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch draft',
            error: true
        });
    }
};

export const removeDraft = async (req, res) => {
    try {
        const { user_id } = req.params;
        if (!user_id) {
            return res.status(400).json({ message: "user id is required", error: true, success: false })
        }
        const deletedDraft = await deleteProductDraft(user_id);

        if (!deletedDraft) {
            return res.status(404).json({
                success: false,
                error: true,
                message: 'Draft not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Draft deleted successfully',
            deletedDraft,
            error: false
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete draft',
            error: true
        });
    }
};