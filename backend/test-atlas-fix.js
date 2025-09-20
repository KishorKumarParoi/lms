require('dotenv').config();

const mongoose = require('mongoose');

async function testAtlasWithDifferentFormats() {
    const atlasConfigs = [
        // Original format
        'mongodb+srv://1703053_db_user:Im8J1I5MqvDFlg9j@test.jdargjm.mongodb.net/lms?retryWrites=true&w=majority',
        
        // Try without database name in URI
        'mongodb+srv://1703053_db_user:Im8J1I5MqvDFlg9j@test.jdargjm.mongodb.net/?retryWrites=true&w=majority',
        
        // Try with different connection options
        'mongodb+srv://1703053_db_user:Im8J1I5MqvDFlg9j@test.jdargjm.mongodb.net/lms?retryWrites=true&w=majority&ssl=true',
        
        // Try standard connection (non-SRV) - you'll need to get this from Atlas
        // 'mongodb://test-shard-00-00.jdargjm.mongodb.net:27017,test-shard-00-01.jdargjm.mongodb.net:27017,test-shard-00-02.jdargjm.mongodb.net:27017/lms?ssl=true&replicaSet=atlas-xyz-shard-0&authSource=admin&retryWrites=true&w=majority'
    ];

    for (let i = 0; i < atlasConfigs.length; i++) {
        try {
            console.log(`\n=== Testing Atlas config ${i + 1} ===`);
            console.log('URI:', atlasConfigs[i].replace(/:[^:@]*@/, ':****@')); // Hide password in logs
            
            const conn = await mongoose.connect(atlasConfigs[i], {
                serverSelectionTimeoutMS: 10000,
                socketTimeoutMS: 45000,
                family: 4, // Use IPv4, skip trying IPv6
            });
            
            console.log('✅ Atlas connection successful!');
            console.log('Host:', conn.connection.host);
            console.log('Database:', conn.connection.name);
            await mongoose.disconnect();
            return true;
        } catch (error) {
            console.error(`❌ Config ${i + 1} failed:`, error.message);
        }
    }
    
    // Try local MongoDB as fallback
    try {
        console.log('\n=== Trying local MongoDB ===');
        const localConn = await mongoose.connect('mongodb://localhost:27017/lms');
        console.log('✅ Local MongoDB works!');
        await mongoose.disconnect();
        return true;
    } catch (localError) {
        console.error('❌ Local MongoDB also failed:', localError.message);
    }
    
    return false;
}

testAtlasWithDifferentFormats();