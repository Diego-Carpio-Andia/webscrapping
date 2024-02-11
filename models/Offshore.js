const {Schema, model}  = require("mongoose");

const OffshoreSchema = Schema({
    data: [],
    created_at: {
        type: Date,
        default: Date.now
    }    
});

module.exports = model("Offshore", OffshoreSchema, "Offshores"); 
