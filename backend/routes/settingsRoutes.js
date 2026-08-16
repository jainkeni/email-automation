const express = require('express');
const { getSupabase } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const defaultCompanyContext = require('../config/companyContext');

const router = express.Router();

router.use(authMiddleware);

// GET /api/settings - Get company settings
router.get('/', async (req, res) => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('company_settings')
            .select('*')
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('Error fetching settings:', error);
            return res.status(500).json({ message: 'Failed to fetch settings.' });
        }

        if (!data) {
            // Create default settings
            const { data: created, error: createError } = await supabase
                .from('company_settings')
                .insert({
                    company_name: defaultCompanyContext.companyName,
                    industry: defaultCompanyContext.industry,
                    products_and_services: defaultCompanyContext.productsAndServices,
                    pricing_info: defaultCompanyContext.pricingInfo,
                    business_hours: defaultCompanyContext.businessHours,
                    location: defaultCompanyContext.location,
                    contact_email: defaultCompanyContext.contactEmail,
                    contact_phone: defaultCompanyContext.contactPhone,
                    website: defaultCompanyContext.website,
                    policies: defaultCompanyContext.policies,
                    tone_of_voice: defaultCompanyContext.toneOfVoice,
                    additional_notes: defaultCompanyContext.additionalNotes,
                })
                .select('*')
                .single();

            if (createError) {
                return res.status(500).json({ message: 'Failed to create default settings.' });
            }

            return res.json(mapSettingsToFrontend(created));
        }

        res.json(mapSettingsToFrontend(data));
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ message: 'Failed to fetch settings.' });
    }
});

// PUT /api/settings - Update company settings
router.put('/', async (req, res) => {
    try {
        const body = req.body;
        const supabase = getSupabase();

        const updateData = {
            company_name: body.companyName,
            industry: body.industry,
            products_and_services: body.productsAndServices,
            pricing_info: body.pricingInfo,
            business_hours: body.businessHours,
            location: body.location,
            contact_email: body.contactEmail,
            contact_phone: body.contactPhone,
            website: body.website,
            policies: body.policies,
            tone_of_voice: body.toneOfVoice,
            additional_notes: body.additionalNotes,
        };

        // Check if settings exist
        const { data: existing } = await supabase
            .from('company_settings')
            .select('id')
            .limit(1)
            .maybeSingle();

        let result;
        if (existing) {
            const { data, error } = await supabase
                .from('company_settings')
                .update(updateData)
                .eq('id', existing.id)
                .select('*')
                .single();

            if (error) {
                console.error('Error updating settings:', error);
                return res.status(500).json({ message: 'Failed to update settings.' });
            }
            result = data;
        } else {
            const { data, error } = await supabase
                .from('company_settings')
                .insert(updateData)
                .select('*')
                .single();

            if (error) {
                console.error('Error creating settings:', error);
                return res.status(500).json({ message: 'Failed to create settings.' });
            }
            result = data;
        }

        res.json({
            message: 'Settings updated successfully.',
            settings: mapSettingsToFrontend(result),
        });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ message: 'Failed to update settings.' });
    }
});

/**
 * Map Supabase row (snake_case) to frontend format (camelCase)
 */
function mapSettingsToFrontend(row) {
    return {
        id: row.id,
        companyName: row.company_name,
        industry: row.industry,
        productsAndServices: row.products_and_services || [],
        pricingInfo: row.pricing_info,
        businessHours: row.business_hours,
        location: row.location,
        contactEmail: row.contact_email,
        contactPhone: row.contact_phone,
        website: row.website,
        policies: row.policies || {},
        toneOfVoice: row.tone_of_voice,
        additionalNotes: row.additional_notes,
    };
}

module.exports = router;
