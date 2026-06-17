const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: true, 
        unique: true 
    },
    email: { 
        type: String 
    },    
    phone: { 
        type: String 
    },    
    // Administrative Unique Access Credentials
    adminUniqueName: { 
        type: String, 
        unique: true, 
        sparse: true // Allows multiple documents to not have this field
    },
    adminAccessNumber: { 
        type: String, 
        unique: true, 
        sparse: true 
    },
    // Matriculated Student Unique Access Credentials
    studentUniqueName: { 
        type: String, 
        unique: true, 
        sparse: true 
    },
    studentAccessNumber: { 
        type: String, 
        unique: true, 
        sparse: true 
    },
    role: { 
        type: String, 
        enum: ['admin', 'student'], 
        required: true 
    }
});

module.exports = mongoose.model('User', userSchema);