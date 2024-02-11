const {Schema, model}  = require("mongoose");

const WorldBankSchema = Schema({
    data: [],    
    created_at: {
        type: Date,
        default: Date.now
    }    
});

module.exports = model("WorldBank", WorldBankSchema, "WorldBanks"); 
