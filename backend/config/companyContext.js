// Default company context - this can be updated by admin via the settings API
// This information is fed to the AI to generate contextually accurate replies

const defaultCompanyContext = {
    companyName: "Your Company Name",
    industry: "B2B Solutions",
    productsAndServices: [
        "Product/Service 1 - Brief description",
        "Product/Service 2 - Brief description",
    ],
    pricingInfo: "Contact for custom pricing based on requirements",
    businessHours: "Monday - Friday, 9:00 AM - 6:00 PM IST",
    location: "India",
    contactEmail: "info@yourcompany.com",
    contactPhone: "+91-XXXXXXXXXX",
    website: "https://yourcompany.com",
    policies: {
        responseTime: "Within 24 hours",
        minimumOrderQuantity: "Varies by product",
        paymentTerms: "Net 30 days for verified businesses",
        shippingInfo: "Pan-India delivery, international shipping available",
        warrantyInfo: "Standard warranty included with all products",
    },
    toneOfVoice: "Professional, helpful, and solution-oriented",
    additionalNotes: "We specialize in bulk B2B orders and offer custom solutions.",
};

module.exports = defaultCompanyContext;
