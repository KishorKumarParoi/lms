require('dotenv').config();

const mongoose = require('mongoose');

async function testAtlas() {
    const atlasUri = 'mongodb+srv://1703053_db_user:Im8J1I5MqvDFlg9j@test.jdargjm.mongodb.net/lms?retryWrites=true&w=majority';

    try {
        console.log('Testing Atlas connection...');
        const conn = await mongoose.connect(atlasUri, {
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
        });
        console.log('✅ Atlas connection successful!');
        console.log('Host:', conn.connection.host);
        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Atlas connection failed:', error.message);

        // Try local MongoDB as fallback
        try {
            console.log('Trying local MongoDB...');
            const localConn = await mongoose.connect('mongodb://localhost:27017/lms');
            console.log('✅ Local MongoDB works!');
            await mongoose.disconnect();
        } catch (localError) {
            console.error('❌ Local MongoDB also failed:', localError.message);
        }
    }
}

testAtlas();