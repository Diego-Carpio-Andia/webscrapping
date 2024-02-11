const {Schema, model}  = require("mongoose");

const OFACSchema = Schema({
    data : [],    
    created_at: {
        type: Date,
        default: Date.now
    }    
});

module.exports = model("OFAC", OFACSchema, "OFACS"); 
