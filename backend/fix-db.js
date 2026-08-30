require('dotenv').config();
const { getSupabase } = require('./config/db');

async function fixDB() {
    console.log("Starting DB Fix");
    const sb = getSupabase();
    console.log("Supabase initialized");
    const { data: requests, error } = await sb.from('email_requests').select('id, ai_draft_reply, admin_reply');
    if (error) {
        console.log("Error:", error);
    }

    if (requests) {
        console.log("Found requests length:", requests.length);
        for (let r of requests) {
            let updated = false;
            let newAiry = r.ai_draft_reply;
            let newAdmin = r.admin_reply;

            if (newAiry && (/₹|INR|Rs/i.test(newAiry))) {
                newAiry = newAiry.replace(/₹/g, '$').replace(/INR/g, 'USD').replace(/Rs\.?\s?/gi, '$');
                updated = true;
            }
            if (newAdmin && (/₹|INR|Rs/i.test(newAdmin))) {
                newAdmin = newAdmin.replace(/₹/g, '$').replace(/INR/g, 'USD').replace(/Rs\.?\s?/gi, '$');
                updated = true;
            }

            if (updated) {
                await sb.from('email_requests').update({
                    ai_draft_reply: newAiry,
                    admin_reply: newAdmin
                }).eq('id', r.id);
                console.log('Fixed draft for ID ' + r.id);
            }
        }
    }
    console.log("Done");
    process.exit(0);
}

fixDB();
